using backend.intex.DTOs.Auth;

namespace backend.intex.Services.Abstractions;

public interface IAuthService
{
    Task<LoginResponse?> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default);
    Task<LoginResponse?> VerifyMfaAsync(MfaVerifyRequest request, CancellationToken cancellationToken = default);
    Task<AuthUserDto?> GetCurrentUserAsync(int userId, CancellationToken cancellationToken = default);
    Task<(bool Success, string? ErrorMessage)> ChangePasswordAsync(int userId, ChangePasswordRequest request, CancellationToken cancellationToken = default);
    Task<(RegisterDonorResponse? Response, string? ErrorMessage, bool IsConflict)> RegisterDonorAsync(RegisterDonorRequest request, CancellationToken cancellationToken = default);
}
