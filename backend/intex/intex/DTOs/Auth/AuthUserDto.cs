namespace backend.intex.DTOs.Auth;

public sealed record AuthUserDto(
    int Id,
    string Username,
    string Email,
    string FirstName,
    string LastName,
    string Role,
    bool IsActive,
    bool MfaEnabled,
    string? LastLogin,
    long? SupporterId,
    IReadOnlyList<long> Safehouses
);
