namespace backend.intex.DTOs.Safehouses;

public sealed record PublicSafehouseDto(
    long SafehouseId,
    string? Name,
    string? SafehouseName
);
