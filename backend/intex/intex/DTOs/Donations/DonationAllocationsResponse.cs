namespace backend.intex.DTOs.Donations;

public sealed record DonationAllocationsResponse(
    IReadOnlyList<DonationAllocationResponseDto> Data,
    int Total
);
