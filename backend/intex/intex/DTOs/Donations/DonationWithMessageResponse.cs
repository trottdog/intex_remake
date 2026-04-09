namespace backend.intex.DTOs.Donations;

public sealed record DonationWithMessageResponse(
    long DonationId,
    long Id,
    long? SupporterId,
    string? DonationType,
    string? DonationDate,
    bool? IsRecurring,
    long? CampaignId,
    string? CampaignName,
    string? Campaign,
    string? ChannelSource,
    string? CurrencyCode,
    string? Currency,
    decimal? Amount,
    decimal? EstimatedValue,
    string? ImpactUnit,
    string? Notes,
    long? ReferralPostId,
    long? SafehouseId,
    string? SafehouseName,
    string? SupporterName,
    decimal? TotalAllocated,
    decimal? Unallocated,
    bool? IsGeneralFund,
    string Message
);
