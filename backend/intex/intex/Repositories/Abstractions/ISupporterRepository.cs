using System.Text.Json;
using backend.intex.Entities.Database;

namespace backend.intex.Repositories.Abstractions;

public interface ISupporterRepository
{
    Task<Supporter?> GetSupporterByIdAsync(long supporterId, CancellationToken cancellationToken = default);
    Task<(IReadOnlyList<Supporter> Supporters, int Total)> ListSupportersAsync(int page, int pageSize, CancellationToken cancellationToken = default);
    Task<Supporter> CreateSupporterAsync(Supporter supporter, CancellationToken cancellationToken = default);
    Task<Supporter?> UpdateSupporterAsync(long supporterId, IReadOnlyDictionary<string, JsonElement> fields, CancellationToken cancellationToken = default);
    Task DeleteSupporterIfExistsAsync(long supporterId, CancellationToken cancellationToken = default);
    Task<IReadOnlyDictionary<long, SupporterDonationAggregate>> GetDonationAggregatesAsync(IReadOnlyList<long> supporterIds, CancellationToken cancellationToken = default);
    Task<SupporterDonationAggregate> GetDonationAggregateAsync(long supporterId, CancellationToken cancellationToken = default);
    Task<SupporterGivingStatsRecord> GetGivingStatsAsync(long supporterId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<SupporterDonationHistoryRecord>> GetDonationHistoryAsync(long supporterId, CancellationToken cancellationToken = default);
    Task<SupporterStatsRecord> GetSupporterStatsAsync(CancellationToken cancellationToken = default);
}

public sealed record SupporterDonationAggregate(
    decimal LifetimeGiving,
    int DonationCount,
    DateOnly? LastGiftDate,
    decimal? LastGiftAmount,
    bool HasRecurring
);

public sealed record SupporterGivingStatsRecord(
    long SupporterId,
    decimal Total,
    int Count,
    decimal AvgGift,
    DateOnly? LastDonationDate,
    IReadOnlyDictionary<string, int> DonationTypesMap
);

public sealed record SupporterDonationHistoryRecord(
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
    long? CampaignId,
    long? SafehouseId,
    string? SafehouseName,
    decimal TotalAllocated,
    decimal? Unallocated,
    bool IsGeneralFund,
    IReadOnlyList<SupporterDonationAllocationRecord> Allocations,
    IReadOnlyList<SupporterInKindDonationItemRecord> InKindItems
);

public sealed record SupporterDonationAllocationRecord(
    long AllocationId,
    long? DonationId,
    long? SafehouseId,
    string? SafehouseName,
    string? ProgramArea,
    decimal? AmountAllocated,
    DateOnly? AllocationDate,
    string? AllocationNotes
);

public sealed record SupporterInKindDonationItemRecord(
    long ItemId,
    long? DonationId,
    string? ItemName,
    string? ItemCategory,
    decimal? Quantity,
    string? UnitOfMeasure,
    decimal? EstimatedUnitValue,
    string? IntendedUse,
    string? ReceivedCondition
);

public sealed record SupporterStatsRecord(
    int TotalSupporters,
    int ActiveSupporters,
    int RecurringDonors,
    int NewSupporters,
    decimal RaisedThisMonth,
    decimal LifetimeTotal,
    decimal AvgGiftSize,
    IReadOnlyList<(string Channel, int Count)> AcquisitionByChannel,
    IReadOnlyList<(string Type, int Count, decimal Percentage)> SupportTypeMix
);
