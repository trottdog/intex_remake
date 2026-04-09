using System.Text.Json.Serialization;
using Intex.Infrastructure.Api.Contracts;

namespace Intex.Infrastructure.CaseManagement.Contracts;

public sealed class ProcessRecordingResponse
{
    public int Id { get; init; }
    public int ResidentId { get; init; }
    public string? ResidentCode { get; init; }
    public int WorkerId { get; init; }
    public string? WorkerName { get; init; }
    public int SafehouseId { get; init; }
    public string SessionDate { get; init; } = null!;
    public int? Duration { get; init; }
    public string? EmotionalStateStart { get; init; }
    public string? EmotionalStateEnd { get; init; }
    public bool ProgressNoted { get; init; }
    public bool ConcernFlag { get; init; }
    public bool ReferralMade { get; init; }
    public bool FollowUpRequired { get; init; }
    public string? SessionNotes { get; init; }
    public string[] Tags { get; init; } = [];
    public DateTimeOffset? CreatedAt { get; init; }
}

public sealed record CreateProcessRecordingRequest(
    int? ResidentId,
    int? WorkerId,
    int? SafehouseId,
    string? SessionDate,
    int? Duration,
    string? EmotionalStateStart,
    string? EmotionalStateEnd,
    bool? ProgressNoted,
    bool? ConcernFlag,
    bool? ReferralMade,
    bool? FollowUpRequired,
    string? SessionNotes,
    string[]? Tags);

public sealed record UpdateProcessRecordingRequest(
    string? SessionDate,
    int? Duration,
    string? EmotionalStateStart,
    string? EmotionalStateEnd,
    bool? ProgressNoted,
    bool? ConcernFlag,
    bool? ReferralMade,
    bool? FollowUpRequired,
    string? SessionNotes,
    string[]? Tags);

public sealed class HomeVisitationResponse
{
    public int Id { get; init; }
    public int ResidentId { get; init; }
    public string? ResidentCode { get; init; }
    public int WorkerId { get; init; }
    public string? WorkerName { get; init; }
    public string VisitDate { get; init; } = null!;
    public string Outcome { get; init; } = null!;
    public string? CooperationLevel { get; init; }
    public bool SafetyConcern { get; init; }
    public bool FollowUpRequired { get; init; }
    public string? FollowUpDue { get; init; }
    public string? Notes { get; init; }
    public DateTimeOffset? CreatedAt { get; init; }
}

public sealed record CreateHomeVisitationRequest(
    int? ResidentId,
    int? WorkerId,
    string? VisitDate,
    string? Outcome,
    string? CooperationLevel,
    bool? SafetyConcern,
    bool? FollowUpRequired,
    string? FollowUpDue,
    string? Notes);

public sealed record UpdateHomeVisitationRequest(
    string? VisitDate,
    string? Outcome,
    string? CooperationLevel,
    bool? SafetyConcern,
    bool? FollowUpRequired,
    string? FollowUpDue,
    string? Notes);

public sealed class CaseConferenceResponse
{
    public int Id { get; init; }
    public int ResidentId { get; init; }
    public string? ResidentCode { get; init; }
    public int SafehouseId { get; init; }
    public string? SafehouseName { get; init; }
    public string ScheduledDate { get; init; } = null!;
    public string? CompletedDate { get; init; }
    public string Status { get; init; } = null!;
    public string[] Attendees { get; init; } = [];
    public string? Decisions { get; init; }
    public string? NextSteps { get; init; }
    public string? NextConferenceDate { get; init; }
    public DateTimeOffset? CreatedAt { get; init; }
}

public sealed record CreateCaseConferenceRequest(
    int? ResidentId,
    int? SafehouseId,
    string? ScheduledDate,
    string? Status,
    string[]? Attendees,
    string? Decisions,
    string? NextSteps,
    string? NextConferenceDate);

public sealed record UpdateCaseConferenceRequest(
    string? ScheduledDate,
    string? CompletedDate,
    string? Status,
    string[]? Attendees,
    string? Decisions,
    string? NextSteps,
    string? NextConferenceDate);

public sealed class InterventionPlanResponse
{
    public int Id { get; init; }
    public int ResidentId { get; init; }
    public string? ResidentCode { get; init; }
    public int SafehouseId { get; init; }
    public string? SafehouseName { get; init; }
    public int WorkerId { get; init; }
    public string? WorkerName { get; init; }
    public string Category { get; init; } = null!;
    public string Title { get; init; } = null!;
    public string Status { get; init; } = null!;
    public string TargetDate { get; init; } = null!;
    public string? CompletedDate { get; init; }
    public string[] Services { get; init; } = [];
    public string[] Milestones { get; init; } = [];
    public decimal? SuccessProbability { get; init; }
    public string? Notes { get; init; }
    public DateTimeOffset? CreatedAt { get; init; }

    [JsonPropertyName("staffId")]
    public int StaffId => WorkerId;

    [JsonPropertyName("startDate")]
    public string StartDate => TargetDate;

    [JsonPropertyName("targetEndDate")]
    public string TargetEndDate => TargetDate;

    [JsonPropertyName("goals")]
    public string? Goals => Notes;

    [JsonPropertyName("interventionType")]
    public string InterventionType => Category;

    [JsonPropertyName("progressNotes")]
    public string? ProgressNotes => Notes;

    [JsonPropertyName("reviewDate")]
    public string ReviewDate => TargetDate;
}

public sealed record CreateInterventionPlanRequest(
    int? ResidentId,
    int? SafehouseId,
    int? WorkerId,
    string? Category,
    string? Title,
    string? Status,
    string? TargetDate,
    string[]? Services,
    string[]? Milestones,
    string? Notes);

public sealed record UpdateInterventionPlanRequest(
    string? Category,
    string? Title,
    string? Status,
    string? TargetDate,
    string? CompletedDate,
    string[]? Services,
    string[]? Milestones,
    string? Notes);

public sealed class IncidentResponse
{
    public int Id { get; init; }
    public int? ResidentId { get; init; }
    public string? ResidentCode { get; init; }
    public int SafehouseId { get; init; }
    public string? SafehouseName { get; init; }
    public int ReportedBy { get; init; }
    public string? ReportedByName { get; init; }
    public string IncidentDate { get; init; } = null!;
    public string IncidentType { get; init; } = null!;
    public string Severity { get; init; } = null!;
    public string Status { get; init; } = null!;
    public string Description { get; init; } = null!;
    public string? Resolution { get; init; }
    public string? ResolutionDate { get; init; }
    public bool FollowUpRequired { get; init; }
    public DateTimeOffset? CreatedAt { get; init; }
}

public sealed record CreateIncidentRequest(
    int? ResidentId,
    int? SafehouseId,
    int? ReportedBy,
    string? IncidentDate,
    string? IncidentType,
    string? Severity,
    string? Status,
    string? Description,
    string? Resolution,
    string? ResolutionDate,
    bool? FollowUpRequired);

public sealed record UpdateIncidentRequest(
    string? IncidentType,
    string? Severity,
    string? Status,
    string? Description,
    string? Resolution,
    string? ResolutionDate,
    bool? FollowUpRequired);

public sealed class EducationRecordResponse
{
    public int Id { get; init; }
    public int ResidentId { get; init; }
    public string RecordDate { get; init; } = null!;
    public string EducationLevel { get; init; } = null!;
    public string EnrollmentStatus { get; init; } = null!;
    public decimal? ProgressScore { get; init; }
    public string? ProgramType { get; init; }
    public string? Notes { get; init; }
    public DateTimeOffset? CreatedAt { get; init; }
    public DateTimeOffset? UpdatedAt { get; init; }
}

public sealed record CreateEducationRecordRequest(
    int? ResidentId,
    string? RecordDate,
    string? EducationLevel,
    string? EnrollmentStatus,
    decimal? ProgressScore,
    string? ProgramType,
    string? Notes);

public sealed record UpdateEducationRecordRequest(
    string? RecordDate,
    string? EducationLevel,
    string? EnrollmentStatus,
    decimal? ProgressScore,
    string? ProgramType,
    string? Notes);

public sealed class HealthRecordResponse
{
    public int Id { get; init; }
    public int ResidentId { get; init; }
    public string RecordDate { get; init; } = null!;
    public decimal? HealthScore { get; init; }
    public string? MentalHealthStatus { get; init; }
    public string? PhysicalHealthStatus { get; init; }
    public string? TraumaProgress { get; init; }
    public string? MedicationStatus { get; init; }
    public string? NextAppointment { get; init; }
    public string? Notes { get; init; }
    public DateTimeOffset? CreatedAt { get; init; }
    public DateTimeOffset? UpdatedAt { get; init; }
}

public sealed record CreateHealthRecordRequest(
    int? ResidentId,
    string? RecordDate,
    decimal? HealthScore,
    string? MentalHealthStatus,
    string? PhysicalHealthStatus,
    string? TraumaProgress,
    string? MedicationStatus,
    string? NextAppointment,
    string? Notes);

public sealed record UpdateHealthRecordRequest(
    string? RecordDate,
    decimal? HealthScore,
    string? MentalHealthStatus,
    string? PhysicalHealthStatus,
    string? TraumaProgress,
    string? MedicationStatus,
    string? NextAppointment,
    string? Notes);
