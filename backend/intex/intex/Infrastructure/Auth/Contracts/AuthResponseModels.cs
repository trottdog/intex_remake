namespace Intex.Infrastructure.Auth.Contracts;

public sealed record AuthUserResponse(
    int Id,
    string Username,
    string Email,
    string FirstName,
    string LastName,
    string Role,
    bool IsActive,
    bool MfaEnabled,
    string? LastLogin,
    int? SupporterId,
    IReadOnlyCollection<int> Safehouses);

public sealed record LoginResponse(
    string Token,
    AuthUserResponse User);

public sealed record MeResponse(AuthUserResponse? User);
