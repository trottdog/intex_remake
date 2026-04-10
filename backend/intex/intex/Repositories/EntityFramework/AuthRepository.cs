using backend.intex.Entities.Database;
using backend.intex.Infrastructure.Data.EntityFramework;
using backend.intex.Repositories.Abstractions;
using Microsoft.EntityFrameworkCore;

namespace backend.intex.Repositories.EntityFramework;

public sealed class AuthRepository(BeaconDbContext dbContext) : IAuthRepository
{
    public Task<User?> FindUserByUsernameAsync(string username, CancellationToken cancellationToken = default) =>
        dbContext.Users.AsNoTracking().FirstOrDefaultAsync(user => user.Username == username, cancellationToken);

    public Task<User?> FindUserByIdAsync(int userId, CancellationToken cancellationToken = default) =>
        dbContext.Users.AsNoTracking().FirstOrDefaultAsync(user => user.Id == userId, cancellationToken);

    public Task<User?> FindUserByEmailAsync(string email, CancellationToken cancellationToken = default) =>
        dbContext.Users.AsNoTracking()
            .FirstOrDefaultAsync(user => user.Email.ToLower() == email.ToLower(), cancellationToken);

    public Task<User?> FindUserByExternalLoginAsync(string provider, string subject, CancellationToken cancellationToken = default) =>
        dbContext.Users.AsNoTracking()
            .FirstOrDefaultAsync(
                user => user.ExternalAuthProvider == provider && user.ExternalAuthSubject == subject,
                cancellationToken);

    public Task<bool> UserExistsByUsernameOrEmailAsync(string username, string email, CancellationToken cancellationToken = default) =>
        dbContext.Users.AsNoTracking().AnyAsync(user =>
            user.Username.ToLower() == username.ToLower() || user.Email.ToLower() == email.ToLower(), cancellationToken);

    public async Task<User> CreateDonorAccountAsync(Supporter supporter, User user, CancellationToken cancellationToken = default)
    {
        User? donorUser = null;
        var executionStrategy = dbContext.Database.CreateExecutionStrategy();

        await executionStrategy.ExecuteAsync(async () =>
        {
            await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);

            dbContext.Supporters.Add(supporter);
            await dbContext.SaveChangesAsync(cancellationToken);

            donorUser = new User
            {
                Username = user.Username,
                Email = user.Email,
                PasswordHash = user.PasswordHash,
                FirstName = user.FirstName,
                LastName = user.LastName,
                Role = user.Role,
                IsActive = user.IsActive,
                MfaEnabled = user.MfaEnabled,
                MfaSecret = user.MfaSecret,
                ExternalAuthProvider = user.ExternalAuthProvider,
                ExternalAuthSubject = user.ExternalAuthSubject,
                SupporterId = supporter.SupporterId,
                CreatedAt = user.CreatedAt,
                UpdatedAt = user.UpdatedAt,
            };

            dbContext.Users.Add(donorUser);
            await dbContext.SaveChangesAsync(cancellationToken);

            dbContext.Entry(supporter).Property(item => item.IdentityUserId).CurrentValue = donorUser.Id.ToString();
            await dbContext.SaveChangesAsync(cancellationToken);

            await transaction.CommitAsync(cancellationToken);
        });

        return donorUser ?? throw new InvalidOperationException("Failed to create donor account");
    }

    public async Task<IReadOnlyList<long>> GetAssignedSafehousesAsync(int userId, CancellationToken cancellationToken = default) =>
        await dbContext.StaffSafehouseAssignments.AsNoTracking()
            .Where(assignment => assignment.UserId == userId.ToString())
            .Select(assignment => assignment.SafehouseId)
            .ToListAsync(cancellationToken);

    public async Task LinkExternalLoginAsync(int userId, string provider, string subject, CancellationToken cancellationToken = default)
    {
        await dbContext.Users
            .Where(user => user.Id == userId)
            .ExecuteUpdateAsync(
                setters => setters
                    .SetProperty(user => user.ExternalAuthProvider, provider)
                    .SetProperty(user => user.ExternalAuthSubject, subject)
                    .SetProperty(user => user.UpdatedAt, DateTimeOffset.UtcNow),
                cancellationToken);
    }

    public async Task UpdateLastLoginAsync(int userId, DateTimeOffset timestamp, CancellationToken cancellationToken = default)
    {
        await dbContext.Users
            .Where(user => user.Id == userId)
            .ExecuteUpdateAsync(setters => setters.SetProperty(user => user.LastLogin, timestamp), cancellationToken);
    }

    public async Task UpdatePasswordHashAsync(int userId, string passwordHash, CancellationToken cancellationToken = default)
    {
        await dbContext.Users
            .Where(user => user.Id == userId)
            .ExecuteUpdateAsync(setters => setters.SetProperty(user => user.PasswordHash, passwordHash), cancellationToken);
    }

    public async Task UpdateMfaAsync(int userId, bool isEnabled, string? secret, CancellationToken cancellationToken = default)
    {
        await dbContext.Users
            .Where(user => user.Id == userId)
            .ExecuteUpdateAsync(
                setters => setters
                    .SetProperty(user => user.MfaEnabled, isEnabled)
                    .SetProperty(user => user.MfaSecret, secret)
                    .SetProperty(user => user.UpdatedAt, DateTimeOffset.UtcNow),
                cancellationToken);
    }
}
