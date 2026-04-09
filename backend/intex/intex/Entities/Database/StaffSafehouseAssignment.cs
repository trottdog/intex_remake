namespace backend.intex.Entities.Database;

public sealed class StaffSafehouseAssignment
{
    public long Id { get; init; }
    public string UserId { get; init; } = string.Empty;
    public long SafehouseId { get; init; }
}
