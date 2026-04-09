namespace backend.intex.DTOs.Campaigns;

public sealed record CampaignResponseDto(
    long CampaignId,
    string Title,
    string? Description,
    string? Category,
    decimal? Goal,
    string? Deadline,
    string Status,
    long? CreatedBy,
    string? CreatedAt,
    string? UpdatedAt,
    decimal TotalRaised,
    int DonorCount
);
