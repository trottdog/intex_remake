using System.Text.Json;
using backend.intex.DTOs.CaseManagement;
using backend.intex.DTOs.Common;
using backend.intex.Infrastructure.Auth;
using backend.intex.Repositories.Abstractions;
using backend.intex.Services.Abstractions;

namespace backend.intex.Services.CaseManagement;

public sealed class CaseManagementService(ICaseManagementRepository repository) : ICaseManagementService
{
    public async Task<StandardPagedResponse<ProcessRecordingResponseDto>> ListProcessRecordingsAsync(ListProcessRecordingsQuery query, string? role, IReadOnlyList<long> assignedSafehouses, CancellationToken cancellationToken = default)
    {
        var page = ResolvePage(query.Page);
        var pageSize = ResolvePageSize(query.PageSize, query.Limit);
        var enforceScope = EnforceScope(role);
        var (data, total) = await repository.ListProcessRecordingsAsync(page, pageSize, query.ResidentId, query.SafehouseId, assignedSafehouses, enforceScope, cancellationToken);
        return new StandardPagedResponse<ProcessRecordingResponseDto>(data, total, BuildPagination(page, pageSize, total));
    }

    public Task<ProcessRecordingResponseDto?> GetProcessRecordingAsync(long recordingId, string? role, IReadOnlyList<long> assignedSafehouses, CancellationToken cancellationToken = default) =>
        repository.GetProcessRecordingAsync(recordingId, assignedSafehouses, EnforceScope(role), cancellationToken);

    public async Task<(ProcessRecordingResponseDto? Recording, string? ErrorMessage)> CreateProcessRecordingAsync(CreateProcessRecordingRequest request, string? role, IReadOnlyList<long> assignedSafehouses, CancellationToken cancellationToken = default)
    {
        var residentId = ReadNullableLong(request.Fields, "residentId");
        if (!residentId.HasValue)
        {
            return (null, "residentId is required");
        }

        var validationError = await ValidateResidentScopeAsync(residentId.Value, role, assignedSafehouses, cancellationToken);
        return validationError is not null
            ? (null, validationError)
            : (await repository.CreateProcessRecordingAsync(request.Fields, cancellationToken), null);
    }

    public async Task<(ProcessRecordingResponseDto? Recording, string? ErrorMessage)> UpdateProcessRecordingAsync(long recordingId, UpdateProcessRecordingRequest request, string? role, IReadOnlyList<long> assignedSafehouses, CancellationToken cancellationToken = default)
    {
        var existing = await repository.GetProcessRecordingAsync(recordingId, assignedSafehouses, EnforceScope(role), cancellationToken);
        if (existing is null)
        {
            return (null, "Not found");
        }

        var effectiveResidentId = ReadNullableLong(request.Fields, "residentId") ?? existing.ResidentId;
        if (effectiveResidentId.HasValue)
        {
            var validationError = await ValidateResidentScopeAsync(effectiveResidentId.Value, role, assignedSafehouses, cancellationToken);
            if (validationError is not null)
            {
                return (null, validationError);
            }
        }

        var updated = await repository.UpdateProcessRecordingAsync(recordingId, request.Fields, cancellationToken);
        return updated is null ? (null, "Not found") : (updated, null);
    }

    public async Task<bool> DeleteProcessRecordingAsync(long recordingId, string? role, IReadOnlyList<long> assignedSafehouses, CancellationToken cancellationToken = default)
    {
        var existing = await repository.GetProcessRecordingAsync(recordingId, assignedSafehouses, EnforceScope(role), cancellationToken);
        return existing is not null && await repository.DeleteProcessRecordingAsync(recordingId, cancellationToken);
    }

    public async Task<StandardPagedResponse<HomeVisitationResponseDto>> ListHomeVisitationsAsync(ListHomeVisitationsQuery query, string? role, IReadOnlyList<long> assignedSafehouses, CancellationToken cancellationToken = default)
    {
        var page = ResolvePage(query.Page);
        var pageSize = ResolvePageSize(query.PageSize, query.Limit);
        var enforceScope = EnforceScope(role);
        var (data, total) = await repository.ListHomeVisitationsAsync(page, pageSize, query.ResidentId, assignedSafehouses, enforceScope, cancellationToken);
        return new StandardPagedResponse<HomeVisitationResponseDto>(data, total, BuildPagination(page, pageSize, total));
    }

    public Task<HomeVisitationResponseDto?> GetHomeVisitationAsync(long visitationId, string? role, IReadOnlyList<long> assignedSafehouses, CancellationToken cancellationToken = default) =>
        repository.GetHomeVisitationAsync(visitationId, assignedSafehouses, EnforceScope(role), cancellationToken);

    public async Task<(HomeVisitationResponseDto? Visitation, string? ErrorMessage)> CreateHomeVisitationAsync(CreateHomeVisitationRequest request, string? role, IReadOnlyList<long> assignedSafehouses, CancellationToken cancellationToken = default)
    {
        var residentId = ReadNullableLong(request.Fields, "residentId");
        if (!residentId.HasValue)
        {
            return (null, "residentId is required");
        }

        var validationError = await ValidateResidentScopeAsync(residentId.Value, role, assignedSafehouses, cancellationToken);
        return validationError is not null
            ? (null, validationError)
            : (await repository.CreateHomeVisitationAsync(request.Fields, cancellationToken), null);
    }

    public async Task<(HomeVisitationResponseDto? Visitation, string? ErrorMessage)> UpdateHomeVisitationAsync(long visitationId, UpdateHomeVisitationRequest request, string? role, IReadOnlyList<long> assignedSafehouses, CancellationToken cancellationToken = default)
    {
        var existing = await repository.GetHomeVisitationAsync(visitationId, assignedSafehouses, EnforceScope(role), cancellationToken);
        if (existing is null)
        {
            return (null, "Not found");
        }

        var effectiveResidentId = ReadNullableLong(request.Fields, "residentId") ?? existing.ResidentId;
        if (effectiveResidentId.HasValue)
        {
            var validationError = await ValidateResidentScopeAsync(effectiveResidentId.Value, role, assignedSafehouses, cancellationToken);
            if (validationError is not null)
            {
                return (null, validationError);
            }
        }

        var updated = await repository.UpdateHomeVisitationAsync(visitationId, request.Fields, cancellationToken);
        return updated is null ? (null, "Not found") : (updated, null);
    }

    public async Task<bool> DeleteHomeVisitationAsync(long visitationId, string? role, IReadOnlyList<long> assignedSafehouses, CancellationToken cancellationToken = default)
    {
        var existing = await repository.GetHomeVisitationAsync(visitationId, assignedSafehouses, EnforceScope(role), cancellationToken);
        return existing is not null && await repository.DeleteHomeVisitationAsync(visitationId, cancellationToken);
    }

    public async Task<StandardPagedResponse<CaseConferenceResponseDto>> ListCaseConferencesAsync(ListCaseConferencesQuery query, string? role, IReadOnlyList<long> assignedSafehouses, CancellationToken cancellationToken = default)
    {
        var page = ResolvePage(query.Page);
        var pageSize = ResolvePageSize(query.PageSize, query.Limit);
        var enforceScope = EnforceScope(role);
        var (data, total) = await repository.ListCaseConferencesAsync(page, pageSize, query.ResidentId, query.Status, query.Upcoming, assignedSafehouses, enforceScope, cancellationToken);
        return new StandardPagedResponse<CaseConferenceResponseDto>(data, total, BuildPagination(page, pageSize, total));
    }

    public Task<CaseConferenceResponseDto?> GetCaseConferenceAsync(long conferenceId, string? role, IReadOnlyList<long> assignedSafehouses, CancellationToken cancellationToken = default) =>
        repository.GetCaseConferenceAsync(conferenceId, assignedSafehouses, EnforceScope(role), cancellationToken);

    public async Task<(CaseConferenceResponseDto? Conference, string? ErrorMessage)> CreateCaseConferenceAsync(CreateCaseConferenceRequest request, string? role, IReadOnlyList<long> assignedSafehouses, CancellationToken cancellationToken = default)
    {
        var residentId = ReadNullableLong(request.Fields, "residentId");
        if (!residentId.HasValue)
        {
            return (null, "residentId is required");
        }

        var validationError = await ValidateResidentScopeAsync(residentId.Value, role, assignedSafehouses, cancellationToken);
        return validationError is not null
            ? (null, validationError)
            : (await repository.CreateCaseConferenceAsync(request.Fields, cancellationToken), null);
    }

    public async Task<(CaseConferenceResponseDto? Conference, string? ErrorMessage)> UpdateCaseConferenceAsync(long conferenceId, UpdateCaseConferenceRequest request, string? role, IReadOnlyList<long> assignedSafehouses, CancellationToken cancellationToken = default)
    {
        var existing = await repository.GetCaseConferenceAsync(conferenceId, assignedSafehouses, EnforceScope(role), cancellationToken);
        if (existing is null)
        {
            return (null, "Not found");
        }

        var effectiveResidentId = ReadNullableLong(request.Fields, "residentId") ?? existing.ResidentId;
        var validationError = await ValidateResidentScopeAsync(effectiveResidentId, role, assignedSafehouses, cancellationToken);
        if (validationError is not null)
        {
            return (null, validationError);
        }

        var updated = await repository.UpdateCaseConferenceAsync(conferenceId, request.Fields, cancellationToken);
        return updated is null ? (null, "Not found") : (updated, null);
    }

    public async Task<bool> DeleteCaseConferenceAsync(long conferenceId, string? role, IReadOnlyList<long> assignedSafehouses, CancellationToken cancellationToken = default)
    {
        var existing = await repository.GetCaseConferenceAsync(conferenceId, assignedSafehouses, EnforceScope(role), cancellationToken);
        return existing is not null && await repository.DeleteCaseConferenceAsync(conferenceId, cancellationToken);
    }

    public async Task<StandardPagedResponse<InterventionPlanResponseDto>> ListInterventionPlansAsync(ListInterventionPlansQuery query, string? role, IReadOnlyList<long> assignedSafehouses, CancellationToken cancellationToken = default)
    {
        var page = ResolvePage(query.Page);
        var pageSize = ResolvePageSize(query.PageSize, query.Limit);
        var enforceScope = EnforceScope(role);
        var (data, total) = await repository.ListInterventionPlansAsync(page, pageSize, query.ResidentId, query.Status, assignedSafehouses, enforceScope, cancellationToken);
        return new StandardPagedResponse<InterventionPlanResponseDto>(data, total, BuildPagination(page, pageSize, total));
    }

    public Task<InterventionPlanResponseDto?> GetInterventionPlanAsync(long planId, string? role, IReadOnlyList<long> assignedSafehouses, CancellationToken cancellationToken = default) =>
        repository.GetInterventionPlanAsync(planId, assignedSafehouses, EnforceScope(role), cancellationToken);

    public async Task<(InterventionPlanResponseDto? Plan, string? ErrorMessage)> CreateInterventionPlanAsync(CreateInterventionPlanRequest request, string? role, IReadOnlyList<long> assignedSafehouses, CancellationToken cancellationToken = default)
    {
        var residentId = ReadNullableLong(request.Fields, "residentId");
        if (!residentId.HasValue)
        {
            return (null, "residentId is required");
        }

        var validationError = await ValidateResidentScopeAsync(residentId.Value, role, assignedSafehouses, cancellationToken);
        return validationError is not null
            ? (null, validationError)
            : (await repository.CreateInterventionPlanAsync(request.Fields, cancellationToken), null);
    }

    public async Task<(InterventionPlanResponseDto? Plan, string? ErrorMessage)> UpdateInterventionPlanAsync(long planId, UpdateInterventionPlanRequest request, string? role, IReadOnlyList<long> assignedSafehouses, CancellationToken cancellationToken = default)
    {
        var existing = await repository.GetInterventionPlanAsync(planId, assignedSafehouses, EnforceScope(role), cancellationToken);
        if (existing is null)
        {
            return (null, "Not found");
        }

        var effectiveResidentId = ReadNullableLong(request.Fields, "residentId") ?? existing.ResidentId;
        if (effectiveResidentId.HasValue)
        {
            var validationError = await ValidateResidentScopeAsync(effectiveResidentId.Value, role, assignedSafehouses, cancellationToken);
            if (validationError is not null)
            {
                return (null, validationError);
            }
        }

        var updated = await repository.UpdateInterventionPlanAsync(planId, request.Fields, cancellationToken);
        return updated is null ? (null, "Not found") : (updated, null);
    }

    public async Task<bool> DeleteInterventionPlanAsync(long planId, string? role, IReadOnlyList<long> assignedSafehouses, CancellationToken cancellationToken = default)
    {
        var existing = await repository.GetInterventionPlanAsync(planId, assignedSafehouses, EnforceScope(role), cancellationToken);
        return existing is not null && await repository.DeleteInterventionPlanAsync(planId, cancellationToken);
    }

    public async Task<StandardPagedResponse<IncidentReportResponseDto>> ListIncidentReportsAsync(ListIncidentReportsQuery query, string? role, IReadOnlyList<long> assignedSafehouses, CancellationToken cancellationToken = default)
    {
        var page = ResolvePage(query.Page);
        var pageSize = ResolvePageSize(query.PageSize, query.Limit);
        var enforceScope = EnforceScope(role);
        var (data, total) = await repository.ListIncidentReportsAsync(page, pageSize, query.ResidentId, query.SafehouseId, query.Severity, query.Status, assignedSafehouses, enforceScope, cancellationToken);
        return new StandardPagedResponse<IncidentReportResponseDto>(data, total, BuildPagination(page, pageSize, total));
    }

    public Task<IncidentReportResponseDto?> GetIncidentReportAsync(long incidentId, string? role, IReadOnlyList<long> assignedSafehouses, CancellationToken cancellationToken = default) =>
        repository.GetIncidentReportAsync(incidentId, assignedSafehouses, EnforceScope(role), cancellationToken);

    public async Task<(IncidentReportResponseDto? Incident, string? ErrorMessage)> CreateIncidentReportAsync(CreateIncidentReportRequest request, string? role, IReadOnlyList<long> assignedSafehouses, CancellationToken cancellationToken = default)
    {
        var safehouseId = ReadNullableLong(request.Fields, "safehouseId");
        if (!safehouseId.HasValue)
        {
            return (null, "safehouseId is required");
        }

        var validationError = await ValidateIncidentScopeAsync(request.Fields, role, assignedSafehouses, cancellationToken);
        return validationError is not null
            ? (null, validationError)
            : (await repository.CreateIncidentReportAsync(request.Fields, cancellationToken), null);
    }

    public async Task<(IncidentReportResponseDto? Incident, string? ErrorMessage)> UpdateIncidentReportAsync(long incidentId, UpdateIncidentReportRequest request, string? role, IReadOnlyList<long> assignedSafehouses, CancellationToken cancellationToken = default)
    {
        var existing = await repository.GetIncidentReportAsync(incidentId, assignedSafehouses, EnforceScope(role), cancellationToken);
        if (existing is null)
        {
            return (null, "Not found");
        }

        var validationError = await ValidateIncidentScopeAsync(request.Fields, role, assignedSafehouses, cancellationToken, existing);
        if (validationError is not null)
        {
            return (null, validationError);
        }

        var updated = await repository.UpdateIncidentReportAsync(incidentId, request.Fields, cancellationToken);
        return updated is null ? (null, "Not found") : (updated, null);
    }

    public async Task<bool> DeleteIncidentReportAsync(long incidentId, string? role, IReadOnlyList<long> assignedSafehouses, CancellationToken cancellationToken = default)
    {
        var existing = await repository.GetIncidentReportAsync(incidentId, assignedSafehouses, EnforceScope(role), cancellationToken);
        return existing is not null && await repository.DeleteIncidentReportAsync(incidentId, cancellationToken);
    }

    private async Task<string?> ValidateResidentScopeAsync(long residentId, string? role, IReadOnlyList<long> assignedSafehouses, CancellationToken cancellationToken)
    {
        var lookup = await repository.GetResidentScopeLookupAsync(residentId, cancellationToken);
        if (lookup is null)
        {
            return "residentId is invalid";
        }

        if (EnforceScope(role) && assignedSafehouses.Count > 0)
        {
            if (!lookup.SafehouseId.HasValue || !assignedSafehouses.Contains(lookup.SafehouseId.Value))
            {
                return "residentId is outside your allowed scope";
            }
        }

        return null;
    }

    private async Task<string?> ValidateIncidentScopeAsync(
        IReadOnlyDictionary<string, JsonElement> fields,
        string? role,
        IReadOnlyList<long> assignedSafehouses,
        CancellationToken cancellationToken,
        IncidentReportResponseDto? existing = null)
    {
        if (!EnforceScope(role) || assignedSafehouses.Count == 0)
        {
            return null;
        }

        var effectiveSafehouseId = ReadNullableLong(fields, "safehouseId") ?? existing?.SafehouseId;
        if (effectiveSafehouseId.HasValue && !assignedSafehouses.Contains(effectiveSafehouseId.Value))
        {
            return "safehouseId is outside your allowed scope";
        }

        var effectiveResidentId = ReadNullableLong(fields, "residentId") ?? existing?.ResidentId;
        if (effectiveResidentId.HasValue)
        {
            var residentError = await ValidateResidentScopeAsync(effectiveResidentId.Value, role, assignedSafehouses, cancellationToken);
            if (residentError is not null)
            {
                return residentError;
            }
        }

        return null;
    }

    private static long? ReadNullableLong(IReadOnlyDictionary<string, JsonElement> fields, string key)
    {
        if (!fields.TryGetValue(key, out var value) || value.ValueKind == JsonValueKind.Null || value.ValueKind == JsonValueKind.Undefined)
        {
            return null;
        }

        return value.ValueKind switch
        {
            JsonValueKind.Number when value.TryGetInt64(out var longValue) => longValue,
            JsonValueKind.String when long.TryParse(value.GetString(), out var stringValue) => stringValue,
            _ => null
        };
    }

    private static bool EnforceScope(string? role) => role is BeaconRoles.Staff or BeaconRoles.Admin;

    private static int ResolvePage(int page) => page <= 0 ? 1 : page;

    private static int ResolvePageSize(int? pageSize, int? limit)
    {
        var resolved = pageSize ?? limit ?? 20;
        return Math.Clamp(resolved, 1, 2000);
    }

    private static StandardPaginationMeta BuildPagination(int page, int pageSize, int total)
    {
        var totalPages = total == 0 ? 0 : (int)Math.Ceiling(total / (double)pageSize);
        return new StandardPaginationMeta(page, pageSize, totalPages, page < totalPages, page > 1);
    }
}
