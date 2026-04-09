namespace Intex.Infrastructure.Api.Pagination;

public sealed record PaginationRequest(int Page, int Limit)
{
    public int Offset => (Page - 1) * Limit;
}
