using System.Security.Cryptography;
using Microsoft.Extensions.Options;

namespace backend.intex.Infrastructure.Auth;

public static class JwtSecretResolver
{
    public static string Resolve(IConfiguration configuration, IWebHostEnvironment environment, ILogger logger)
    {
        var configuredSecret = ResolveConfiguredSecret(configuration);

        if (!string.IsNullOrWhiteSpace(configuredSecret))
        {
            return configuredSecret;
        }

        if (environment.IsProduction())
        {
            throw new InvalidOperationException("JWT secret must be configured in production.");
        }

        Span<byte> bytes = stackalloc byte[48];
        RandomNumberGenerator.Fill(bytes);
        var ephemeralSecret = Convert.ToHexString(bytes);
        logger.LogWarning("JWT secret not configured. Using an ephemeral development secret; tokens will be invalidated on restart.");
        return ephemeralSecret;
    }

    private static string? ResolveConfiguredSecret(IConfiguration configuration)
    {
        var candidates = new[]
        {
            configuration.GetSection(JwtOptions.SectionName).Get<JwtOptions>()?.Secret,
            configuration["Jwt:Secret"],
            configuration["JWT_SECRET"],
            configuration["JWT_Secret"],
            Environment.GetEnvironmentVariable("JWT_SECRET"),
            Environment.GetEnvironmentVariable("JWT_Secret"),
            Environment.GetEnvironmentVariable("Jwt__Secret")
        };

        return candidates.FirstOrDefault(candidate => !string.IsNullOrWhiteSpace(candidate));
    }
}
