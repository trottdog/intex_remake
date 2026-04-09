namespace backend.intex.Entities.Database;

public sealed class Donation
{
    public long DonationId { get; init; }
    public long? SupporterId { get; init; }
    public long? CampaignId { get; init; }
    public string? DonationType { get; init; }
    public DateOnly? DonationDate { get; init; }
    public bool? IsRecurring { get; init; }
    public string? CampaignName { get; init; }
    public string? ChannelSource { get; init; }
    public string? CurrencyCode { get; init; }
    public decimal? Amount { get; init; }
    public decimal? EstimatedValue { get; init; }
    public string? ImpactUnit { get; init; }
    public string? Notes { get; init; }
    public long? ReferralPostId { get; init; }
    public long? SafehouseId { get; init; }
    public double? AttributedOutcomeScore { get; init; }
    public long? AttributionRunId { get; init; }
}
