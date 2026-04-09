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

    public async Task<IReadOnlyList<long>> GetAssignedSafehousesAsync(int userId, CancellationToken cancellationToken = default) =>
        await dbContext.StaffSafehouseAssignments.AsNoTracking()
            .Where(assignment => assignment.UserId == userId.ToString())
            .Select(assignment => assignment.SafehouseId)
            .ToListAsync(cancellationToken);

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
}
