using System.Text.Json;
using backend.intex.DTOs.CaseManagement;
using backend.intex.Entities.Database;
using backend.intex.Infrastructure.Data.EntityFramework;
using backend.intex.Repositories.Abstractions;
using Microsoft.EntityFrameworkCore;

namespace backend.intex.Repositories.EntityFramework;

public sealed class CaseManagementRepository(BeaconDbContext dbContext) : ICaseManagementRepository
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    public async Task<(IReadOnlyList<ProcessRecordingResponseDto> Data, int Total)> ListProcessRecordingsAsync(
        int page,
        int pageSize,
        long? residentId,
        long? safehouseId,
        IReadOnlyList<long> allowedSafehouses,
        bool enforceSafehouseScope,
        CancellationToken cancellationToken = default)
    {
        var query = from recording in dbContext.ProcessRecordings.AsNoTracking()
                    join resident in dbContext.Residents.AsNoTracking() on recording.ResidentId equals (long?)resident.ResidentId into residentGroup
                    from resident in residentGroup.DefaultIfEmpty()
                    select new
                    {
                        Recording = recording,
                        resident.CaseControlNo,
                        resident.InternalCode,
                        resident.SafehouseId
                    };

        if (residentId.HasValue)
        {
            query = query.Where(item => item.Recording.ResidentId == residentId.Value);
        }

        if (safehouseId.HasValue)
        {
            query = query.Where(item => item.SafehouseId == safehouseId.Value);
        }

        if (enforceSafehouseScope && allowedSafehouses.Count > 0)
        {
            query = query.Where(item => item.SafehouseId.HasValue && allowedSafehouses.Contains(item.SafehouseId.Value));
        }

        var total = await query.CountAsync(cancellationToken);
        var rows = await query
            .OrderByDescending(item => item.Recording.SessionDate)
            .ThenByDescending(item => item.Recording.RecordingId)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return (rows.Select(item => new ProcessRecordingResponseDto
        {
            RecordingId = item.Recording.RecordingId,
            Id = item.Recording.RecordingId,
            ResidentId = item.Recording.ResidentId,
            SessionDate = item.Recording.SessionDate?.ToString("yyyy-MM-dd"),
            SocialWorker = item.Recording.SocialWorker,
            SessionType = item.Recording.SessionType,
            SessionDurationMinutes = item.Recording.SessionDurationMinutes,
            EmotionalStateObserved = item.Recording.EmotionalStateObserved,
            EmotionalStateEnd = item.Recording.EmotionalStateEnd,
            SessionNarrative = item.Recording.SessionNarrative,
            InterventionsApplied = item.Recording.InterventionsApplied,
            FollowUpActions = item.Recording.FollowUpActions,
            ProgressNoted = item.Recording.ProgressNoted,
            ConcernsFlagged = item.Recording.ConcernsFlagged,
            ReferralMade = item.Recording.ReferralMade,
            NotesRestricted = item.Recording.NotesRestricted,
            ResidentCode = BuildResidentCode(item.CaseControlNo, item.InternalCode, item.Recording.ResidentId)
        }).ToList(), total);
    }

    public async Task<ProcessRecordingResponseDto?> GetProcessRecordingAsync(
        long recordingId,
        IReadOnlyList<long> allowedSafehouses,
        bool enforceSafehouseScope,
        CancellationToken cancellationToken = default)
    {
        return await GetProcessRecordingCoreAsync(recordingId, allowedSafehouses, enforceSafehouseScope, cancellationToken);
    }

    public async Task<ProcessRecordingResponseDto?> CreateProcessRecordingAsync(
        IReadOnlyDictionary<string, JsonElement> fields,
        CancellationToken cancellationToken = default)
    {
        var entity = DeserializeEntity<ProcessRecording>(fields);
        dbContext.ProcessRecordings.Add(entity);
        await dbContext.SaveChangesAsync(cancellationToken);
        return await GetProcessRecordingCoreAsync(entity.RecordingId, [], false, cancellationToken);
    }

    public async Task<ProcessRecordingResponseDto?> UpdateProcessRecordingAsync(
        long recordingId,
        IReadOnlyDictionary<string, JsonElement> fields,
        CancellationToken cancellationToken = default)
    {
        var entity = await dbContext.ProcessRecordings.FirstOrDefaultAsync(item => item.RecordingId == recordingId, cancellationToken);
        if (entity is null)
        {
            return null;
        }

        ApplyMergedValues(entity, fields);
        await dbContext.SaveChangesAsync(cancellationToken);
        return await GetProcessRecordingCoreAsync(recordingId, [], false, cancellationToken);
    }

    public async Task<bool> DeleteProcessRecordingAsync(long recordingId, CancellationToken cancellationToken = default)
    {
        var entity = await dbContext.ProcessRecordings.FirstOrDefaultAsync(item => item.RecordingId == recordingId, cancellationToken);
        if (entity is null)
        {
            return false;
        }

        dbContext.ProcessRecordings.Remove(entity);
        await dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<(IReadOnlyList<HomeVisitationResponseDto> Data, int Total)> ListHomeVisitationsAsync(
        int page,
        int pageSize,
        long? residentId,
        IReadOnlyList<long> allowedSafehouses,
        bool enforceSafehouseScope,
        CancellationToken cancellationToken = default)
    {
        var query = from visitation in dbContext.HomeVisitations.AsNoTracking()
                    join resident in dbContext.Residents.AsNoTracking() on visitation.ResidentId equals (long?)resident.ResidentId into residentGroup
                    from resident in residentGroup.DefaultIfEmpty()
                    select new
                    {
                        Visitation = visitation,
                        resident.CaseControlNo,
                        resident.InternalCode,
                        resident.SafehouseId
                    };

        if (residentId.HasValue)
        {
            query = query.Where(item => item.Visitation.ResidentId == residentId.Value);
        }

        if (enforceSafehouseScope && allowedSafehouses.Count > 0)
        {
            query = query.Where(item => item.SafehouseId.HasValue && allowedSafehouses.Contains(item.SafehouseId.Value));
        }

        var total = await query.CountAsync(cancellationToken);
        var rows = await query
            .OrderByDescending(item => item.Visitation.VisitDate)
            .ThenByDescending(item => item.Visitation.VisitationId)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return (rows.Select(item => new HomeVisitationResponseDto
        {
            VisitationId = item.Visitation.VisitationId,
            Id = item.Visitation.VisitationId,
            ResidentId = item.Visitation.ResidentId,
            VisitDate = item.Visitation.VisitDate?.ToString("yyyy-MM-dd"),
            SocialWorker = item.Visitation.SocialWorker,
            VisitType = item.Visitation.VisitType,
            LocationVisited = item.Visitation.LocationVisited,
            FamilyMembersPresent = item.Visitation.FamilyMembersPresent,
            Purpose = item.Visitation.Purpose,
            Observations = item.Visitation.Observations,
            FamilyCooperationLevel = item.Visitation.FamilyCooperationLevel,
            SafetyConcernsNoted = item.Visitation.SafetyConcernsNoted,
            FollowUpNeeded = item.Visitation.FollowUpNeeded,
            FollowUpNotes = item.Visitation.FollowUpNotes,
            VisitOutcome = item.Visitation.VisitOutcome,
            ResidentCode = BuildResidentCode(item.CaseControlNo, item.InternalCode, item.Visitation.ResidentId)
        }).ToList(), total);
    }

    public async Task<HomeVisitationResponseDto?> GetHomeVisitationAsync(
        long visitationId,
        IReadOnlyList<long> allowedSafehouses,
        bool enforceSafehouseScope,
        CancellationToken cancellationToken = default)
        => await GetHomeVisitationCoreAsync(visitationId, allowedSafehouses, enforceSafehouseScope, cancellationToken);

    public async Task<HomeVisitationResponseDto?> CreateHomeVisitationAsync(
        IReadOnlyDictionary<string, JsonElement> fields,
        CancellationToken cancellationToken = default)
    {
        var entity = DeserializeEntity<HomeVisitation>(fields);
        dbContext.HomeVisitations.Add(entity);
        await dbContext.SaveChangesAsync(cancellationToken);
        return await GetHomeVisitationCoreAsync(entity.VisitationId, [], false, cancellationToken);
    }

    public async Task<HomeVisitationResponseDto?> UpdateHomeVisitationAsync(
        long visitationId,
        IReadOnlyDictionary<string, JsonElement> fields,
        CancellationToken cancellationToken = default)
    {
        var entity = await dbContext.HomeVisitations.FirstOrDefaultAsync(item => item.VisitationId == visitationId, cancellationToken);
        if (entity is null)
        {
            return null;
        }

        ApplyMergedValues(entity, fields);
        await dbContext.SaveChangesAsync(cancellationToken);
        return await GetHomeVisitationCoreAsync(visitationId, [], false, cancellationToken);
    }

    public async Task<bool> DeleteHomeVisitationAsync(long visitationId, CancellationToken cancellationToken = default)
    {
        var entity = await dbContext.HomeVisitations.FirstOrDefaultAsync(item => item.VisitationId == visitationId, cancellationToken);
        if (entity is null)
        {
            return false;
        }

        dbContext.HomeVisitations.Remove(entity);
        await dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<(IReadOnlyList<CaseConferenceResponseDto> Data, int Total)> ListCaseConferencesAsync(
        int page,
        int pageSize,
        long? residentId,
        string? status,
        bool? upcoming,
        IReadOnlyList<long> allowedSafehouses,
        bool enforceSafehouseScope,
        CancellationToken cancellationToken = default)
    {
        var query = from conference in dbContext.CaseConferences.AsNoTracking()
                    join resident in dbContext.Residents.AsNoTracking() on conference.ResidentId equals resident.ResidentId into residentGroup
                    from resident in residentGroup.DefaultIfEmpty()
                    select new
                    {
                        Conference = conference,
                        resident.CaseControlNo,
                        resident.InternalCode,
                        resident.SafehouseId
                    };

        if (residentId.HasValue)
        {
            query = query.Where(item => item.Conference.ResidentId == residentId.Value);
        }

        if (!string.IsNullOrWhiteSpace(status))
        {
            query = query.Where(item => item.Conference.ConferenceType != null && EF.Functions.ILike(item.Conference.ConferenceType, status));
        }

        if (upcoming.HasValue)
        {
            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            query = upcoming.Value
                ? query.Where(item => item.Conference.ConferenceDate >= today)
                : query.Where(item => item.Conference.ConferenceDate < today);
        }

        if (enforceSafehouseScope && allowedSafehouses.Count > 0)
        {
            query = query.Where(item => item.SafehouseId.HasValue && allowedSafehouses.Contains(item.SafehouseId.Value));
        }

        var total = await query.CountAsync(cancellationToken);
        var rows = await query
            .OrderByDescending(item => item.Conference.ConferenceDate)
            .ThenByDescending(item => item.Conference.ConferenceId)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return (rows.Select(item => new CaseConferenceResponseDto
        {
            ConferenceId = item.Conference.ConferenceId,
            Id = item.Conference.ConferenceId,
            ResidentId = item.Conference.ResidentId,
            ConferenceDate = item.Conference.ConferenceDate.ToString("yyyy-MM-dd"),
            ConferenceType = item.Conference.ConferenceType,
            Summary = item.Conference.Summary,
            DecisionsMade = item.Conference.DecisionsMade,
            NextSteps = item.Conference.NextSteps,
            NextConferenceDate = item.Conference.NextConferenceDate?.ToString("yyyy-MM-dd"),
            CreatedBy = item.Conference.CreatedBy,
            ResidentCode = BuildResidentCode(item.CaseControlNo, item.InternalCode, item.Conference.ResidentId),
            Status = item.Conference.ConferenceType
        }).ToList(), total);
    }

    public async Task<CaseConferenceResponseDto?> GetCaseConferenceAsync(
        long conferenceId,
        IReadOnlyList<long> allowedSafehouses,
        bool enforceSafehouseScope,
        CancellationToken cancellationToken = default)
        => await GetCaseConferenceCoreAsync(conferenceId, allowedSafehouses, enforceSafehouseScope, cancellationToken);

    public async Task<CaseConferenceResponseDto?> CreateCaseConferenceAsync(
        IReadOnlyDictionary<string, JsonElement> fields,
        CancellationToken cancellationToken = default)
    {
        var entity = DeserializeEntity<CaseConference>(fields);
        dbContext.CaseConferences.Add(entity);
        await dbContext.SaveChangesAsync(cancellationToken);
        return await GetCaseConferenceCoreAsync(entity.ConferenceId, [], false, cancellationToken);
    }

    public async Task<CaseConferenceResponseDto?> UpdateCaseConferenceAsync(
        long conferenceId,
        IReadOnlyDictionary<string, JsonElement> fields,
        CancellationToken cancellationToken = default)
    {
        var entity = await dbContext.CaseConferences.FirstOrDefaultAsync(item => item.ConferenceId == conferenceId, cancellationToken);
        if (entity is null)
        {
            return null;
        }

        ApplyMergedValues(entity, fields);
        await dbContext.SaveChangesAsync(cancellationToken);
        return await GetCaseConferenceCoreAsync(conferenceId, [], false, cancellationToken);
    }

    public async Task<bool> DeleteCaseConferenceAsync(long conferenceId, CancellationToken cancellationToken = default)
    {
        var entity = await dbContext.CaseConferences.FirstOrDefaultAsync(item => item.ConferenceId == conferenceId, cancellationToken);
        if (entity is null)
        {
            return false;
        }

        dbContext.CaseConferences.Remove(entity);
        await dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<(IReadOnlyList<InterventionPlanResponseDto> Data, int Total)> ListInterventionPlansAsync(
        int page,
        int pageSize,
        long? residentId,
        string? status,
        IReadOnlyList<long> allowedSafehouses,
        bool enforceSafehouseScope,
        CancellationToken cancellationToken = default)
    {
        var query = from plan in dbContext.InterventionPlans.AsNoTracking()
                    join resident in dbContext.Residents.AsNoTracking() on plan.ResidentId equals (long?)resident.ResidentId into residentGroup
                    from resident in residentGroup.DefaultIfEmpty()
                    select new
                    {
                        Plan = plan,
                        resident.CaseControlNo,
                        resident.InternalCode,
                        resident.SafehouseId
                    };

        if (residentId.HasValue)
        {
            query = query.Where(item => item.Plan.ResidentId == residentId.Value);
        }

        if (!string.IsNullOrWhiteSpace(status))
        {
            query = query.Where(item => item.Plan.Status != null && EF.Functions.ILike(item.Plan.Status, status));
        }

        if (enforceSafehouseScope && allowedSafehouses.Count > 0)
        {
            query = query.Where(item => item.SafehouseId.HasValue && allowedSafehouses.Contains(item.SafehouseId.Value));
        }

        var total = await query.CountAsync(cancellationToken);
        var rows = await query
            .OrderByDescending(item => item.Plan.TargetDate)
            .ThenByDescending(item => item.Plan.PlanId)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return (rows.Select(item => new InterventionPlanResponseDto
        {
            PlanId = item.Plan.PlanId,
            Id = item.Plan.PlanId,
            ResidentId = item.Plan.ResidentId,
            PlanCategory = item.Plan.PlanCategory,
            PlanDescription = item.Plan.PlanDescription,
            ServicesProvided = item.Plan.ServicesProvided,
            TargetValue = item.Plan.TargetValue.HasValue ? decimal.Round(item.Plan.TargetValue.Value, 2) : null,
            TargetDate = item.Plan.TargetDate?.ToString("yyyy-MM-dd"),
            Status = item.Plan.Status,
            CaseConferenceDate = item.Plan.CaseConferenceDate?.ToString("yyyy-MM-dd"),
            ResidentCode = BuildResidentCode(item.CaseControlNo, item.InternalCode, item.Plan.ResidentId)
        }).ToList(), total);
    }

    public async Task<InterventionPlanResponseDto?> GetInterventionPlanAsync(
        long planId,
        IReadOnlyList<long> allowedSafehouses,
        bool enforceSafehouseScope,
        CancellationToken cancellationToken = default)
        => await GetInterventionPlanCoreAsync(planId, allowedSafehouses, enforceSafehouseScope, cancellationToken);

    public async Task<InterventionPlanResponseDto?> CreateInterventionPlanAsync(
        IReadOnlyDictionary<string, JsonElement> fields,
        CancellationToken cancellationToken = default)
    {
        var fieldMap = new Dictionary<string, JsonElement>(fields, StringComparer.OrdinalIgnoreCase);
        if (!fieldMap.ContainsKey("createdAt"))
        {
            fieldMap["createdAt"] = JsonSerializer.SerializeToElement(DateTime.UtcNow);
        }

        var entity = DeserializeEntity<InterventionPlan>(fieldMap);
        dbContext.InterventionPlans.Add(entity);
        await dbContext.SaveChangesAsync(cancellationToken);
        return await GetInterventionPlanCoreAsync(entity.PlanId, [], false, cancellationToken);
    }

    public async Task<InterventionPlanResponseDto?> UpdateInterventionPlanAsync(
        long planId,
        IReadOnlyDictionary<string, JsonElement> fields,
        CancellationToken cancellationToken = default)
    {
        var entity = await dbContext.InterventionPlans.FirstOrDefaultAsync(item => item.PlanId == planId, cancellationToken);
        if (entity is null)
        {
            return null;
        }

        var fieldMap = new Dictionary<string, JsonElement>(fields, StringComparer.OrdinalIgnoreCase)
        {
            ["updatedAt"] = JsonSerializer.SerializeToElement(DateTime.UtcNow)
        };

        ApplyMergedValues(entity, fieldMap);
        await dbContext.SaveChangesAsync(cancellationToken);
        return await GetInterventionPlanCoreAsync(planId, [], false, cancellationToken);
    }

    public async Task<bool> DeleteInterventionPlanAsync(long planId, CancellationToken cancellationToken = default)
    {
        var entity = await dbContext.InterventionPlans.FirstOrDefaultAsync(item => item.PlanId == planId, cancellationToken);
        if (entity is null)
        {
            return false;
        }

        dbContext.InterventionPlans.Remove(entity);
        await dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<(IReadOnlyList<IncidentReportResponseDto> Data, int Total)> ListIncidentReportsAsync(
        int page,
        int pageSize,
        long? residentId,
        long? safehouseId,
        string? severity,
        string? status,
        IReadOnlyList<long> allowedSafehouses,
        bool enforceSafehouseScope,
        CancellationToken cancellationToken = default)
    {
        var query = from incident in dbContext.IncidentReports.AsNoTracking()
                    join resident in dbContext.Residents.AsNoTracking() on incident.ResidentId equals (long?)resident.ResidentId into residentGroup
                    from resident in residentGroup.DefaultIfEmpty()
                    join safehouse in dbContext.Safehouses.AsNoTracking() on incident.SafehouseId equals (long?)safehouse.SafehouseId into safehouseGroup
                    from safehouse in safehouseGroup.DefaultIfEmpty()
                    select new
                    {
                        Incident = incident,
                        resident.CaseControlNo,
                        resident.InternalCode,
                        ResidentSafehouseId = resident.SafehouseId,
                        SafehouseName = safehouse.Name
                    };

        if (residentId.HasValue)
        {
            query = query.Where(item => item.Incident.ResidentId == residentId.Value);
        }

        if (safehouseId.HasValue)
        {
            query = query.Where(item => item.Incident.SafehouseId == safehouseId.Value);
        }

        if (!string.IsNullOrWhiteSpace(severity))
        {
            query = query.Where(item => item.Incident.Severity != null && EF.Functions.ILike(item.Incident.Severity, severity));
        }

        if (!string.IsNullOrWhiteSpace(status))
        {
            query = query.Where(item => item.Incident.Status != null && EF.Functions.ILike(item.Incident.Status, status));
        }

        if (enforceSafehouseScope && allowedSafehouses.Count > 0)
        {
            query = query.Where(item =>
                (item.ResidentSafehouseId.HasValue && allowedSafehouses.Contains(item.ResidentSafehouseId.Value))
                || (item.Incident.SafehouseId.HasValue && allowedSafehouses.Contains(item.Incident.SafehouseId.Value)));
        }

        var total = await query.CountAsync(cancellationToken);
        var rows = await query
            .OrderByDescending(item => item.Incident.IncidentDate)
            .ThenByDescending(item => item.Incident.IncidentId)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return (rows.Select(item => new IncidentReportResponseDto
        {
            IncidentId = item.Incident.IncidentId,
            Id = item.Incident.IncidentId,
            ResidentId = item.Incident.ResidentId,
            SafehouseId = item.Incident.SafehouseId,
            IncidentDate = item.Incident.IncidentDate?.ToString("yyyy-MM-dd"),
            IncidentType = item.Incident.IncidentType,
            Severity = item.Incident.Severity,
            Description = item.Incident.Description,
            ResponseTaken = item.Incident.ResponseTaken,
            Resolved = item.Incident.Resolved,
            ResolutionDate = item.Incident.ResolutionDate?.ToString("yyyy-MM-dd"),
            ReportedBy = item.Incident.ReportedBy,
            FollowUpRequired = item.Incident.FollowUpRequired,
            Status = item.Incident.Status,
            SafehouseName = item.SafehouseName,
            ResidentCode = BuildResidentCode(item.CaseControlNo, item.InternalCode, item.Incident.ResidentId)
        }).ToList(), total);
    }

    public async Task<IncidentReportResponseDto?> GetIncidentReportAsync(
        long incidentId,
        IReadOnlyList<long> allowedSafehouses,
        bool enforceSafehouseScope,
        CancellationToken cancellationToken = default)
        => await GetIncidentReportCoreAsync(incidentId, allowedSafehouses, enforceSafehouseScope, cancellationToken);

    public async Task<IncidentReportResponseDto?> CreateIncidentReportAsync(
        IReadOnlyDictionary<string, JsonElement> fields,
        CancellationToken cancellationToken = default)
    {
        var entity = DeserializeEntity<IncidentReport>(fields);
        dbContext.IncidentReports.Add(entity);
        await dbContext.SaveChangesAsync(cancellationToken);
        return await GetIncidentReportCoreAsync(entity.IncidentId, [], false, cancellationToken);
    }

    public async Task<IncidentReportResponseDto?> UpdateIncidentReportAsync(
        long incidentId,
        IReadOnlyDictionary<string, JsonElement> fields,
        CancellationToken cancellationToken = default)
    {
        var entity = await dbContext.IncidentReports.FirstOrDefaultAsync(item => item.IncidentId == incidentId, cancellationToken);
        if (entity is null)
        {
            return null;
        }

        ApplyMergedValues(entity, fields);
        await dbContext.SaveChangesAsync(cancellationToken);
        return await GetIncidentReportCoreAsync(incidentId, [], false, cancellationToken);
    }

    public async Task<bool> DeleteIncidentReportAsync(long incidentId, CancellationToken cancellationToken = default)
    {
        var entity = await dbContext.IncidentReports.FirstOrDefaultAsync(item => item.IncidentId == incidentId, cancellationToken);
        if (entity is null)
        {
            return false;
        }

        dbContext.IncidentReports.Remove(entity);
        await dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<ResidentScopeLookup?> GetResidentScopeLookupAsync(long residentId, CancellationToken cancellationToken = default)
    {
        return await (from resident in dbContext.Residents.AsNoTracking()
                      join safehouse in dbContext.Safehouses.AsNoTracking() on resident.SafehouseId equals (long?)safehouse.SafehouseId into safehouseGroup
                      from safehouse in safehouseGroup.DefaultIfEmpty()
                      where resident.ResidentId == residentId
                      select new ResidentScopeLookup(
                          resident.ResidentId,
                          resident.SafehouseId,
                          resident.CaseControlNo ?? resident.InternalCode ?? $"CASE-{resident.ResidentId}",
                          safehouse.Name))
            .FirstOrDefaultAsync(cancellationToken);
    }

    private async Task<ProcessRecordingResponseDto?> GetProcessRecordingCoreAsync(long recordingId, IReadOnlyList<long> allowedSafehouses, bool enforceSafehouseScope, CancellationToken cancellationToken)
    {
        var query = from recording in dbContext.ProcessRecordings.AsNoTracking()
                    join resident in dbContext.Residents.AsNoTracking() on recording.ResidentId equals (long?)resident.ResidentId into residentGroup
                    from resident in residentGroup.DefaultIfEmpty()
                    where recording.RecordingId == recordingId
                    select new
                    {
                        Recording = recording,
                        resident.CaseControlNo,
                        resident.InternalCode,
                        resident.SafehouseId
                    };

        if (enforceSafehouseScope && allowedSafehouses.Count > 0)
        {
            query = query.Where(item => item.SafehouseId.HasValue && allowedSafehouses.Contains(item.SafehouseId.Value));
        }
        var item = await query.FirstOrDefaultAsync(cancellationToken);
        return item is null
            ? null
            : new ProcessRecordingResponseDto
            {
                RecordingId = item.Recording.RecordingId,
                Id = item.Recording.RecordingId,
                ResidentId = item.Recording.ResidentId,
                SessionDate = item.Recording.SessionDate?.ToString("yyyy-MM-dd"),
                SocialWorker = item.Recording.SocialWorker,
                SessionType = item.Recording.SessionType,
                SessionDurationMinutes = item.Recording.SessionDurationMinutes,
                EmotionalStateObserved = item.Recording.EmotionalStateObserved,
                EmotionalStateEnd = item.Recording.EmotionalStateEnd,
                SessionNarrative = item.Recording.SessionNarrative,
                InterventionsApplied = item.Recording.InterventionsApplied,
                FollowUpActions = item.Recording.FollowUpActions,
                ProgressNoted = item.Recording.ProgressNoted,
                ConcernsFlagged = item.Recording.ConcernsFlagged,
                ReferralMade = item.Recording.ReferralMade,
                NotesRestricted = item.Recording.NotesRestricted,
                ResidentCode = BuildResidentCode(item.CaseControlNo, item.InternalCode, item.Recording.ResidentId)
            };
    }

    private async Task<HomeVisitationResponseDto?> GetHomeVisitationCoreAsync(long visitationId, IReadOnlyList<long> allowedSafehouses, bool enforceSafehouseScope, CancellationToken cancellationToken)
    {
        var query = from visitation in dbContext.HomeVisitations.AsNoTracking()
                    join resident in dbContext.Residents.AsNoTracking() on visitation.ResidentId equals (long?)resident.ResidentId into residentGroup
                    from resident in residentGroup.DefaultIfEmpty()
                    where visitation.VisitationId == visitationId
                    select new
                    {
                        Visitation = visitation,
                        resident.CaseControlNo,
                        resident.InternalCode,
                        resident.SafehouseId
                    };

        if (enforceSafehouseScope && allowedSafehouses.Count > 0)
        {
            query = query.Where(item => item.SafehouseId.HasValue && allowedSafehouses.Contains(item.SafehouseId.Value));
        }
        var item = await query.FirstOrDefaultAsync(cancellationToken);
        return item is null
            ? null
            : new HomeVisitationResponseDto
            {
                VisitationId = item.Visitation.VisitationId,
                Id = item.Visitation.VisitationId,
                ResidentId = item.Visitation.ResidentId,
                VisitDate = item.Visitation.VisitDate?.ToString("yyyy-MM-dd"),
                SocialWorker = item.Visitation.SocialWorker,
                VisitType = item.Visitation.VisitType,
                LocationVisited = item.Visitation.LocationVisited,
                FamilyMembersPresent = item.Visitation.FamilyMembersPresent,
                Purpose = item.Visitation.Purpose,
                Observations = item.Visitation.Observations,
                FamilyCooperationLevel = item.Visitation.FamilyCooperationLevel,
                SafetyConcernsNoted = item.Visitation.SafetyConcernsNoted,
                FollowUpNeeded = item.Visitation.FollowUpNeeded,
                FollowUpNotes = item.Visitation.FollowUpNotes,
                VisitOutcome = item.Visitation.VisitOutcome,
                ResidentCode = BuildResidentCode(item.CaseControlNo, item.InternalCode, item.Visitation.ResidentId)
            };
    }

    private async Task<CaseConferenceResponseDto?> GetCaseConferenceCoreAsync(long conferenceId, IReadOnlyList<long> allowedSafehouses, bool enforceSafehouseScope, CancellationToken cancellationToken)
    {
        var query = from conference in dbContext.CaseConferences.AsNoTracking()
                    join resident in dbContext.Residents.AsNoTracking() on conference.ResidentId equals resident.ResidentId into residentGroup
                    from resident in residentGroup.DefaultIfEmpty()
                    where conference.ConferenceId == conferenceId
                    select new
                    {
                        Conference = conference,
                        resident.CaseControlNo,
                        resident.InternalCode,
                        resident.SafehouseId
                    };

        if (enforceSafehouseScope && allowedSafehouses.Count > 0)
        {
            query = query.Where(item => item.SafehouseId.HasValue && allowedSafehouses.Contains(item.SafehouseId.Value));
        }
        var item = await query.FirstOrDefaultAsync(cancellationToken);
        return item is null
            ? null
            : new CaseConferenceResponseDto
            {
                ConferenceId = item.Conference.ConferenceId,
                Id = item.Conference.ConferenceId,
                ResidentId = item.Conference.ResidentId,
                ConferenceDate = item.Conference.ConferenceDate.ToString("yyyy-MM-dd"),
                ConferenceType = item.Conference.ConferenceType,
                Summary = item.Conference.Summary,
                DecisionsMade = item.Conference.DecisionsMade,
                NextSteps = item.Conference.NextSteps,
                NextConferenceDate = item.Conference.NextConferenceDate?.ToString("yyyy-MM-dd"),
                CreatedBy = item.Conference.CreatedBy,
                ResidentCode = BuildResidentCode(item.CaseControlNo, item.InternalCode, item.Conference.ResidentId),
                Status = item.Conference.ConferenceType
            };
    }

    private async Task<InterventionPlanResponseDto?> GetInterventionPlanCoreAsync(long planId, IReadOnlyList<long> allowedSafehouses, bool enforceSafehouseScope, CancellationToken cancellationToken)
    {
        var query = from plan in dbContext.InterventionPlans.AsNoTracking()
                    join resident in dbContext.Residents.AsNoTracking() on plan.ResidentId equals (long?)resident.ResidentId into residentGroup
                    from resident in residentGroup.DefaultIfEmpty()
                    where plan.PlanId == planId
                    select new
                    {
                        Plan = plan,
                        resident.CaseControlNo,
                        resident.InternalCode,
                        resident.SafehouseId
                    };

        if (enforceSafehouseScope && allowedSafehouses.Count > 0)
        {
            query = query.Where(item => item.SafehouseId.HasValue && allowedSafehouses.Contains(item.SafehouseId.Value));
        }
        var item = await query.FirstOrDefaultAsync(cancellationToken);
        return item is null
            ? null
            : new InterventionPlanResponseDto
            {
                PlanId = item.Plan.PlanId,
                Id = item.Plan.PlanId,
                ResidentId = item.Plan.ResidentId,
                PlanCategory = item.Plan.PlanCategory,
                PlanDescription = item.Plan.PlanDescription,
                ServicesProvided = item.Plan.ServicesProvided,
                TargetValue = item.Plan.TargetValue.HasValue ? decimal.Round(item.Plan.TargetValue.Value, 2) : null,
                TargetDate = item.Plan.TargetDate?.ToString("yyyy-MM-dd"),
                Status = item.Plan.Status,
                CaseConferenceDate = item.Plan.CaseConferenceDate?.ToString("yyyy-MM-dd"),
                ResidentCode = BuildResidentCode(item.CaseControlNo, item.InternalCode, item.Plan.ResidentId)
            };
    }

    private async Task<IncidentReportResponseDto?> GetIncidentReportCoreAsync(long incidentId, IReadOnlyList<long> allowedSafehouses, bool enforceSafehouseScope, CancellationToken cancellationToken)
    {
        var query = from incident in dbContext.IncidentReports.AsNoTracking()
                    join resident in dbContext.Residents.AsNoTracking() on incident.ResidentId equals (long?)resident.ResidentId into residentGroup
                    from resident in residentGroup.DefaultIfEmpty()
                    join safehouse in dbContext.Safehouses.AsNoTracking() on incident.SafehouseId equals (long?)safehouse.SafehouseId into safehouseGroup
                    from safehouse in safehouseGroup.DefaultIfEmpty()
                    where incident.IncidentId == incidentId
                    select new
                    {
                        Incident = incident,
                        resident.CaseControlNo,
                        resident.InternalCode,
                        ResidentSafehouseId = resident.SafehouseId,
                        SafehouseName = safehouse.Name
                    };

        if (enforceSafehouseScope && allowedSafehouses.Count > 0)
        {
            query = query.Where(item =>
                (item.ResidentSafehouseId.HasValue && allowedSafehouses.Contains(item.ResidentSafehouseId.Value))
                || (item.Incident.SafehouseId.HasValue && allowedSafehouses.Contains(item.Incident.SafehouseId.Value)));
        }
        var item = await query.FirstOrDefaultAsync(cancellationToken);
        return item is null
            ? null
            : new IncidentReportResponseDto
            {
                IncidentId = item.Incident.IncidentId,
                Id = item.Incident.IncidentId,
                ResidentId = item.Incident.ResidentId,
                SafehouseId = item.Incident.SafehouseId,
                IncidentDate = item.Incident.IncidentDate?.ToString("yyyy-MM-dd"),
                IncidentType = item.Incident.IncidentType,
                Severity = item.Incident.Severity,
                Description = item.Incident.Description,
                ResponseTaken = item.Incident.ResponseTaken,
                Resolved = item.Incident.Resolved,
                ResolutionDate = item.Incident.ResolutionDate?.ToString("yyyy-MM-dd"),
                ReportedBy = item.Incident.ReportedBy,
                FollowUpRequired = item.Incident.FollowUpRequired,
                Status = item.Incident.Status,
                SafehouseName = item.SafehouseName,
                ResidentCode = BuildResidentCode(item.CaseControlNo, item.InternalCode, item.Incident.ResidentId)
            };
    }

    private static TEntity DeserializeEntity<TEntity>(IReadOnlyDictionary<string, JsonElement> fields)
        where TEntity : class =>
        JsonSerializer.Deserialize<TEntity>(JsonSerializer.Serialize(fields, JsonOptions), JsonOptions)
        ?? throw new InvalidOperationException("The request body is invalid.");

    private void ApplyMergedValues<TEntity>(TEntity entity, IReadOnlyDictionary<string, JsonElement> fields)
        where TEntity : class
    {
        var merged = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(
            JsonSerializer.Serialize(entity, JsonOptions),
            JsonOptions) ?? new Dictionary<string, JsonElement>(StringComparer.OrdinalIgnoreCase);

        foreach (var (key, value) in fields)
        {
            merged[key] = value;
        }

        var updated = JsonSerializer.Deserialize<TEntity>(JsonSerializer.Serialize(merged, JsonOptions), JsonOptions)
            ?? throw new InvalidOperationException("The request body is invalid.");

        dbContext.Entry(entity).CurrentValues.SetValues(updated);
    }

    private static string? BuildResidentCode(string? caseControlNo, string? internalCode, long? residentId) =>
        caseControlNo ?? internalCode ?? (residentId.HasValue ? $"CASE-{residentId.Value}" : null);
}
