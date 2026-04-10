using backend.intex.DTOs.Auth;
using backend.intex.Entities.Database;
using backend.intex.Infrastructure.Auth;
using backend.intex.Repositories.Abstractions;
using backend.intex.Services.Abstractions;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using OtpNet;
using QRCoder;
using System.Security.Cryptography;
using System.Text.RegularExpressions;

namespace backend.intex.Services.Auth;

public sealed class AuthService(
    IAuthRepository authRepository,
    IPasswordService passwordService,
    IJwtTokenService jwtTokenService,
    IMfaChallengeService mfaChallengeService,
    IMemoryCache cache,
    IOptions<MfaOptions> mfaOptions) : IAuthService
{
    private const string GoogleProvider = "google";

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

        if (MfaState.IsConfigured(user))
        {
            var challengeToken = mfaChallengeService.CreateChallenge(user.Id);
            return LoginResponse.MfaChallenge(challengeToken);
        }

        return await BuildCompletedLoginResponseAsync(user, cancellationToken);
    }

    public async Task<LoginResponse?> LoginWithGoogleAsync(
        string subject,
        string? email,
        string? firstName,
        string? lastName,
        string? displayName,
        CancellationToken cancellationToken = default)
    {
        var normalizedSubject = subject?.Trim();
        var normalizedEmail = email?.Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(normalizedSubject) || string.IsNullOrWhiteSpace(normalizedEmail))
        {
            return null;
        }

        var user = await authRepository.FindUserByExternalLoginAsync(GoogleProvider, normalizedSubject, cancellationToken);
        if (user is null)
        {
            user = await authRepository.FindUserByEmailAsync(normalizedEmail, cancellationToken);

            if (user is not null)
            {
                if (!string.IsNullOrWhiteSpace(user.ExternalAuthProvider)
                    && !string.Equals(user.ExternalAuthProvider, GoogleProvider, StringComparison.OrdinalIgnoreCase))
                {
                    return null;
                }

                if (!string.IsNullOrWhiteSpace(user.ExternalAuthSubject)
                    && !string.Equals(user.ExternalAuthSubject, normalizedSubject, StringComparison.Ordinal))
                {
                    return null;
                }

                if (string.IsNullOrWhiteSpace(user.ExternalAuthSubject))
                {
                    await authRepository.LinkExternalLoginAsync(user.Id, GoogleProvider, normalizedSubject, cancellationToken);
                    user = await authRepository.FindUserByIdAsync(user.Id, cancellationToken);
                }
            }
        }

        if (user is null)
        {
            user = await CreateGoogleDonorAccountAsync(
                normalizedSubject,
                normalizedEmail,
                firstName,
                lastName,
                displayName,
                cancellationToken);
        }

        if (user is null || !user.IsActive)
        {
            return null;
        }

        if (MfaState.IsConfigured(user))
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

        if (!mfaChallengeService.TryGetChallenge(request.ChallengeToken, out var userId))
        {
            return null;
        }

        var user = await authRepository.FindUserByIdAsync(userId, cancellationToken);
        if (user is null || !user.IsActive || !MfaState.IsConfigured(user))
        {
            return null;
        }

        if (!VerifyTotpCode(user.MfaSecret!, request.Code))
        {
            return null;
        }

        mfaChallengeService.ConsumeChallenge(request.ChallengeToken);
        return await BuildCompletedLoginResponseAsync(user, cancellationToken);
    }

    public async Task<MfaStatusResponse?> GetMfaStatusAsync(int userId, CancellationToken cancellationToken = default)
    {
        var user = await authRepository.FindUserByIdAsync(userId, cancellationToken);
        if (user is null)
        {
            return null;
        }

        return new MfaStatusResponse(MfaState.IsConfigured(user), HasPendingEnrollment(userId));
    }

    public async Task<(MfaSetupResponse? Response, string? ErrorMessage, bool IsConflict)> BeginMfaSetupAsync(int userId, CancellationToken cancellationToken = default)
    {
        var user = await authRepository.FindUserByIdAsync(userId, cancellationToken);
        if (user is null)
        {
            return (null, "User not found", false);
        }

        if (MfaState.IsConfigured(user))
        {
            return (null, "MFA is already enabled for this account.", true);
        }

        var secret = Base32Encoding.ToString(RandomNumberGenerator.GetBytes(20));
        var ttlMinutes = Math.Max(1, mfaOptions.Value.EnrollmentTtlMinutes);
        var expiresAt = DateTimeOffset.UtcNow.AddMinutes(ttlMinutes);
        cache.Set(GetEnrollmentCacheKey(userId), new PendingEnrollment(secret, expiresAt), expiresAt);

        var otpAuthUri = BuildOtpAuthUri(secret, user);
        return (
            new MfaSetupResponse(
                FormatManualEntryKey(secret),
                otpAuthUri,
                BuildQrCodeSvg(otpAuthUri),
                (int)TimeSpan.FromMinutes(ttlMinutes).TotalSeconds),
            null,
            false);
    }

    public async Task<(MfaStatusResponse? Response, string? ErrorMessage, bool IsConflict)> EnableMfaAsync(int userId, MfaCodeRequest request, CancellationToken cancellationToken = default)
    {
        var user = await authRepository.FindUserByIdAsync(userId, cancellationToken);
        if (user is null)
        {
            return (null, "User not found", false);
        }

        if (MfaState.IsConfigured(user))
        {
            return (null, "MFA is already enabled for this account.", true);
        }

        if (!TryGetPendingEnrollment(userId, out var enrollment) || enrollment is null)
        {
            return (null, "MFA setup expired. Start setup again.", false);
        }

        if (!VerifyTotpCode(enrollment.Secret, request.Code))
        {
            return (null, "Invalid verification code.", false);
        }

        await authRepository.UpdateMfaAsync(userId, true, enrollment.Secret, cancellationToken);
        ClearPendingEnrollment(userId);
        return (new MfaStatusResponse(true, false), null, false);
    }

    public async Task<(MfaStatusResponse? Response, string? ErrorMessage)> DisableMfaAsync(int userId, MfaCodeRequest request, CancellationToken cancellationToken = default)
    {
        var user = await authRepository.FindUserByIdAsync(userId, cancellationToken);
        if (user is null)
        {
            return (null, "User not found");
        }

        if (!MfaState.IsConfigured(user))
        {
            ClearPendingEnrollment(userId);
            return (new MfaStatusResponse(false, false), null);
        }

        if (!VerifyTotpCode(user.MfaSecret!, request.Code))
        {
            return (null, "Invalid verification code.");
        }

        await authRepository.UpdateMfaAsync(userId, false, null, cancellationToken);
        ClearPendingEnrollment(userId);
        return (new MfaStatusResponse(false, false), null);
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
            MfaState.IsConfigured(user),
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
            SupporterType = "MonetaryDonor",
            DisplayName = $"{firstName} {lastName}",
            FirstName = firstName,
            LastName = lastName,
            Email = email,
            Status = "Active",
            CreatedAt = now.ToString("O"),
            AcquisitionChannel = "Website",
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
            MfaSecret = null,
            ExternalAuthProvider = null,
            ExternalAuthSubject = null,
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
            MfaState.IsConfigured(user),
            previousLastLogin,
            user.SupporterId,
            safehouses);

        var token = jwtTokenService.CreateToken(authUser);
        return LoginResponse.Completed(token, authUser);
    }

    private bool VerifyTotpCode(string secret, string providedCode)
    {
        if (string.IsNullOrWhiteSpace(secret) || string.IsNullOrWhiteSpace(providedCode))
        {
            return false;
        }

        var normalizedCode = providedCode.Trim();
        if (normalizedCode.Length != Math.Max(6, mfaOptions.Value.CodeLength)
            || normalizedCode.Any(static ch => !char.IsDigit(ch)))
        {
            return false;
        }

        byte[] secretBytes;
        try
        {
            secretBytes = Base32Encoding.ToBytes(secret);
        }
        catch
        {
            return false;
        }

        var totp = new Totp(
            secretBytes,
            step: Math.Max(15, mfaOptions.Value.TimeStepSeconds),
            totpSize: Math.Max(6, mfaOptions.Value.CodeLength));

        var driftWindow = Math.Max(0, mfaOptions.Value.AllowedDriftWindows);
        return totp.VerifyTotp(normalizedCode, out _, new VerificationWindow(previous: driftWindow, future: driftWindow));
    }

    private bool HasPendingEnrollment(int userId) => TryGetPendingEnrollment(userId, out _);

    private bool TryGetPendingEnrollment(int userId, out PendingEnrollment? enrollment)
    {
        enrollment = null;
        if (!cache.TryGetValue<PendingEnrollment>(GetEnrollmentCacheKey(userId), out var entry) || entry is null)
        {
            return false;
        }

        if (entry.ExpiresAt <= DateTimeOffset.UtcNow)
        {
            cache.Remove(GetEnrollmentCacheKey(userId));
            return false;
        }

        enrollment = entry;
        return true;
    }

    private void ClearPendingEnrollment(int userId) => cache.Remove(GetEnrollmentCacheKey(userId));

    private string BuildOtpAuthUri(string secret, User user)
    {
        var issuer = string.IsNullOrWhiteSpace(mfaOptions.Value.Issuer) ? "Beacon Sanctuary PH" : mfaOptions.Value.Issuer.Trim();
        var accountName = !string.IsNullOrWhiteSpace(user.Email) ? user.Email : user.Username;
        return $"otpauth://totp/{Uri.EscapeDataString($"{issuer}:{accountName}")}?secret={Uri.EscapeDataString(secret)}&issuer={Uri.EscapeDataString(issuer)}&digits={Math.Max(6, mfaOptions.Value.CodeLength)}&period={Math.Max(15, mfaOptions.Value.TimeStepSeconds)}";
    }

    private static string BuildQrCodeSvg(string otpAuthUri)
    {
        using var qrGenerator = new QRCodeGenerator();
        using var qrData = qrGenerator.CreateQrCode(otpAuthUri, QRCodeGenerator.ECCLevel.Q);
        var qrCode = new SvgQRCode(qrData);
        return qrCode.GetGraphic(8);
    }

    private static string FormatManualEntryKey(string secret)
    {
        const int groupSize = 4;
        var chunks = Enumerable.Range(0, (secret.Length + groupSize - 1) / groupSize)
            .Select(index => secret.Substring(index * groupSize, Math.Min(groupSize, secret.Length - (index * groupSize))));
        return string.Join(" ", chunks);
    }

    private async Task<User> CreateGoogleDonorAccountAsync(
        string subject,
        string email,
        string? firstName,
        string? lastName,
        string? displayName,
        CancellationToken cancellationToken)
    {
        var resolvedFirstName = firstName?.Trim();
        var resolvedLastName = lastName?.Trim();

        if (string.IsNullOrWhiteSpace(resolvedFirstName) || string.IsNullOrWhiteSpace(resolvedLastName))
        {
            var parsedName = SplitDisplayName(displayName, email);
            resolvedFirstName ??= parsedName.FirstName;
            resolvedLastName ??= parsedName.LastName;
        }

        resolvedFirstName = string.IsNullOrWhiteSpace(resolvedFirstName) ? "Google" : resolvedFirstName;
        resolvedLastName = string.IsNullOrWhiteSpace(resolvedLastName) ? "User" : resolvedLastName;

        var usernameBase = Regex.Replace(email.Split('@')[0].ToLowerInvariant(), @"[^a-z0-9._-]", string.Empty);
        if (string.IsNullOrWhiteSpace(usernameBase))
        {
            usernameBase = $"googleuser{RandomNumberGenerator.GetInt32(1000, 9999)}";
        }

        var username = await GenerateUniqueUsernameAsync(usernameBase, cancellationToken);
        var now = DateTimeOffset.UtcNow;
        var supporter = new Supporter
        {
            SupporterType = "MonetaryDonor",
            DisplayName = string.IsNullOrWhiteSpace(displayName) ? $"{resolvedFirstName} {resolvedLastName}" : displayName.Trim(),
            FirstName = resolvedFirstName,
            LastName = resolvedLastName,
            Email = email,
            Status = "Active",
            CreatedAt = now.ToString("O"),
            AcquisitionChannel = "Website",
            CanLogin = true,
            RecurringEnabled = false,
        };

        var user = new User
        {
            Username = username,
            Email = email,
            PasswordHash = passwordService.HashPassword($"{Guid.NewGuid():N}!Aa1"),
            FirstName = resolvedFirstName,
            LastName = resolvedLastName,
            Role = BeaconRoles.Donor,
            IsActive = true,
            MfaEnabled = false,
            MfaSecret = null,
            ExternalAuthProvider = GoogleProvider,
            ExternalAuthSubject = subject,
            CreatedAt = now,
            UpdatedAt = now,
        };

        return await authRepository.CreateDonorAccountAsync(supporter, user, cancellationToken);
    }

    private async Task<string> GenerateUniqueUsernameAsync(string usernameBase, CancellationToken cancellationToken)
    {
        var candidate = usernameBase;
        var suffix = 1;
        while (await authRepository.FindUserByUsernameAsync(candidate, cancellationToken) is not null)
        {
            candidate = $"{usernameBase}{suffix}";
            suffix++;
        }

        return candidate;
    }

    private static (string FirstName, string LastName) SplitDisplayName(string? displayName, string email)
    {
        var fallback = email.Split('@')[0];
        if (string.IsNullOrWhiteSpace(displayName))
        {
            return (fallback, "User");
        }

        var parts = displayName.Split(' ', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length == 0)
        {
            return (fallback, "User");
        }

        if (parts.Length == 1)
        {
            return (parts[0], "User");
        }

        return (parts[0], string.Join(' ', parts.Skip(1)));
    }

    private static string GetEnrollmentCacheKey(int userId) => $"mfa:enrollment:{userId}";

    private sealed record PendingEnrollment(string Secret, DateTimeOffset ExpiresAt);
}
