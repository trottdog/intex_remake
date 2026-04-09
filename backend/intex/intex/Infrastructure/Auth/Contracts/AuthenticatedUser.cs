namespace Intex.Infrastructure.Auth.Contracts;

public sealed record AuthenticatedUser(
    int Id,
    string Username,
    string Email,
    string FirstName,
    string LastName,
    string Role,
    bool IsActive,
    bool MfaEnabled,
    string? LastLogin,
    int? SupporterId);
