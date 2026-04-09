namespace backend.intex.DTOs.Supporters;

public sealed class ListSupportersQuery
{
    public int Page { get; init; } = 1;
    public int? PageSize { get; init; }
    public int? Limit { get; init; }
}
