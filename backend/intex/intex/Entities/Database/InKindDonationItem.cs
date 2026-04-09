namespace backend.intex.Entities.Database;

public sealed class InKindDonationItem
{
    public long ItemId { get; init; }
    public long? DonationId { get; init; }
    public string? ItemName { get; init; }
    public string? ItemCategory { get; init; }
    public decimal? Quantity { get; init; }
    public string? UnitOfMeasure { get; init; }
    public decimal? EstimatedUnitValue { get; init; }
    public string? IntendedUse { get; init; }
    public string? ReceivedCondition { get; init; }
}
