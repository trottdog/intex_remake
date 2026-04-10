namespace backend.intex.Infrastructure.Auth;

public sealed class MfaOptions
{
    public const string SectionName = "Mfa";

    public int ChallengeTtlMinutes { get; init; } = 5;
    public int EnrollmentTtlMinutes { get; init; } = 10;
    public string Issuer { get; init; } = "Beacon Sanctuary PH";
    public int CodeLength { get; init; } = 6;
    public int TimeStepSeconds { get; init; } = 30;
    public int AllowedDriftWindows { get; init; } = 1;
}
