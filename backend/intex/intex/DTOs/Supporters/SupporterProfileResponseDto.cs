namespace backend.intex.DTOs.Supporters;

public sealed record SupporterProfileResponseDto(
    SupporterResponseDto Supporter,
    SupporterGivingStatsDto GivingStats,
    IReadOnlyList<SupporterDonationHistoryItemDto> DonationHistory
);

public sealed record SupporterDonationHistoryItemDto(
    long DonationId,
    long? SupporterId,
    string? DonationType,
    string? DonationDate,
    bool? IsRecurring,
    string? CampaignName,
    string? ChannelSource,
    string? CurrencyCode,
    decimal? Amount,
    decimal? EstimatedValue,
    string? ImpactUnit,
    string? Notes,
    long? ReferralPostId,
    long? CampaignId,
    long? SafehouseId,
    string? SafehouseName,
    decimal TotalAllocated,
    decimal? Unallocated,
    bool IsGeneralFund,
    IReadOnlyList<SupporterDonationAllocationItemDto> Allocations,
    IReadOnlyList<SupporterInKindDonationItemDto> InKindItems
);

public sealed record SupporterDonationAllocationItemDto(
    long AllocationId,
    long? DonationId,
    long? SafehouseId,
    string? SafehouseName,
    string? ProgramArea,
    decimal? AmountAllocated,
    string? AllocationDate,
    string? AllocationNotes
);

public sealed record SupporterInKindDonationItemDto(
    long ItemId,
    long? DonationId,
    string? ItemName,
    string? ItemCategory,
    decimal? Quantity,
    string? UnitOfMeasure,
    decimal? EstimatedUnitValue,
    string? IntendedUse,
    string? ReceivedCondition
);
