using backend.intex.DTOs.CaseManagement;
using backend.intex.DTOs.Common;

namespace backend.intex.Services.Abstractions;

public interface ICaseManagementService
{
    Task<StandardPagedResponse<ProcessRecordingResponseDto>> ListProcessRecordingsAsync(ListProcessRecordingsQuery query, string? role, IReadOnlyList<long> assignedSafehouses, CancellationToken cancellationToken = default);
    Task<ProcessRecordingResponseDto?> GetProcessRecordingAsync(long recordingId, string? role, IReadOnlyList<long> assignedSafehouses, CancellationToken cancellationToken = default);
    Task<(ProcessRecordingResponseDto? Recording, string? ErrorMessage)> CreateProcessRecordingAsync(CreateProcessRecordingRequest request, string? role, IReadOnlyList<long> assignedSafehouses, CancellationToken cancellationToken = default);
    Task<(ProcessRecordingResponseDto? Recording, string? ErrorMessage)> UpdateProcessRecordingAsync(long recordingId, UpdateProcessRecordingRequest request, string? role, IReadOnlyList<long> assignedSafehouses, CancellationToken cancellationToken = default);
    Task<bool> DeleteProcessRecordingAsync(long recordingId, string? role, IReadOnlyList<long> assignedSafehouses, CancellationToken cancellationToken = default);

    Task<StandardPagedResponse<HomeVisitationResponseDto>> ListHomeVisitationsAsync(ListHomeVisitationsQuery query, string? role, IReadOnlyList<long> assignedSafehouses, CancellationToken cancellationToken = default);
    Task<HomeVisitationResponseDto?> GetHomeVisitationAsync(long visitationId, string? role, IReadOnlyList<long> assignedSafehouses, CancellationToken cancellationToken = default);
    Task<(HomeVisitationResponseDto? Visitation, string? ErrorMessage)> CreateHomeVisitationAsync(CreateHomeVisitationRequest request, string? role, IReadOnlyList<long> assignedSafehouses, CancellationToken cancellationToken = default);
    Task<(HomeVisitationResponseDto? Visitation, string? ErrorMessage)> UpdateHomeVisitationAsync(long visitationId, UpdateHomeVisitationRequest request, string? role, IReadOnlyList<long> assignedSafehouses, CancellationToken cancellationToken = default);
    Task<bool> DeleteHomeVisitationAsync(long visitationId, string? role, IReadOnlyList<long> assignedSafehouses, CancellationToken cancellationToken = default);

    Task<StandardPagedResponse<CaseConferenceResponseDto>> ListCaseConferencesAsync(ListCaseConferencesQuery query, string? role, IReadOnlyList<long> assignedSafehouses, CancellationToken cancellationToken = default);
    Task<CaseConferenceResponseDto?> GetCaseConferenceAsync(long conferenceId, string? role, IReadOnlyList<long> assignedSafehouses, CancellationToken cancellationToken = default);
    Task<(CaseConferenceResponseDto? Conference, string? ErrorMessage)> CreateCaseConferenceAsync(CreateCaseConferenceRequest request, string? role, IReadOnlyList<long> assignedSafehouses, CancellationToken cancellationToken = default);
    Task<(CaseConferenceResponseDto? Conference, string? ErrorMessage)> UpdateCaseConferenceAsync(long conferenceId, UpdateCaseConferenceRequest request, string? role, IReadOnlyList<long> assignedSafehouses, CancellationToken cancellationToken = default);
    Task<bool> DeleteCaseConferenceAsync(long conferenceId, string? role, IReadOnlyList<long> assignedSafehouses, CancellationToken cancellationToken = default);

    Task<StandardPagedResponse<InterventionPlanResponseDto>> ListInterventionPlansAsync(ListInterventionPlansQuery query, string? role, IReadOnlyList<long> assignedSafehouses, CancellationToken cancellationToken = default);
    Task<InterventionPlanResponseDto?> GetInterventionPlanAsync(long planId, string? role, IReadOnlyList<long> assignedSafehouses, CancellationToken cancellationToken = default);
    Task<(InterventionPlanResponseDto? Plan, string? ErrorMessage)> CreateInterventionPlanAsync(CreateInterventionPlanRequest request, string? role, IReadOnlyList<long> assignedSafehouses, CancellationToken cancellationToken = default);
    Task<(InterventionPlanResponseDto? Plan, string? ErrorMessage)> UpdateInterventionPlanAsync(long planId, UpdateInterventionPlanRequest request, string? role, IReadOnlyList<long> assignedSafehouses, CancellationToken cancellationToken = default);
    Task<bool> DeleteInterventionPlanAsync(long planId, string? role, IReadOnlyList<long> assignedSafehouses, CancellationToken cancellationToken = default);

    Task<StandardPagedResponse<IncidentReportResponseDto>> ListIncidentReportsAsync(ListIncidentReportsQuery query, string? role, IReadOnlyList<long> assignedSafehouses, CancellationToken cancellationToken = default);
    Task<IncidentReportResponseDto?> GetIncidentReportAsync(long incidentId, string? role, IReadOnlyList<long> assignedSafehouses, CancellationToken cancellationToken = default);
    Task<(IncidentReportResponseDto? Incident, string? ErrorMessage)> CreateIncidentReportAsync(CreateIncidentReportRequest request, string? role, IReadOnlyList<long> assignedSafehouses, CancellationToken cancellationToken = default);
    Task<(IncidentReportResponseDto? Incident, string? ErrorMessage)> UpdateIncidentReportAsync(long incidentId, UpdateIncidentReportRequest request, string? role, IReadOnlyList<long> assignedSafehouses, CancellationToken cancellationToken = default);
    Task<bool> DeleteIncidentReportAsync(long incidentId, string? role, IReadOnlyList<long> assignedSafehouses, CancellationToken cancellationToken = default);
}
