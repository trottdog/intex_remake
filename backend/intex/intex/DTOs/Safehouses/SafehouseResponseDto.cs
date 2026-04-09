namespace backend.intex.DTOs.Safehouses;

public sealed record SafehouseResponseDto(
    long SafehouseId,
    long Id,
    string? SafehouseCode,
    string? Name,
    string? Region,
    string? City,
    string? Province,
    string? Country,
    string? Location,
    string? OpenDate,
    string? Status,
    int? CapacityGirls,
    int? CapacityStaff,
    int? Capacity,
    int? CurrentOccupancy,
    string? Notes,
    string? Description,
    string? ContactName,
    string? ContactEmail,
    string? ContactPhone,
    string[]? ProgramAreas,
    string? OperatingHours
);
