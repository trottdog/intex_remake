using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Intex.Infrastructure.Api.Contracts;
using Intex.Infrastructure.Auth.Jwt;
using Intex.Infrastructure.Auth.Passwords;
using Intex.Persistence;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace Intex.Infrastructure.Auth;

public static class AuthenticationFoundationServiceCollectionExtensions
{
    public static IServiceCollection AddAuthenticationFoundation(
        this IServiceCollection services,
        IConfiguration configuration,
        IWebHostEnvironment environment)
    {
        services.Configure<JwtOptions>(options =>
        {
            var resolvedOptions = JwtOptions.FromConfiguration(configuration);
            options.Secret = resolvedOptions.Secret;
            options.ExpiryHours = resolvedOptions.ExpiryHours;
            options.Issuer = resolvedOptions.Issuer;
            options.Audience = resolvedOptions.Audience;
        });
        services.AddSingleton<JwtSecretProvider>();
        services.AddSingleton(TimeProvider.System);
        services.AddScoped<IJwtTokenService, JwtTokenService>();
        services.AddSingleton<IPasswordHasher, BcryptPasswordHasher>();
        services.AddSingleton<IPasswordValidationService, PasswordValidationService>();

        JwtSecurityTokenHandler.DefaultMapInboundClaims = false;

        services
            .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer();

        services
            .AddOptions<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme)
            .Configure<JwtSecretProvider, IWebHostEnvironment, IOptions<JwtOptions>>((options, secretProvider, hostEnvironment, configuredJwtOptions) =>
            {
                var jwtOptions = configuredJwtOptions.Value;

                options.RequireHttpsMetadata = hostEnvironment.IsProduction();
                options.SaveToken = false;
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretProvider.Secret)),
                    ValidateIssuer = true,
                    ValidIssuer = jwtOptions.Issuer,
                    ValidateAudience = true,
                    ValidAudience = jwtOptions.Audience,
                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.Zero,
                    NameClaimType = AuthClaimTypes.Username,
                    RoleClaimType = AuthClaimTypes.Role
                };

                options.Events = new JwtBearerEvents
                {
                    OnMessageReceived = context =>
                    {
                        var header = context.Request.Headers.Authorization.ToString();
                        if (!string.IsNullOrWhiteSpace(header) && !header.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
                        {
                            context.NoResult();
                        }

                        return Task.CompletedTask;
                    },
                    OnTokenValidated = async context =>
                    {
                        var userIdValue = context.Principal?.FindFirstValue(AuthClaimTypes.Id);
                        if (!int.TryParse(userIdValue, out var userId))
                        {
                            context.Fail("Invalid or expired token");
                            return;
                        }

                        var dbContext = context.HttpContext.RequestServices.GetRequiredService<BeaconDbContext>();
                        var dbUser = await dbContext.Users
                            .AsNoTracking()
                            .Where(x => x.Id == userId)
                            .Select(x => new { x.Id, x.IsActive })
                            .SingleOrDefaultAsync(context.HttpContext.RequestAborted);

                        if (dbUser is null || !dbUser.IsActive)
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

                            var message = context.AuthenticateFailure?.Message switch
                            {
                                "Account is disabled or not found" => "Account is disabled or not found",
                                _ when HasBearerHeader(context.Request) => "Invalid or expired token",
                                _ => "Authentication required"
                            };

                            await context.Response.WriteAsJsonAsync(new ErrorResponse(message));
                        }
                    },
                    OnForbidden = async context =>
                    {
                        if (!context.Response.HasStarted)
                        {
                            context.Response.Clear();
                            context.Response.StatusCode = StatusCodes.Status403Forbidden;
                            context.Response.ContentType = "application/json";
                            await context.Response.WriteAsJsonAsync(new ErrorResponse("Insufficient permissions"));
                        }
                    }
                };
            });

        services.AddAuthorization(options =>
        {
            options.AddPolicy(AuthPolicies.AnyAuthenticatedUser, policy => policy.RequireAuthenticatedUser());
            options.AddPolicy(AuthPolicies.DonorOnly, policy => policy.RequireAuthenticatedUser().RequireRole(AuthRoles.Donor));
            options.AddPolicy(AuthPolicies.DonorOrStaffOrAbove, policy => policy.RequireAuthenticatedUser().RequireRole(AuthRoles.Donor, AuthRoles.Staff, AuthRoles.Admin, AuthRoles.SuperAdmin));
            options.AddPolicy(AuthPolicies.StaffOrAbove, policy => policy.RequireAuthenticatedUser().RequireRole(AuthRoles.Staff, AuthRoles.Admin, AuthRoles.SuperAdmin));
            options.AddPolicy(AuthPolicies.AdminOrAbove, policy => policy.RequireAuthenticatedUser().RequireRole(AuthRoles.Admin, AuthRoles.SuperAdmin));
            options.AddPolicy(AuthPolicies.SuperAdminOnly, policy => policy.RequireAuthenticatedUser().RequireRole(AuthRoles.SuperAdmin));
        });

        return services;
    }

    private static bool HasBearerHeader(HttpRequest request)
    {
        var header = request.Headers.Authorization.ToString();
        return !string.IsNullOrWhiteSpace(header) && header.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase);
    }
}
