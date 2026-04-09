namespace backend.intex.DTOs.Common;

public sealed record StandardPagedResponse<T>(
    IReadOnlyList<T> Data,
    int Total,
    StandardPaginationMeta Pagination
);
