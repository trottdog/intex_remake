namespace backend.intex.Infrastructure.Auth;

public sealed class MfaOptions
{
    public const string SectionName = "Mfa";

    public int ChallengeTtlMinutes { get; init; } = 5;

    public string VerificationCode { get; init; } = string.Empty;
}