using System.Security.Claims;
using Intex.Infrastructure.Auth.Contracts;

namespace Intex.Infrastructure.Auth.Principal;

public static class ClaimsPrincipalExtensions
{
    public static AuthenticatedUser? GetAuthenticatedUser(this ClaimsPrincipal principal)
    {
        if (principal.Identity?.IsAuthenticated != true)
        {
            return null;
        }

        if (!int.TryParse(principal.FindFirstValue(AuthClaimTypes.Id), out var id))
        {
            return null;
        }

        var username = principal.FindFirstValue(AuthClaimTypes.Username);
        var email = principal.FindFirstValue(AuthClaimTypes.Email);
        var firstName = principal.FindFirstValue(AuthClaimTypes.FirstName);
        var lastName = principal.FindFirstValue(AuthClaimTypes.LastName);
        var role = principal.FindFirstValue(AuthClaimTypes.Role);

        if (string.IsNullOrWhiteSpace(username)
            || string.IsNullOrWhiteSpace(email)
            || string.IsNullOrWhiteSpace(firstName)
            || string.IsNullOrWhiteSpace(lastName)
            || string.IsNullOrWhiteSpace(role))
        {
            return null;
        }

        var isActive = bool.TryParse(principal.FindFirstValue(AuthClaimTypes.IsActive), out var active) && active;
        var mfaEnabled = bool.TryParse(principal.FindFirstValue(AuthClaimTypes.MfaEnabled), out var mfa) && mfa;
        var lastLogin = principal.FindFirstValue(AuthClaimTypes.LastLogin);
        var supporterIdRaw = principal.FindFirstValue(AuthClaimTypes.SupporterId);
        int? supporterId = int.TryParse(supporterIdRaw, out var parsedSupporterId) ? parsedSupporterId : null;

        return new AuthenticatedUser(
            id,
            username,
            email,
            firstName,
            lastName,
            role,
            isActive,
            mfaEnabled,
            string.IsNullOrWhiteSpace(lastLogin) ? null : lastLogin,
            supporterId);
    }
}
