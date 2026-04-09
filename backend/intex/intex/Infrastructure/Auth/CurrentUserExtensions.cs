using System.Security.Claims;

namespace backend.intex.Infrastructure.Auth;

public static class CurrentUserExtensions
{
    public static int? GetUserId(this ClaimsPrincipal principal)
    {
        var value = principal.FindFirstValue(ClaimNames.UserId)
                    ?? principal.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(value, out var parsed) ? parsed : null;
    }
}
