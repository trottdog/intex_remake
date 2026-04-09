using System.Security.Claims;
using backend.intex.Infrastructure.Auth;
using backend.intex.Repositories.Abstractions;
using backend.intex.Services.Abstractions;

namespace backend.intex.Services.Auth;

public sealed class UserScopeService(IUserRepository userRepository) : IUserScopeService
{
    public async Task<IReadOnlyList<long>> GetAssignedSafehousesAsync(ClaimsPrincipal user, CancellationToken cancellationToken = default)
    {
        var role = user.GetRole();
        if (role is not (BeaconRoles.Staff or BeaconRoles.Admin))
        {
            return user.GetAssignedSafehouseIds();
        }

        var userId = user.GetUserId();
        if (!userId.HasValue)
        {
            return [];
        }

        return await userRepository.GetAssignedSafehousesAsync(userId.Value, cancellationToken);
    }
}
