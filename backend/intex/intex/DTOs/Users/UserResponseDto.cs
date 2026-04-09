namespace backend.intex.DTOs.Users;

public sealed record UserResponseDto(
    int Id,
    string Username,
    string Email,
    string FirstName,
    string LastName,
    string Role,
    bool IsActive,
    string? LastLogin,
    bool? MfaEnabled,
    long? SupporterId,
    IReadOnlyList<long> AssignedSafehouses
);
