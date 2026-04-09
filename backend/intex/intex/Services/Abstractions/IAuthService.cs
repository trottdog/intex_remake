using backend.intex.DTOs.Auth;

namespace backend.intex.Services.Abstractions;

public interface IAuthService
{
    Task<LoginResponse?> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default);
    Task<AuthUserDto?> GetCurrentUserAsync(int userId, CancellationToken cancellationToken = default);
    Task<(bool Success, string? ErrorMessage)> ChangePasswordAsync(int userId, ChangePasswordRequest request, CancellationToken cancellationToken = default);
}
