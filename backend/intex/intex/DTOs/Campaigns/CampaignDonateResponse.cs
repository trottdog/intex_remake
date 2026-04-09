namespace backend.intex.DTOs.Campaigns;

public sealed record CampaignDonateResponse(
    long DonationId,
    long CampaignId,
    string CampaignTitle,
    decimal Amount,
    string Message
);
