namespace backend.intex.Entities.Database;

public sealed class Donation
{
    public long DonationId { get; set; }
    public long? SupporterId { get; set; }
    public long? CampaignId { get; set; }
    public string? DonationType { get; set; }
    public DateOnly? DonationDate { get; set; }
    public bool? IsRecurring { get; set; }
    public string? CampaignName { get; set; }
    public string? ChannelSource { get; set; }
    public string? CurrencyCode { get; set; }
    public decimal? Amount { get; set; }
    public decimal? EstimatedValue { get; set; }
    public string? ImpactUnit { get; set; }
    public string? Notes { get; set; }
    public long? ReferralPostId { get; set; }
    public long? SafehouseId { get; set; }
    public double? AttributedOutcomeScore { get; set; }
    public long? AttributionRunId { get; set; }
}
