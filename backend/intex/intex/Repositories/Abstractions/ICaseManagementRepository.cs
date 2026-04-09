using System.Text.Json;
using backend.intex.DTOs.CaseManagement;

namespace backend.intex.Repositories.Abstractions;

public interface ICaseManagementRepository
{
    Task<(IReadOnlyList<ProcessRecordingResponseDto> Data, int Total)> ListProcessRecordingsAsync(
        int page,
        int pageSize,
        long? residentId,
        long? safehouseId,
        IReadOnlyList<long> allowedSafehouses,
        bool enforceSafehouseScope,
        CancellationToken cancellationToken = default);

    Task<ProcessRecordingResponseDto?> GetProcessRecordingAsync(
        long recordingId,
        IReadOnlyList<long> allowedSafehouses,
        bool enforceSafehouseScope,
        CancellationToken cancellationToken = default);

    Task<ProcessRecordingResponseDto?> CreateProcessRecordingAsync(
        IReadOnlyDictionary<string, JsonElement> fields,
        CancellationToken cancellationToken = default);

    Task<ProcessRecordingResponseDto?> UpdateProcessRecordingAsync(
        long recordingId,
        IReadOnlyDictionary<string, JsonElement> fields,
        CancellationToken cancellationToken = default);

    Task<bool> DeleteProcessRecordingAsync(long recordingId, CancellationToken cancellationToken = default);

    Task<(IReadOnlyList<HomeVisitationResponseDto> Data, int Total)> ListHomeVisitationsAsync(
        int page,
        int pageSize,
        long? residentId,
        IReadOnlyList<long> allowedSafehouses,
        bool enforceSafehouseScope,
        CancellationToken cancellationToken = default);

    Task<HomeVisitationResponseDto?> GetHomeVisitationAsync(
        long visitationId,
        IReadOnlyList<long> allowedSafehouses,
        bool enforceSafehouseScope,
        CancellationToken cancellationToken = default);

    Task<HomeVisitationResponseDto?> CreateHomeVisitationAsync(
        IReadOnlyDictionary<string, JsonElement> fields,
        CancellationToken cancellationToken = default);

    Task<HomeVisitationResponseDto?> UpdateHomeVisitationAsync(
        long visitationId,
        IReadOnlyDictionary<string, JsonElement> fields,
        CancellationToken cancellationToken = default);

    Task<bool> DeleteHomeVisitationAsync(long visitationId, CancellationToken cancellationToken = default);

    Task<(IReadOnlyList<CaseConferenceResponseDto> Data, int Total)> ListCaseConferencesAsync(
        int page,
        int pageSize,
        long? residentId,
        string? status,
        bool? upcoming,
        IReadOnlyList<long> allowedSafehouses,
        bool enforceSafehouseScope,
        CancellationToken cancellationToken = default);

    Task<CaseConferenceResponseDto?> GetCaseConferenceAsync(
        long conferenceId,
        IReadOnlyList<long> allowedSafehouses,
        bool enforceSafehouseScope,
        CancellationToken cancellationToken = default);

    Task<CaseConferenceResponseDto?> CreateCaseConferenceAsync(
        IReadOnlyDictionary<string, JsonElement> fields,
        CancellationToken cancellationToken = default);

    Task<CaseConferenceResponseDto?> UpdateCaseConferenceAsync(
        long conferenceId,
        IReadOnlyDictionary<string, JsonElement> fields,
        CancellationToken cancellationToken = default);

    Task<bool> DeleteCaseConferenceAsync(long conferenceId, CancellationToken cancellationToken = default);

    Task<(IReadOnlyList<InterventionPlanResponseDto> Data, int Total)> ListInterventionPlansAsync(
        int page,
        int pageSize,
        long? residentId,
        string? status,
        IReadOnlyList<long> allowedSafehouses,
        bool enforceSafehouseScope,
        CancellationToken cancellationToken = default);

    Task<InterventionPlanResponseDto?> GetInterventionPlanAsync(
        long planId,
        IReadOnlyList<long> allowedSafehouses,
        bool enforceSafehouseScope,
        CancellationToken cancellationToken = default);

    Task<InterventionPlanResponseDto?> CreateInterventionPlanAsync(
        IReadOnlyDictionary<string, JsonElement> fields,
        CancellationToken cancellationToken = default);

    Task<InterventionPlanResponseDto?> UpdateInterventionPlanAsync(
        long planId,
        IReadOnlyDictionary<string, JsonElement> fields,
        CancellationToken cancellationToken = default);

    Task<bool> DeleteInterventionPlanAsync(long planId, CancellationToken cancellationToken = default);

    Task<(IReadOnlyList<IncidentReportResponseDto> Data, int Total)> ListIncidentReportsAsync(
        int page,
        int pageSize,
        long? residentId,
        long? safehouseId,
        string? severity,
        string? status,
        IReadOnlyList<long> allowedSafehouses,
        bool enforceSafehouseScope,
        CancellationToken cancellationToken = default);

    Task<IncidentReportResponseDto?> GetIncidentReportAsync(
        long incidentId,
        IReadOnlyList<long> allowedSafehouses,
        bool enforceSafehouseScope,
        CancellationToken cancellationToken = default);

    Task<IncidentReportResponseDto?> CreateIncidentReportAsync(
        IReadOnlyDictionary<string, JsonElement> fields,
        CancellationToken cancellationToken = default);

    Task<IncidentReportResponseDto?> UpdateIncidentReportAsync(
        long incidentId,
        IReadOnlyDictionary<string, JsonElement> fields,
        CancellationToken cancellationToken = default);

    Task<bool> DeleteIncidentReportAsync(long incidentId, CancellationToken cancellationToken = default);

    Task<ResidentScopeLookup?> GetResidentScopeLookupAsync(long residentId, CancellationToken cancellationToken = default);
}

public sealed record ResidentScopeLookup(long ResidentId, long? SafehouseId, string? ResidentCode, string? SafehouseName);
