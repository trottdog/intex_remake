namespace backend.intex.DTOs.Donations;

public sealed class CreateDonationAllocationRequest
{
    public long? DonationId { get; init; }
    public long? SafehouseId { get; init; }
    public string? ProgramArea { get; init; }
    public decimal? AmountAllocated { get; init; }
    public string? AllocationNotes { get; init; }
}
