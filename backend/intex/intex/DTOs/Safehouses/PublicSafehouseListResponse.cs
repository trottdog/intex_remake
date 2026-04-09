namespace backend.intex.DTOs.Safehouses;

public sealed record PublicSafehouseListResponse(
    IReadOnlyList<PublicSafehouseDto> Data
);
