namespace backend.intex.Entities.Database;

public sealed class Safehouse
{
    public long SafehouseId { get; init; }
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
}
