namespace backend.intex.DTOs.Residents;

public sealed record ListResidentsQuery(
    int Page = 1,
    int? PageSize = null,
    int? Limit = null,
    long? SafehouseId = null,
    string? CaseStatus = null
);
