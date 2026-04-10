namespace backend.intex.Services.Abstractions;

public interface IMfaChallengeService
{
    string CreateChallenge(int userId);
    bool TryGetChallenge(string challengeToken, out int userId);
    void ConsumeChallenge(string challengeToken);
}
