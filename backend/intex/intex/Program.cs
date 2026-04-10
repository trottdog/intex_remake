using System.Text.Json;
using backend.intex.DTOs.Common;
using backend.intex.Infrastructure.Auth;
using backend.intex.Infrastructure.Configuration;
using backend.intex.Infrastructure.Data;
using backend.intex.Infrastructure.Data.EntityFramework;
using backend.intex.Infrastructure.Extensions;
using backend.intex.Infrastructure.Middleware;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ApplicationModels;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.RateLimiting;
using System.Threading.RateLimiting;

DotEnvLoader.LoadFromCurrentDirectory();

var builder = WebApplication.CreateBuilder(args);

builder.Configuration.AddJsonFile("appsettings.Local.json", optional: true, reloadOnChange: true);
var azureHostingOptions = builder.Configuration
    .GetSection(AzureHostingOptions.SectionName)
    .Get<AzureHostingOptions>() ?? new AzureHostingOptions();

var appInsightsConnectionString = builder.Configuration["APPLICATIONINSIGHTS_CONNECTION_STRING"];
if (!string.IsNullOrWhiteSpace(appInsightsConnectionString))
{
    builder.Services.AddApplicationInsightsTelemetry(options =>
    {
        options.ConnectionString = appInsightsConnectionString;
    });
}

builder.Logging.AddSimpleConsole(options =>
{
    options.SingleLine = true;
    options.TimestampFormat = "yyyy-MM-ddTHH:mm:ss.fffZ ";
});

builder.Services
    .AddApplicationConfiguration(builder.Configuration)
    .AddConfiguredCors(builder.Configuration, builder.Environment)
    .AddDatabaseInfrastructure(builder.Configuration)
    .AddJwtAuthentication(builder.Configuration, builder.Environment)
    .AddRoleBasedAuthorization()
    .AddApplicationServices();

builder.Services.AddControllers(options =>
    {
        options.Conventions.Add(new ApiRoutePrefixConvention("api"));
    })
    .ConfigureApiBehaviorOptions(options =>
    {
        options.InvalidModelStateResponseFactory = context =>
        {
            var firstError = context.ModelState.Values
                .SelectMany(value => value.Errors)
                .Select(error => error.ErrorMessage)
                .FirstOrDefault(static message => !string.IsNullOrWhiteSpace(message))
                ?? "The request body is invalid.";

            return new BadRequestObjectResult(new ErrorResponse(firstError));
        };
    })
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.DictionaryKeyPolicy = JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
    });

builder.Services.Configure<Microsoft.AspNetCore.Http.Json.JsonOptions>(options =>
{
    options.SerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
    options.SerializerOptions.DictionaryKeyPolicy = JsonNamingPolicy.CamelCase;
    options.SerializerOptions.PropertyNameCaseInsensitive = true;
});

builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownIPNetworks.Clear();
    options.KnownProxies.Clear();
});

builder.Services.Configure<ProblemDetailsOptions>(_ => { });
builder.Services.AddOpenApi();
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
    {
        var key = context.User.Identity?.IsAuthenticated == true
            ? $"user:{context.User.GetUserId()}"
            : $"ip:{context.Connection.RemoteIpAddress}";

        return RateLimitPartition.GetFixedWindowLimiter(key, _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 500,
            Window = TimeSpan.FromMinutes(1),
            QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
            QueueLimit = 0
        });
    });
    options.OnRejected = async (context, cancellationToken) =>
    {
        if (context.HttpContext.Response.HasStarted)
        {
            return;
        }

        context.HttpContext.Response.ContentType = "application/json";
        await context.HttpContext.Response.WriteAsJsonAsync(
            new ErrorResponse("Too many requests. Please try again shortly."),
            cancellationToken: cancellationToken);
    };
});

var app = builder.Build();

await EnsureRuntimeSchemaAsync(app);

if (azureHostingOptions.UseForwardedHeaders)
{
    app.UseForwardedHeaders();
}
app.UseMiddleware<JsonExceptionMiddleware>();
app.UseMiddleware<SecurityHeadersMiddleware>();
app.UseStatusCodePages(async context =>
{
    var response = context.HttpContext.Response;
    if (response.HasStarted || response.StatusCode < 400 || response.StatusCode == StatusCodes.Status204NoContent)
    {
        return;
    }

    var path = context.HttpContext.Request.Path.Value ?? string.Empty;
    if (!path.StartsWith("/api", StringComparison.OrdinalIgnoreCase))
    {
        return;
    }

    if (!string.IsNullOrWhiteSpace(response.ContentType))
    {
        return;
    }

    response.ContentType = "application/json";
    var message = response.StatusCode switch
    {
        StatusCodes.Status404NotFound => "Not found",
        StatusCodes.Status405MethodNotAllowed => "Method not allowed",
        StatusCodes.Status429TooManyRequests => "Too many requests. Please try again shortly.",
        _ => "Request failed"
    };
    await response.WriteAsJsonAsync(new ErrorResponse(message));
});

if (!app.Environment.IsDevelopment() && azureHostingOptions.UseHsts)
{
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseCors(FrontendCorsOptions.PolicyName);
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.MapControllers();

app.Run();

static async Task EnsureRuntimeSchemaAsync(WebApplication app)
{
    await using var scope = app.Services.CreateAsyncScope();
    var logger = scope.ServiceProvider
        .GetRequiredService<ILoggerFactory>()
        .CreateLogger("SchemaBootstrap");

    try
    {
        var dbContext = scope.ServiceProvider.GetRequiredService<BeaconDbContext>();
        await dbContext.Database.ExecuteSqlRawAsync("""
            ALTER TABLE public.users
            ADD COLUMN IF NOT EXISTS mfa_secret text;
            """);

        await dbContext.Database.ExecuteSqlRawAsync("""
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_schema = 'public'
                      AND table_name = 'donation_allocations'
                      AND column_name = 'allocation_id'
                      AND is_identity = 'NO'
                      AND column_default IS NULL
                ) THEN
                    CREATE SEQUENCE IF NOT EXISTS public.donation_allocations_allocation_id_seq;
                    PERFORM setval(
                        'public.donation_allocations_allocation_id_seq',
                        COALESCE((SELECT MAX(allocation_id) FROM public.donation_allocations), 0) + 1,
                        false);
                    ALTER TABLE public.donation_allocations
                        ALTER COLUMN allocation_id SET DEFAULT nextval('public.donation_allocations_allocation_id_seq');
                END IF;
            END $$;
            """);

        await dbContext.Database.ExecuteSqlRawAsync("""
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_schema = 'public'
                      AND table_name = 'in_kind_donation_items'
                      AND column_name = 'item_id'
                      AND is_identity = 'NO'
                      AND column_default IS NULL
                ) THEN
                    CREATE SEQUENCE IF NOT EXISTS public.in_kind_donation_items_item_id_seq;
                    PERFORM setval(
                        'public.in_kind_donation_items_item_id_seq',
                        COALESCE((SELECT MAX(item_id) FROM public.in_kind_donation_items), 0) + 1,
                        false);
                    ALTER TABLE public.in_kind_donation_items
                        ALTER COLUMN item_id SET DEFAULT nextval('public.in_kind_donation_items_item_id_seq');
                END IF;
            END $$;
            """);

        await dbContext.Database.ExecuteSqlRawAsync("""
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_schema = 'public'
                      AND table_name = 'safehouses'
                      AND column_name = 'safehouse_id'
                      AND is_identity = 'NO'
                      AND column_default IS NULL
                ) THEN
                    CREATE SEQUENCE IF NOT EXISTS public.safehouses_safehouse_id_seq;
                    PERFORM setval(
                        'public.safehouses_safehouse_id_seq',
                        COALESCE((SELECT MAX(safehouse_id) FROM public.safehouses), 0) + 1,
                        false);
                    ALTER TABLE public.safehouses
                        ALTER COLUMN safehouse_id SET DEFAULT nextval('public.safehouses_safehouse_id_seq');
                END IF;
            END $$;
            """);

        await dbContext.Database.ExecuteSqlRawAsync("""
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_schema = 'public'
                      AND table_name = 'partners'
                      AND column_name = 'partner_id'
                      AND is_identity = 'NO'
                      AND column_default IS NULL
                ) THEN
                    CREATE SEQUENCE IF NOT EXISTS public.partners_partner_id_seq;
                    PERFORM setval(
                        'public.partners_partner_id_seq',
                        COALESCE((SELECT MAX(partner_id) FROM public.partners), 0) + 1,
                        false);
                    ALTER TABLE public.partners
                        ALTER COLUMN partner_id SET DEFAULT nextval('public.partners_partner_id_seq');
                END IF;
            END $$;
            """);

        await dbContext.Database.ExecuteSqlRawAsync("""
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_schema = 'public'
                      AND table_name = 'partner_assignments'
                      AND column_name = 'assignment_id'
                      AND is_identity = 'NO'
                      AND column_default IS NULL
                ) THEN
                    CREATE SEQUENCE IF NOT EXISTS public.partner_assignments_assignment_id_seq;
                    PERFORM setval(
                        'public.partner_assignments_assignment_id_seq',
                        COALESCE((SELECT MAX(assignment_id) FROM public.partner_assignments), 0) + 1,
                        false);
                    ALTER TABLE public.partner_assignments
                        ALTER COLUMN assignment_id SET DEFAULT nextval('public.partner_assignments_assignment_id_seq');
                END IF;
            END $$;
            """);
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Failed to apply runtime schema bootstrap for auth columns.");
        throw;
    }
}

public partial class Program;
