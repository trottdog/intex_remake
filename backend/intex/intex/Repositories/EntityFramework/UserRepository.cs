using backend.intex.Entities.Database;
using backend.intex.Infrastructure.Data.EntityFramework;
using backend.intex.Repositories.Abstractions;
using Microsoft.EntityFrameworkCore;

namespace backend.intex.Repositories.EntityFramework;

public sealed class UserRepository(BeaconDbContext dbContext) : IUserRepository
{
    public async Task<(IReadOnlyList<User> Users, int Total)> ListUsersAsync(int page, int pageSize, string? role, CancellationToken cancellationToken = default)
    {
        var query = dbContext.Users.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(role))
        {
            query = query.Where(user => user.Role == role);
        }

        var total = await query.CountAsync(cancellationToken);
        var users = await query
            .OrderBy(user => user.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return (users, total);
    }

    public Task<User?> FindByIdAsync(int userId, CancellationToken cancellationToken = default) =>
        dbContext.Users.AsNoTracking().FirstOrDefaultAsync(user => user.Id == userId, cancellationToken);

    public Task<User?> GetUserWithAssignmentsAsync(int userId, CancellationToken cancellationToken = default) =>
        dbContext.Users.AsNoTracking().FirstOrDefaultAsync(user => user.Id == userId, cancellationToken);

    public async Task<User> CreateAsync(User user, IReadOnlyList<long> assignedSafehouses, CancellationToken cancellationToken = default)
    {
        dbContext.Users.Add(user);
        await dbContext.SaveChangesAsync(cancellationToken);

        if (assignedSafehouses.Count > 0)
        {
            dbContext.StaffSafehouseAssignments.AddRange(assignedSafehouses.Select(safehouseId =>
                new StaffSafehouseAssignment
                {
                    UserId = user.Id.ToString(),
                    SafehouseId = safehouseId
                }));
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        return user;
    }

    public async Task<User?> UpdateAsync(int userId, Action<UserMutation> mutate, IReadOnlyList<long>? assignedSafehouses, CancellationToken cancellationToken = default)
    {
        var user = await dbContext.Users.FirstOrDefaultAsync(entity => entity.Id == userId, cancellationToken);
        if (user is null)
        {
            return null;
        }

        var mutation = new UserMutation();
        mutate(mutation);

        user = new User
        {
            Id = user.Id,
            Username = mutation.Username ?? user.Username,
            Email = mutation.Email ?? user.Email,
            PasswordHash = user.PasswordHash,
            FirstName = mutation.FirstName ?? user.FirstName,
            LastName = mutation.LastName ?? user.LastName,
            Role = mutation.Role ?? user.Role,
            IsActive = mutation.IsActive ?? user.IsActive,
            MfaEnabled = mutation.MfaEnabled ?? user.MfaEnabled,
            LastLogin = user.LastLogin,
            SupporterId = mutation.SupporterId ?? user.SupporterId,
            CreatedAt = user.CreatedAt,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        dbContext.Entry(await dbContext.Users.FirstAsync(entity => entity.Id == userId, cancellationToken)).CurrentValues.SetValues(user);

        if (assignedSafehouses is not null)
        {
            var existingAssignments = await dbContext.StaffSafehouseAssignments
                .Where(assignment => assignment.UserId == userId.ToString())
                .ToListAsync(cancellationToken);

            dbContext.StaffSafehouseAssignments.RemoveRange(existingAssignments);

            if (assignedSafehouses.Count > 0)
            {
                dbContext.StaffSafehouseAssignments.AddRange(assignedSafehouses.Select(safehouseId =>
                    new StaffSafehouseAssignment
                    {
                        UserId = userId.ToString(),
                        SafehouseId = safehouseId
                    }));
            }
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        return user;
    }

    public async Task<User?> SetActiveStateAsync(int userId, bool isActive, CancellationToken cancellationToken = default)
    {
        var user = await dbContext.Users.FirstOrDefaultAsync(entity => entity.Id == userId, cancellationToken);
        if (user is null)
        {
            return null;
        }

        var updated = new User
        {
            Id = user.Id,
            Username = user.Username,
            Email = user.Email,
            PasswordHash = user.PasswordHash,
            FirstName = user.FirstName,
            LastName = user.LastName,
            Role = user.Role,
            IsActive = isActive,
            MfaEnabled = user.MfaEnabled,
            LastLogin = user.LastLogin,
            SupporterId = user.SupporterId,
            CreatedAt = user.CreatedAt,
            UpdatedAt = DateTimeOffset.UtcNow
        };

        dbContext.Entry(user).CurrentValues.SetValues(updated);
        await dbContext.SaveChangesAsync(cancellationToken);
        return updated;
    }

    public async Task<bool> DeleteAsync(int userId, CancellationToken cancellationToken = default)
    {
        var user = await dbContext.Users.FirstOrDefaultAsync(entity => entity.Id == userId, cancellationToken);
        if (user is null)
        {
            return false;
        }

        var assignments = await dbContext.StaffSafehouseAssignments
            .Where(assignment => assignment.UserId == userId.ToString())
            .ToListAsync(cancellationToken);
        if (assignments.Count > 0)
        {
            dbContext.StaffSafehouseAssignments.RemoveRange(assignments);
        }

        dbContext.Users.Remove(user);
        await dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<IReadOnlyList<long>> GetAssignedSafehousesAsync(int userId, CancellationToken cancellationToken = default) =>
        await dbContext.StaffSafehouseAssignments.AsNoTracking()
            .Where(assignment => assignment.UserId == userId.ToString())
            .Select(assignment => assignment.SafehouseId)
            .ToListAsync(cancellationToken);
}
