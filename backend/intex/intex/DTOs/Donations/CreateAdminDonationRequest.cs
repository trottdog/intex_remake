namespace backend.intex.DTOs.Donations;

public sealed class CreateAdminDonationRequest
{
    public long? ExistingSupporterId { get; init; }
    public AdminDonationSupporterRequest? Supporter { get; init; }
    public long? CampaignId { get; init; }
    public string? DonationType { get; init; }
    public DateOnly? DonationDate { get; init; }
    public string? ChannelSource { get; init; }
    public string? CurrencyCode { get; init; }
    public decimal? Amount { get; init; }
    public decimal? EstimatedValue { get; init; }
    public string? ImpactUnit { get; init; }
    public bool? IsRecurring { get; init; }
    public string? CampaignName { get; init; }
    public string? Notes { get; init; }
    public long? ReferralPostId { get; init; }
    public long? SafehouseId { get; init; }
    public IReadOnlyList<AdminDonationInKindItemRequest>? InKindItems { get; init; }
    public IReadOnlyList<AdminDonationAllocationEntryRequest>? Allocations { get; init; }
}

public sealed class AdminDonationSupporterRequest
{
    public string? SupporterType { get; init; }
    public string? DisplayName { get; init; }
    public string? OrganizationName { get; init; }
    public string? FirstName { get; init; }
    public string? LastName { get; init; }
    public string? RelationshipType { get; init; }
    public string? Region { get; init; }
    public string? Country { get; init; }
    public string? Email { get; init; }
    public string? Phone { get; init; }
    public string? Status { get; init; }
    public DateOnly? FirstDonationDate { get; init; }
    public string? AcquisitionChannel { get; init; }
    public string? CreatedAt { get; init; }
}

public sealed class AdminDonationInKindItemRequest
{
    public string? ItemName { get; init; }
    public string? ItemCategory { get; init; }
    public decimal? Quantity { get; init; }
    public string? UnitOfMeasure { get; init; }
    public decimal? EstimatedUnitValue { get; init; }
    public string? IntendedUse { get; init; }
    public string? ReceivedCondition { get; init; }
}

public sealed class AdminDonationAllocationEntryRequest
{
    public long? SafehouseId { get; init; }
    public string? ProgramArea { get; init; }
    public decimal? AmountAllocated { get; init; }
    public DateOnly? AllocationDate { get; init; }
    public string? AllocationNotes { get; init; }
}
