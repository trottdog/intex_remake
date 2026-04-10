using backend.intex.Entities.Database;

namespace backend.intex.Repositories.Abstractions;

public interface IUserRepository
{
    Task<(IReadOnlyList<User> Users, int Total)> ListUsersAsync(int page, int pageSize, string? role, CancellationToken cancellationToken = default);
    Task<User?> FindByIdAsync(int userId, CancellationToken cancellationToken = default);
    Task<bool> UsernameOrEmailExistsAsync(string username, string email, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<long>> ListMissingSafehouseIdsAsync(IReadOnlyList<long> safehouseIds, CancellationToken cancellationToken = default);
    Task<User> CreateAsync(User user, IReadOnlyList<long> assignedSafehouses, CancellationToken cancellationToken = default);
    Task<User?> UpdateAsync(int userId, Action<UserMutation> mutate, IReadOnlyList<long>? assignedSafehouses, CancellationToken cancellationToken = default);
    Task<User?> SetActiveStateAsync(int userId, bool isActive, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(int userId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<long>> GetAssignedSafehousesAsync(int userId, CancellationToken cancellationToken = default);
    Task<IReadOnlyDictionary<int, IReadOnlyList<long>>> GetAssignedSafehousesForUsersAsync(IReadOnlyList<int> userIds, CancellationToken cancellationToken = default);
    Task<User?> GetUserWithAssignmentsAsync(int userId, CancellationToken cancellationToken = default);
}
