namespace backend.intex.DTOs.Common;

public sealed record StandardPaginationMeta(
    int Page,
    int PageSize,
    int TotalPages,
    bool HasNext,
    bool HasPrev
);
