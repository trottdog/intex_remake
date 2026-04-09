using System.Text.Json;
using System.Text.Json.Serialization;

namespace backend.intex.DTOs.CaseManagement;

public sealed class ListProcessRecordingsQuery
{
    public int Page { get; init; } = 1;
    public int? PageSize { get; init; }
    public int? Limit { get; init; }
    public long? ResidentId { get; init; }
    public long? SafehouseId { get; init; }
}

public sealed class ListHomeVisitationsQuery
{
    public int Page { get; init; } = 1;
    public int? PageSize { get; init; }
    public int? Limit { get; init; }
    public long? ResidentId { get; init; }
}

public sealed class ListCaseConferencesQuery
{
    public int Page { get; init; } = 1;
    public int? PageSize { get; init; }
    public int? Limit { get; init; }
    public long? ResidentId { get; init; }
    public string? Status { get; init; }
    public bool? Upcoming { get; init; }
}

public sealed class ListInterventionPlansQuery
{
    public int Page { get; init; } = 1;
    public int? PageSize { get; init; }
    public int? Limit { get; init; }
    public long? ResidentId { get; init; }
    public string? Status { get; init; }
}

public sealed class ListIncidentReportsQuery
{
    public int Page { get; init; } = 1;
    public int? PageSize { get; init; }
    public int? Limit { get; init; }
    public long? ResidentId { get; init; }
    public long? SafehouseId { get; init; }
    public string? Severity { get; init; }
    public string? Status { get; init; }
}

public sealed class CreateProcessRecordingRequest
{
    [JsonExtensionData]
    public Dictionary<string, JsonElement> Fields { get; init; } = new(StringComparer.OrdinalIgnoreCase);
}

public sealed class UpdateProcessRecordingRequest
{
    [JsonExtensionData]
    public Dictionary<string, JsonElement> Fields { get; init; } = new(StringComparer.OrdinalIgnoreCase);
}

public sealed class CreateHomeVisitationRequest
{
    [JsonExtensionData]
    public Dictionary<string, JsonElement> Fields { get; init; } = new(StringComparer.OrdinalIgnoreCase);
}

public sealed class UpdateHomeVisitationRequest
{
    [JsonExtensionData]
    public Dictionary<string, JsonElement> Fields { get; init; } = new(StringComparer.OrdinalIgnoreCase);
}

public sealed class CreateCaseConferenceRequest
{
    [JsonExtensionData]
    public Dictionary<string, JsonElement> Fields { get; init; } = new(StringComparer.OrdinalIgnoreCase);
}

public sealed class UpdateCaseConferenceRequest
{
    [JsonExtensionData]
    public Dictionary<string, JsonElement> Fields { get; init; } = new(StringComparer.OrdinalIgnoreCase);
}

public sealed class CreateInterventionPlanRequest
{
    [JsonExtensionData]
    public Dictionary<string, JsonElement> Fields { get; init; } = new(StringComparer.OrdinalIgnoreCase);
}

public sealed class UpdateInterventionPlanRequest
{
    [JsonExtensionData]
    public Dictionary<string, JsonElement> Fields { get; init; } = new(StringComparer.OrdinalIgnoreCase);
}

public sealed class CreateIncidentReportRequest
{
    [JsonExtensionData]
    public Dictionary<string, JsonElement> Fields { get; init; } = new(StringComparer.OrdinalIgnoreCase);
}

public sealed class UpdateIncidentReportRequest
{
    [JsonExtensionData]
    public Dictionary<string, JsonElement> Fields { get; init; } = new(StringComparer.OrdinalIgnoreCase);
}

public sealed class ProcessRecordingResponseDto
{
    public long RecordingId { get; init; }
    public long Id { get; init; }
    public long? ResidentId { get; init; }
    public string? SessionDate { get; init; }
    public string? SocialWorker { get; init; }
    public string? SessionType { get; init; }
    public int? SessionDurationMinutes { get; init; }
    public string? EmotionalStateObserved { get; init; }
    public string? EmotionalStateEnd { get; init; }
    public string? SessionNarrative { get; init; }
    public string? InterventionsApplied { get; init; }
    public string? FollowUpActions { get; init; }
    public bool? ProgressNoted { get; init; }
    public bool? ConcernsFlagged { get; init; }
    public bool? ReferralMade { get; init; }
    public string? NotesRestricted { get; init; }
    public string? ResidentCode { get; init; }
}

public sealed class HomeVisitationResponseDto
{
    public long VisitationId { get; init; }
    public long Id { get; init; }
    public long? ResidentId { get; init; }
    public string? VisitDate { get; init; }
    public string? SocialWorker { get; init; }
    public string? VisitType { get; init; }
    public string? LocationVisited { get; init; }
    public string? FamilyMembersPresent { get; init; }
    public string? Purpose { get; init; }
    public string? Observations { get; init; }
    public string? FamilyCooperationLevel { get; init; }
    public bool? SafetyConcernsNoted { get; init; }
    public bool? FollowUpNeeded { get; init; }
    public string? FollowUpNotes { get; init; }
    public string? VisitOutcome { get; init; }
    public string? ResidentCode { get; init; }
}

public sealed class CaseConferenceResponseDto
{
    public long ConferenceId { get; init; }
    public long Id { get; init; }
    public long ResidentId { get; init; }
    public string? ConferenceDate { get; init; }
    public string? ConferenceType { get; init; }
    public string? Summary { get; init; }
    public string? DecisionsMade { get; init; }
    public string? NextSteps { get; init; }
    public string? NextConferenceDate { get; init; }
    public string? CreatedBy { get; init; }
    public string? ResidentCode { get; init; }
    public string? Status { get; init; }
}

public sealed class InterventionPlanResponseDto
{
    public long PlanId { get; init; }
    public long Id { get; init; }
    public long? ResidentId { get; init; }
    public string? PlanCategory { get; init; }
    public string? PlanDescription { get; init; }
    public string? ServicesProvided { get; init; }
    public decimal? TargetValue { get; init; }
    public string? TargetDate { get; init; }
    public string? Status { get; init; }
    public string? CaseConferenceDate { get; init; }
    public string? ResidentCode { get; init; }
}

public sealed class IncidentReportResponseDto
{
    public long IncidentId { get; init; }
    public long Id { get; init; }
    public long? ResidentId { get; init; }
    public long? SafehouseId { get; init; }
    public string? IncidentDate { get; init; }
    public string? IncidentType { get; init; }
    public string? Severity { get; init; }
    public string? Description { get; init; }
    public string? ResponseTaken { get; init; }
    public bool? Resolved { get; init; }
    public string? ResolutionDate { get; init; }
    public string? ReportedBy { get; init; }
    public bool? FollowUpRequired { get; init; }
    public string? Status { get; init; }
    public string? SafehouseName { get; init; }
    public string? ResidentCode { get; init; }
}
