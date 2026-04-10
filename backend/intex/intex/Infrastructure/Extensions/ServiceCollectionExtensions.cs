using System.Text;
using backend.intex.Infrastructure.Auth;
using backend.intex.Infrastructure.Configuration;
using backend.intex.Infrastructure.Data;
using backend.intex.Infrastructure.Data.EntityFramework;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authentication.OAuth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Npgsql;
using System.Text.Json;
using backend.intex.Repositories.Abstractions;
using backend.intex.Repositories.EntityFramework;
using backend.intex.Services.Abstractions;
using backend.intex.Services.Auth;
using backend.intex.Services.Campaigns;
using backend.intex.Services.CaseManagement;
using backend.intex.Services.Donations;
using backend.intex.Services.Records;
using backend.intex.Services.Residents;
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
        services.Configure<MfaOptions>(configuration.GetSection(MfaOptions.SectionName));
        services.Configure<GoogleAuthOptions>(configuration.GetSection(GoogleAuthOptions.SectionName));
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
        var connectionString = ResolvePostgresConnectionString(configuration);

        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException("A PostgreSQL connection string must be configured.");
        }

        var connectionBuilder = new NpgsqlConnectionStringBuilder(connectionString)
        {
            MinPoolSize = 0,
            MaxPoolSize = 20,
            Timeout = 6,
            CommandTimeout = 8,
            KeepAlive = 15
        };

        if (IsSupabasePoolerConnection(connectionBuilder))
        {
            // Supabase pooler already multiplexes server sessions; disabling local pooling
            // avoids stale connector reads that can manifest as long command hangs.
            connectionBuilder.Pooling = false;
        }
        else
        {
            connectionBuilder.Pooling = true;
        }
        var normalizedConnectionString = connectionBuilder.ConnectionString;

        var dataSourceBuilder = new NpgsqlDataSourceBuilder(normalizedConnectionString);
        var dataSource = dataSourceBuilder.Build();

        services.AddSingleton(dataSource);
        services.AddSingleton<IPostgresConnectionFactory, PostgresConnectionFactory>();
        services.AddPooledDbContextFactory<BeaconDbContext>((sp, options) =>
        {
            var sharedDataSource = sp.GetRequiredService<NpgsqlDataSource>();
            options.UseNpgsql(sharedDataSource, npgsql =>
            {
                npgsql.UseQuerySplittingBehavior(QuerySplittingBehavior.SingleQuery);
                npgsql.CommandTimeout(15);
                npgsql.EnableRetryOnFailure(maxRetryCount: 2, maxRetryDelay: TimeSpan.FromSeconds(3), errorCodesToAdd: null);
            });
        });
        services.AddScoped(sp =>
            sp.GetRequiredService<IDbContextFactory<BeaconDbContext>>().CreateDbContext());
        services.AddScoped<IAuthRepository, AuthRepository>();
        services.AddScoped<ICampaignRepository, CampaignRepository>();
        services.AddScoped<ICaseManagementRepository, CaseManagementRepository>();
        services.AddScoped<IDonationRepository, DonationRepository>();
        services.AddScoped<IResidentRepository, ResidentRepository>();
        services.AddScoped<IResidentRecordRepository, ResidentRecordRepository>();
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

        var googleOptions = configuration.GetSection(GoogleAuthOptions.SectionName).Get<GoogleAuthOptions>() ?? new GoogleAuthOptions();
        var authenticationBuilder = services
            .AddAuthentication(options =>
            {
                options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
                options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
                options.DefaultSignInScheme = ExternalAuthSchemes.ExternalCookie;
            })
            .AddCookie(ExternalAuthSchemes.ExternalCookie, options =>
            {
                options.Cookie.Name = "__Host-beacon.external";
                options.Cookie.HttpOnly = true;
                options.Cookie.SameSite = SameSiteMode.Lax;
                options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
                options.ExpireTimeSpan = TimeSpan.FromMinutes(10);
                options.SlidingExpiration = false;
            })
            .AddJwtBearer(options =>
            {
                options.MapInboundClaims = false;
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

        if (googleOptions.IsConfigured)
        {
            authenticationBuilder.AddGoogle(ExternalAuthSchemes.Google, options =>
            {
                options.ClientId = googleOptions.ClientId;
                options.ClientSecret = googleOptions.ClientSecret;
                options.SignInScheme = ExternalAuthSchemes.ExternalCookie;
                options.CallbackPath = googleOptions.CallbackPath;
                options.SaveTokens = false;
                options.AccessType = "offline";
                options.Scope.Add("email");
                options.Scope.Add("profile");
                options.Events = new OAuthEvents
                {
                    OnRedirectToAuthorizationEndpoint = context =>
                    {
                        if (string.IsNullOrWhiteSpace(googleOptions.PublicOrigin))
                        {
                            context.Response.Redirect(context.RedirectUri);
                            return Task.CompletedTask;
                        }

                        var authorizationUri = new Uri(context.RedirectUri);
                        var callbackUri = new Uri(new Uri(googleOptions.PublicOrigin.TrimEnd('/') + "/"), googleOptions.CallbackPath.TrimStart('/'));
                        var query = QueryHelpers.ParseQuery(authorizationUri.Query)
                            .ToDictionary(
                                pair => pair.Key,
                                pair => pair.Value.ToString(),
                                StringComparer.OrdinalIgnoreCase);
                        query["redirect_uri"] = callbackUri.ToString();

                        var rewrittenUri = QueryHelpers.AddQueryString(
                            $"{authorizationUri.Scheme}://{authorizationUri.Authority}{authorizationUri.AbsolutePath}",
                            query!);
                        context.Response.Redirect(rewrittenUri);
                        return Task.CompletedTask;
                    },
                    OnRemoteFailure = context =>
                    {
                        context.HandleResponse();

                        var callbackBase = string.IsNullOrWhiteSpace(googleOptions.PublicOrigin)
                            ? "/auth/callback"
                            : $"{googleOptions.PublicOrigin.TrimEnd('/')}/auth/callback";
                        var message = string.IsNullOrWhiteSpace(context.Failure?.Message)
                            ? "Google sign-in could not be completed"
                            : "Google sign-in could not be completed";
                        context.Response.Redirect($"{callbackBase}#error={Uri.EscapeDataString(message)}");
                        return Task.CompletedTask;
                    }
                };
            });
        }

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
        services.AddMemoryCache();
        services.AddScoped<IPasswordService, BcryptPasswordService>();
        services.AddScoped<IJwtTokenService, JwtTokenService>();
        services.AddScoped<IJwtTokenReader, JwtTokenReader>();
        services.AddScoped<IMfaChallengeService, MfaChallengeService>();
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<ICaseManagementService, CaseManagementService>();
        services.AddScoped<IUserScopeService, UserScopeService>();
        services.AddScoped<ICampaignService, CampaignService>();
        services.AddScoped<IDonationService, DonationService>();
        services.AddScoped<IResidentService, ResidentService>();
        services.AddScoped<IResidentRecordService, ResidentRecordService>();
        services.AddScoped<ISafehouseService, SafehouseService>();
        services.AddScoped<ISupporterService, SupporterService>();
        services.AddScoped<IUserService, UserService>();

        return services;
    }

    private static string[] ResolveCorsOrigins(IConfiguration configuration)
    {
        var sectionOrigins = configuration.GetSection(FrontendCorsOptions.SectionName)
            .Get<FrontendCorsOptions>()?.AllowedOrigins ?? [];

        var envOrigins = new[]
        {
            configuration["CORS_ALLOWED_ORIGINS"],
            configuration["VERCEL_FRONTEND_ORIGIN"],
            configuration["FRONTEND_ORIGIN"]
        };

        var parsedEnvOrigins = envOrigins
            .Where(static value => !string.IsNullOrWhiteSpace(value))
            .SelectMany(value => value!.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries));

        return parsedEnvOrigins
            .Concat(sectionOrigins)
            .Where(static origin => !string.IsNullOrWhiteSpace(origin))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();
    }

    private static string? ResolvePostgresConnectionString(IConfiguration configuration)
    {
        var candidates = new[]
        {
            configuration.GetConnectionString("PostgreSql"),
            configuration.GetConnectionString("DefaultConnection"),
            configuration["ConnectionStrings:PostgreSql"],
            configuration["ConnectionStrings:DefaultConnection"],
            configuration["POSTGRESQLCONNSTR_PostgreSql"],
            configuration["POSTGRESQLCONNSTR_DefaultConnection"],
            configuration["CUSTOMCONNSTR_PostgreSql"],
            configuration["CUSTOMCONNSTR_DefaultConnection"],
            configuration["DATABASE_URL"]
        };

        return candidates.FirstOrDefault(candidate => !string.IsNullOrWhiteSpace(candidate));
    }

    private static bool IsSupabasePoolerConnection(NpgsqlConnectionStringBuilder connectionBuilder)
    {
        if (connectionBuilder.Port == 6543)
        {
            return true;
        }

        var host = connectionBuilder.Host;
        return !string.IsNullOrWhiteSpace(host)
            && host.Contains(".pooler.supabase.com", StringComparison.OrdinalIgnoreCase);
    }
}
