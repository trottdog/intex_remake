namespace backend.intex.DTOs.Common;

public sealed record SuperAdminMlMeta(
    int Page,
    int PageSize,
    int Total,
    int? TotalAtRisk = null,
    int? TotalRestricted = null
);
