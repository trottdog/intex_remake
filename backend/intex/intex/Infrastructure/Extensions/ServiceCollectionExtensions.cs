using System.Text;
using backend.intex.Infrastructure.Auth;
using backend.intex.Infrastructure.Configuration;
using backend.intex.Infrastructure.Data;
using backend.intex.Infrastructure.Data.EntityFramework;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Npgsql;
using System.Text.Json;
using backend.intex.Repositories.Abstractions;
using backend.intex.Repositories.EntityFramework;
using backend.intex.Services.Abstractions;
using backend.intex.Services.Auth;
using backend.intex.Services.Donations;
using backend.intex.Services.Safehouses;
using backend.intex.Services.Security;
using backend.intex.Services.Supporters;
using backend.intex.Services.Users;

namespace backend.intex.Infrastructure.Extensions;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddApplicationConfiguration(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<AzureHostingOptions>(configuration.GetSection(AzureHostingOptions.SectionName));
        services.AddOptions<FrontendCorsOptions>()
            .Bind(configuration.GetSection(FrontendCorsOptions.SectionName))
            .PostConfigure(options =>
            {
                var envOrigins = ResolveCorsOrigins(configuration);
                if (envOrigins.Length > 0)
                {
                    options.AllowedOrigins = envOrigins;
                }
            });
        services.Configure<JwtOptions>(configuration.GetSection(JwtOptions.SectionName));
        services.Configure<SupabaseOptions>(configuration.GetSection(SupabaseOptions.SectionName));
        return services;
    }

    public static IServiceCollection AddConfiguredCors(
        this IServiceCollection services,
        IConfiguration configuration,
        IWebHostEnvironment environment)
    {
        var allowedOrigins = ResolveCorsOrigins(configuration);

        services.AddCors(options =>
        {
            options.AddPolicy(FrontendCorsOptions.PolicyName, policy =>
            {
                if (allowedOrigins.Length > 0)
                {
                    policy.WithOrigins(allowedOrigins);
                }
                else if (environment.IsDevelopment())
                {
                    policy.SetIsOriginAllowed(static _ => true);
                }

                policy.WithHeaders("Content-Type", "Authorization")
                    .WithMethods("GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS");
            });
        });

        return services;
    }

    public static IServiceCollection AddDatabaseInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("PostgreSql")
                              ?? configuration["DATABASE_URL"]
                              ?? throw new InvalidOperationException("A PostgreSQL connection string must be configured.");

        var dataSourceBuilder = new NpgsqlDataSourceBuilder(connectionString);
        var dataSource = dataSourceBuilder.Build();

        services.AddSingleton(dataSource);
        services.AddSingleton<IPostgresConnectionFactory, PostgresConnectionFactory>();
        services.AddDbContext<BeaconDbContext>(options =>
            options.UseNpgsql(connectionString, npgsql =>
            {
                npgsql.UseQuerySplittingBehavior(QuerySplittingBehavior.SingleQuery);
            }));
        services.AddScoped<IAuthRepository, AuthRepository>();
        services.AddScoped<IDonationRepository, DonationRepository>();
        services.AddScoped<ISafehouseRepository, SafehouseRepository>();
        services.AddScoped<ISupporterRepository, SupporterRepository>();
        services.AddScoped<IUserRepository, UserRepository>();

        return services;
    }

    public static IServiceCollection AddJwtAuthentication(
        this IServiceCollection services,
        IConfiguration configuration,
        IWebHostEnvironment environment)
    {
        using var loggerFactory = LoggerFactory.Create(logging => logging.AddConsole());
        var logger = loggerFactory.CreateLogger("JwtStartup");
        var secret = JwtSecretResolver.Resolve(configuration, environment, logger);
        var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));

        services.AddSingleton(signingKey);

        services
            .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.RequireHttpsMetadata = !environment.IsDevelopment();
                options.Events = new JwtBearerEvents
                {
                    OnTokenValidated = async context =>
                    {
                        var userIdClaim = context.Principal?.FindFirst(ClaimNames.UserId)?.Value
                                          ;
                        if (!int.TryParse(userIdClaim, out var userId))
                        {
                            context.Fail("Invalid or expired token");
                            return;
                        }

                        var repository = context.HttpContext.RequestServices.GetRequiredService<IAuthRepository>();
                        var user = await repository.FindUserByIdAsync(userId, context.HttpContext.RequestAborted);
                        if (user is null || !user.IsActive)
                        {
                            context.Fail("Account is disabled or not found");
                        }
                    },
                    OnChallenge = async context =>
                    {
                        context.HandleResponse();
                        if (!context.Response.HasStarted)
                        {
                            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                            context.Response.ContentType = "application/json";

                            var message = context.AuthenticateFailure?.Message;
                            if (string.IsNullOrWhiteSpace(message))
                            {
                                message = string.IsNullOrWhiteSpace(context.Request.Headers.Authorization)
                                    ? "Authentication required"
                                    : "Invalid or expired token";
                            }

                            await context.Response.WriteAsJsonAsync(new { error = message });
                        }
                    },
                    OnForbidden = async context =>
                    {
                        if (!context.Response.HasStarted)
                        {
                            context.Response.StatusCode = StatusCodes.Status403Forbidden;
                            context.Response.ContentType = "application/json";
                            await context.Response.WriteAsJsonAsync(new { error = "Insufficient permissions" });
                        }
                    }
                };
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = false,
                    ValidateAudience = false,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = signingKey,
                    ClockSkew = TimeSpan.Zero,
                    RoleClaimType = "role",
                    NameClaimType = "username"
                };
            });

        return services;
    }

    public static IServiceCollection AddRoleBasedAuthorization(this IServiceCollection services)
    {
        services.AddAuthorizationBuilder()
            .SetDefaultPolicy(new AuthorizationPolicyBuilder()
                .RequireAuthenticatedUser()
                .Build())
            .AddPolicy(PolicyNames.DonorOnly, policy => policy.RequireRole(BeaconRoles.Donor))
            .AddPolicy(PolicyNames.StaffOrAbove, policy => policy.RequireRole(BeaconRoles.Staff, BeaconRoles.Admin, BeaconRoles.SuperAdmin))
            .AddPolicy(PolicyNames.AdminOrAbove, policy => policy.RequireRole(BeaconRoles.Admin, BeaconRoles.SuperAdmin))
            .AddPolicy(PolicyNames.SuperAdminOnly, policy => policy.RequireRole(BeaconRoles.SuperAdmin))
            .AddPolicy(PolicyNames.DonorOrStaffOrAbove, policy => policy.RequireRole(
                BeaconRoles.Donor,
                BeaconRoles.Staff,
                BeaconRoles.Admin,
                BeaconRoles.SuperAdmin));

        return services;
    }

    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        services.AddScoped<IPasswordService, BcryptPasswordService>();
        services.AddScoped<IJwtTokenService, JwtTokenService>();
        services.AddScoped<IJwtTokenReader, JwtTokenReader>();
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IDonationService, DonationService>();
        services.AddScoped<ISafehouseService, SafehouseService>();
        services.AddScoped<ISupporterService, SupporterService>();
        services.AddScoped<IUserService, UserService>();

        return services;
    }

    private static string[] ResolveCorsOrigins(IConfiguration configuration)
    {
        var sectionOrigins = configuration.GetSection(FrontendCorsOptions.SectionName)
            .Get<FrontendCorsOptions>()?.AllowedOrigins ?? [];

        var envOrigins = configuration["CORS_ALLOWED_ORIGINS"];
        if (string.IsNullOrWhiteSpace(envOrigins))
        {
            return sectionOrigins
                .Where(static origin => !string.IsNullOrWhiteSpace(origin))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToArray();
        }

        return envOrigins
            .Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries)
            .Concat(sectionOrigins)
            .Where(static origin => !string.IsNullOrWhiteSpace(origin))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();
    }
}
