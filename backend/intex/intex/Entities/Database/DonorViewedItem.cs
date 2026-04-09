namespace backend.intex.Entities.Database;

public sealed class DonorViewedItem
{
    public long Id { get; init; }
    public long? SupporterId { get; init; }
    public string? ItemType { get; init; }
    public long? ItemId { get; init; }
    public DateTime? ViewedAt { get; init; }
}
