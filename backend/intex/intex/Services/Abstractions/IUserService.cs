using backend.intex.DTOs.Common;
using backend.intex.DTOs.Users;

namespace backend.intex.Services.Abstractions;

public interface IUserService
{
    Task<StandardPagedResponse<UserResponseDto>> ListUsersAsync(ListUsersQuery query, CancellationToken cancellationToken = default);
    Task<UserResponseDto?> GetUserAsync(int userId, CancellationToken cancellationToken = default);
    Task<(UserResponseDto? User, string? ErrorMessage)> CreateUserAsync(CreateUserRequest request, CancellationToken cancellationToken = default);
    Task<(UserResponseDto? User, string? ErrorMessage)> UpdateUserAsync(int userId, UpdateUserRequest request, CancellationToken cancellationToken = default);
    Task<UserResponseDto?> SetUserActiveStateAsync(int userId, bool isActive, CancellationToken cancellationToken = default);
    Task<(bool Success, string? ErrorMessage)> DeleteUserAsync(int userId, int currentUserId, CancellationToken cancellationToken = default);
}
