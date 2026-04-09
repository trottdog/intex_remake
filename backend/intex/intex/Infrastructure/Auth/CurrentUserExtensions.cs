using System.Security.Claims;
using System.Text.Json;

namespace backend.intex.Infrastructure.Auth;

public static class CurrentUserExtensions
{
    public static int? GetUserId(this ClaimsPrincipal principal)
    {
        var value = principal.FindFirstValue(ClaimNames.UserId)
                    ?? principal.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(value, out var parsed) ? parsed : null;
    }

    public static long? GetSupporterId(this ClaimsPrincipal principal)
    {
        var value = principal.FindFirstValue(ClaimNames.SupporterId);
        return long.TryParse(value, out var parsed) ? parsed : null;
    }

    public static string? GetRole(this ClaimsPrincipal principal) =>
        principal.FindFirstValue(ClaimNames.Role) ?? principal.FindFirstValue(ClaimTypes.Role);

    public static IReadOnlyList<long> GetAssignedSafehouseIds(this ClaimsPrincipal principal)
    {
        var value = principal.FindFirstValue(ClaimNames.Safehouses);
        if (string.IsNullOrWhiteSpace(value))
        {
            return [];
        }

        try
        {
            var safehouses = JsonSerializer.Deserialize<List<long>>(value);
            return safehouses ?? [];
        }
        catch
        {
            return [];
        }
    }
}
