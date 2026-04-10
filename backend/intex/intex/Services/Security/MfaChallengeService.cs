using backend.intex.Infrastructure.Auth;
using backend.intex.Services.Abstractions;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;

namespace backend.intex.Services.Security;

public sealed class MfaChallengeService(
    IMemoryCache cache,
    IOptions<MfaOptions> mfaOptions) : IMfaChallengeService
{
    public string CreateChallenge(int userId)
    {
        var challengeToken = Guid.NewGuid().ToString("N");
        var ttlMinutes = Math.Max(1, mfaOptions.Value.ChallengeTtlMinutes);
        var expiresAt = DateTimeOffset.UtcNow.AddMinutes(ttlMinutes);

        cache.Set(GetCacheKey(challengeToken), new ChallengeEntry(userId, expiresAt), expiresAt);
        return challengeToken;
    }

    public bool TryConsumeChallenge(string challengeToken, out int userId)
    {
        userId = 0;
        if (string.IsNullOrWhiteSpace(challengeToken))
        {
            return false;
        }

        var cacheKey = GetCacheKey(challengeToken);
        if (!cache.TryGetValue<ChallengeEntry>(cacheKey, out var entry) || entry is null)
        {
            return false;
        }

        cache.Remove(cacheKey);
        if (entry.ExpiresAt <= DateTimeOffset.UtcNow)
        {
            return false;
        }

        userId = entry.UserId;
        return true;
    }

    private static string GetCacheKey(string challengeToken) => $"mfa:challenge:{challengeToken}";

    private sealed record ChallengeEntry(int UserId, DateTimeOffset ExpiresAt);
}