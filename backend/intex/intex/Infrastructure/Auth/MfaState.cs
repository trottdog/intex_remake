using backend.intex.Entities.Database;

namespace backend.intex.Infrastructure.Auth;

public static class MfaState
{
    public static bool IsConfigured(User user) =>
        user.MfaEnabled && !string.IsNullOrWhiteSpace(user.MfaSecret);
}
