using Intex.Infrastructure.Api.Errors;
using Intex.Infrastructure.Auth.Contracts;
using Intex.Infrastructure.Auth.Jwt;
using Intex.Infrastructure.Auth.Passwords;
using Intex.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Intex.Infrastructure.Auth;

public sealed class AuthApplicationService(
    BeaconDbContext dbContext,
    IJwtTokenService jwtTokenService,
    IPasswordHasher passwordHasher,
    IPasswordValidationService passwordValidationService,
    TimeProvider timeProvider)
{
    public async Task<LoginResponse> LoginAsync(string username, string password, CancellationToken cancellationToken)
    {
        var user = await dbContext.Users
            .SingleOrDefaultAsync(x => x.Username == username, cancellationToken);

        if (user is null || !user.IsActive)
        {
            throw new ApiException(StatusCodes.Status401Unauthorized, "Invalid credentials");
        }

        if (!passwordHasher.Verify(password, user.PasswordHash))
        {
            throw new ApiException(StatusCodes.Status401Unauthorized, "Invalid credentials");
        }

        var lastLogin = timeProvider.GetUtcNow();
        user.LastLogin = lastLogin;
        user.UpdatedAt = lastLogin;
        await dbContext.SaveChangesAsync(cancellationToken);

        var safehouses = await GetAssignedSafehouseIdsAsync(user.Id, cancellationToken);

        var authUserClaims = new AuthUserClaims(
            user.Id,
            user.Username,
            user.Email,
            user.FirstName,
            user.LastName,
            user.Role,
            user.IsActive,
            user.MfaEnabled,
            lastLogin.ToString("O"),
            user.SupporterId);

        var token = jwtTokenService.CreateToken(authUserClaims);

        return new LoginResponse(token, MapAuthUserResponse(authUserClaims, safehouses));
    }

    public async Task<MeResponse> GetMeAsync(AuthenticatedUser? authenticatedUser, CancellationToken cancellationToken)
    {
        if (authenticatedUser is null)
        {
            return new MeResponse(null);
        }

        var safehouses = await GetAssignedSafehouseIdsAsync(authenticatedUser.Id, cancellationToken);
        var response = new AuthUserResponse(
            authenticatedUser.Id,
            authenticatedUser.Username,
            authenticatedUser.Email,
            authenticatedUser.FirstName,
            authenticatedUser.LastName,
            authenticatedUser.Role,
            authenticatedUser.IsActive,
            authenticatedUser.MfaEnabled,
            authenticatedUser.LastLogin,
            authenticatedUser.SupporterId,
            safehouses);

        return new MeResponse(response);
    }

    public async Task ChangePasswordAsync(int userId, string currentPassword, string newPassword, CancellationToken cancellationToken)
    {
        var user = await dbContext.Users.SingleOrDefaultAsync(x => x.Id == userId, cancellationToken);
        if (user is null)
        {
            throw new ApiException(StatusCodes.Status404NotFound, "User not found");
        }

        if (!passwordHasher.Verify(currentPassword, user.PasswordHash))
        {
            throw new ApiException(StatusCodes.Status401Unauthorized, "Current password is incorrect");
        }

        var passwordValidation = passwordValidationService.ValidateAggregatedForChangePassword(newPassword);
        if (!passwordValidation.IsValid)
        {
            throw new ApiException(StatusCodes.Status400BadRequest, passwordValidation.ErrorMessage!);
        }

        user.PasswordHash = passwordHasher.Hash(newPassword);
        user.UpdatedAt = timeProvider.GetUtcNow();
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private async Task<IReadOnlyCollection<int>> GetAssignedSafehouseIdsAsync(int userId, CancellationToken cancellationToken)
    {
        return await dbContext.StaffSafehouseAssignments
            .AsNoTracking()
            .Where(x => x.UserId == userId)
            .OrderBy(x => x.SafehouseId)
            .Select(x => x.SafehouseId)
            .ToListAsync(cancellationToken);
    }

    private static AuthUserResponse MapAuthUserResponse(AuthUserClaims user, IReadOnlyCollection<int> safehouses)
    {
        return new AuthUserResponse(
            user.Id,
            user.Username,
            user.Email,
            user.FirstName,
            user.LastName,
            user.Role,
            user.IsActive,
            user.MfaEnabled,
            user.LastLogin,
            user.SupporterId,
            safehouses);
    }
}
