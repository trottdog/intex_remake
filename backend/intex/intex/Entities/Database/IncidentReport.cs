namespace backend.intex.Entities.Database;

public sealed class IncidentReport
{
    public long IncidentId { get; init; }
    public long? ResidentId { get; init; }
    public long? SafehouseId { get; init; }
    public DateOnly? IncidentDate { get; init; }
    public string? IncidentType { get; init; }
    public string? Severity { get; init; }
    public string? Description { get; init; }
    public string? ResponseTaken { get; init; }
    public bool? Resolved { get; init; }
    public DateOnly? ResolutionDate { get; init; }
    public string? ReportedBy { get; init; }
    public bool? FollowUpRequired { get; init; }
    public string? Status { get; init; }
}
