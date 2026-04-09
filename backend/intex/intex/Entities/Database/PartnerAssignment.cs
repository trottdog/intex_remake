namespace backend.intex.Entities.Database;

public sealed class PartnerAssignment
{
    public long AssignmentId { get; init; }
    public long? PartnerId { get; init; }
    public long? SafehouseId { get; init; }
    public string? ProgramArea { get; init; }
    public DateOnly? AssignmentStart { get; init; }
    public DateOnly? AssignmentEnd { get; init; }
    public string? ResponsibilityNotes { get; init; }
    public bool? IsPrimary { get; init; }
    public string? Status { get; init; }
}
