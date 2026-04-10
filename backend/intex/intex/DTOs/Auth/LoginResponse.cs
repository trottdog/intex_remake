namespace backend.intex.DTOs.Auth;

public sealed record LoginResponse(
    string? Token,
    AuthUserDto? User,
    bool MfaRequired,
    string? ChallengeToken
)
{
    public static LoginResponse Completed(string token, AuthUserDto user) =>
        new(token, user, false, null);

    public static LoginResponse MfaChallenge(string challengeToken) =>
        new(null, null, true, challengeToken);
}
