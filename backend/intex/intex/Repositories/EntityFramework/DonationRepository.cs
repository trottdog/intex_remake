using System.Text.Json;
using backend.intex.Entities.Database;
using backend.intex.Infrastructure.Data;
using backend.intex.Infrastructure.Data.EntityFramework;
using backend.intex.Repositories.Abstractions;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Npgsql;

namespace backend.intex.Repositories.EntityFramework;

public sealed class DonationRepository(BeaconDbContext dbContext, IPostgresConnectionFactory connectionFactory) : IDonationRepository
{
    public async Task<IReadOnlyList<PriorDonorSupporterOptionRecord>> SearchPriorDonorSupportersAsync(string? search, int limit, CancellationToken cancellationToken = default)
    {
        var donorAggregates = await dbContext.Donations.AsNoTracking()
            .Where(item => item.SupporterId.HasValue)
            .GroupBy(item => item.SupporterId!.Value)
            .Select(group => new
            {
                SupporterId = group.Key,
                DonationCount = group.Count(),
                LifetimeGiving = group.Sum(item => item.Amount) ?? 0m
            })
            .ToListAsync(cancellationToken);

        if (donorAggregates.Count == 0)
        {
            return [];
        }

        var supporterIds = donorAggregates.Select(item => item.SupporterId).ToList();
        var supporters = await dbContext.Supporters.AsNoTracking()
            .Where(item => supporterIds.Contains(item.SupporterId))
            .ToListAsync(cancellationToken);

        var normalizedSearch = search?.Trim();
        return supporters
            .Join(
                donorAggregates,
                supporter => supporter.SupporterId,
                aggregate => aggregate.SupporterId,
                (supporter, aggregate) => new PriorDonorSupporterOptionRecord(
                    supporter.SupporterId,
                    ResolveSupporterDisplayName(supporter),
                    supporter.Email,
                    aggregate.DonationCount,
                    decimal.Round(aggregate.LifetimeGiving, 2)))
            .Where(item =>
                string.IsNullOrWhiteSpace(normalizedSearch)
                || item.DisplayName.Contains(normalizedSearch, StringComparison.OrdinalIgnoreCase)
                || (!string.IsNullOrWhiteSpace(item.Email) && item.Email.Contains(normalizedSearch, StringComparison.OrdinalIgnoreCase)))
            .OrderByDescending(item => item.DonationCount)
            .ThenBy(item => item.DisplayName, StringComparer.OrdinalIgnoreCase)
            .Take(limit)
            .ToList();
    }

    public Task<bool> SupporterExistsAsync(long supporterId, CancellationToken cancellationToken = default) =>
        dbContext.Supporters.AsNoTracking().AnyAsync(item => item.SupporterId == supporterId, cancellationToken);

    public Task<bool> SafehouseExistsAsync(long safehouseId, CancellationToken cancellationToken = default) =>
        dbContext.Safehouses.AsNoTracking().AnyAsync(item => item.SafehouseId == safehouseId, cancellationToken);

    public async Task<(IReadOnlyList<DonationLedgerRecord> Donations, int Total)> ListMyLedgerAsync(long supporterId, int page, int pageSize, CancellationToken cancellationToken = default)
    {
        var query = dbContext.Donations.AsNoTracking().Where(donation => donation.SupporterId == supporterId);
        var total = await query.CountAsync(cancellationToken);
        var donations = await query
            .OrderByDescending(donation => donation.DonationDate)
            .ThenByDescending(donation => donation.DonationId)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        var safehouseMap = await GetSafehouseNamesAsync(donations.Select(donation => donation.SafehouseId).ToList(), cancellationToken);
        return (donations.Select(donation => new DonationLedgerRecord(
            donation.DonationId,
            donation.SupporterId,
            donation.DonationType,
            donation.DonationDate,
            donation.IsRecurring,
            donation.CampaignName,
            donation.ChannelSource,
            donation.CurrencyCode,
            donation.Amount,
            donation.EstimatedValue,
            donation.ImpactUnit,
            donation.Notes,
            donation.ReferralPostId,
            donation.SafehouseId,
            donation.SafehouseId.HasValue && safehouseMap.TryGetValue(donation.SafehouseId.Value, out var safehouseName) ? safehouseName : null))
            .ToList(), total);
    }

    public async Task<IReadOnlyList<DonationTrendRecord>> ListDonationTrendsAsync(int months, CancellationToken cancellationToken = default)
    {
        var donations = await dbContext.Donations
            .AsNoTracking()
            .Where(donation => donation.DonationDate.HasValue)
            .Select(donation => new { donation.DonationDate, donation.Amount })
            .ToListAsync(cancellationToken);

        return donations
            .GroupBy(donation => donation.DonationDate!.Value.ToString("yyyy-MM"), StringComparer.Ordinal)
            .Select(group =>
            {
                var totalAmount = group.Sum(item => item.Amount ?? 0m);
                var donationCount = group.Count();
                return new DonationTrendRecord(
                    group.Key,
                    decimal.Round(totalAmount, 2),
                    donationCount,
                    donationCount == 0 ? 0m : decimal.Round(totalAmount / donationCount, 2));
            })
            .OrderByDescending(item => item.Month)
            .Take(months)
            .OrderBy(item => item.Month)
            .ToList();
    }

    public async Task<DonationStatsRecord> GetDonationStatsAsync(string? fundType, IReadOnlyList<long> allowedSafehouses, bool enforceSafehouseScope, CancellationToken cancellationToken = default)
    {
        var rows = await ApplyDonationFilters(dbContext.Donations.AsNoTracking(), fundType, allowedSafehouses, enforceSafehouseScope)
            .Select(donation => new
            {
                donation.Amount,
                donation.SupporterId,
                TotalAllocated = dbContext.DonationAllocations
                    .Where(allocation => allocation.DonationId == donation.DonationId)
                    .Sum(allocation => (decimal?)allocation.AmountAllocated) ?? 0m
            })
            .ToListAsync(cancellationToken);

        var totalReceived = 0m;
        var totalAllocated = 0m;
        var pendingAllocationCount = 0;
        var uniqueDonorIds = new HashSet<long>();

        foreach (var row in rows)
        {
            var amount = decimal.Round(row.Amount ?? 0m, 2);
            var allocated = decimal.Round(row.TotalAllocated, 2);
            var unallocated = Math.Max(0m, amount - allocated);

            totalReceived += amount;
            totalAllocated += allocated;
            if (unallocated > 0.005m)
            {
                pendingAllocationCount += 1;
            }

            if (row.SupporterId.HasValue)
            {
                uniqueDonorIds.Add(row.SupporterId.Value);
            }
        }

        return new DonationStatsRecord(
            decimal.Round(totalReceived, 2),
            decimal.Round(totalAllocated, 2),
            pendingAllocationCount,
            uniqueDonorIds.Count);
    }

    public async Task<(IReadOnlyList<DonationSummaryRecord> Donations, int Total)> ListDonationsAsync(int page, int pageSize, string? fundType, IReadOnlyList<long> allowedSafehouses, bool enforceSafehouseScope, CancellationToken cancellationToken = default)
    {
        var baseQuery = ApplyDonationFilters(dbContext.Donations.AsNoTracking(), fundType, allowedSafehouses, enforceSafehouseScope);
        var total = await baseQuery.CountAsync(cancellationToken);
        var donations = await baseQuery
            .OrderByDescending(donation => donation.DonationDate)
            .ThenByDescending(donation => donation.DonationId)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return (await BuildDonationSummaryRecordsAsync(donations, cancellationToken), total);
    }

    public async Task<DonationSummaryRecord?> GetDonationAsync(long donationId, CancellationToken cancellationToken = default)
    {
        var donation = await dbContext.Donations.AsNoTracking()
            .FirstOrDefaultAsync(item => item.DonationId == donationId, cancellationToken);
        if (donation is null)
        {
            return null;
        }

        var summaries = await BuildDonationSummaryRecordsAsync([donation], cancellationToken);
        return summaries[0];
    }

    public async Task<Donation> CreateDonationAsync(Donation donation, CancellationToken cancellationToken = default)
    {
        dbContext.Donations.Add(donation);
        await dbContext.SaveChangesAsync(cancellationToken);
        return donation;
    }

    public async Task<DonationSummaryRecord?> CreateAdministrativeDonationAsync(AdminDonationCreateCommand command, CancellationToken cancellationToken = default)
    {
        await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);

        long supporterId;
        if (command.ExistingSupporterId.HasValue)
        {
            supporterId = command.ExistingSupporterId.Value;
            var supporter = await dbContext.Supporters.FirstOrDefaultAsync(item => item.SupporterId == supporterId, cancellationToken);
            if (supporter is null)
            {
                return null;
            }

            ApplySupporterDonationSideEffects(supporter, command.DonationDate, command.IsRecurring);
        }
        else if (command.Supporter is not null)
        {
            var supporter = new Supporter
            {
                SupporterType = command.Supporter.SupporterType,
                DisplayName = command.Supporter.DisplayName,
                OrganizationName = command.Supporter.OrganizationName,
                FirstName = command.Supporter.FirstName,
                LastName = command.Supporter.LastName,
                RelationshipType = command.Supporter.RelationshipType,
                Region = command.Supporter.Region,
                Country = command.Supporter.Country,
                Email = command.Supporter.Email,
                Phone = command.Supporter.Phone,
                Status = command.Supporter.Status,
                CreatedAt = command.Supporter.CreatedAt,
                FirstDonationDate = command.Supporter.FirstDonationDate ?? command.DonationDate,
                AcquisitionChannel = command.Supporter.AcquisitionChannel,
                CanLogin = false,
                RecurringEnabled = command.IsRecurring
            };

            dbContext.Supporters.Add(supporter);
            await dbContext.SaveChangesAsync(cancellationToken);
            supporterId = supporter.SupporterId;
        }
        else
        {
            return null;
        }

        var donation = new Donation
        {
            SupporterId = supporterId,
            CampaignId = command.CampaignId,
            DonationType = command.DonationType,
            DonationDate = command.DonationDate,
            IsRecurring = command.IsRecurring,
            CampaignName = command.CampaignName,
            ChannelSource = command.ChannelSource,
            CurrencyCode = command.CurrencyCode,
            Amount = command.Amount,
            EstimatedValue = command.EstimatedValue,
            ImpactUnit = command.ImpactUnit,
            Notes = command.Notes,
            ReferralPostId = command.ReferralPostId,
            SafehouseId = command.SafehouseId
        };

        dbContext.Donations.Add(donation);
        await dbContext.SaveChangesAsync(cancellationToken);

        if (command.InKindItems.Count > 0)
        {
            var nextItemId = await GetNextTableIdAsync(
                "in_kind_donation_items",
                "item_id",
                transaction,
                cancellationToken);
            var items = command.InKindItems.Select(item => new InKindDonationItem
            {
                ItemId = nextItemId++,
                DonationId = donation.DonationId,
                ItemName = item.ItemName,
                ItemCategory = item.ItemCategory,
                Quantity = item.Quantity,
                UnitOfMeasure = item.UnitOfMeasure,
                EstimatedUnitValue = item.EstimatedUnitValue,
                IntendedUse = item.IntendedUse,
                ReceivedCondition = item.ReceivedCondition
            }).ToList();

            dbContext.InKindDonationItems.AddRange(items);
        }

        if (command.Allocations.Count > 0)
        {
            var nextAllocationId = await GetNextTableIdAsync(
                "donation_allocations",
                "allocation_id",
                transaction,
                cancellationToken);
            var allocations = command.Allocations.Select(item => new DonationAllocation
            {
                AllocationId = nextAllocationId++,
                DonationId = donation.DonationId,
                SafehouseId = item.SafehouseId ?? command.SafehouseId,
                ProgramArea = item.ProgramArea,
                AmountAllocated = item.AmountAllocated,
                AllocationDate = item.AllocationDate,
                AllocationNotes = item.AllocationNotes
            }).ToList();

            dbContext.DonationAllocations.AddRange(allocations);
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return await GetDonationAsync(donation.DonationId, cancellationToken);
    }

    public async Task<IReadOnlyList<InKindDonationItem>> CreateInKindDonationItemsAsync(IReadOnlyList<InKindDonationItem> items, CancellationToken cancellationToken = default)
    {
        if (items.Count == 0)
        {
            return [];
        }

        dbContext.InKindDonationItems.AddRange(items);
        await dbContext.SaveChangesAsync(cancellationToken);
        return items;
    }

    public async Task<Donation?> UpdateDonationAsync(long donationId, IReadOnlyDictionary<string, JsonElement> fields, CancellationToken cancellationToken = default)
    {
        var entity = await dbContext.Donations.FirstOrDefaultAsync(donation => donation.DonationId == donationId, cancellationToken);
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

    public async Task<bool> DeleteDonationAsync(long donationId, CancellationToken cancellationToken = default)
    {
        var executionStrategy = dbContext.Database.CreateExecutionStrategy();
        var deleted = false;

        await executionStrategy.ExecuteAsync(async () =>
        {
            await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);

            var donation = await dbContext.Donations.FirstOrDefaultAsync(item => item.DonationId == donationId, cancellationToken);
            if (donation is null)
            {
                deleted = false;
                return;
            }

            var allocations = await dbContext.DonationAllocations.Where(item => item.DonationId == donationId).ToListAsync(cancellationToken);
            if (allocations.Count > 0)
            {
                dbContext.DonationAllocations.RemoveRange(allocations);
            }

            var inKindItems = await dbContext.InKindDonationItems.Where(item => item.DonationId == donationId).ToListAsync(cancellationToken);
            if (inKindItems.Count > 0)
            {
                dbContext.InKindDonationItems.RemoveRange(inKindItems);
            }

            dbContext.Donations.Remove(donation);
            await dbContext.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            deleted = true;
        });

        return deleted;
    }

    public async Task<IReadOnlyList<DonationAllocationRecord>> ListDonationAllocationsAsync(long? donationId, IReadOnlyList<long> allowedSafehouses, bool enforceSafehouseScope, CancellationToken cancellationToken = default)
    {
        var allocations = await dbContext.DonationAllocations.AsNoTracking().ToListAsync(cancellationToken);
        if (allocations.Count == 0)
        {
            return [];
        }

        var donationIds = allocations.Where(item => item.DonationId.HasValue).Select(item => item.DonationId!.Value).Distinct().ToList();
        var donations = await dbContext.Donations.AsNoTracking()
            .Where(item => donationIds.Contains(item.DonationId))
            .Select(item => new { item.DonationId, item.SafehouseId })
            .ToListAsync(cancellationToken);
        var donationSafehouseMap = donations.ToDictionary(item => item.DonationId, item => item.SafehouseId);

        var safehouseMap = await GetSafehouseNamesAsync(allocations.Select(item => item.SafehouseId).ToList(), cancellationToken);

        var filtered = allocations.Where(item =>
        {
            if (donationId.HasValue && item.DonationId != donationId.Value)
            {
                return false;
            }

            if (!enforceSafehouseScope || allowedSafehouses.Count == 0)
            {
                return true;
            }

            var effectiveSafehouseId = item.SafehouseId
                                     ?? (item.DonationId.HasValue && donationSafehouseMap.TryGetValue(item.DonationId.Value, out var donationSafehouseId)
                                         ? donationSafehouseId
                                         : null);

            return effectiveSafehouseId.HasValue && allowedSafehouses.Contains(effectiveSafehouseId.Value);
        });

        return filtered
            .Select(item => new DonationAllocationRecord(
                item.AllocationId,
                item.DonationId,
                item.SafehouseId,
                item.ProgramArea,
                item.AmountAllocated,
                item.AllocationDate,
                item.AllocationNotes,
                item.SafehouseId.HasValue && safehouseMap.TryGetValue(item.SafehouseId.Value, out var safehouseName) ? safehouseName : null,
                item.DonationId.HasValue && donationSafehouseMap.TryGetValue(item.DonationId.Value, out var donationSafehouseId) ? donationSafehouseId : null))
            .ToList();
    }

    public async Task<DonationAllocationRecord?> CreateDonationAllocationAsync(DonationAllocation allocation, CancellationToken cancellationToken = default)
    {
        await using var connection = await connectionFactory.OpenConnectionAsync(cancellationToken);
        await using var transaction = await connection.BeginTransactionAsync(cancellationToken);
        var nextAllocationId = await GetNextTableIdAsync(
            connection,
            transaction,
            "donation_allocations",
            "allocation_id",
            cancellationToken);
        await using var command = connection.CreateCommand();
        command.Transaction = transaction;
        command.CommandText = """
            INSERT INTO donation_allocations (
                allocation_id,
                donation_id,
                safehouse_id,
                program_area,
                amount_allocated,
                allocation_date,
                allocation_notes
            )
            VALUES (
                @allocation_id,
                @donation_id,
                @safehouse_id,
                @program_area,
                @amount_allocated,
                @allocation_date,
                @allocation_notes
            )
            RETURNING allocation_id;
            """;

        AddParameter(command, "allocation_id", nextAllocationId);
        AddParameter(command, "donation_id", allocation.DonationId);
        AddParameter(command, "safehouse_id", allocation.SafehouseId);
        AddParameter(command, "program_area", allocation.ProgramArea);
        AddParameter(command, "amount_allocated", allocation.AmountAllocated);
        AddParameter(command, "allocation_date", allocation.AllocationDate);
        AddParameter(command, "allocation_notes", allocation.AllocationNotes);

        var insertedId = await command.ExecuteScalarAsync(cancellationToken);
        if (insertedId is null || insertedId is DBNull)
        {
            return null;
        }

        await transaction.CommitAsync(cancellationToken);
        var allocationId = Convert.ToInt64(insertedId);
        return await GetDonationAllocationAsync(allocationId, cancellationToken);
    }

    public async Task<DonationAllocationRecord?> GetDonationAllocationAsync(long allocationId, CancellationToken cancellationToken = default)
    {
        var allocation = await dbContext.DonationAllocations.AsNoTracking()
            .FirstOrDefaultAsync(item => item.AllocationId == allocationId, cancellationToken);
        if (allocation is null)
        {
            return null;
        }

        var safehouseMap = await GetSafehouseNamesAsync([allocation.SafehouseId], cancellationToken);
        long? donationSafehouseId = null;
        if (allocation.DonationId.HasValue)
        {
            donationSafehouseId = await dbContext.Donations.AsNoTracking()
                .Where(item => item.DonationId == allocation.DonationId.Value)
                .Select(item => item.SafehouseId)
                .FirstOrDefaultAsync(cancellationToken);
        }

        return new DonationAllocationRecord(
            allocation.AllocationId,
            allocation.DonationId,
            allocation.SafehouseId,
            allocation.ProgramArea,
            allocation.AmountAllocated,
            allocation.AllocationDate,
            allocation.AllocationNotes,
            allocation.SafehouseId.HasValue && safehouseMap.TryGetValue(allocation.SafehouseId.Value, out var safehouseName) ? safehouseName : null,
            donationSafehouseId);
    }

    public async Task<bool> DeleteDonationAllocationAsync(long allocationId, CancellationToken cancellationToken = default)
    {
        var allocation = await dbContext.DonationAllocations.FirstOrDefaultAsync(item => item.AllocationId == allocationId, cancellationToken);
        if (allocation is null)
        {
            return false;
        }

        dbContext.DonationAllocations.Remove(allocation);
        await dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    private IQueryable<Donation> ApplyDonationFilters(IQueryable<Donation> query, string? fundType, IReadOnlyList<long> allowedSafehouses, bool enforceSafehouseScope)
    {
        if (enforceSafehouseScope && allowedSafehouses.Count > 0)
        {
            query = query.Where(donation => donation.SafehouseId.HasValue && allowedSafehouses.Contains(donation.SafehouseId.Value));
        }

        return fundType switch
        {
            "general" => query.Where(donation => donation.SafehouseId == null),
            "directed" => query.Where(donation => donation.SafehouseId != null),
            _ => query
        };
    }

    private async Task<IReadOnlyList<DonationSummaryRecord>> BuildDonationSummaryRecordsAsync(IReadOnlyList<Donation> donations, CancellationToken cancellationToken)
    {
        if (donations.Count == 0)
        {
            return [];
        }

        var safehouseMap = await GetSafehouseNamesAsync(donations.Select(item => item.SafehouseId).ToList(), cancellationToken);
        var supporterMap = await GetSupporterNamesAsync(donations.Select(item => item.SupporterId).ToList(), cancellationToken);

        var donationIds = donations.Select(item => item.DonationId).ToList();
        var allocationTotals = await dbContext.DonationAllocations.AsNoTracking()
            .Where(item => item.DonationId.HasValue && donationIds.Contains(item.DonationId.Value))
            .GroupBy(item => item.DonationId!.Value)
            .Select(group => new
            {
                DonationId = group.Key,
                TotalAllocated = group.Sum(item => item.AmountAllocated) ?? 0m
            })
            .ToListAsync(cancellationToken);
        var allocationMap = allocationTotals.ToDictionary(item => item.DonationId, item => decimal.Round(item.TotalAllocated, 2));

        return donations.Select(donation =>
        {
            var totalAllocated = allocationMap.TryGetValue(donation.DonationId, out var allocated) ? allocated : 0m;
            var amount = donation.Amount.HasValue ? decimal.Round(donation.Amount.Value, 2) : (decimal?)null;
            return new DonationSummaryRecord(
                donation.DonationId,
                donation.SupporterId,
                donation.DonationType,
                donation.DonationDate,
                donation.IsRecurring,
                donation.CampaignId,
                donation.CampaignName,
                donation.ChannelSource,
                donation.CurrencyCode,
                amount,
                donation.EstimatedValue.HasValue ? decimal.Round(donation.EstimatedValue.Value, 2) : null,
                donation.ImpactUnit,
                donation.Notes,
                donation.ReferralPostId,
                donation.SafehouseId,
                donation.SafehouseId.HasValue && safehouseMap.TryGetValue(donation.SafehouseId.Value, out var safehouseName) ? safehouseName : null,
                donation.SupporterId.HasValue && supporterMap.TryGetValue(donation.SupporterId.Value, out var supporterName) ? supporterName : null,
                totalAllocated);
        }).ToList();
    }

    private async Task<Dictionary<long, string?>> GetSafehouseNamesAsync(IEnumerable<long?> safehouseIds, CancellationToken cancellationToken)
    {
        var ids = safehouseIds.Where(id => id.HasValue).Select(id => id!.Value).Distinct().ToList();
        if (ids.Count == 0)
        {
            return new Dictionary<long, string?>();
        }

        return await dbContext.Safehouses.AsNoTracking()
            .Where(item => ids.Contains(item.SafehouseId))
            .ToDictionaryAsync(item => item.SafehouseId, item => item.Name, cancellationToken);
    }

    private async Task<Dictionary<long, string?>> GetSupporterNamesAsync(IEnumerable<long?> supporterIds, CancellationToken cancellationToken)
    {
        var ids = supporterIds.Where(id => id.HasValue).Select(id => id!.Value).Distinct().ToList();
        if (ids.Count == 0)
        {
            return new Dictionary<long, string?>();
        }

        var userNamesBySupporterId = (await dbContext.Users.AsNoTracking()
            .Where(item => item.SupporterId.HasValue && ids.Contains(item.SupporterId.Value))
            .Select(item => new
            {
                SupporterId = item.SupporterId!.Value,
                UserName = ((item.FirstName ?? string.Empty) + " " + (item.LastName ?? string.Empty)).Trim(),
                item.Username,
                item.Email
            })
            .ToListAsync(cancellationToken))
            .GroupBy(item => item.SupporterId)
            .ToDictionary(
                group => group.Key,
                group => group
                    .Select(item => !string.IsNullOrWhiteSpace(item.UserName)
                        ? item.UserName
                        : (!string.IsNullOrWhiteSpace(item.Username) ? item.Username : item.Email))
                    .FirstOrDefault(name => !string.IsNullOrWhiteSpace(name)));

        var supporterNamesById = await dbContext.Supporters.AsNoTracking()
            .Where(item => ids.Contains(item.SupporterId))
            .Select(item => new
            {
                item.SupporterId,
                SupporterName = item.DisplayName
                                ?? (((item.FirstName ?? string.Empty) + " " + (item.LastName ?? string.Empty)).Trim().Length > 0
                                    ? ((item.FirstName ?? string.Empty) + " " + (item.LastName ?? string.Empty)).Trim()
                                    : item.Email)
            })
            .ToDictionaryAsync(item => item.SupporterId, item => item.SupporterName, cancellationToken);

        foreach (var supporterId in ids)
        {
            if (!supporterNamesById.TryGetValue(supporterId, out var supporterName) || string.IsNullOrWhiteSpace(supporterName))
            {
                if (userNamesBySupporterId.TryGetValue(supporterId, out var userName) && !string.IsNullOrWhiteSpace(userName))
                {
                    supporterNamesById[supporterId] = userName;
                }
            }
        }

        return supporterNamesById;
    }

    private static string ResolveSupporterDisplayName(Supporter supporter)
    {
        if (!string.IsNullOrWhiteSpace(supporter.DisplayName))
        {
            return supporter.DisplayName;
        }

        var fullName = string.Join(" ", new[] { supporter.FirstName, supporter.LastName }
            .Where(part => !string.IsNullOrWhiteSpace(part))).Trim();
        if (!string.IsNullOrWhiteSpace(fullName))
        {
            return fullName;
        }

        if (!string.IsNullOrWhiteSpace(supporter.OrganizationName))
        {
            return supporter.OrganizationName;
        }

        return supporter.Email ?? $"Supporter #{supporter.SupporterId}";
    }

    private void ApplySupporterDonationSideEffects(Supporter supporter, DateOnly donationDate, bool isRecurring)
    {
        var values = dbContext.Entry(supporter).CurrentValues;
        var existingFirstDonationDate = supporter.FirstDonationDate;
        if (!existingFirstDonationDate.HasValue || donationDate < existingFirstDonationDate.Value)
        {
            values[nameof(Supporter.FirstDonationDate)] = donationDate;
        }

        if (isRecurring && !supporter.RecurringEnabled)
        {
            values[nameof(Supporter.RecurringEnabled)] = true;
        }
    }

    private async Task<long> GetNextTableIdAsync(
        string tableName,
        string columnName,
        IDbContextTransaction transaction,
        CancellationToken cancellationToken)
    {
        var connection = (NpgsqlConnection)dbContext.Database.GetDbConnection();
        if (connection.State != System.Data.ConnectionState.Open)
        {
            await connection.OpenAsync(cancellationToken);
        }

        return await GetNextTableIdAsync(
            connection,
            (NpgsqlTransaction)transaction.GetDbTransaction(),
            tableName,
            columnName,
            cancellationToken);
    }

    private static async Task<long> GetNextTableIdAsync(
        NpgsqlConnection connection,
        NpgsqlTransaction transaction,
        string tableName,
        string columnName,
        CancellationToken cancellationToken)
    {
        await using var lockCommand = connection.CreateCommand();
        lockCommand.Transaction = transaction;
        lockCommand.CommandText = $"LOCK TABLE {tableName} IN EXCLUSIVE MODE;";
        await lockCommand.ExecuteNonQueryAsync(cancellationToken);

        await using var nextIdCommand = connection.CreateCommand();
        nextIdCommand.Transaction = transaction;
        nextIdCommand.CommandText = $"SELECT COALESCE(MAX({columnName}), 0) + 1 FROM {tableName};";
        var nextId = await nextIdCommand.ExecuteScalarAsync(cancellationToken);
        return Convert.ToInt64(nextId);
    }

    private static void AddParameter(NpgsqlCommand command, string name, object? value)
    {
        command.Parameters.AddWithValue(name, value ?? DBNull.Value);
    }

    private static bool TryMapField(string key, JsonElement value, out string propertyName, out object? parsedValue)
    {
        propertyName = string.Empty;
        parsedValue = null;

        switch (key)
        {
            case "supporterId":
                propertyName = nameof(Donation.SupporterId);
                parsedValue = ReadNullableLong(value);
                return true;
            case "campaignId":
                propertyName = nameof(Donation.CampaignId);
                parsedValue = ReadNullableLong(value);
                return true;
            case "donationType":
                propertyName = nameof(Donation.DonationType);
                parsedValue = ReadNullableString(value);
                return true;
            case "donationDate":
                propertyName = nameof(Donation.DonationDate);
                parsedValue = ReadNullableDateOnly(value);
                return true;
            case "isRecurring":
                propertyName = nameof(Donation.IsRecurring);
                parsedValue = ReadNullableBool(value);
                return true;
            case "campaignName":
            case "campaign":
                propertyName = nameof(Donation.CampaignName);
                parsedValue = ReadNullableString(value);
                return true;
            case "channelSource":
                propertyName = nameof(Donation.ChannelSource);
                parsedValue = ReadNullableString(value);
                return true;
            case "currencyCode":
            case "currency":
                propertyName = nameof(Donation.CurrencyCode);
                parsedValue = ReadNullableString(value);
                return true;
            case "amount":
                propertyName = nameof(Donation.Amount);
                parsedValue = ReadNullableDecimal(value);
                return true;
            case "estimatedValue":
                propertyName = nameof(Donation.EstimatedValue);
                parsedValue = ReadNullableDecimal(value);
                return true;
            case "impactUnit":
                propertyName = nameof(Donation.ImpactUnit);
                parsedValue = ReadNullableString(value);
                return true;
            case "notes":
                propertyName = nameof(Donation.Notes);
                parsedValue = ReadNullableString(value);
                return true;
            case "referralPostId":
                propertyName = nameof(Donation.ReferralPostId);
                parsedValue = ReadNullableLong(value);
                return true;
            case "safehouseId":
                propertyName = nameof(Donation.SafehouseId);
                parsedValue = ReadNullableLong(value);
                return true;
            default:
                return false;
        }
    }

    private static string? ReadNullableString(JsonElement value) =>
        value.ValueKind == JsonValueKind.Null ? null : value.GetString();

    private static long? ReadNullableLong(JsonElement value)
    {
        if (value.ValueKind == JsonValueKind.Null)
        {
            return null;
        }

        return value.ValueKind switch
        {
            JsonValueKind.Number when value.TryGetInt64(out var longValue) => longValue,
            JsonValueKind.String when long.TryParse(value.GetString(), out var stringValue) => stringValue,
            _ => throw new InvalidOperationException("The request body is invalid.")
        };
    }

    private static decimal? ReadNullableDecimal(JsonElement value)
    {
        if (value.ValueKind == JsonValueKind.Null)
        {
            return null;
        }

        return value.ValueKind switch
        {
            JsonValueKind.Number when value.TryGetDecimal(out var decimalValue) => decimal.Round(decimalValue, 2),
            JsonValueKind.String when decimal.TryParse(value.GetString(), out var stringValue) => decimal.Round(stringValue, 2),
            _ => throw new InvalidOperationException("The request body is invalid.")
        };
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

    private static bool? ReadNullableBool(JsonElement value)
    {
        if (value.ValueKind == JsonValueKind.Null)
        {
            return null;
        }

        if (value.ValueKind == JsonValueKind.True || value.ValueKind == JsonValueKind.False)
        {
            return value.GetBoolean();
        }

        throw new InvalidOperationException("The request body is invalid.");
    }
}
