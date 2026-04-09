namespace backend.intex.DTOs.Donations;

public sealed class GiveDonationRequest
{
    public decimal? Amount { get; init; }
    public string? CurrencyCode { get; init; }
    public string? ChannelSource { get; init; }
    public string? Notes { get; init; }
    public bool? IsRecurring { get; init; }
    public long? SafehouseId { get; init; }
}
