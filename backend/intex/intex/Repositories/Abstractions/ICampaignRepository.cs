using System.Text.Json;
using backend.intex.Entities.Database;

namespace backend.intex.Repositories.Abstractions;

public interface ICampaignRepository
{
    Task<IReadOnlyList<CampaignAggregateRecord>> ListCampaignsAsync(bool showAll, CancellationToken cancellationToken = default);
    Task<CampaignAggregateRecord?> GetCampaignAsync(long campaignId, CancellationToken cancellationToken = default);
    Task<Campaign> CreateCampaignAsync(Campaign campaign, CancellationToken cancellationToken = default);
    Task<Campaign?> UpdateCampaignAsync(long campaignId, IReadOnlyDictionary<string, JsonElement> fields, CancellationToken cancellationToken = default);
    Task DeleteCampaignAsync(long campaignId, CancellationToken cancellationToken = default);
}

public sealed record CampaignAggregateRecord(
    long CampaignId,
    string Title,
    string? Description,
    string? Category,
    decimal? Goal,
    DateOnly? Deadline,
    string? Status,
    long? CreatedBy,
    DateTime? CreatedAt,
    DateTime? UpdatedAt,
    decimal TotalRaised,
    int DonorCount
);
