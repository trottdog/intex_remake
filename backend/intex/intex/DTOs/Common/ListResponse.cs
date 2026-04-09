namespace backend.intex.DTOs.Common;

public sealed record ListResponse<T>(
    IReadOnlyList<T> Data,
    int Total
);
