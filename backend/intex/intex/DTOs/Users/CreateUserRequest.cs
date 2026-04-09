namespace backend.intex.DTOs.Users;

public sealed record CreateUserRequest(
    string Username,
    string Email,
    string Password,
    string FirstName,
    string LastName,
    string Role,
    bool? IsActive,
    bool? MfaEnabled,
    long? SupporterId,
    IReadOnlyList<long>? AssignedSafehouses
);
