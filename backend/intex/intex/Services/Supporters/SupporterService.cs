using System.Text.Json;
using backend.intex.DTOs.Common;
using backend.intex.DTOs.Supporters;
using backend.intex.Entities.Database;
using backend.intex.Repositories.Abstractions;
using backend.intex.Services.Abstractions;

namespace backend.intex.Services.Supporters;

public sealed class SupporterService(ISupporterRepository supporterRepository) : ISupporterService
{
    public async Task<SupporterResponseDto?> GetMyProfileAsync(long supporterId, CancellationToken cancellationToken = default)
    {
        var supporter = await supporterRepository.GetSupporterByIdAsync(supporterId, cancellationToken);
        if (supporter is null)
        {
            return null;
        }

        var aggregate = await supporterRepository.GetDonationAggregateAsync(supporterId, cancellationToken);
        return Map(supporter, aggregate);
    }

    public async Task<(SupporterResponseDto? Supporter, string? ErrorMessage)> UpdateMyProfileAsync(long supporterId, UpdateMySupporterProfileRequest request, CancellationToken cancellationToken = default)
    {
        var fields = new Dictionary<string, JsonElement>(StringComparer.OrdinalIgnoreCase);
        AddIfPresent(fields, "firstName", request.FirstName);
        AddIfPresent(fields, "lastName", request.LastName);
        AddIfPresent(fields, "phone", request.Phone);
        AddIfPresent(fields, "organizationName", request.OrganizationName ?? request.Organization);

        if (fields.Count == 0)
        {
            return (null, "No fields to update");
        }

        var updated = await supporterRepository.UpdateSupporterAsync(supporterId, fields, cancellationToken);
        if (updated is null)
        {
            return (null, "Not found");
        }

        var aggregate = await supporterRepository.GetDonationAggregateAsync(supporterId, cancellationToken);
        return (Map(updated, aggregate), null);
    }

    public async Task<RecurringStatusResponse?> GetRecurringStatusAsync(long supporterId, CancellationToken cancellationToken = default)
    {
        var supporter = await supporterRepository.GetSupporterByIdAsync(supporterId, cancellationToken);
        return supporter is null ? null : new RecurringStatusResponse(supporter.RecurringEnabled);
    }

    public async Task<(RecurringStatusResponse? Response, string? ErrorMessage)> UpdateRecurringStatusAsync(long supporterId, UpdateRecurringRequest request, CancellationToken cancellationToken = default)
    {
        if (!request.RecurringEnabled.HasValue)
        {
            return (null, "recurringEnabled must be a boolean");
        }

        var fields = new Dictionary<string, JsonElement>(StringComparer.OrdinalIgnoreCase)
        {
            ["recurringEnabled"] = JsonSerializer.SerializeToElement(request.RecurringEnabled.Value)
        };

        var updated = await supporterRepository.UpdateSupporterAsync(supporterId, fields, cancellationToken);
        if (updated is null)
        {
            return (null, "Not found");
        }

        return (new RecurringStatusResponse(
            updated.RecurringEnabled,
            updated.RecurringEnabled
                ? "Recurring monthly donations enabled."
                : "Recurring donations disabled."), null);
    }

    public async Task<SupporterStatsResponseDto> GetStatsAsync(CancellationToken cancellationToken = default)
    {
        var stats = await supporterRepository.GetSupporterStatsAsync(cancellationToken);
        var channels = stats.AcquisitionByChannel
            .Select(item => new SupporterStatsChannelItemDto(item.Channel, item.Count))
            .ToList();
        var typeMix = stats.SupportTypeMix
            .Select(item => new SupporterStatsTypeMixItemDto(item.Type, item.Count, item.Percentage))
            .ToList();

        return new SupporterStatsResponseDto(
            stats.TotalSupporters,
            stats.ActiveSupporters,
            stats.RecurringDonors,
            stats.NewSupporters,
            stats.RaisedThisMonth,
            stats.LifetimeTotal,
            stats.AvgGiftSize,
            channels,
            typeMix,
            stats.TotalSupporters,
            stats.ActiveSupporters,
            stats.RecurringDonors,
            stats.NewSupporters,
            stats.AvgGiftSize,
            channels,
            typeMix);
    }

    public async Task<SupporterGivingStatsDto> GetGivingStatsAsync(long supporterId, CancellationToken cancellationToken = default)
    {
        var stats = await supporterRepository.GetGivingStatsAsync(supporterId, cancellationToken);
        return new SupporterGivingStatsDto(
            supporterId,
            stats.Total,
            stats.Count,
            stats.AvgGift,
            stats.LastDonationDate?.ToString("yyyy-MM-dd"),
            stats.DonationTypesMap,
            stats.Total,
            stats.Count,
            stats.AvgGift,
            stats.DonationTypesMap);
    }

    public async Task<StandardPagedResponse<SupporterResponseDto>> ListSupportersAsync(ListSupportersQuery query, CancellationToken cancellationToken = default)
    {
        var page = query.Page <= 0 ? 1 : query.Page;
        var pageSize = ResolvePageSize(query.PageSize, query.Limit);
        var (supporters, total) = await supporterRepository.ListSupportersAsync(page, pageSize, cancellationToken);
        var aggregates = await supporterRepository.GetDonationAggregatesAsync(supporters.Select(supporter => supporter.SupporterId).ToList(), cancellationToken);

        var data = supporters
            .Select(supporter => Map(
                supporter,
                aggregates.TryGetValue(supporter.SupporterId, out var aggregate)
                    ? aggregate
                    : EmptyAggregate()))
            .ToList();

        var totalPages = total == 0 ? 0 : (int)Math.Ceiling(total / (double)pageSize);
        return new StandardPagedResponse<SupporterResponseDto>(
            data,
            total,
            new StandardPaginationMeta(page, pageSize, totalPages, page < totalPages, page > 1));
    }

    public async Task<SupporterResponseDto> CreateSupporterAsync(CreateSupporterRequest request, CancellationToken cancellationToken = default)
    {
        var created = await supporterRepository.CreateSupporterAsync(
            new Supporter
            {
                SupporterType = request.SupporterType ?? request.SupportType,
                DisplayName = request.DisplayName,
                OrganizationName = request.OrganizationName ?? request.Organization,
                FirstName = request.FirstName,
                LastName = request.LastName,
                RelationshipType = request.RelationshipType,
                Region = request.Region,
                Country = request.Country,
                Email = request.Email,
                Phone = request.Phone,
                Status = request.Status,
                CreatedAt = request.CreatedAt,
                FirstDonationDate = request.FirstDonationDate,
                AcquisitionChannel = request.AcquisitionChannel,
                IdentityUserId = request.IdentityUserId,
                CanLogin = request.CanLogin ?? false,
                RecurringEnabled = request.RecurringEnabled ?? false
            },
            cancellationToken);

        return Map(created, EmptyAggregate());
    }

    public async Task<SupporterResponseDto?> GetSupporterAsync(long supporterId, CancellationToken cancellationToken = default)
    {
        var supporter = await supporterRepository.GetSupporterByIdAsync(supporterId, cancellationToken);
        if (supporter is null)
        {
            return null;
        }

        var aggregate = await supporterRepository.GetDonationAggregateAsync(supporterId, cancellationToken);
        return Map(supporter, aggregate);
    }

    public async Task<SupporterResponseDto?> UpdateSupporterAsync(long supporterId, UpdateSupporterRequest request, CancellationToken cancellationToken = default)
    {
        var updated = await supporterRepository.UpdateSupporterAsync(supporterId, request.Fields, cancellationToken);
        if (updated is null)
        {
            return null;
        }

        var aggregate = await supporterRepository.GetDonationAggregateAsync(supporterId, cancellationToken);
        return Map(updated, aggregate);
    }

    public Task DeleteSupporterAsync(long supporterId, CancellationToken cancellationToken = default) =>
        supporterRepository.DeleteSupporterIfExistsAsync(supporterId, cancellationToken);

    private static SupporterResponseDto Map(Supporter supporter, SupporterDonationAggregate aggregate) =>
        new(
            supporter.SupporterId,
            supporter.SupporterId,
            supporter.SupporterType,
            supporter.SupporterType,
            supporter.DisplayName,
            supporter.OrganizationName,
            supporter.OrganizationName,
            supporter.FirstName,
            supporter.LastName,
            supporter.RelationshipType,
            supporter.Region,
            supporter.Country,
            supporter.Email,
            supporter.Phone,
            supporter.Status,
            supporter.CreatedAt,
            supporter.FirstDonationDate?.ToString("yyyy-MM-dd"),
            supporter.FirstDonationDate?.ToString("yyyy-MM-dd"),
            supporter.AcquisitionChannel,
            supporter.IdentityUserId,
            supporter.CanLogin,
            supporter.RecurringEnabled,
            supporter.RecurringEnabled,
            supporter.ChurnRiskScore,
            supporter.ChurnBand,
            supporter.ChurnTopDrivers,
            supporter.ChurnRecommendedAction,
            supporter.ChurnScoreUpdatedAt?.ToUniversalTime().ToString("O"),
            supporter.UpgradeLikelihoodScore,
            supporter.UpgradeBand,
            supporter.UpgradeTopDrivers,
            supporter.UpgradeRecommendedAskBand,
            supporter.UpgradeScoreUpdatedAt?.ToUniversalTime().ToString("O"),
            aggregate.LifetimeGiving,
            aggregate.DonationCount,
            aggregate.LastGiftDate?.ToString("yyyy-MM-dd"),
            aggregate.LastGiftAmount,
            aggregate.HasRecurring,
            null,
            null);

    private static SupporterDonationAggregate EmptyAggregate() => new(0m, 0, null, null, false);

    private static int ResolvePageSize(int? pageSize, int? limit)
    {
        var resolved = pageSize ?? limit ?? 20;
        return Math.Clamp(resolved, 1, 100);
    }

    private static void AddIfPresent(IDictionary<string, JsonElement> fields, string key, string? value)
    {
        if (value is not null)
        {
            fields[key] = JsonSerializer.SerializeToElement<string?>(value);
        }
    }
}
