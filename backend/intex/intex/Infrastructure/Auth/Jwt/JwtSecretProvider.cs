using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Options;

namespace Intex.Infrastructure.Auth.Jwt;

public sealed class JwtSecretProvider
{
    public JwtSecretProvider(IOptions<JwtOptions> options, IWebHostEnvironment environment)
    {
        var configuredSecret = options.Value.Secret?.Trim();

        if (!string.IsNullOrWhiteSpace(configuredSecret))
        {
            ValidateSecretStrength(configuredSecret, environment);
            Secret = configuredSecret;
            return;
        }

        if (environment.IsProduction())
        {
            throw new InvalidOperationException("JWT secret is required in production.");
        }

        Span<byte> buffer = stackalloc byte[48];
        RandomNumberGenerator.Fill(buffer);
        Secret = Convert.ToBase64String(buffer);
    }

    public string Secret { get; }

    private static void ValidateSecretStrength(string secret, IWebHostEnvironment environment)
    {
        if (!environment.IsProduction())
        {
            return;
        }

        if (secret.Length < 32)
        {
            throw new InvalidOperationException("JWT secret must be at least 32 characters in production.");
        }
    }
}
