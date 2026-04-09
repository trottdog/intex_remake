namespace backend.intex.Entities.Database;

public sealed class EducationRecord
{
    public long EducationRecordId { get; init; }
    public long? ResidentId { get; init; }
    public DateOnly? RecordDate { get; init; }
    public string? EducationLevel { get; init; }
    public string? SchoolName { get; init; }
    public string? EnrollmentStatus { get; init; }
    public decimal? AttendanceRate { get; init; }
    public decimal? ProgressPercent { get; init; }
    public string? CompletionStatus { get; init; }
    public string? Notes { get; init; }
}
