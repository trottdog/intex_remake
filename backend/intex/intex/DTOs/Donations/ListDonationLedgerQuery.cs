namespace backend.intex.DTOs.Donations;

public sealed class ListDonationLedgerQuery
{
    public int Page { get; init; } = 1;
    public int? PageSize { get; init; }
    public int? Limit { get; init; }
}
