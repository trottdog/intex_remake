namespace backend.intex.DTOs.Donations;

public sealed class PublicDonationRequest
{
    public decimal? Amount { get; init; }
    public string? Name { get; init; }
    public string? Email { get; init; }
    public string? Notes { get; init; }
    public bool? IsRecurring { get; init; }
    public long? SafehouseId { get; init; }
    public string? CurrencyCode { get; init; }
    public long? SupporterId { get; init; }
}

public sealed class PublicInKindDonationItemRequest
{
    public string? ItemName { get; init; }
    public string? ItemCategory { get; init; }
    public decimal? Quantity { get; init; }
    public string? UnitOfMeasure { get; init; }
    public decimal? EstimatedUnitValue { get; init; }
    public string? IntendedUse { get; init; }
    public string? ReceivedCondition { get; init; }
}

public sealed class PublicInKindDonationRequest
{
    public string? Name { get; init; }
    public string? Email { get; init; }
    public string? Notes { get; init; }
    public long? SafehouseId { get; init; }
    public long? SupporterId { get; init; }
    public List<PublicInKindDonationItemRequest>? Items { get; init; }
}
