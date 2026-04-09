namespace backend.intex.DTOs.Supporters;

public sealed class CreateSupporterRequest
{
    public string? SupporterType { get; init; }
    public string? SupportType { get; init; }
    public string? DisplayName { get; init; }
    public string? OrganizationName { get; init; }
    public string? Organization { get; init; }
    public string? FirstName { get; init; }
    public string? LastName { get; init; }
    public string? RelationshipType { get; init; }
    public string? Region { get; init; }
    public string? Country { get; init; }
    public string? Email { get; init; }
    public string? Phone { get; init; }
    public string? Status { get; init; }
    public string? CreatedAt { get; init; }
    public DateOnly? FirstDonationDate { get; init; }
    public string? AcquisitionChannel { get; init; }
    public string? IdentityUserId { get; init; }
    public bool? CanLogin { get; init; }
    public bool? RecurringEnabled { get; init; }
    public string? CommunicationPreference { get; init; }
    public string[]? Interests { get; init; }
}
