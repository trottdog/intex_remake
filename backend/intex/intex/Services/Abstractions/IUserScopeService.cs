using System.Security.Claims;

namespace backend.intex.Services.Abstractions;

public interface IUserScopeService
{
    Task<IReadOnlyList<long>> GetAssignedSafehousesAsync(ClaimsPrincipal user, CancellationToken cancellationToken = default);
}
