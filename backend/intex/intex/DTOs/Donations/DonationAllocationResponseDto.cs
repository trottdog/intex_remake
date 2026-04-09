namespace backend.intex.DTOs.Donations;

public sealed record DonationAllocationResponseDto(
    long AllocationId,
    long? DonationId,
    long? SafehouseId,
    string? ProgramArea,
    decimal? AmountAllocated,
    string? AllocationDate,
    string? AllocationNotes,
    string? SafehouseName
);
