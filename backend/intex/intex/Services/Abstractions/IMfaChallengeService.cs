namespace backend.intex.Services.Abstractions;

public interface IMfaChallengeService
{
    string CreateChallenge(int userId);
    bool TryConsumeChallenge(string challengeToken, out int userId);
}