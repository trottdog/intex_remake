namespace backend.intex.Repositories.Abstractions;

public sealed class UserMutation
{
    public string? Username { get; set; }
    public string? Email { get; set; }
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? Role { get; set; }
    public bool? IsActive { get; set; }
    public bool? MfaEnabled { get; set; }
    public long? SupporterId { get; set; }
}
