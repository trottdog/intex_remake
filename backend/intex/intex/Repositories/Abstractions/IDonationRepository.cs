using System.Text.Json;
using backend.intex.Entities.Database;

namespace backend.intex.Repositories.Abstractions;

public interface IDonationRepository
{
    Task<(IReadOnlyList<DonationLedgerRecord> Donations, int Total)> ListMyLedgerAsync(long supporterId, int page, int pageSize, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<DonationTrendRecord>> ListDonationTrendsAsync(int months, CancellationToken cancellationToken = default);
    Task<(IReadOnlyList<DonationSummaryRecord> Donations, int Total)> ListDonationsAsync(int page, int pageSize, string? fundType, IReadOnlyList<long> allowedSafehouses, bool enforceSafehouseScope, CancellationToken cancellationToken = default);
    Task<DonationSummaryRecord?> GetDonationAsync(long donationId, CancellationToken cancellationToken = default);
    Task<Donation> CreateDonationAsync(Donation donation, CancellationToken cancellationToken = default);
    Task<Donation?> UpdateDonationAsync(long donationId, IReadOnlyDictionary<string, JsonElement> fields, CancellationToken cancellationToken = default);
    Task<bool> DeleteDonationAsync(long donationId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<DonationAllocationRecord>> ListDonationAllocationsAsync(long? donationId, IReadOnlyList<long> allowedSafehouses, bool enforceSafehouseScope, CancellationToken cancellationToken = default);
    Task<DonationAllocationRecord?> CreateDonationAllocationAsync(DonationAllocation allocation, CancellationToken cancellationToken = default);
    Task<DonationAllocationRecord?> GetDonationAllocationAsync(long allocationId, CancellationToken cancellationToken = default);
    Task<bool> DeleteDonationAllocationAsync(long allocationId, CancellationToken cancellationToken = default);
}

public sealed record DonationLedgerRecord(
    long DonationId,
    long? SupporterId,
    string? DonationType,
    DateOnly? DonationDate,
    bool? IsRecurring,
    string? CampaignName,
    string? ChannelSource,
    string? CurrencyCode,
    decimal? Amount,
    decimal? EstimatedValue,
    string? ImpactUnit,
    string? Notes,
    long? ReferralPostId,
    long? SafehouseId,
    string? SafehouseName
);

public sealed record DonationSummaryRecord(
    long DonationId,
    long? SupporterId,
    string? DonationType,
    DateOnly? DonationDate,
    bool? IsRecurring,
    long? CampaignId,
    string? CampaignName,
    string? ChannelSource,
    string? CurrencyCode,
    decimal? Amount,
    decimal? EstimatedValue,
    string? ImpactUnit,
    string? Notes,
    long? ReferralPostId,
    long? SafehouseId,
    string? SafehouseName,
    string? SupporterName,
    decimal TotalAllocated
);

public sealed record DonationTrendRecord(
    string Month,
    decimal TotalAmount,
    int DonationCount,
    decimal AvgAmount
);

public sealed record DonationAllocationRecord(
    long AllocationId,
    long? DonationId,
    long? SafehouseId,
    string? ProgramArea,
    decimal? AmountAllocated,
    DateOnly? AllocationDate,
    string? AllocationNotes,
    string? SafehouseName,
    long? DonationSafehouseId
);
