namespace backend.intex.DTOs.Common;

public sealed record SuperAdminMlPagedResponse<T>(
    IReadOnlyList<T> Data,
    SuperAdminMlMeta Meta
);
