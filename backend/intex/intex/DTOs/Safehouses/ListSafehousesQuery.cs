namespace backend.intex.DTOs.Safehouses;

public sealed class ListSafehousesQuery
{
    public int Page { get; init; } = 1;
    public int? PageSize { get; init; }
    public int? Limit { get; init; }
}
