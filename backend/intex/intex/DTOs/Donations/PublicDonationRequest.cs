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
}
