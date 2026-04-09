using System.Security.Cryptography;
using Microsoft.Extensions.Options;

namespace backend.intex.Infrastructure.Auth;

public static class JwtSecretResolver
{
    public static string Resolve(IConfiguration configuration, IWebHostEnvironment environment, ILogger logger)
    {
        var configuredSecret = configuration.GetSection(JwtOptions.SectionName).Get<JwtOptions>()?.Secret
                               ?? configuration["JWT_SECRET"];

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
}
