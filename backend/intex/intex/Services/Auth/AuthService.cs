using backend.intex.DTOs.Auth;
using backend.intex.Entities.Database;
using backend.intex.Infrastructure.Auth;
using backend.intex.Repositories.Abstractions;
using backend.intex.Services.Abstractions;
using Microsoft.Extensions.Options;
using System.Security.Cryptography;
using System.Text;

namespace backend.intex.Services.Auth;

public sealed class AuthService(
    IAuthRepository authRepository,
    IPasswordService passwordService,
    IJwtTokenService jwtTokenService,
    IMfaChallengeService mfaChallengeService,
    IOptions<MfaOptions> mfaOptions) : IAuthService
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

        if (user.MfaEnabled)
        {
            var challengeToken = mfaChallengeService.CreateChallenge(user.Id);
            return LoginResponse.MfaChallenge(challengeToken);
        }

        return await BuildCompletedLoginResponseAsync(user, cancellationToken);
    }

    public async Task<LoginResponse?> VerifyMfaAsync(MfaVerifyRequest request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.ChallengeToken) || string.IsNullOrWhiteSpace(request.Code))
        {
            return null;
        }

        if (!mfaChallengeService.TryConsumeChallenge(request.ChallengeToken, out var userId))
        {
            return null;
        }

        if (!VerifyMfaCode(request.Code))
        {
            return null;
        }

        var user = await authRepository.FindUserByIdAsync(userId, cancellationToken);
        if (user is null || !user.IsActive)
        {
            return null;
        }

        return await BuildCompletedLoginResponseAsync(user, cancellationToken);
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

    public async Task<(RegisterDonorResponse? Response, string? ErrorMessage, bool IsConflict)> RegisterDonorAsync(RegisterDonorRequest request, CancellationToken cancellationToken = default)
    {
        var firstName = request.FirstName?.Trim();
        var lastName = request.LastName?.Trim();
        var email = request.Email?.Trim().ToLowerInvariant();
        var username = request.Username?.Trim().ToLowerInvariant();

        if (string.IsNullOrWhiteSpace(firstName)
            || string.IsNullOrWhiteSpace(lastName)
            || string.IsNullOrWhiteSpace(email)
            || string.IsNullOrWhiteSpace(username)
            || string.IsNullOrWhiteSpace(request.Password))
        {
            return (null, "firstName, lastName, email, username, and password are required", false);
        }

        var passwordError = PasswordRules.Validate(request.Password);
        if (passwordError is not null)
        {
            return (null, passwordError, false);
        }

        var duplicateExists = await authRepository.UserExistsByUsernameOrEmailAsync(username, email, cancellationToken);
        if (duplicateExists)
        {
            return (null, "Username or email already exists", true);
        }

        var now = DateTimeOffset.UtcNow;
        var supporter = new Supporter
        {
            SupporterType = "individual",
            DisplayName = $"{firstName} {lastName}",
            FirstName = firstName,
            LastName = lastName,
            Email = email,
            Status = "active",
            CreatedAt = now.ToString("O"),
            CanLogin = true,
            RecurringEnabled = false,
        };

        var user = new User
        {
            Username = username,
            Email = email,
            PasswordHash = passwordService.HashPassword(request.Password),
            FirstName = firstName,
            LastName = lastName,
            Role = BeaconRoles.Donor,
            IsActive = true,
            MfaEnabled = false,
            CreatedAt = now,
            UpdatedAt = now,
        };

        var created = await authRepository.CreateDonorAccountAsync(supporter, user, cancellationToken);
        return (new RegisterDonorResponse(created.Id, created.Username, created.Email, created.SupporterId), null, false);
    }

    private async Task<LoginResponse> BuildCompletedLoginResponseAsync(User user, CancellationToken cancellationToken)
    {
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
        return LoginResponse.Completed(token, authUser);
    }

    private bool VerifyMfaCode(string providedCode)
    {
        var expectedCode = mfaOptions.Value.VerificationCode;
        if (string.IsNullOrWhiteSpace(expectedCode))
        {
            return false;
        }

        var provided = Encoding.UTF8.GetBytes(providedCode.Trim());
        var expected = Encoding.UTF8.GetBytes(expectedCode.Trim());
        return provided.Length == expected.Length && CryptographicOperations.FixedTimeEquals(provided, expected);
    }
}
