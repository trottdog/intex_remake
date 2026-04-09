namespace backend.intex.Infrastructure.Auth;

public sealed class JwtOptions
{
    public const string SectionName = "Jwt";

    public string Secret { get; init; } = string.Empty;

    public int ExpiryHours { get; init; } = 8;
}
