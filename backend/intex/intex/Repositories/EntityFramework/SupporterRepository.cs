using System.Text.Json;
using backend.intex.Entities.Database;
using backend.intex.Infrastructure.Data.EntityFramework;
using backend.intex.Repositories.Abstractions;
using Microsoft.EntityFrameworkCore;

namespace backend.intex.Repositories.EntityFramework;

public sealed class SupporterRepository(BeaconDbContext dbContext) : ISupporterRepository
{
    public Task<Supporter?> GetSupporterByIdAsync(long supporterId, CancellationToken cancellationToken = default) =>
        dbContext.Supporters
            .AsNoTracking()
            .FirstOrDefaultAsync(supporter => supporter.SupporterId == supporterId, cancellationToken);

    public async Task<(IReadOnlyList<Supporter> Supporters, int Total)> ListSupportersAsync(int page, int pageSize, CancellationToken cancellationToken = default)
    {
        var query = dbContext.Supporters.AsNoTracking();
        var total = await query.CountAsync(cancellationToken);
        var supporters = await query
            .OrderBy(supporter => supporter.SupporterId)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return (supporters, total);
    }

    public async Task<Supporter> CreateSupporterAsync(Supporter supporter, CancellationToken cancellationToken = default)
    {
        dbContext.Supporters.Add(supporter);
        await dbContext.SaveChangesAsync(cancellationToken);
        return supporter;
    }

    public async Task<Supporter?> UpdateSupporterAsync(long supporterId, IReadOnlyDictionary<string, JsonElement> fields, CancellationToken cancellationToken = default)
    {
        var entity = await dbContext.Supporters.FirstOrDefaultAsync(supporter => supporter.SupporterId == supporterId, cancellationToken);
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

        await dbContext.SaveChangesAsync(cancellationToken);
        return entity;
    }

    public async Task DeleteSupporterIfExistsAsync(long supporterId, CancellationToken cancellationToken = default)
    {
        var entity = await dbContext.Supporters.FirstOrDefaultAsync(supporter => supporter.SupporterId == supporterId, cancellationToken);
        if (entity is null)
        {
            return;
        }

        dbContext.Supporters.Remove(entity);
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<IReadOnlyDictionary<long, SupporterDonationAggregate>> GetDonationAggregatesAsync(IReadOnlyList<long> supporterIds, CancellationToken cancellationToken = default)
    {
        if (supporterIds.Count == 0)
        {
            return new Dictionary<long, SupporterDonationAggregate>();
        }

        var aggregateRows = await dbContext.Donations
            .AsNoTracking()
            .Where(donation => donation.SupporterId.HasValue && supporterIds.Contains(donation.SupporterId.Value))
            .GroupBy(donation => donation.SupporterId!.Value)
            .Select(group => new
            {
                SupporterId = group.Key,
                LifetimeGiving = group.Sum(donation => donation.Amount) ?? 0m,
                DonationCount = group.Count(),
                LastGiftDate = group.Max(donation => donation.DonationDate),
                HasRecurring = group.Any(donation => donation.IsRecurring == true)
            })
            .ToListAsync(cancellationToken);

        var result = new Dictionary<long, SupporterDonationAggregate>();
        foreach (var row in aggregateRows)
        {
            var lastGiftAmount = await dbContext.Donations
                .AsNoTracking()
                .Where(donation => donation.SupporterId == row.SupporterId && donation.DonationDate == row.LastGiftDate)
                .OrderByDescending(donation => donation.DonationId)
                .Select(donation => donation.Amount)
                .FirstOrDefaultAsync(cancellationToken);

            result[row.SupporterId] = new SupporterDonationAggregate(
                row.LifetimeGiving,
                row.DonationCount,
                row.LastGiftDate,
                lastGiftAmount,
                row.HasRecurring);
        }

        return result;
    }

    public async Task<SupporterDonationAggregate> GetDonationAggregateAsync(long supporterId, CancellationToken cancellationToken = default)
    {
        var aggregateMap = await GetDonationAggregatesAsync([supporterId], cancellationToken);
        return aggregateMap.TryGetValue(supporterId, out var aggregate)
            ? aggregate
            : new SupporterDonationAggregate(0m, 0, null, null, false);
    }

    public async Task<SupporterGivingStatsRecord> GetGivingStatsAsync(long supporterId, CancellationToken cancellationToken = default)
    {
        var donations = await dbContext.Donations
            .AsNoTracking()
            .Where(donation => donation.SupporterId == supporterId)
            .OrderByDescending(donation => donation.DonationDate)
            .ThenByDescending(donation => donation.DonationId)
            .ToListAsync(cancellationToken);

        var total = donations.Sum(donation => donation.Amount ?? 0m);
        var count = donations.Count;
        var donationTypesMap = donations
            .Where(donation => !string.IsNullOrWhiteSpace(donation.DonationType))
            .GroupBy(donation => donation.DonationType!, StringComparer.Ordinal)
            .ToDictionary(group => group.Key, group => group.Count(), StringComparer.Ordinal);

        return new SupporterGivingStatsRecord(
            supporterId,
            total,
            count,
            count == 0 ? 0m : decimal.Round(total / count, 2),
            donations.FirstOrDefault()?.DonationDate,
            donationTypesMap);
    }

    public async Task<IReadOnlyList<SupporterDonationHistoryRecord>> GetDonationHistoryAsync(long supporterId, CancellationToken cancellationToken = default)
    {
        var donations = await dbContext.Donations
            .AsNoTracking()
            .Where(donation => donation.SupporterId == supporterId)
            .OrderByDescending(donation => donation.DonationDate)
            .ThenByDescending(donation => donation.DonationId)
            .ToListAsync(cancellationToken);

        if (donations.Count == 0)
        {
            return [];
        }

        var donationIds = donations.Select(item => item.DonationId).ToList();
        var allocations = await dbContext.DonationAllocations
            .AsNoTracking()
            .Where(item => item.DonationId.HasValue && donationIds.Contains(item.DonationId.Value))
            .OrderBy(item => item.AllocationDate)
            .ThenBy(item => item.AllocationId)
            .ToListAsync(cancellationToken);
        var allocationsByDonationId = allocations
            .Where(item => item.DonationId.HasValue)
            .GroupBy(item => item.DonationId!.Value)
            .ToDictionary(group => group.Key, group => (IReadOnlyList<DonationAllocation>)group.ToList());

        var inKindItems = await dbContext.InKindDonationItems
            .AsNoTracking()
            .Where(item => item.DonationId.HasValue && donationIds.Contains(item.DonationId.Value))
            .OrderBy(item => item.ItemId)
            .ToListAsync(cancellationToken);
        var inKindItemsByDonationId = inKindItems
            .Where(item => item.DonationId.HasValue)
            .GroupBy(item => item.DonationId!.Value)
            .ToDictionary(group => group.Key, group => (IReadOnlyList<InKindDonationItem>)group.ToList());

        var safehouseIds = donations.Select(item => item.SafehouseId)
            .Concat(allocations.Select(item => item.SafehouseId))
            .Where(item => item.HasValue)
            .Select(item => item!.Value)
            .Distinct()
            .ToList();

        var safehouseNames = safehouseIds.Count == 0
            ? new Dictionary<long, string?>()
            : await dbContext.Safehouses
                .AsNoTracking()
                .Where(item => safehouseIds.Contains(item.SafehouseId))
                .ToDictionaryAsync(item => item.SafehouseId, item => item.Name, cancellationToken);

        return donations.Select(donation =>
        {
            allocationsByDonationId.TryGetValue(donation.DonationId, out var donationAllocations);
            donationAllocations ??= [];

            inKindItemsByDonationId.TryGetValue(donation.DonationId, out var donationItems);
            donationItems ??= [];

            var totalAllocated = decimal.Round(donationAllocations.Sum(item => item.AmountAllocated ?? 0m), 2);
            var baseAmount = donation.Amount ?? donation.EstimatedValue;
            var unallocated = baseAmount.HasValue
                ? (decimal?)decimal.Round(baseAmount.Value - totalAllocated, 2)
                : null;

            return new SupporterDonationHistoryRecord(
                donation.DonationId,
                donation.SupporterId,
                donation.DonationType,
                donation.DonationDate,
                donation.IsRecurring,
                donation.CampaignName,
                donation.ChannelSource,
                donation.CurrencyCode,
                donation.Amount.HasValue ? decimal.Round(donation.Amount.Value, 2) : null,
                donation.EstimatedValue.HasValue ? decimal.Round(donation.EstimatedValue.Value, 2) : null,
                donation.ImpactUnit,
                donation.Notes,
                donation.ReferralPostId,
                donation.CampaignId,
                donation.SafehouseId,
                donation.SafehouseId.HasValue && safehouseNames.TryGetValue(donation.SafehouseId.Value, out var donationSafehouseName)
                    ? donationSafehouseName
                    : null,
                totalAllocated,
                unallocated,
                !donation.SafehouseId.HasValue,
                donationAllocations
                    .Select(item => new SupporterDonationAllocationRecord(
                        item.AllocationId,
                        item.DonationId,
                        item.SafehouseId,
                        item.SafehouseId.HasValue && safehouseNames.TryGetValue(item.SafehouseId.Value, out var allocationSafehouseName)
                            ? allocationSafehouseName
                            : null,
                        item.ProgramArea,
                        item.AmountAllocated.HasValue ? decimal.Round(item.AmountAllocated.Value, 2) : null,
                        item.AllocationDate,
                        item.AllocationNotes))
                    .ToList(),
                donationItems
                    .Select(item => new SupporterInKindDonationItemRecord(
                        item.ItemId,
                        item.DonationId,
                        item.ItemName,
                        item.ItemCategory,
                        item.Quantity,
                        item.UnitOfMeasure,
                        item.EstimatedUnitValue.HasValue ? decimal.Round(item.EstimatedUnitValue.Value, 2) : null,
                        item.IntendedUse,
                        item.ReceivedCondition))
                    .ToList());
        }).ToList();
    }

    public async Task<SupporterStatsRecord> GetSupporterStatsAsync(CancellationToken cancellationToken = default)
    {
        var monthStart = new DateOnly(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1);
        var monthStartText = monthStart.ToString("yyyy-MM-dd");

        var supporters = await dbContext.Supporters
            .AsNoTracking()
            .Select(supporter => new
            {
                supporter.SupporterType,
                supporter.AcquisitionChannel,
                supporter.Status,
                supporter.RecurringEnabled,
                supporter.CreatedAt
            })
            .ToListAsync(cancellationToken);

        var donations = await dbContext.Donations
            .AsNoTracking()
            .Select(donation => new { donation.Amount, donation.DonationDate })
            .ToListAsync(cancellationToken);

        var totalSupporters = supporters.Count;
        var activeSupporters = supporters.Count(supporter => string.IsNullOrWhiteSpace(supporter.Status) || supporter.Status == "active");
        var recurringDonors = supporters.Count(supporter => supporter.RecurringEnabled);
        var newSupporters = supporters.Count(supporter =>
            !string.IsNullOrWhiteSpace(supporter.CreatedAt) &&
            string.CompareOrdinal(supporter.CreatedAt, monthStartText) >= 0);

        var lifetimeTotal = donations.Sum(donation => donation.Amount ?? 0m);
        var raisedThisMonth = donations
            .Where(donation => donation.DonationDate.HasValue && donation.DonationDate.Value >= monthStart)
            .Sum(donation => donation.Amount ?? 0m);
        var totalDonationCount = donations.Count;
        var avgGiftSize = totalDonationCount == 0 ? 0m : decimal.Round(lifetimeTotal / totalDonationCount, 2);

        var acquisitionByChannel = supporters
            .Where(supporter => !string.IsNullOrWhiteSpace(supporter.AcquisitionChannel))
            .GroupBy(supporter => supporter.AcquisitionChannel!, StringComparer.Ordinal)
            .Select(group => (Channel: group.Key, Count: group.Count()))
            .OrderBy(item => item.Channel)
            .ToList();

        var supportTypeMix = supporters
            .Where(supporter => !string.IsNullOrWhiteSpace(supporter.SupporterType))
            .GroupBy(supporter => supporter.SupporterType!, StringComparer.Ordinal)
            .Select(group => (
                Type: group.Key,
                Count: group.Count(),
                Percentage: totalSupporters == 0 ? 0m : decimal.Round((group.Count() * 100m) / totalSupporters, 2)))
            .OrderBy(item => item.Type)
            .ToList();

        return new SupporterStatsRecord(
            totalSupporters,
            activeSupporters,
            recurringDonors,
            newSupporters,
            raisedThisMonth,
            lifetimeTotal,
            avgGiftSize,
            acquisitionByChannel,
            supportTypeMix);
    }

    private static bool TryMapField(string key, JsonElement value, out string propertyName, out object? parsedValue)
    {
        propertyName = string.Empty;
        parsedValue = null;

        switch (key)
        {
            case "supporterType":
            case "supportType":
                propertyName = nameof(Supporter.SupporterType);
                parsedValue = ReadNullableString(value);
                return true;
            case "displayName":
                propertyName = nameof(Supporter.DisplayName);
                parsedValue = ReadNullableString(value);
                return true;
            case "organizationName":
            case "organization":
                propertyName = nameof(Supporter.OrganizationName);
                parsedValue = ReadNullableString(value);
                return true;
            case "firstName":
                propertyName = nameof(Supporter.FirstName);
                parsedValue = ReadNullableString(value);
                return true;
            case "lastName":
                propertyName = nameof(Supporter.LastName);
                parsedValue = ReadNullableString(value);
                return true;
            case "relationshipType":
                propertyName = nameof(Supporter.RelationshipType);
                parsedValue = ReadNullableString(value);
                return true;
            case "region":
                propertyName = nameof(Supporter.Region);
                parsedValue = ReadNullableString(value);
                return true;
            case "country":
                propertyName = nameof(Supporter.Country);
                parsedValue = ReadNullableString(value);
                return true;
            case "email":
                propertyName = nameof(Supporter.Email);
                parsedValue = ReadNullableString(value);
                return true;
            case "phone":
                propertyName = nameof(Supporter.Phone);
                parsedValue = ReadNullableString(value);
                return true;
            case "status":
                propertyName = nameof(Supporter.Status);
                parsedValue = ReadNullableString(value);
                return true;
            case "createdAt":
                propertyName = nameof(Supporter.CreatedAt);
                parsedValue = ReadNullableString(value);
                return true;
            case "firstDonationDate":
            case "donorSince":
                propertyName = nameof(Supporter.FirstDonationDate);
                parsedValue = ReadNullableDateOnly(value);
                return true;
            case "acquisitionChannel":
                propertyName = nameof(Supporter.AcquisitionChannel);
                parsedValue = ReadNullableString(value);
                return true;
            case "identityUserId":
                propertyName = nameof(Supporter.IdentityUserId);
                parsedValue = ReadNullableString(value);
                return true;
            case "canLogin":
                propertyName = nameof(Supporter.CanLogin);
                parsedValue = ReadRequiredBool(value);
                return true;
            case "recurringEnabled":
            case "isRecurring":
                propertyName = nameof(Supporter.RecurringEnabled);
                parsedValue = ReadRequiredBool(value);
                return true;
            default:
                return false;
        }
    }

    private static string? ReadNullableString(JsonElement value) =>
        value.ValueKind == JsonValueKind.Null ? null : value.GetString();

    private static bool ReadRequiredBool(JsonElement value)
    {
        if (value.ValueKind == JsonValueKind.True || value.ValueKind == JsonValueKind.False)
        {
            return value.GetBoolean();
        }

        throw new InvalidOperationException("The request body is invalid.");
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

        throw new InvalidOperationException("The request body is invalid.");
    }
}
