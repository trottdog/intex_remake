using System.Text.Json;
using backend.intex.Entities.Database;
using backend.intex.Infrastructure.Data.EntityFramework;
using backend.intex.Repositories.Abstractions;
using Microsoft.EntityFrameworkCore;

namespace backend.intex.Repositories.EntityFramework;

public sealed class CampaignRepository(BeaconDbContext dbContext) : ICampaignRepository
{
    public async Task<IReadOnlyList<CampaignAggregateRecord>> ListCampaignsAsync(bool showAll, CancellationToken cancellationToken = default)
    {
        var campaignQuery = dbContext.Campaigns.AsNoTracking();
        if (!showAll)
        {
            campaignQuery = campaignQuery.Where(campaign => campaign.Status == "active");
        }

        var campaigns = showAll
            ? await campaignQuery
                .OrderByDescending(campaign => campaign.CreatedAt)
                .ThenByDescending(campaign => campaign.CampaignId)
                .ToListAsync(cancellationToken)
            : await campaignQuery
                .OrderBy(campaign => campaign.Deadline)
                .ThenBy(campaign => campaign.CampaignId)
                .ToListAsync(cancellationToken);

        return await BuildAggregateRecordsAsync(campaigns, cancellationToken);
    }

    public async Task<CampaignAggregateRecord?> GetCampaignAsync(long campaignId, CancellationToken cancellationToken = default)
    {
        var campaign = await dbContext.Campaigns
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.CampaignId == campaignId, cancellationToken);

        if (campaign is null)
        {
            return null;
        }

        var aggregates = await GetAggregateMapAsync([campaign.CampaignId], cancellationToken);
        var aggregate = aggregates.TryGetValue(campaign.CampaignId, out var foundAggregate)
            ? foundAggregate
            : new CampaignTotals(0m, 0);

        return new CampaignAggregateRecord(
            campaign.CampaignId,
            campaign.Title,
            campaign.Description,
            campaign.Category,
            campaign.Goal,
            campaign.Deadline,
            campaign.Status,
            campaign.CreatedBy,
            campaign.CreatedAt,
            campaign.UpdatedAt,
            aggregate.TotalRaised,
            aggregate.DonorCount);
    }

    public async Task<Campaign> CreateCampaignAsync(Campaign campaign, CancellationToken cancellationToken = default)
    {
        dbContext.Campaigns.Add(campaign);
        await dbContext.SaveChangesAsync(cancellationToken);
        return campaign;
    }

    public async Task<Campaign?> UpdateCampaignAsync(long campaignId, IReadOnlyDictionary<string, JsonElement> fields, CancellationToken cancellationToken = default)
    {
        var entity = await dbContext.Campaigns.FirstOrDefaultAsync(campaign => campaign.CampaignId == campaignId, cancellationToken);
        if (entity is null)
        {
            return null;
        }

        var values = dbContext.Entry(entity).CurrentValues;
        foreach (var (key, value) in fields)
        {
            if (!TryMapField(key, value, out var propertyName, out var parsedValue))
            {
                continue;
            }

            values[propertyName] = parsedValue;
        }

        values[nameof(Campaign.UpdatedAt)] = DateTime.UtcNow;
        await dbContext.SaveChangesAsync(cancellationToken);
        return entity;
    }

    public async Task DeleteCampaignAsync(long campaignId, CancellationToken cancellationToken = default)
    {
        var entity = await dbContext.Campaigns.FirstOrDefaultAsync(campaign => campaign.CampaignId == campaignId, cancellationToken);
        if (entity is null)
        {
            return;
        }

        dbContext.Campaigns.Remove(entity);
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private async Task<IReadOnlyList<CampaignAggregateRecord>> BuildAggregateRecordsAsync(IReadOnlyList<Campaign> campaigns, CancellationToken cancellationToken)
    {
        if (campaigns.Count == 0)
        {
            return [];
        }

        var campaignIds = campaigns.Select(campaign => campaign.CampaignId).ToList();
        var aggregateMap = await GetAggregateMapAsync(campaignIds, cancellationToken);

        return campaigns.Select(campaign =>
        {
            var aggregate = aggregateMap.TryGetValue(campaign.CampaignId, out var foundAggregate)
                ? foundAggregate
                : new CampaignTotals(0m, 0);
            return new CampaignAggregateRecord(
                campaign.CampaignId,
                campaign.Title,
                campaign.Description,
                campaign.Category,
                campaign.Goal,
                campaign.Deadline,
                campaign.Status,
                campaign.CreatedBy,
                campaign.CreatedAt,
                campaign.UpdatedAt,
                aggregate.TotalRaised,
                aggregate.DonorCount);
        }).ToList();
    }

    private async Task<IReadOnlyDictionary<long, CampaignTotals>> GetAggregateMapAsync(IReadOnlyList<long> campaignIds, CancellationToken cancellationToken)
    {
        if (campaignIds.Count == 0)
        {
            return new Dictionary<long, CampaignTotals>();
        }

        var rows = await dbContext.Donations
            .AsNoTracking()
            .Where(donation => donation.CampaignId.HasValue && campaignIds.Contains(donation.CampaignId.Value))
            .GroupBy(donation => donation.CampaignId!.Value)
            .Select(group => new
            {
                CampaignId = group.Key,
                TotalRaised = group.Sum(donation => donation.Amount) ?? 0m,
                DonorCount = group
                    .Where(donation => donation.SupporterId.HasValue)
                    .Select(donation => donation.SupporterId!.Value)
                    .Distinct()
                    .Count()
            })
            .ToListAsync(cancellationToken);

        return rows.ToDictionary(
            row => row.CampaignId,
            row => new CampaignTotals(decimal.Round(row.TotalRaised, 2), row.DonorCount));
    }

    private static bool TryMapField(string key, JsonElement value, out string propertyName, out object? parsedValue)
    {
        propertyName = string.Empty;
        parsedValue = null;

        switch (key)
        {
            case "title":
                propertyName = nameof(Campaign.Title);
                parsedValue = ReadRequiredString(value);
                return parsedValue is not null;
            case "description":
                propertyName = nameof(Campaign.Description);
                parsedValue = ReadNullableString(value);
                return true;
            case "category":
                propertyName = nameof(Campaign.Category);
                parsedValue = ReadNullableString(value);
                return true;
            case "goal":
                propertyName = nameof(Campaign.Goal);
                parsedValue = ReadNullableDecimal(value);
                return value.ValueKind is JsonValueKind.Number or JsonValueKind.Null;
            case "deadline":
                propertyName = nameof(Campaign.Deadline);
                parsedValue = ReadNullableDateOnly(value);
                return parsedValue is not null || value.ValueKind == JsonValueKind.Null;
            case "status":
                propertyName = nameof(Campaign.Status);
                parsedValue = ReadNullableString(value);
                return true;
            default:
                return false;
        }
    }

    private static string? ReadRequiredString(JsonElement value)
    {
        if (value.ValueKind != JsonValueKind.String)
        {
            return null;
        }

        var text = value.GetString()?.Trim();
        return string.IsNullOrWhiteSpace(text) ? null : text;
    }

    private static string? ReadNullableString(JsonElement value)
    {
        if (value.ValueKind == JsonValueKind.Null)
        {
            return null;
        }

        if (value.ValueKind != JsonValueKind.String)
        {
            return null;
        }

        var text = value.GetString()?.Trim();
        return string.IsNullOrWhiteSpace(text) ? null : text;
    }

    private static decimal? ReadNullableDecimal(JsonElement value)
    {
        if (value.ValueKind == JsonValueKind.Null)
        {
            return null;
        }

        return value.ValueKind == JsonValueKind.Number && value.TryGetDecimal(out var number)
            ? decimal.Round(number, 2)
            : null;
    }

    private static DateOnly? ReadNullableDateOnly(JsonElement value)
    {
        if (value.ValueKind == JsonValueKind.Null)
        {
            return null;
        }

        if (value.ValueKind == JsonValueKind.String && DateOnly.TryParse(value.GetString(), out var parsed))
        {
            return parsed;
        }

        return null;
    }

    private sealed record CampaignTotals(decimal TotalRaised, int DonorCount);
}
