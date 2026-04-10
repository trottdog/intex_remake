using backend.intex.DTOs.Common;
using backend.intex.DTOs.Users;
using backend.intex.Entities.Database;
using backend.intex.Infrastructure.Auth;
using backend.intex.Repositories.Abstractions;
using backend.intex.Services.Abstractions;
using Microsoft.EntityFrameworkCore;

namespace backend.intex.Services.Users;

public sealed class UserService(
    IUserRepository userRepository,
    IPasswordService passwordService) : IUserService
{
    public async Task<StandardPagedResponse<UserResponseDto>> ListUsersAsync(ListUsersQuery query, CancellationToken cancellationToken = default)
    {
        var page = query.Page <= 0 ? 1 : query.Page;
        var pageSize = ResolvePageSize(query.PageSize, query.Limit);
        var (users, total) = await userRepository.ListUsersAsync(page, pageSize, query.Role, cancellationToken);
        var assignmentsByUserId = await userRepository.GetAssignedSafehousesForUsersAsync(users.Select(user => user.Id).ToList(), cancellationToken);

        var dtos = new List<UserResponseDto>(users.Count);
        foreach (var user in users)
        {
            var assignedSafehouses = assignmentsByUserId.GetValueOrDefault(user.Id, []);
            dtos.Add(Map(user, assignedSafehouses));
        }

        var totalPages = total == 0 ? 0 : (int)Math.Ceiling(total / (double)pageSize);
        return new StandardPagedResponse<UserResponseDto>(
            dtos,
            total,
            new StandardPaginationMeta(page, pageSize, totalPages, page < totalPages, page > 1));
    }

    public async Task<UserResponseDto?> GetUserAsync(int userId, CancellationToken cancellationToken = default)
    {
        var user = await userRepository.GetUserWithAssignmentsAsync(userId, cancellationToken);
        if (user is null)
        {
            return null;
        }

        var assignedSafehouses = await userRepository.GetAssignedSafehousesAsync(userId, cancellationToken);
        return Map(user, assignedSafehouses);
    }

    public async Task<(UserResponseDto? User, string? ErrorMessage)> CreateUserAsync(CreateUserRequest request, CancellationToken cancellationToken = default)
    {
        if (!BeaconRoles.All.Contains(request.Role))
        {
            return (null, "Invalid role");
        }

        var username = request.Username.Trim();
        var email = request.Email.Trim();
        if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(email))
        {
            return (null, "Username and email are required");
        }

        var passwordError = PasswordRules.Validate(request.Password);
        if (passwordError is not null)
        {
            return (null, passwordError);
        }

        var assignedSafehouseIds = request.AssignedSafehouses?.Distinct().ToArray() ?? [];
        var duplicateExists = await userRepository.UsernameOrEmailExistsAsync(username, email, cancellationToken);
        var missingSafehouses = await userRepository.ListMissingSafehouseIdsAsync(assignedSafehouseIds, cancellationToken);

        if (duplicateExists)
        {
            return (null, "Username or email already exists");
        }

        if (missingSafehouses.Count > 0)
        {
            return (null, $"Unknown safehouse IDs: {string.Join(", ", missingSafehouses.OrderBy(id => id))}");
        }

        User createdUser;
        try
        {
            createdUser = await userRepository.CreateAsync(
                new User
                {
                    Username = username,
                    Email = email,
                    PasswordHash = passwordService.HashPassword(request.Password),
                    FirstName = request.FirstName,
                    LastName = request.LastName,
                    Role = request.Role,
                    IsActive = request.IsActive ?? true,
                    MfaEnabled = request.MfaEnabled ?? false,
                    MfaSecret = null,
                    ExternalAuthProvider = null,
                    ExternalAuthSubject = null,
                    SupporterId = request.SupporterId,
                    CreatedAt = DateTimeOffset.UtcNow,
                    UpdatedAt = DateTimeOffset.UtcNow
                },
                assignedSafehouseIds,
                cancellationToken);
        }
        catch (DbUpdateException)
        {
            return (null, "Failed to persist safehouse assignments for this user.");
        }

        return (Map(createdUser, assignedSafehouseIds), null);
    }

    public async Task<(UserResponseDto? User, string? ErrorMessage)> UpdateUserAsync(int userId, UpdateUserRequest request, CancellationToken cancellationToken = default)
    {
        if (request.Role is not null && !BeaconRoles.All.Contains(request.Role))
        {
            return (null, "Invalid role");
        }

        if (request.MfaEnabled is true)
        {
            var existingUser = await userRepository.FindByIdAsync(userId, cancellationToken);
            if (existingUser is null)
            {
                return (null, "Not found");
            }

            if (!MfaState.IsConfigured(existingUser))
            {
                return (null, "MFA must be enrolled by the user before it can be enabled.");
            }
        }

        var updated = await userRepository.UpdateAsync(
            userId,
            mutation =>
            {
                mutation.Username = request.Username;
                mutation.Email = request.Email;
                mutation.FirstName = request.FirstName;
                mutation.LastName = request.LastName;
                mutation.Role = request.Role;
                mutation.IsActive = request.IsActive;
                mutation.MfaEnabled = request.MfaEnabled;
                mutation.SupporterId = request.SupporterId;
            },
            request.AssignedSafehouses,
            cancellationToken);

        if (updated is null)
        {
            return (null, "Not found");
        }

        var assignedSafehouses = await userRepository.GetAssignedSafehousesAsync(userId, cancellationToken);
        return (Map(updated, assignedSafehouses), null);
    }

    public async Task<UserResponseDto?> SetUserActiveStateAsync(int userId, bool isActive, CancellationToken cancellationToken = default)
    {
        var updated = await userRepository.SetActiveStateAsync(userId, isActive, cancellationToken);
        if (updated is null)
        {
            return null;
        }

        var assignedSafehouses = await userRepository.GetAssignedSafehousesAsync(userId, cancellationToken);
        return Map(updated, assignedSafehouses);
    }

    public async Task<(bool Success, string? ErrorMessage)> DeleteUserAsync(int userId, int currentUserId, CancellationToken cancellationToken = default)
    {
        if (userId == currentUserId)
        {
            return (false, "Cannot delete your own account");
        }

        var deleted = await userRepository.DeleteAsync(userId, cancellationToken);
        return deleted ? (true, null) : (false, "Not found");
    }

    private static UserResponseDto Map(User user, IReadOnlyList<long> assignedSafehouses) =>
        new(
            user.Id,
            user.Username,
            user.Email,
            user.FirstName,
            user.LastName,
            user.Role,
            user.IsActive,
            user.LastLogin?.ToUniversalTime().ToString("O"),
            MfaState.IsConfigured(user),
            user.SupporterId,
            assignedSafehouses);

    private static int ResolvePageSize(int? pageSize, int? limit)
    {
        var resolved = pageSize ?? limit ?? 20;
        return Math.Clamp(resolved, 1, 100);
    }
}
