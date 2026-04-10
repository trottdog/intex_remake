namespace backend.intex.DTOs.Donations;

public sealed record DonationStatsResponse(
    decimal TotalReceived,
    decimal TotalAllocated,
    int PendingAllocationCount,
    int UniqueDonors
);
