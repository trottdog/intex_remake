using backend.intex.Entities.Database;

namespace backend.intex.Repositories.Abstractions;

public interface IAuthRepository
{
    Task<User?> FindUserByUsernameAsync(string username, CancellationToken cancellationToken = default);
    Task<User?> FindUserByIdAsync(int userId, CancellationToken cancellationToken = default);
    Task<User?> FindUserByEmailAsync(string email, CancellationToken cancellationToken = default);
    Task<User?> FindUserByExternalLoginAsync(string provider, string subject, CancellationToken cancellationToken = default);
    Task<bool> UserExistsByUsernameOrEmailAsync(string username, string email, CancellationToken cancellationToken = default);
    Task<User> CreateDonorAccountAsync(Supporter supporter, User user, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<long>> GetAssignedSafehousesAsync(int userId, CancellationToken cancellationToken = default);
    Task LinkExternalLoginAsync(int userId, string provider, string subject, CancellationToken cancellationToken = default);
    Task UpdateLastLoginAsync(int userId, DateTimeOffset timestamp, CancellationToken cancellationToken = default);
    Task UpdatePasswordHashAsync(int userId, string passwordHash, CancellationToken cancellationToken = default);
    Task UpdateMfaAsync(int userId, bool isEnabled, string? secret, CancellationToken cancellationToken = default);
}
