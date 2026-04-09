using Intex.Infrastructure.Api;
using Intex.Infrastructure.Api.Middleware;
using Intex.Infrastructure.AdminStaff;
using Intex.Infrastructure.Auth;
using Intex.Infrastructure.CaseManagement;
using Intex.Infrastructure.Donor;
using Intex.Infrastructure.ExtendedAdmin;
using Intex.Infrastructure.Public;
using Intex.Infrastructure.SuperAdmin;
using Intex.Persistence;
using Npgsql;
using Microsoft.AspNetCore.HttpLogging;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Primitives;

var builder = WebApplication.CreateBuilder(args);
const string FrontendCorsPolicy = "FrontendCors";

// Add services to the container.
builder.Services.AddApiContractInfrastructure();
builder.Services.AddAuthenticationFoundation(builder.Configuration, builder.Environment);
builder.Services.AddScoped<AuthApplicationService>();
builder.Services.AddScoped<AdminStaffReadService>();
builder.Services.AddScoped<AdminStaffMutationService>();
builder.Services.AddScoped<CaseManagementService>();
builder.Services.AddScoped<DonorPortalService>();
builder.Services.AddScoped<ExtendedAdminService>();
builder.Services.AddScoped<PublicReadService>();
builder.Services.AddScoped<SuperAdminService>();
builder.Services.AddMemoryCache();
builder.Services.AddHttpLogging(options =>
{
    options.LoggingFields = HttpLoggingFields.RequestMethod
        | HttpLoggingFields.RequestPath
        | HttpLoggingFields.RequestQuery
        | HttpLoggingFields.ResponseStatusCode
        | HttpLoggingFields.Duration;
    options.RequestHeaders.Add("X-Forwarded-For");
    options.RequestHeaders.Add("X-Forwarded-Proto");
    options.RequestHeaders.Add("X-Request-Id");
    options.ResponseHeaders.Add("X-Request-Id");
    options.CombineLogs = true;
});
builder.Services.AddDbContext<BeaconDbContext>(options =>
{
    var connectionString = BuildNpgsqlConnectionString(builder.Configuration)
        ?? throw new InvalidOperationException("Connection string 'BeaconDb' is not configured.");

    options.UseNpgsql(connectionString, npgsqlOptions =>
    {
        npgsqlOptions.EnableRetryOnFailure(3, TimeSpan.FromSeconds(5), null);
        npgsqlOptions.CommandTimeout(120);
    });
});
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownIPNetworks.Clear();
    options.KnownProxies.Clear();
});
builder.Services.AddCors(options =>
{
    options.AddPolicy(FrontendCorsPolicy, policy =>
    {
        var configuredOrigins = ResolveAllowedOrigins(builder.Configuration, builder.Environment);

        if (configuredOrigins.Count > 0)
        {
            policy
                .WithOrigins(configuredOrigins.ToArray())
                .WithHeaders("Content-Type", "Authorization")
                .WithMethods("GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS");
        }
    });
});
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

var app = builder.Build();

// Configure the HTTP request pipeline.
app.UseForwardedHeaders();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}
else
{
    app.UseHsts();
}

app.UseApiExceptionHandling();
app.UseHttpsRedirection();
app.Use(async (context, next) =>
{
    context.Response.Headers["X-Content-Type-Options"] = "nosniff";
    context.Response.Headers["Referrer-Policy"] = "strict-origin-when-cross-origin";

    if (!context.Request.Headers.TryGetValue("X-Request-Id", out StringValues requestId)
        || StringValues.IsNullOrEmpty(requestId))
    {
        context.Response.Headers["X-Request-Id"] = context.TraceIdentifier;
    }
    else
    {
        context.Response.Headers["X-Request-Id"] = requestId.ToString();
    }

    await next();
});
app.UseCors(FrontendCorsPolicy);
app.UseHttpLogging();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();

static List<string> ResolveAllowedOrigins(IConfiguration configuration, IWebHostEnvironment environment)
{
    var configuredOrigins = configuration
        .GetSection("Cors:AllowedOrigins")
        .Get<string[]>()
        ?.Where(static origin => !string.IsNullOrWhiteSpace(origin))
        .Select(static origin => origin.Trim())
        .ToList()
        ?? [];

    var rawOrigins = configuration["CORS_ALLOWED_ORIGINS"];
    if (string.IsNullOrWhiteSpace(rawOrigins))
    {
        return configuredOrigins
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    configuredOrigins.AddRange(
        rawOrigins
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Where(static origin => !string.IsNullOrWhiteSpace(origin)));

    if (configuredOrigins.Count == 0 && environment.IsDevelopment())
    {
        configuredOrigins.AddRange(
        [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:4173",
            "http://127.0.0.1:4173",
            "http://localhost:3000",
            "http://127.0.0.1:3000"
        ]);
    }

    return configuredOrigins
        .Distinct(StringComparer.OrdinalIgnoreCase)
        .ToList();
}

static string? BuildNpgsqlConnectionString(IConfiguration configuration)
{
    var rawConnectionString = configuration.GetConnectionString("BeaconDb")
        ?? configuration.GetConnectionString("DefaultConnection")
        ?? configuration["BEACON_DB_CONNECTION"]
        ?? configuration["DATABASE_URL"]
        ?? configuration["SUPABASE_DB_CONNECTION"];

    if (string.IsNullOrWhiteSpace(rawConnectionString))
    {
        return null;
    }

    var builder = TryCreateConnectionStringBuilder(rawConnectionString);
    if (builder is null)
    {
        return rawConnectionString;
    }

    builder.SslMode = SslMode.Require;

    if (builder.Timeout <= 0)
    {
        builder.Timeout = 15;
    }

    if (builder.CommandTimeout <= 0)
    {
        builder.CommandTimeout = 120;
    }

    if (builder.KeepAlive <= 0)
    {
        builder.KeepAlive = 30;
    }

    if (builder.ConnectionIdleLifetime <= 0)
    {
        builder.ConnectionIdleLifetime = 60;
    }

    if (builder.ConnectionPruningInterval <= 0)
    {
        builder.ConnectionPruningInterval = 10;
    }

    if (builder.MaxPoolSize <= 0)
    {
        builder.MaxPoolSize = 20;
    }

    return builder.ConnectionString;
}

static NpgsqlConnectionStringBuilder? TryCreateConnectionStringBuilder(string rawConnectionString)
{
    if (rawConnectionString.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase)
        || rawConnectionString.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase))
    {
        var uri = new Uri(rawConnectionString);
        var userInfoParts = uri.UserInfo.Split(':', 2);

        return new NpgsqlConnectionStringBuilder
        {
            Host = uri.Host,
            Port = uri.Port > 0 ? uri.Port : 5432,
            Database = uri.AbsolutePath.Trim('/'),
            Username = userInfoParts.ElementAtOrDefault(0),
            Password = userInfoParts.Length > 1 ? Uri.UnescapeDataString(userInfoParts[1]) : null
        };
    }

    try
    {
        return new NpgsqlConnectionStringBuilder(rawConnectionString);
    }
    catch (ArgumentException)
    {
        return null;
    }
}

public partial class Program;
