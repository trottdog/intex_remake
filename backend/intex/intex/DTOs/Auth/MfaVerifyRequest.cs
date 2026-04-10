namespace backend.intex.DTOs.Auth;

public sealed record MfaVerifyRequest(
    string ChallengeToken,
    string Code
);