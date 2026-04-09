namespace backend.intex.DTOs.Campaigns;

public sealed record CreateCampaignRequest(
    string? Title,
    string? Description,
    string? Category,
    decimal? Goal,
    DateOnly? Deadline,
    string? Status
);
