namespace backend.intex.Entities.Database;

public sealed class User
{
    public int Id { get; init; }
    public string Username { get; init; } = string.Empty;
    public string Email { get; init; } = string.Empty;
    public string PasswordHash { get; init; } = string.Empty;
    public string FirstName { get; init; } = string.Empty;
    public string LastName { get; init; } = string.Empty;
    public string Role { get; init; } = string.Empty;
    public bool IsActive { get; init; }
    public bool MfaEnabled { get; init; }
    public string? MfaSecret { get; init; }
    public string? ExternalAuthProvider { get; init; }
    public string? ExternalAuthSubject { get; init; }
    public DateTimeOffset? LastLogin { get; init; }
    public long? SupporterId { get; init; }
    public DateTimeOffset CreatedAt { get; init; }
    public DateTimeOffset UpdatedAt { get; init; }
}
