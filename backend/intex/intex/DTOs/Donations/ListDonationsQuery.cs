namespace backend.intex.DTOs.Donations;

public sealed class ListDonationsQuery
{
    public int Page { get; init; } = 1;
    public int? PageSize { get; init; }
    public int? Limit { get; init; }
    public string? FundType { get; init; }
}
