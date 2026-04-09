namespace Intex.Infrastructure.Api.Pagination;

public static class PaginationResolver
{
    public static PaginationRequest Resolve(
        string? page,
        string? limit,
        string? pageSize,
        int defaultLimit = 20,
        bool allowLimitAlias = true)
    {
        var resolvedPage = ParsePositiveOrDefault(page, 1);
        var resolvedLimit = ResolveLimit(limit, pageSize, defaultLimit, allowLimitAlias);

        return new PaginationRequest(resolvedPage, resolvedLimit);
    }

    public static int ResolveLimit(
        string? limit,
        string? pageSize,
        int defaultLimit = 20,
        bool allowLimitAlias = true)
    {
        var candidate = pageSize;

        if (allowLimitAlias && string.IsNullOrWhiteSpace(candidate))
        {
            candidate = limit;
        }

        return ParsePositiveOrDefault(candidate, defaultLimit);
    }

    private static int ParsePositiveOrDefault(string? rawValue, int fallback)
    {
        return int.TryParse(rawValue, out var parsed) && parsed > 0
            ? parsed
            : fallback;
    }
}
