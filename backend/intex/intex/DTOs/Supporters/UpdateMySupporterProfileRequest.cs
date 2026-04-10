namespace backend.intex.DTOs.Supporters;

public sealed class UpdateMySupporterProfileRequest
{
    public string? FirstName { get; init; }
    public string? LastName { get; init; }
    public string? Email { get; init; }
    public string? Phone { get; init; }
    public string? OrganizationName { get; init; }

    // Legacy donor UI alias still sent by the current React page.
    public string? Organization { get; init; }
    public string? CommunicationPreference { get; init; }
}
