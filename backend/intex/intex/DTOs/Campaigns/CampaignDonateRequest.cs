namespace backend.intex.DTOs.Campaigns;

public sealed record CampaignDonateRequest(
    decimal? Amount,
    string? CurrencyCode,
    string? ChannelSource,
    string? Notes
);
