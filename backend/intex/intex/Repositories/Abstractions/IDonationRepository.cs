using System.Text.Json;
using backend.intex.Entities.Database;

namespace backend.intex.Repositories.Abstractions;

public interface IDonationRepository
{
    Task<IReadOnlyList<PriorDonorSupporterOptionRecord>> SearchPriorDonorSupportersAsync(string? search, int limit, CancellationToken cancellationToken = default);
    Task<bool> SupporterExistsAsync(long supporterId, CancellationToken cancellationToken = default);
    Task<bool> SafehouseExistsAsync(long safehouseId, CancellationToken cancellationToken = default);
    Task<(IReadOnlyList<DonationLedgerRecord> Donations, int Total)> ListMyLedgerAsync(long supporterId, int page, int pageSize, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<DonationTrendRecord>> ListDonationTrendsAsync(int months, CancellationToken cancellationToken = default);
    Task<DonationStatsRecord> GetDonationStatsAsync(string? fundType, IReadOnlyList<long> allowedSafehouses, bool enforceSafehouseScope, CancellationToken cancellationToken = default);
    Task<(IReadOnlyList<DonationSummaryRecord> Donations, int Total)> ListDonationsAsync(int page, int pageSize, string? fundType, IReadOnlyList<long> allowedSafehouses, bool enforceSafehouseScope, CancellationToken cancellationToken = default);
    Task<DonationSummaryRecord?> GetDonationAsync(long donationId, CancellationToken cancellationToken = default);
    Task<Donation> CreateDonationAsync(Donation donation, CancellationToken cancellationToken = default);
    Task<DonationSummaryRecord?> CreateAdministrativeDonationAsync(AdminDonationCreateCommand command, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<InKindDonationItem>> CreateInKindDonationItemsAsync(IReadOnlyList<InKindDonationItem> items, CancellationToken cancellationToken = default);
    Task<Donation?> UpdateDonationAsync(long donationId, IReadOnlyDictionary<string, JsonElement> fields, CancellationToken cancellationToken = default);
    Task<bool> DeleteDonationAsync(long donationId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<DonationAllocationRecord>> ListDonationAllocationsAsync(long? donationId, IReadOnlyList<long> allowedSafehouses, bool enforceSafehouseScope, CancellationToken cancellationToken = default);
    Task<DonationAllocationRecord?> CreateDonationAllocationAsync(DonationAllocation allocation, CancellationToken cancellationToken = default);
    Task<DonationAllocationRecord?> GetDonationAllocationAsync(long allocationId, CancellationToken cancellationToken = default);
    Task<bool> DeleteDonationAllocationAsync(long allocationId, CancellationToken cancellationToken = default);
}

public sealed record PriorDonorSupporterOptionRecord(
    long SupporterId,
    string DisplayName,
    string? Email,
    int DonationCount,
    decimal LifetimeGiving
);

public sealed record AdminDonationCreateCommand(
    long? ExistingSupporterId,
    AdminDonationCreateSupporterCommand? Supporter,
    long? CampaignId,
    string DonationType,
    DateOnly DonationDate,
    string ChannelSource,
    string? CurrencyCode,
    decimal? Amount,
    decimal? EstimatedValue,
    string? ImpactUnit,
    bool IsRecurring,
    string? CampaignName,
    string? Notes,
    long? ReferralPostId,
    long? SafehouseId,
    IReadOnlyList<AdminDonationCreateInKindItemCommand> InKindItems,
    IReadOnlyList<AdminDonationCreateAllocationCommand> Allocations
);

public sealed record AdminDonationCreateSupporterCommand(
    string? SupporterType,
    string? DisplayName,
    string? OrganizationName,
    string? FirstName,
    string? LastName,
    string? RelationshipType,
    string? Region,
    string? Country,
    string? Email,
    string? Phone,
    string? Status,
    DateOnly? FirstDonationDate,
    string? AcquisitionChannel,
    string CreatedAt
);

public sealed record AdminDonationCreateInKindItemCommand(
    string ItemName,
    string? ItemCategory,
    decimal Quantity,
    string? UnitOfMeasure,
    decimal? EstimatedUnitValue,
    string? IntendedUse,
    string? ReceivedCondition
);

public sealed record AdminDonationCreateAllocationCommand(
    long? SafehouseId,
    string ProgramArea,
    decimal AmountAllocated,
    DateOnly AllocationDate,
    string? AllocationNotes
);

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

public sealed record DonationStatsRecord(
    decimal TotalReceived,
    decimal TotalAllocated,
    int PendingAllocationCount,
    int UniqueDonors
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
