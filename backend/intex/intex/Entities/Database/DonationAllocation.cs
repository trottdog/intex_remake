namespace backend.intex.Entities.Database;

public sealed class DonationAllocation
{
    public long AllocationId { get; init; }
    public long? DonationId { get; init; }
    public long? SafehouseId { get; init; }
    public string? ProgramArea { get; init; }
    public decimal? AmountAllocated { get; init; }
    public DateOnly? AllocationDate { get; init; }
    public string? AllocationNotes { get; init; }
}
