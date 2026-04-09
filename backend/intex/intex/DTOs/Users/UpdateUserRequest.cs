namespace backend.intex.DTOs.Users;

public sealed record UpdateUserRequest(
    string? Username,
    string? Email,
    string? FirstName,
    string? LastName,
    string? Role,
    bool? IsActive,
    bool? MfaEnabled,
    long? SupporterId,
    IReadOnlyList<long>? AssignedSafehouses
);
