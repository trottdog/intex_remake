namespace Intex.Infrastructure.Auth.Jwt;

public sealed class JwtOptions
{
    public const string SectionName = "Jwt";

    public string? Secret { get; set; }
    public int ExpiryHours { get; set; } = 8;
    public string Issuer { get; set; } = "beacon-api";
    public string Audience { get; set; } = "beacon-frontend";

    public static JwtOptions FromConfiguration(IConfiguration configuration)
    {
        var options = new JwtOptions();
        configuration.GetSection(SectionName).Bind(options);

        options.Secret ??= configuration["JWT_SECRET"];
        options.Issuer = configuration["JWT_ISSUER"] ?? options.Issuer;
        options.Audience = configuration["JWT_AUDIENCE"] ?? options.Audience;

        if (int.TryParse(configuration["JWT_EXPIRY_HOURS"], out var expiryHours) && expiryHours > 0)
        {
            options.ExpiryHours = expiryHours;
        }

        return options;
    }
}
