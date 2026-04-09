namespace backend.intex.DTOs.Safehouses;

public sealed class CreateSafehouseRequest
{
    public string? SafehouseCode { get; init; }
    public string? Name { get; init; }
    public string? Region { get; init; }
    public string? City { get; init; }
    public string? Province { get; init; }
    public string? Country { get; init; }
    public DateOnly? OpenDate { get; init; }
    public string? Status { get; init; }
    public int? CapacityGirls { get; init; }
    public int? CapacityStaff { get; init; }
    public int? CurrentOccupancy { get; init; }
    public string? Notes { get; init; }

    // Legacy frontend aliases still sent by the current React admin UI.
    public string? Location { get; init; }
    public int? Capacity { get; init; }
    public string? Description { get; init; }
    public string? ContactName { get; init; }
    public string? ContactEmail { get; init; }
    public string? ContactPhone { get; init; }
    public string[]? ProgramAreas { get; init; }
    public string? OperatingHours { get; init; }
}
