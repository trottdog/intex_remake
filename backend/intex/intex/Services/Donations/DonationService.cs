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

        if (role is BeaconRoles.Staff or BeaconRoles.Admin && assignedSafehouses.Count > 0)
        {
            var donation = await donationRepository.GetDonationAsync(request.DonationId.Value, cancellationToken);
            if (donation is null)
            {
                return (null, "Not found");
            }

            var effectiveSafehouseId = request.SafehouseId ?? donation.SafehouseId;
            if (!effectiveSafehouseId.HasValue || !assignedSafehouses.Contains(effectiveSafehouseId.Value))
            {
                return (null, "Not found");
            }
        }

        var created = await donationRepository.CreateDonationAllocationAsync(new DonationAllocation
        {
            DonationId = request.DonationId,
            SafehouseId = request.SafehouseId,
            ProgramArea = request.ProgramArea,
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
}
