using backend.intex.DTOs.Auth;

namespace backend.intex.Services.Abstractions;

public interface IAuthService
{
    Task<LoginResponse?> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default);
    Task<LoginResponse?> LoginWithGoogleAsync(
        string subject,
        string? email,
        string? firstName,
        string? lastName,
        string? displayName,
        CancellationToken cancellationToken = default);
    Task<LoginResponse?> VerifyMfaAsync(MfaVerifyRequest request, CancellationToken cancellationToken = default);
    Task<MfaStatusResponse?> GetMfaStatusAsync(int userId, CancellationToken cancellationToken = default);
    Task<(MfaSetupResponse? Response, string? ErrorMessage, bool IsConflict)> BeginMfaSetupAsync(int userId, CancellationToken cancellationToken = default);
    Task<(MfaStatusResponse? Response, string? ErrorMessage, bool IsConflict)> EnableMfaAsync(int userId, MfaCodeRequest request, CancellationToken cancellationToken = default);
    Task<(MfaStatusResponse? Response, string? ErrorMessage)> DisableMfaAsync(int userId, MfaCodeRequest request, CancellationToken cancellationToken = default);
    Task<AuthUserDto?> GetCurrentUserAsync(int userId, CancellationToken cancellationToken = default);
    Task<(bool Success, string? ErrorMessage)> ChangePasswordAsync(int userId, ChangePasswordRequest request, CancellationToken cancellationToken = default);
    Task<(RegisterDonorResponse? Response, string? ErrorMessage, bool IsConflict)> RegisterDonorAsync(RegisterDonorRequest request, CancellationToken cancellationToken = default);
}
