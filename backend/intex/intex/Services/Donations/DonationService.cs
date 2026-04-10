using System.Globalization;
using backend.intex.DTOs.Common;
using backend.intex.DTOs.Donations;
using backend.intex.Entities.Database;
using backend.intex.Infrastructure.Auth;
using backend.intex.Repositories.Abstractions;
using backend.intex.Services.Abstractions;

namespace backend.intex.Services.Donations;

public sealed class DonationService(IDonationRepository donationRepository) : IDonationService
{
    private static readonly HashSet<string> SupporterTypes = new([
        "MonetaryDonor", "InKindDonor", "Volunteer", "SkillsContributor", "SocialMediaAdvocate", "PartnerOrganization"
    ], StringComparer.Ordinal);

    private static readonly HashSet<string> RelationshipTypes = new([
        "Local", "International", "PartnerOrganization"
    ], StringComparer.Ordinal);

    private static readonly HashSet<string> SupporterStatuses = new([
        "Active", "Inactive"
    ], StringComparer.Ordinal);

    private static readonly HashSet<string> AcquisitionChannels = new([
        "Website", "SocialMedia", "Event", "WordOfMouth", "PartnerReferral", "Church"
    ], StringComparer.Ordinal);

    private static readonly HashSet<string> DonationTypes = new([
        "Monetary", "InKind", "Time", "Skills", "SocialMedia"
    ], StringComparer.Ordinal);

    private static readonly HashSet<string> ChannelSources = new([
        "Campaign", "Event", "Direct", "SocialMedia", "PartnerReferral"
    ], StringComparer.Ordinal);

    private static readonly HashSet<string> ImpactUnits = new([
        "pesos", "items", "hours", "campaigns"
    ], StringComparer.Ordinal);

    private static readonly HashSet<string> ItemCategories = new([
        "Food", "Supplies", "Clothing", "SchoolMaterials", "Hygiene", "Furniture", "Medical"
    ], StringComparer.Ordinal);

    private static readonly HashSet<string> UnitOfMeasures = new([
        "pcs", "boxes", "kg", "sets", "packs"
    ], StringComparer.Ordinal);

    private static readonly HashSet<string> IntendedUses = new([
        "Meals", "Education", "Shelter", "Hygiene", "Health"
    ], StringComparer.Ordinal);

    private static readonly HashSet<string> ReceivedConditions = new([
        "New", "Good", "Fair"
    ], StringComparer.Ordinal);

    private static readonly HashSet<string> ProgramAreas = new([
        "Education", "Wellbeing", "Operations", "Transport", "Maintenance", "Outreach"
    ], StringComparer.Ordinal);

    public async Task<IReadOnlyList<PriorDonorSupporterOptionDto>> SearchPriorDonorSupportersAsync(string? search, int? limit, CancellationToken cancellationToken = default)
    {
        var resolvedLimit = Math.Clamp(limit ?? 20, 1, 50);
        var supporters = await donationRepository.SearchPriorDonorSupportersAsync(search, resolvedLimit, cancellationToken);
        return supporters
            .Select(item => new PriorDonorSupporterOptionDto(
                item.SupporterId,
                item.DisplayName,
                item.Email,
                item.DonationCount,
                decimal.Round(item.LifetimeGiving, 2)))
            .ToList();
    }

    public async Task<StandardPagedResponse<DonationResponseDto>> ListMyLedgerAsync(long? supporterId, ListDonationLedgerQuery query, CancellationToken cancellationToken = default)
    {
        var page = query.Page <= 0 ? 1 : query.Page;
        var pageSize = ResolvePageSize(query.PageSize, query.Limit);
        if (!supporterId.HasValue)
        {
            return new StandardPagedResponse<DonationResponseDto>(
                [],
                0,
                new StandardPaginationMeta(page, pageSize, 0, false, page > 1));
        }

        var (donations, total) = await donationRepository.ListMyLedgerAsync(supporterId.Value, page, pageSize, cancellationToken);
        return new StandardPagedResponse<DonationResponseDto>(
            donations.Select(MapLedger).ToList(),
            total,
            BuildPagination(page, pageSize, total));
    }

    public async Task<DonationTrendsResponse> GetDonationTrendsAsync(int months, CancellationToken cancellationToken = default)
    {
        var resolvedMonths = Math.Clamp(months <= 0 ? 12 : months, 1, 24);
        var trends = await donationRepository.ListDonationTrendsAsync(resolvedMonths, cancellationToken);
        return new DonationTrendsResponse(trends.Select(item => new DonationTrendDto(
            item.Month,
            item.Month,
            item.TotalAmount,
            item.TotalAmount,
            item.DonationCount,
            item.DonationCount,
            item.AvgAmount)).ToList());
    }

    public async Task<StandardPagedResponse<DonationResponseDto>> ListDonationsAsync(ListDonationsQuery query, string? role, IReadOnlyList<long> assignedSafehouses, CancellationToken cancellationToken = default)
    {
        var page = query.Page <= 0 ? 1 : query.Page;
        var pageSize = ResolvePageSize(query.PageSize, query.Limit);
        var enforceScope = role is BeaconRoles.Staff or BeaconRoles.Admin;
        var (donations, total) = await donationRepository.ListDonationsAsync(page, pageSize, query.FundType, assignedSafehouses, enforceScope, cancellationToken);

        return new StandardPagedResponse<DonationResponseDto>(
            donations.Select(MapSummary).ToList(),
            total,
            BuildPagination(page, pageSize, total));
    }

    public async Task<DonationResponseDto?> GetDonationAsync(long donationId, string? role, IReadOnlyList<long> assignedSafehouses, CancellationToken cancellationToken = default)
    {
        var donation = await donationRepository.GetDonationAsync(donationId, cancellationToken);
        if (donation is null)
        {
            return null;
        }

        if (role is BeaconRoles.Staff or BeaconRoles.Admin && assignedSafehouses.Count > 0)
        {
            if (!donation.SafehouseId.HasValue || !assignedSafehouses.Contains(donation.SafehouseId.Value))
            {
                return null;
            }
        }

        return MapSummary(donation);
    }

    public async Task<DonationResponseDto> CreateDonationAsync(CreateDonationRequest request, CancellationToken cancellationToken = default)
    {
        var created = await donationRepository.CreateDonationAsync(new Donation
        {
            SupporterId = request.SupporterId,
            CampaignId = request.CampaignId,
            DonationType = request.DonationType,
            DonationDate = request.DonationDate,
            IsRecurring = request.IsRecurring,
            CampaignName = request.CampaignName,
            ChannelSource = request.ChannelSource,
            CurrencyCode = request.CurrencyCode,
            Amount = request.Amount.HasValue ? decimal.Round(request.Amount.Value, 2) : null,
            EstimatedValue = request.EstimatedValue.HasValue ? decimal.Round(request.EstimatedValue.Value, 2) : null,
            ImpactUnit = request.ImpactUnit,
            Notes = request.Notes,
            ReferralPostId = request.ReferralPostId,
            SafehouseId = request.SafehouseId
        }, cancellationToken);

        var summary = await donationRepository.GetDonationAsync(created.DonationId, cancellationToken);
        return summary is null ? MapEntity(created) : MapSummary(summary);
    }

    public async Task<(DonationResponseDto? Response, string? ErrorMessage)> CreateAdminDonationEntryAsync(CreateAdminDonationRequest request, string? role, IReadOnlyList<long> assignedSafehouses, CancellationToken cancellationToken = default)
    {
        var supporterError = await ValidateSupporterSelectionAsync(request, cancellationToken);
        if (supporterError is not null)
        {
            return (null, supporterError);
        }

        var donationType = request.DonationType?.Trim();
        if (string.IsNullOrWhiteSpace(donationType) || !DonationTypes.Contains(donationType))
        {
            return (null, "donationType must be one of Monetary, InKind, Time, Skills, SocialMedia");
        }

        var channelSource = request.ChannelSource?.Trim();
        if (string.IsNullOrWhiteSpace(channelSource) || !ChannelSources.Contains(channelSource))
        {
            return (null, "channelSource must be one of Campaign, Event, Direct, SocialMedia, PartnerReferral");
        }

        var donationDate = request.DonationDate ?? DateOnly.FromDateTime(DateTime.UtcNow);
        var safehouseError = ValidateSafehouseScope(request.SafehouseId, role, assignedSafehouses);
        if (safehouseError is not null)
        {
            return (null, safehouseError);
        }

        var inKindItems = request.InKindItems?
            .Where(static item => item is not null)
            .ToList() ?? [];
        var allocations = request.Allocations?
            .Where(static item => item is not null)
            .ToList() ?? [];

        if (allocations.Count == 0)
        {
            return (null, "At least one donation allocation is required");
        }

        var amount = request.Amount.HasValue ? decimal.Round(request.Amount.Value, 2) : (decimal?)null;
        var estimatedValue = request.EstimatedValue.HasValue ? decimal.Round(request.EstimatedValue.Value, 2) : (decimal?)null;
        string? currencyCode = request.CurrencyCode?.Trim();
        string? impactUnit = request.ImpactUnit?.Trim();

        switch (donationType)
        {
            case "Monetary":
                if (!amount.HasValue || amount.Value <= 0)
                {
                    return (null, "amount is required for Monetary donations");
                }

                currencyCode = string.IsNullOrWhiteSpace(currencyCode) ? "PHP" : currencyCode;
                if (!string.Equals(currencyCode, "PHP", StringComparison.Ordinal))
                {
                    return (null, "currencyCode must be PHP for Monetary donations");
                }

                impactUnit ??= "pesos";
                estimatedValue = amount;
                break;
            case "InKind":
                if (inKindItems.Count == 0)
                {
                    return (null, "At least one in-kind item is required for InKind donations");
                }

                currencyCode = null;
                impactUnit ??= "items";
                amount = null;
                estimatedValue = decimal.Round(inKindItems.Sum(item =>
                    (item.Quantity ?? 0m) * (item.EstimatedUnitValue ?? 0m)), 2);
                break;
            default:
                currencyCode = null;
                if (amount.HasValue)
                {
                    return (null, "amount is only allowed for Monetary donations");
                }

                if (!estimatedValue.HasValue || estimatedValue.Value <= 0)
                {
                    return (null, "estimatedValue is required for non-monetary donations");
                }

                if (string.IsNullOrWhiteSpace(impactUnit))
                {
                    impactUnit = donationType is "Time" or "Skills" ? "hours" : "campaigns";
                }
                break;
        }

        if (!string.IsNullOrWhiteSpace(impactUnit) && !ImpactUnits.Contains(impactUnit))
        {
            return (null, "impactUnit must be one of pesos, items, hours, campaigns");
        }

        var inKindCommands = new List<AdminDonationCreateInKindItemCommand>();
        foreach (var item in inKindItems)
        {
            var itemName = item.ItemName?.Trim();
            if (string.IsNullOrWhiteSpace(itemName))
            {
                return (null, "Each in-kind item requires itemName");
            }

            if (!item.Quantity.HasValue || item.Quantity.Value <= 0)
            {
                return (null, "Each in-kind item requires quantity greater than zero");
            }

            if (!string.IsNullOrWhiteSpace(item.ItemCategory) && !ItemCategories.Contains(item.ItemCategory))
            {
                return (null, "itemCategory must be one of Food, Supplies, Clothing, SchoolMaterials, Hygiene, Furniture, Medical");
            }

            if (!string.IsNullOrWhiteSpace(item.UnitOfMeasure) && !UnitOfMeasures.Contains(item.UnitOfMeasure))
            {
                return (null, "unitOfMeasure must be one of pcs, boxes, kg, sets, packs");
            }

            if (!string.IsNullOrWhiteSpace(item.IntendedUse) && !IntendedUses.Contains(item.IntendedUse))
            {
                return (null, "intendedUse must be one of Meals, Education, Shelter, Hygiene, Health");
            }

            if (!string.IsNullOrWhiteSpace(item.ReceivedCondition) && !ReceivedConditions.Contains(item.ReceivedCondition))
            {
                return (null, "receivedCondition must be one of New, Good, Fair");
            }

            inKindCommands.Add(new AdminDonationCreateInKindItemCommand(
                itemName,
                item.ItemCategory?.Trim(),
                decimal.Round(item.Quantity.Value, 2),
                item.UnitOfMeasure?.Trim(),
                item.EstimatedUnitValue.HasValue ? decimal.Round(item.EstimatedUnitValue.Value, 2) : null,
                item.IntendedUse?.Trim(),
                item.ReceivedCondition?.Trim()));
        }

        var allocationCommands = new List<AdminDonationCreateAllocationCommand>();
        foreach (var allocation in allocations)
        {
            var programArea = allocation.ProgramArea?.Trim();
            if (string.IsNullOrWhiteSpace(programArea) || !ProgramAreas.Contains(programArea))
            {
                return (null, "programArea must be one of Education, Wellbeing, Operations, Transport, Maintenance, Outreach");
            }

            if (!allocation.AmountAllocated.HasValue || allocation.AmountAllocated.Value <= 0)
            {
                return (null, "Each allocation requires amountAllocated greater than zero");
            }

            var effectiveSafehouseId = request.SafehouseId ?? allocation.SafehouseId;
            if (!effectiveSafehouseId.HasValue)
            {
                return (null, "Each allocation requires a safehouse when the donation is not directed to a specific safehouse");
            }

            if (request.SafehouseId.HasValue && allocation.SafehouseId.HasValue && allocation.SafehouseId.Value != request.SafehouseId.Value)
            {
                return (null, "Allocation safehouse must match the donation safehouse for directed donations");
            }

            if (role is BeaconRoles.Staff or BeaconRoles.Admin &&
                assignedSafehouses.Count > 0 &&
                !assignedSafehouses.Contains(effectiveSafehouseId.Value))
            {
                return (null, "Allocations must stay within your assigned safehouses");
            }

            allocationCommands.Add(new AdminDonationCreateAllocationCommand(
                allocation.SafehouseId ?? request.SafehouseId,
                programArea,
                decimal.Round(allocation.AmountAllocated.Value, 2),
                allocation.AllocationDate ?? donationDate,
                allocation.AllocationNotes?.Trim()));
        }

        var allocatableTotal = amount ?? estimatedValue ?? 0m;
        if (allocatableTotal > 0m)
        {
            var totalAllocated = allocationCommands.Sum(item => item.AmountAllocated);
            if (totalAllocated > allocatableTotal + 0.01m)
            {
                return (null, "Allocated total cannot exceed the donation value");
            }
        }

        string? supporterCommandError = null;
        var supporterCommand = request.Supporter is null
            ? null
            : BuildSupporterCommand(request.Supporter, donationDate, request.IsRecurring ?? false, out supporterCommandError);
        if (supporterCommandError is not null)
        {
            return (null, supporterCommandError);
        }

        var summary = await donationRepository.CreateAdministrativeDonationAsync(new AdminDonationCreateCommand(
            request.ExistingSupporterId,
            supporterCommand,
            request.CampaignId,
            donationType,
            donationDate,
            channelSource,
            currencyCode,
            amount,
            estimatedValue,
            impactUnit,
            request.IsRecurring ?? false,
            request.CampaignName?.Trim(),
            request.Notes?.Trim(),
            request.ReferralPostId,
            request.SafehouseId,
            inKindCommands,
            allocationCommands), cancellationToken);

        return summary is null
            ? (null, "Failed to record donation")
            : (MapSummary(summary), null);
    }

    public async Task<DonationResponseDto?> UpdateDonationAsync(long donationId, UpdateDonationRequest request, CancellationToken cancellationToken = default)
    {
        var updated = await donationRepository.UpdateDonationAsync(donationId, request.Fields, cancellationToken);
        if (updated is null)
        {
            return null;
        }

        var summary = await donationRepository.GetDonationAsync(donationId, cancellationToken);
        return summary is null ? MapEntity(updated) : MapSummary(summary);
    }

    public Task<bool> DeleteDonationAsync(long donationId, CancellationToken cancellationToken = default) =>
        donationRepository.DeleteDonationAsync(donationId, cancellationToken);

    public async Task<(DonationWithMessageResponse? Response, string? ErrorMessage)> GiveDonationAsync(long? supporterId, GiveDonationRequest request, CancellationToken cancellationToken = default)
    {
        if (!supporterId.HasValue)
        {
            return (null, "No donor profile linked to this account");
        }

        if (!request.Amount.HasValue || request.Amount.Value <= 0)
        {
            return (null, "A valid donation amount is required");
        }

        var amount = decimal.Round(request.Amount.Value, 2);
        var created = await donationRepository.CreateDonationAsync(new Donation
        {
            SupporterId = supporterId.Value,
            DonationType = "monetary",
            DonationDate = DateOnly.FromDateTime(DateTime.UtcNow),
            Amount = amount,
            CurrencyCode = string.IsNullOrWhiteSpace(request.CurrencyCode) ? "PHP" : request.CurrencyCode,
            ChannelSource = string.IsNullOrWhiteSpace(request.ChannelSource) ? "online" : request.ChannelSource,
            Notes = request.Notes,
            IsRecurring = request.IsRecurring ?? false,
            SafehouseId = request.SafehouseId
        }, cancellationToken);

        var summary = await donationRepository.GetDonationAsync(created.DonationId, cancellationToken);
        var response = summary is null ? MapEntity(created) : MapSummary(summary);
        var destination = request.SafehouseId.HasValue
            ? "This donation will go directly to the safehouse you selected."
            : "This donation goes to the General Fund and will be allocated by our team.";

        return (new DonationWithMessageResponse(
            response.DonationId,
            response.Id,
            response.SupporterId,
            response.DonationType,
            response.DonationDate,
            response.IsRecurring,
            response.CampaignId,
            response.CampaignName,
            response.Campaign,
            response.ChannelSource,
            response.CurrencyCode,
            response.Currency,
            response.Amount,
            response.EstimatedValue,
            response.ImpactUnit,
            response.Notes,
            response.ReferralPostId,
            response.SafehouseId,
            response.SafehouseName,
            response.SupporterName,
            response.TotalAllocated,
            response.Unallocated,
            response.IsGeneralFund,
            $"Thank you! Your {(request.IsRecurring ?? false ? "recurring " : string.Empty)}donation of ₱{amount.ToString("#,0.##", CultureInfo.InvariantCulture)} has been recorded. {destination}"), null);
    }

    public async Task<(PublicDonationResponse? Response, string? ErrorMessage)> CreatePublicDonationAsync(PublicDonationRequest request, CancellationToken cancellationToken = default)
    {
        if (!request.Amount.HasValue || request.Amount.Value <= 0)
        {
            return (null, "A valid donation amount is required");
        }

        var amount = decimal.Round(request.Amount.Value, 2);
        var notes = string.Join(" | ", new[]
        {
            !string.IsNullOrWhiteSpace(request.Name) ? $"From: {request.Name}" : null,
            !string.IsNullOrWhiteSpace(request.Email) ? $"Email: {request.Email}" : null,
            !string.IsNullOrWhiteSpace(request.Notes) ? request.Notes : null
        }.Where(static item => !string.IsNullOrWhiteSpace(item)));

        var created = await donationRepository.CreateDonationAsync(new Donation
        {
            SupporterId = request.SupporterId,
            DonationType = "monetary",
            DonationDate = DateOnly.FromDateTime(DateTime.UtcNow),
            Amount = amount,
            CurrencyCode = string.IsNullOrWhiteSpace(request.CurrencyCode) ? "PHP" : request.CurrencyCode,
            ChannelSource = "online",
            Notes = string.IsNullOrWhiteSpace(notes) ? null : notes,
            IsRecurring = request.IsRecurring ?? false,
            SafehouseId = request.SafehouseId
        }, cancellationToken);

        return (new PublicDonationResponse(created.DonationId, "Thank you for your donation!"), null);
    }

    public async Task<DonationAllocationsResponse> ListDonationAllocationsAsync(ListDonationAllocationsQuery query, string? role, IReadOnlyList<long> assignedSafehouses, CancellationToken cancellationToken = default)
    {
        var enforceScope = role is BeaconRoles.Staff or BeaconRoles.Admin;
        var allocations = await donationRepository.ListDonationAllocationsAsync(query.DonationId, assignedSafehouses, enforceScope, cancellationToken);
        return new DonationAllocationsResponse(
            allocations.Select(MapAllocation).ToList(),
            allocations.Count);
    }

    public async Task<(DonationAllocationResponseDto? Response, string? ErrorMessage)> CreateDonationAllocationAsync(CreateDonationAllocationRequest request, string? role, IReadOnlyList<long> assignedSafehouses, CancellationToken cancellationToken = default)
    {
        if (!request.DonationId.HasValue || string.IsNullOrWhiteSpace(request.ProgramArea) || !request.AmountAllocated.HasValue || request.AmountAllocated.Value <= 0)
        {
            return (null, "donationId, programArea and amountAllocated (>0) are required");
        }

        var donation = await donationRepository.GetDonationAsync(request.DonationId.Value, cancellationToken);
        if (donation is null)
        {
            return (null, "Not found");
        }

        var effectiveSafehouseId = request.SafehouseId ?? donation.SafehouseId;
        if (!effectiveSafehouseId.HasValue)
        {
            return (null, "safehouseId is required");
        }

        if (!await donationRepository.SafehouseExistsAsync(effectiveSafehouseId.Value, cancellationToken))
        {
            return (null, "safehouseId was not found");
        }

        var allocatableTotal = donation.Amount ?? donation.EstimatedValue;
        if (request.AmountAllocated.Value > 0 && allocatableTotal.HasValue)
        {
            var existingAllocations = await donationRepository.ListDonationAllocationsAsync(request.DonationId.Value, [], false, cancellationToken);
            var allocatedTotal = existingAllocations.Sum(item => item.AmountAllocated ?? 0m);
            if (decimal.Round(allocatedTotal + request.AmountAllocated.Value, 2) > decimal.Round(allocatableTotal.Value, 2) + 0.01m)
            {
                return (null, "amountAllocated exceeds the remaining donation balance");
            }
        }

        if (role is BeaconRoles.Staff or BeaconRoles.Admin && assignedSafehouses.Count > 0)
        {
            if (!assignedSafehouses.Contains(effectiveSafehouseId.Value))
            {
                return (null, "Not found");
            }
        }

        var created = await donationRepository.CreateDonationAllocationAsync(new DonationAllocation
        {
            DonationId = request.DonationId,
            SafehouseId = effectiveSafehouseId,
            ProgramArea = request.ProgramArea.Trim(),
            AmountAllocated = decimal.Round(request.AmountAllocated.Value, 2),
            AllocationDate = DateOnly.FromDateTime(DateTime.UtcNow),
            AllocationNotes = request.AllocationNotes
        }, cancellationToken);

        return created is null ? (null, "Failed to create allocation") : (MapAllocation(created), null);
    }

    public async Task<bool> DeleteDonationAllocationAsync(long allocationId, string? role, IReadOnlyList<long> assignedSafehouses, CancellationToken cancellationToken = default)
    {
        if (role is BeaconRoles.Staff or BeaconRoles.Admin && assignedSafehouses.Count > 0)
        {
            var allocation = await donationRepository.GetDonationAllocationAsync(allocationId, cancellationToken);
            if (allocation is null)
            {
                return false;
            }

            var effectiveSafehouseId = allocation.SafehouseId ?? allocation.DonationSafehouseId;
            if (!effectiveSafehouseId.HasValue || !assignedSafehouses.Contains(effectiveSafehouseId.Value))
            {
                return false;
            }
        }

        return await donationRepository.DeleteDonationAllocationAsync(allocationId, cancellationToken);
    }

    private static DonationResponseDto MapLedger(DonationLedgerRecord donation) =>
        new(
            donation.DonationId,
            donation.DonationId,
            donation.SupporterId,
            donation.DonationType,
            donation.DonationDate?.ToString("yyyy-MM-dd"),
            donation.IsRecurring,
            null,
            donation.CampaignName,
            donation.CampaignName,
            donation.ChannelSource,
            donation.CurrencyCode,
            donation.CurrencyCode,
            donation.Amount.HasValue ? decimal.Round(donation.Amount.Value, 2) : (decimal?)null,
            donation.EstimatedValue.HasValue ? decimal.Round(donation.EstimatedValue.Value, 2) : null,
            donation.ImpactUnit,
            donation.Notes,
            donation.ReferralPostId,
            donation.SafehouseId,
            donation.SafehouseName,
            null,
            null,
            null,
            donation.SafehouseId is null);

    private static DonationResponseDto MapSummary(DonationSummaryRecord donation)
    {
        var amount = donation.Amount.HasValue ? decimal.Round(donation.Amount.Value, 2) : (decimal?)null;
        var totalAllocated = decimal.Round(donation.TotalAllocated, 2);
        var unallocated = amount.HasValue ? decimal.Round(Math.Max(0m, amount.Value - totalAllocated), 2) : (decimal?)null;
        return new(
            donation.DonationId,
            donation.DonationId,
            donation.SupporterId,
            donation.DonationType,
            donation.DonationDate?.ToString("yyyy-MM-dd"),
            donation.IsRecurring,
            donation.CampaignId,
            donation.CampaignName,
            donation.CampaignName,
            donation.ChannelSource,
            donation.CurrencyCode,
            donation.CurrencyCode,
            amount,
            donation.EstimatedValue.HasValue ? decimal.Round(donation.EstimatedValue.Value, 2) : null,
            donation.ImpactUnit,
            donation.Notes,
            donation.ReferralPostId,
            donation.SafehouseId,
            donation.SafehouseName,
            donation.SupporterName,
            totalAllocated,
            unallocated,
            donation.SafehouseId is null);
    }

    private static DonationResponseDto MapEntity(Donation donation) =>
        new(
            donation.DonationId,
            donation.DonationId,
            donation.SupporterId,
            donation.DonationType,
            donation.DonationDate?.ToString("yyyy-MM-dd"),
            donation.IsRecurring,
            donation.CampaignId,
            donation.CampaignName,
            donation.CampaignName,
            donation.ChannelSource,
            donation.CurrencyCode,
            donation.CurrencyCode,
            donation.Amount.HasValue ? decimal.Round(donation.Amount.Value, 2) : null,
            donation.EstimatedValue.HasValue ? decimal.Round(donation.EstimatedValue.Value, 2) : null,
            donation.ImpactUnit,
            donation.Notes,
            donation.ReferralPostId,
            donation.SafehouseId,
            null,
            null,
            0m,
            donation.Amount.HasValue ? decimal.Round(donation.Amount.Value, 2) : null,
            donation.SafehouseId is null);

    private static DonationAllocationResponseDto MapAllocation(DonationAllocationRecord allocation) =>
        new(
            allocation.AllocationId,
            allocation.DonationId,
            allocation.SafehouseId,
            allocation.ProgramArea,
            allocation.AmountAllocated.HasValue ? decimal.Round(allocation.AmountAllocated.Value, 2) : null,
            allocation.AllocationDate?.ToString("yyyy-MM-dd"),
            allocation.AllocationNotes,
            allocation.SafehouseName);

    private static StandardPaginationMeta BuildPagination(int page, int pageSize, int total)
    {
        var totalPages = total == 0 ? 0 : (int)Math.Ceiling(total / (double)pageSize);
        return new StandardPaginationMeta(page, pageSize, totalPages, page < totalPages, page > 1);
    }

    private static int ResolvePageSize(int? pageSize, int? limit)
    {
        var resolved = pageSize ?? limit ?? 20;
        return Math.Clamp(resolved, 1, 100);
    }

    private async Task<string?> ValidateSupporterSelectionAsync(CreateAdminDonationRequest request, CancellationToken cancellationToken)
    {
        var hasExisting = request.ExistingSupporterId.HasValue;
        var hasNew = request.Supporter is not null;

        if (hasExisting == hasNew)
        {
            return "Provide either existingSupporterId or a new supporter payload";
        }

        if (hasExisting && !await donationRepository.SupporterExistsAsync(request.ExistingSupporterId!.Value, cancellationToken))
        {
            return "Selected supporter was not found";
        }

        return null;
    }

    private static string? ValidateSafehouseScope(long? safehouseId, string? role, IReadOnlyList<long> assignedSafehouses)
    {
        if (role is not BeaconRoles.Staff and not BeaconRoles.Admin)
        {
            return null;
        }

        if (!safehouseId.HasValue)
        {
            return "A directed safehouse is required for admin-entered donations";
        }

        if (assignedSafehouses.Count > 0 && !assignedSafehouses.Contains(safehouseId.Value))
        {
            return "Donations must be assigned to one of your safehouses";
        }

        return null;
    }

    private static AdminDonationCreateSupporterCommand? BuildSupporterCommand(
        AdminDonationSupporterRequest request,
        DateOnly donationDate,
        bool recurringEnabled,
        out string? errorMessage)
    {
        errorMessage = null;

        if (!string.IsNullOrWhiteSpace(request.SupporterType) && !SupporterTypes.Contains(request.SupporterType))
        {
            errorMessage = "supporterType must be one of MonetaryDonor, InKindDonor, Volunteer, SkillsContributor, SocialMediaAdvocate, PartnerOrganization";
            return null;
        }

        if (!string.IsNullOrWhiteSpace(request.RelationshipType) && !RelationshipTypes.Contains(request.RelationshipType))
        {
            errorMessage = "relationshipType must be one of Local, International, PartnerOrganization";
            return null;
        }

        if (!string.IsNullOrWhiteSpace(request.Status) && !SupporterStatuses.Contains(request.Status))
        {
            errorMessage = "status must be Active or Inactive";
            return null;
        }

        if (!string.IsNullOrWhiteSpace(request.AcquisitionChannel) && !AcquisitionChannels.Contains(request.AcquisitionChannel))
        {
            errorMessage = "acquisitionChannel must be one of Website, SocialMedia, Event, WordOfMouth, PartnerReferral, Church";
            return null;
        }

        var displayName = request.DisplayName?.Trim();
        if (string.IsNullOrWhiteSpace(displayName))
        {
            displayName = string.Join(" ", new[] { request.FirstName?.Trim(), request.LastName?.Trim() }
                .Where(part => !string.IsNullOrWhiteSpace(part))).Trim();
        }

        if (string.IsNullOrWhiteSpace(displayName))
        {
            displayName = request.OrganizationName?.Trim();
        }

        if (string.IsNullOrWhiteSpace(displayName))
        {
            errorMessage = "displayName is required for new supporters";
            return null;
        }

        return new AdminDonationCreateSupporterCommand(
            request.SupporterType?.Trim(),
            displayName,
            request.OrganizationName?.Trim(),
            request.FirstName?.Trim(),
            request.LastName?.Trim(),
            request.RelationshipType?.Trim(),
            request.Region?.Trim(),
            request.Country?.Trim(),
            request.Email?.Trim(),
            request.Phone?.Trim(),
            string.IsNullOrWhiteSpace(request.Status) ? "Active" : request.Status.Trim(),
            request.FirstDonationDate ?? donationDate,
            request.AcquisitionChannel?.Trim(),
            string.IsNullOrWhiteSpace(request.CreatedAt) ? DateTimeOffset.UtcNow.ToString("O") : request.CreatedAt.Trim());
    }
}
