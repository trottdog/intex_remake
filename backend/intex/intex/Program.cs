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

        var generatedIdColumns = new (string TableName, string ColumnName, string SequenceName)[]
        {
            ("users", "id", "users_id_seq"),
            ("supporters", "supporter_id", "supporters_supporter_id_seq"),
            ("safehouses", "safehouse_id", "safehouses_safehouse_id_seq"),
            ("partners", "partner_id", "partners_partner_id_seq"),
            ("partner_assignments", "assignment_id", "partner_assignments_assignment_id_seq"),
            ("campaigns", "campaign_id", "campaigns_campaign_id_seq"),
            ("donations", "donation_id", "donations_donation_id_seq"),
            ("donation_allocations", "allocation_id", "donation_allocations_allocation_id_seq"),
            ("in_kind_donation_items", "item_id", "in_kind_donation_items_item_id_seq"),
            ("program_updates", "update_id", "program_updates_update_id_seq"),
            ("social_media_posts", "post_id", "social_media_posts_post_id_seq"),
            ("residents", "resident_id", "residents_resident_id_seq"),
            ("case_conferences", "conference_id", "case_conferences_conference_id_seq"),
            ("education_records", "education_record_id", "education_records_education_record_id_seq"),
            ("health_wellbeing_records", "health_record_id", "health_wellbeing_records_health_record_id_seq"),
            ("donor_viewed_items", "id", "donor_viewed_items_id_seq"),
            ("staff_safehouse_assignments", "id", "staff_safehouse_assignments_id_seq"),
            ("public_impact_snapshots", "snapshot_id", "public_impact_snapshots_snapshot_id_seq"),
            ("safehouse_monthly_metrics", "metric_id", "safehouse_monthly_metrics_metric_id_seq"),
            ("ml_pipeline_runs", "run_id", "ml_pipeline_runs_run_id_seq"),
            ("ml_prediction_snapshots", "prediction_id", "ml_prediction_snapshots_prediction_id_seq")
        };

        foreach (var (tableName, columnName, sequenceName) in generatedIdColumns)
        {
            await EnsurePrimaryKeyDefaultAsync(dbContext, tableName, columnName, sequenceName);
        }
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Failed to apply runtime schema bootstrap for auth columns.");
        throw;
    }
}

static async Task EnsurePrimaryKeyDefaultAsync(BeaconDbContext dbContext, string tableName, string columnName, string sequenceName)
{
    var sql = $"""
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = '{tableName}'
                  AND column_name = '{columnName}'
                  AND is_identity = 'NO'
                  AND column_default IS NULL
            ) THEN
                CREATE SEQUENCE IF NOT EXISTS public.{sequenceName};
                PERFORM setval(
                    'public.{sequenceName}',
                    COALESCE((SELECT MAX({columnName}) FROM public.{tableName}), 0) + 1,
                    false);
                ALTER TABLE public.{tableName}
                    ALTER COLUMN {columnName} SET DEFAULT nextval('public.{sequenceName}');
            END IF;
        END $$;
        """;

    await dbContext.Database.ExecuteSqlRawAsync(sql);
}

public partial class Program;
