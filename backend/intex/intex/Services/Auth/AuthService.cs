using backend.intex.DTOs.Auth;
using backend.intex.Infrastructure.Auth;
using backend.intex.Repositories.Abstractions;
using backend.intex.Services.Abstractions;

namespace backend.intex.Services.Auth;

public sealed class AuthService(
    IAuthRepository authRepository,
    IPasswordService passwordService,
    IJwtTokenService jwtTokenService) : IAuthService
{
    public async Task<LoginResponse?> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default)
    {
        var user = await authRepository.FindUserByUsernameAsync(request.Username, cancellationToken);
        if (user is null || !user.IsActive)
        {
            return null;
        }

        var isValid = passwordService.Verify(request.Password, user.PasswordHash);
        if (!isValid)
        {
            return null;
        }

        var previousLastLogin = user.LastLogin?.ToUniversalTime().ToString("O");
        var safehouses = await authRepository.GetAssignedSafehousesAsync(user.Id, cancellationToken);
        await authRepository.UpdateLastLoginAsync(user.Id, DateTimeOffset.UtcNow, cancellationToken);

        var authUser = new AuthUserDto(
            user.Id,
            user.Username,
            user.Email,
            user.FirstName,
            user.LastName,
            user.Role,
            user.IsActive,
            user.MfaEnabled,
            previousLastLogin,
            user.SupporterId,
            safehouses);

        var token = jwtTokenService.CreateToken(authUser);
        return new LoginResponse(token, authUser);
    }

    public async Task<AuthUserDto?> GetCurrentUserAsync(int userId, CancellationToken cancellationToken = default)
    {
        var user = await authRepository.FindUserByIdAsync(userId, cancellationToken);
        if (user is null)
        {
            return null;
        }

        var safehouses = await authRepository.GetAssignedSafehousesAsync(userId, cancellationToken);
        return new AuthUserDto(
            user.Id,
            user.Username,
            user.Email,
            user.FirstName,
            user.LastName,
            user.Role,
            user.IsActive,
            user.MfaEnabled,
            user.LastLogin?.ToUniversalTime().ToString("O"),
            user.SupporterId,
            safehouses);
    }

    public async Task<(bool Success, string? ErrorMessage)> ChangePasswordAsync(int userId, ChangePasswordRequest request, CancellationToken cancellationToken = default)
    {
        var passwordError = PasswordRules.Validate(request.NewPassword);
        if (passwordError is not null)
        {
            return (false, passwordError);
        }

        var user = await authRepository.FindUserByIdAsync(userId, cancellationToken);
        if (user is null)
        {
            return (false, "User not found");
        }

        var currentPasswordMatches = passwordService.Verify(request.CurrentPassword, user.PasswordHash);
        if (!currentPasswordMatches)
        {
            return (false, "Current password is incorrect");
        }

        var passwordHash = passwordService.HashPassword(request.NewPassword);
        await authRepository.UpdatePasswordHashAsync(userId, passwordHash, cancellationToken);
        return (true, null);
    }
}
