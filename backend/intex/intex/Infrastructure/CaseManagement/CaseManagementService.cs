using System.Globalization;
using System.Linq.Expressions;
using Intex.Infrastructure.Api.Contracts;
using Intex.Infrastructure.Api.Errors;
using Intex.Infrastructure.Api.Pagination;
using Intex.Infrastructure.CaseManagement.Contracts;
using Intex.Persistence;
using Intex.Persistence.Entities;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace Intex.Infrastructure.CaseManagement;

public sealed class CaseManagementService(BeaconDbContext dbContext, TimeProvider timeProvider)
{
    public async Task<PaginatedListEnvelope<ProcessRecordingResponse>> ListProcessRecordingsAsync(
        PaginationRequest pagination,
        int? residentId,
        int? safehouseId,
        CancellationToken cancellationToken)
    {
        var query = dbContext.ProcessRecordings.AsNoTracking();
        if (residentId.HasValue) query = query.Where(x => x.ResidentId == residentId.Value);
        if (safehouseId.HasValue) query = query.Where(x => x.SafehouseId == safehouseId.Value);

        query = query.OrderByDescending(x => x.SessionDate).ThenByDescending(x => x.Id);
        return PaginationEnvelopeFactory.Create(
            await query.Skip((pagination.Page - 1) * pagination.Limit).Take(pagination.Limit)
                .Select(x => new ProcessRecordingResponse
                {
                    Id = x.Id,
                    ResidentId = x.ResidentId,
                    ResidentCode = x.Resident.ResidentCode,
                    WorkerId = x.WorkerId,
                    WorkerName = x.Worker.FirstName + " " + x.Worker.LastName,
                    SafehouseId = x.SafehouseId,
                    SessionDate = x.SessionDate,
                    Duration = x.Duration,
                    EmotionalStateStart = x.EmotionalStateStart,
                    EmotionalStateEnd = x.EmotionalStateEnd,
                    ProgressNoted = x.ProgressNoted,
                    ConcernFlag = x.ConcernFlag,
                    ReferralMade = x.ReferralMade,
                    FollowUpRequired = x.FollowUpRequired,
                    SessionNotes = x.SessionNotes,
                    Tags = x.Tags,
                    CreatedAt = x.CreatedAt
                }).ToListAsync(cancellationToken),
            await query.CountAsync(cancellationToken),
            pagination);
    }

    public async Task<ProcessRecordingResponse> GetProcessRecordingAsync(int id, CancellationToken cancellationToken) =>
        await dbContext.ProcessRecordings.AsNoTracking().Where(x => x.Id == id).Select(MapProcessRecording()).SingleOrDefaultAsync(cancellationToken)
        ?? throw NotFound();

    public async Task<ProcessRecordingResponse> CreateProcessRecordingAsync(CreateProcessRecordingRequest? request, CancellationToken cancellationToken)
    {
        request ??= new(null, null, null, null, null, null, null, null, null, null, null, null, null);
        var entity = new ProcessRecording
        {
            ResidentId = Required(request.ResidentId, "residentId is required"),
            WorkerId = Required(request.WorkerId, "workerId is required"),
            SafehouseId = Required(request.SafehouseId, "safehouseId is required"),
            SessionDate = ValidDate(request.SessionDate),
            Duration = request.Duration,
            EmotionalStateStart = NullIfWhiteSpace(request.EmotionalStateStart),
            EmotionalStateEnd = NullIfWhiteSpace(request.EmotionalStateEnd),
            ProgressNoted = request.ProgressNoted ?? false,
            ConcernFlag = request.ConcernFlag ?? false,
            ReferralMade = request.ReferralMade ?? false,
            FollowUpRequired = request.FollowUpRequired ?? false,
            SessionNotes = NullIfWhiteSpace(request.SessionNotes),
            Tags = request.Tags ?? [],
            CreatedAt = timeProvider.GetUtcNow(),
            UpdatedAt = timeProvider.GetUtcNow()
        };
        dbContext.ProcessRecordings.Add(entity);
        await SaveAsync(cancellationToken);
        return await GetProcessRecordingAsync(entity.Id, cancellationToken);
    }

    public async Task<ProcessRecordingResponse> UpdateProcessRecordingAsync(int id, UpdateProcessRecordingRequest? request, CancellationToken cancellationToken)
    {
        request ??= new(null, null, null, null, null, null, null, null, null, null);
        var entity = await dbContext.ProcessRecordings.SingleOrDefaultAsync(x => x.Id == id, cancellationToken) ?? throw NotFound();
        if (request.SessionDate is not null) entity.SessionDate = ValidDate(request.SessionDate);
        if (request.Duration.HasValue) entity.Duration = request.Duration;
        if (request.EmotionalStateStart is not null) entity.EmotionalStateStart = NullIfWhiteSpace(request.EmotionalStateStart);
        if (request.EmotionalStateEnd is not null) entity.EmotionalStateEnd = NullIfWhiteSpace(request.EmotionalStateEnd);
        if (request.ProgressNoted.HasValue) entity.ProgressNoted = request.ProgressNoted.Value;
        if (request.ConcernFlag.HasValue) entity.ConcernFlag = request.ConcernFlag.Value;
        if (request.ReferralMade.HasValue) entity.ReferralMade = request.ReferralMade.Value;
        if (request.FollowUpRequired.HasValue) entity.FollowUpRequired = request.FollowUpRequired.Value;
        if (request.SessionNotes is not null) entity.SessionNotes = NullIfWhiteSpace(request.SessionNotes);
        if (request.Tags is not null) entity.Tags = request.Tags;
        entity.UpdatedAt = timeProvider.GetUtcNow();
        await SaveAsync(cancellationToken);
        return await GetProcessRecordingAsync(id, cancellationToken);
    }

    public async Task DeleteProcessRecordingAsync(int id, CancellationToken cancellationToken)
    {
        var entity = await dbContext.ProcessRecordings.SingleOrDefaultAsync(x => x.Id == id, cancellationToken) ?? throw NotFound();
        dbContext.ProcessRecordings.Remove(entity);
        await SaveAsync(cancellationToken);
    }

    public async Task<PaginatedListEnvelope<HomeVisitationResponse>> ListHomeVisitationsAsync(PaginationRequest pagination, int? residentId, CancellationToken cancellationToken)
    {
        var query = dbContext.HomeVisitations.AsNoTracking();
        if (residentId.HasValue) query = query.Where(x => x.ResidentId == residentId.Value);
        query = query.OrderByDescending(x => x.VisitDate).ThenByDescending(x => x.Id);
        return PaginationEnvelopeFactory.Create(
            await query.Skip((pagination.Page - 1) * pagination.Limit).Take(pagination.Limit).Select(x => new HomeVisitationResponse
            {
                Id = x.Id,
                ResidentId = x.ResidentId,
                ResidentCode = x.Resident.ResidentCode,
                WorkerId = x.WorkerId,
                WorkerName = x.Worker.FirstName + " " + x.Worker.LastName,
                VisitDate = x.VisitDate,
                Outcome = x.Outcome,
                CooperationLevel = x.CooperationLevel,
                SafetyConcern = x.SafetyConcern,
                FollowUpRequired = x.FollowUpRequired,
                FollowUpDue = x.FollowUpDue,
                Notes = x.Notes,
                CreatedAt = x.CreatedAt
            }).ToListAsync(cancellationToken),
            await query.CountAsync(cancellationToken),
            pagination);
    }

    public async Task<HomeVisitationResponse> GetHomeVisitationAsync(int id, CancellationToken cancellationToken) =>
        await dbContext.HomeVisitations.AsNoTracking().Where(x => x.Id == id).Select(x => new HomeVisitationResponse
        {
            Id = x.Id,
            ResidentId = x.ResidentId,
            ResidentCode = x.Resident.ResidentCode,
            WorkerId = x.WorkerId,
            WorkerName = x.Worker.FirstName + " " + x.Worker.LastName,
            VisitDate = x.VisitDate,
            Outcome = x.Outcome,
            CooperationLevel = x.CooperationLevel,
            SafetyConcern = x.SafetyConcern,
            FollowUpRequired = x.FollowUpRequired,
            FollowUpDue = x.FollowUpDue,
            Notes = x.Notes,
            CreatedAt = x.CreatedAt
        }).SingleOrDefaultAsync(cancellationToken) ?? throw NotFound();

    public async Task<HomeVisitationResponse> CreateHomeVisitationAsync(CreateHomeVisitationRequest? request, CancellationToken cancellationToken)
    {
        request ??= new(null, null, null, null, null, null, null, null, null);
        var entity = new HomeVisitation
        {
            ResidentId = Required(request.ResidentId, "residentId is required"),
            WorkerId = Required(request.WorkerId, "workerId is required"),
            VisitDate = ValidDate(request.VisitDate),
            Outcome = RequiredText(request.Outcome, "outcome is required"),
            CooperationLevel = NullIfWhiteSpace(request.CooperationLevel),
            SafetyConcern = request.SafetyConcern ?? false,
            FollowUpRequired = request.FollowUpRequired ?? false,
            FollowUpDue = OptionalDate(request.FollowUpDue),
            Notes = NullIfWhiteSpace(request.Notes),
            CreatedAt = timeProvider.GetUtcNow(),
            UpdatedAt = timeProvider.GetUtcNow()
        };
        dbContext.HomeVisitations.Add(entity);
        await SaveAsync(cancellationToken);
        return await GetHomeVisitationAsync(entity.Id, cancellationToken);
    }

    public async Task<HomeVisitationResponse> UpdateHomeVisitationAsync(int id, UpdateHomeVisitationRequest? request, CancellationToken cancellationToken)
    {
        request ??= new(null, null, null, null, null, null, null);
        var entity = await dbContext.HomeVisitations.SingleOrDefaultAsync(x => x.Id == id, cancellationToken) ?? throw NotFound();
        if (request.VisitDate is not null) entity.VisitDate = ValidDate(request.VisitDate);
        if (request.Outcome is not null) entity.Outcome = request.Outcome;
        if (request.CooperationLevel is not null) entity.CooperationLevel = NullIfWhiteSpace(request.CooperationLevel);
        if (request.SafetyConcern.HasValue) entity.SafetyConcern = request.SafetyConcern.Value;
        if (request.FollowUpRequired.HasValue) entity.FollowUpRequired = request.FollowUpRequired.Value;
        if (request.FollowUpDue is not null) entity.FollowUpDue = OptionalDate(request.FollowUpDue);
        if (request.Notes is not null) entity.Notes = NullIfWhiteSpace(request.Notes);
        entity.UpdatedAt = timeProvider.GetUtcNow();
        await SaveAsync(cancellationToken);
        return await GetHomeVisitationAsync(id, cancellationToken);
    }

    public async Task DeleteHomeVisitationAsync(int id, CancellationToken cancellationToken)
    {
        var entity = await dbContext.HomeVisitations.SingleOrDefaultAsync(x => x.Id == id, cancellationToken) ?? throw NotFound();
        dbContext.HomeVisitations.Remove(entity);
        await SaveAsync(cancellationToken);
    }

    public async Task<PaginatedListEnvelope<CaseConferenceResponse>> ListCaseConferencesAsync(PaginationRequest pagination, int? residentId, int? safehouseId, string? status, bool? upcoming, CancellationToken cancellationToken)
    {
        var query = dbContext.CaseConferences.AsNoTracking();
        if (residentId.HasValue) query = query.Where(x => x.ResidentId == residentId.Value);
        if (safehouseId.HasValue) query = query.Where(x => x.SafehouseId == safehouseId.Value);
        if (!string.IsNullOrWhiteSpace(status)) query = query.Where(x => x.Status == status);
        if (upcoming == true)
        {
            var today = DateOnly.FromDateTime(timeProvider.GetUtcNow().UtcDateTime).ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
            query = query.Where(x => string.CompareOrdinal(x.ScheduledDate, today) >= 0 && x.Status == "scheduled");
        }
        query = query.OrderByDescending(x => x.ScheduledDate).ThenByDescending(x => x.Id);
        return PaginationEnvelopeFactory.Create(
            await query.Skip((pagination.Page - 1) * pagination.Limit).Take(pagination.Limit).Select(MapCaseConference()).ToListAsync(cancellationToken),
            await query.CountAsync(cancellationToken),
            pagination);
    }

    public async Task<CaseConferenceResponse> GetCaseConferenceAsync(int id, CancellationToken cancellationToken) =>
        await dbContext.CaseConferences.AsNoTracking().Where(x => x.Id == id).Select(MapCaseConference()).SingleOrDefaultAsync(cancellationToken) ?? throw NotFound();

    public async Task<CaseConferenceResponse> CreateCaseConferenceAsync(CreateCaseConferenceRequest? request, CancellationToken cancellationToken)
    {
        request ??= new(null, null, null, null, null, null, null, null);
        var entity = new CaseConference
        {
            ResidentId = Required(request.ResidentId, "residentId is required"),
            SafehouseId = Required(request.SafehouseId, "safehouseId is required"),
            ScheduledDate = ValidDate(request.ScheduledDate),
            Status = string.IsNullOrWhiteSpace(request.Status) ? "scheduled" : request.Status,
            Attendees = request.Attendees ?? [],
            Decisions = NullIfWhiteSpace(request.Decisions),
            NextSteps = NullIfWhiteSpace(request.NextSteps),
            NextConferenceDate = OptionalDate(request.NextConferenceDate),
            CreatedAt = timeProvider.GetUtcNow(),
            UpdatedAt = timeProvider.GetUtcNow()
        };
        dbContext.CaseConferences.Add(entity);
        await SaveAsync(cancellationToken);
        return await GetCaseConferenceAsync(entity.Id, cancellationToken);
    }

    public async Task<CaseConferenceResponse> UpdateCaseConferenceAsync(int id, UpdateCaseConferenceRequest? request, CancellationToken cancellationToken)
    {
        request ??= new(null, null, null, null, null, null, null);
        var entity = await dbContext.CaseConferences.SingleOrDefaultAsync(x => x.Id == id, cancellationToken) ?? throw NotFound();
        if (request.ScheduledDate is not null) entity.ScheduledDate = ValidDate(request.ScheduledDate);
        if (request.CompletedDate is not null) entity.CompletedDate = OptionalDate(request.CompletedDate);
        if (request.Status is not null) entity.Status = request.Status;
        if (request.Attendees is not null) entity.Attendees = request.Attendees;
        if (request.Decisions is not null) entity.Decisions = NullIfWhiteSpace(request.Decisions);
        if (request.NextSteps is not null) entity.NextSteps = NullIfWhiteSpace(request.NextSteps);
        if (request.NextConferenceDate is not null) entity.NextConferenceDate = OptionalDate(request.NextConferenceDate);
        entity.UpdatedAt = timeProvider.GetUtcNow();
        await SaveAsync(cancellationToken);
        return await GetCaseConferenceAsync(id, cancellationToken);
    }

    public async Task DeleteCaseConferenceAsync(int id, CancellationToken cancellationToken)
    {
        var entity = await dbContext.CaseConferences.SingleOrDefaultAsync(x => x.Id == id, cancellationToken) ?? throw NotFound();
        dbContext.CaseConferences.Remove(entity);
        await SaveAsync(cancellationToken);
    }

    public async Task<PaginatedListEnvelope<InterventionPlanResponse>> ListInterventionPlansAsync(PaginationRequest pagination, int? residentId, int? safehouseId, string? status, CancellationToken cancellationToken)
    {
        var query = dbContext.InterventionPlans.AsNoTracking();
        if (residentId.HasValue) query = query.Where(x => x.ResidentId == residentId.Value);
        if (safehouseId.HasValue) query = query.Where(x => x.SafehouseId == safehouseId.Value);
        if (!string.IsNullOrWhiteSpace(status)) query = query.Where(x => x.Status == status);
        query = query.OrderByDescending(x => x.TargetDate).ThenByDescending(x => x.Id);
        return PaginationEnvelopeFactory.Create(
            await query.Skip((pagination.Page - 1) * pagination.Limit).Take(pagination.Limit).Select(MapInterventionPlan()).ToListAsync(cancellationToken),
            await query.CountAsync(cancellationToken),
            pagination);
    }

    public async Task<InterventionPlanResponse> GetInterventionPlanAsync(int id, CancellationToken cancellationToken) =>
        await dbContext.InterventionPlans.AsNoTracking().Where(x => x.Id == id).Select(MapInterventionPlan()).SingleOrDefaultAsync(cancellationToken) ?? throw NotFound();

    public async Task<InterventionPlanResponse> CreateInterventionPlanAsync(CreateInterventionPlanRequest? request, CancellationToken cancellationToken)
    {
        request ??= new(null, null, null, null, null, null, null, null, null, null);
        var entity = new InterventionPlan
        {
            ResidentId = Required(request.ResidentId, "residentId is required"),
            SafehouseId = Required(request.SafehouseId, "safehouseId is required"),
            WorkerId = Required(request.WorkerId, "workerId is required"),
            Category = RequiredText(request.Category, "category is required"),
            Title = RequiredText(request.Title, "title is required"),
            Status = string.IsNullOrWhiteSpace(request.Status) ? "open" : request.Status,
            TargetDate = ValidDate(request.TargetDate),
            Services = request.Services ?? [],
            Milestones = request.Milestones ?? [],
            Notes = NullIfWhiteSpace(request.Notes),
            CreatedAt = timeProvider.GetUtcNow(),
            UpdatedAt = timeProvider.GetUtcNow()
        };
        dbContext.InterventionPlans.Add(entity);
        await SaveAsync(cancellationToken);
        return await GetInterventionPlanAsync(entity.Id, cancellationToken);
    }

    public async Task<InterventionPlanResponse> UpdateInterventionPlanAsync(int id, UpdateInterventionPlanRequest? request, CancellationToken cancellationToken)
    {
        request ??= new(null, null, null, null, null, null, null, null);
        var entity = await dbContext.InterventionPlans.SingleOrDefaultAsync(x => x.Id == id, cancellationToken) ?? throw NotFound();
        if (request.Category is not null) entity.Category = request.Category;
        if (request.Title is not null) entity.Title = request.Title;
        if (request.Status is not null) entity.Status = request.Status;
        if (request.TargetDate is not null) entity.TargetDate = ValidDate(request.TargetDate);
        if (request.CompletedDate is not null) entity.CompletedDate = OptionalDate(request.CompletedDate);
        if (request.Services is not null) entity.Services = request.Services;
        if (request.Milestones is not null) entity.Milestones = request.Milestones;
        if (request.Notes is not null) entity.Notes = NullIfWhiteSpace(request.Notes);
        entity.UpdatedAt = timeProvider.GetUtcNow();
        await SaveAsync(cancellationToken);
        return await GetInterventionPlanAsync(id, cancellationToken);
    }

    public async Task DeleteInterventionPlanAsync(int id, CancellationToken cancellationToken)
    {
        var entity = await dbContext.InterventionPlans.SingleOrDefaultAsync(x => x.Id == id, cancellationToken) ?? throw NotFound();
        dbContext.InterventionPlans.Remove(entity);
        await SaveAsync(cancellationToken);
    }

    public async Task<PaginatedListEnvelope<IncidentResponse>> ListIncidentsAsync(PaginationRequest pagination, int? residentId, int? safehouseId, string? severity, string? status, CancellationToken cancellationToken)
    {
        var query = dbContext.IncidentReports.AsNoTracking();
        if (residentId.HasValue) query = query.Where(x => x.ResidentId == residentId.Value);
        if (safehouseId.HasValue) query = query.Where(x => x.SafehouseId == safehouseId.Value);
        if (!string.IsNullOrWhiteSpace(severity)) query = query.Where(x => x.Severity == severity);
        if (!string.IsNullOrWhiteSpace(status)) query = query.Where(x => x.Status == status);
        query = query.OrderByDescending(x => x.IncidentDate).ThenByDescending(x => x.Id);
        return PaginationEnvelopeFactory.Create(
            await query.Skip((pagination.Page - 1) * pagination.Limit).Take(pagination.Limit).Select(MapIncident()).ToListAsync(cancellationToken),
            await query.CountAsync(cancellationToken),
            pagination);
    }

    public async Task<IncidentResponse> GetIncidentAsync(int id, CancellationToken cancellationToken) =>
        await dbContext.IncidentReports.AsNoTracking().Where(x => x.Id == id).Select(MapIncident()).SingleOrDefaultAsync(cancellationToken) ?? throw NotFound();

    public async Task<IncidentResponse> CreateIncidentAsync(CreateIncidentRequest? request, CancellationToken cancellationToken)
    {
        request ??= new(null, null, null, null, null, null, null, null, null, null, null);
        var entity = new IncidentReport
        {
            ResidentId = request.ResidentId,
            SafehouseId = Required(request.SafehouseId, "safehouseId is required"),
            ReportedBy = Required(request.ReportedBy, "reportedBy is required"),
            IncidentDate = ValidDate(request.IncidentDate),
            IncidentType = RequiredText(request.IncidentType, "incidentType is required"),
            Severity = RequiredText(request.Severity, "severity is required"),
            Status = string.IsNullOrWhiteSpace(request.Status) ? "open" : request.Status,
            Description = RequiredText(request.Description, "description is required"),
            Resolution = NullIfWhiteSpace(request.Resolution),
            ResolutionDate = OptionalDate(request.ResolutionDate),
            FollowUpRequired = request.FollowUpRequired ?? false,
            CreatedAt = timeProvider.GetUtcNow(),
            UpdatedAt = timeProvider.GetUtcNow()
        };
        dbContext.IncidentReports.Add(entity);
        await SaveAsync(cancellationToken);
        return await GetIncidentAsync(entity.Id, cancellationToken);
    }

    public async Task<IncidentResponse> UpdateIncidentAsync(int id, UpdateIncidentRequest? request, CancellationToken cancellationToken)
    {
        request ??= new(null, null, null, null, null, null, null);
        var entity = await dbContext.IncidentReports.SingleOrDefaultAsync(x => x.Id == id, cancellationToken) ?? throw NotFound();
        if (request.IncidentType is not null) entity.IncidentType = request.IncidentType;
        if (request.Severity is not null) entity.Severity = request.Severity;
        if (request.Status is not null) entity.Status = request.Status;
        if (request.Description is not null) entity.Description = request.Description;
        if (request.Resolution is not null) entity.Resolution = NullIfWhiteSpace(request.Resolution);
        if (request.ResolutionDate is not null) entity.ResolutionDate = OptionalDate(request.ResolutionDate);
        if (request.FollowUpRequired.HasValue) entity.FollowUpRequired = request.FollowUpRequired.Value;
        entity.UpdatedAt = timeProvider.GetUtcNow();
        await SaveAsync(cancellationToken);
        return await GetIncidentAsync(id, cancellationToken);
    }

    public async Task DeleteIncidentAsync(int id, CancellationToken cancellationToken)
    {
        var entity = await dbContext.IncidentReports.SingleOrDefaultAsync(x => x.Id == id, cancellationToken) ?? throw NotFound();
        dbContext.IncidentReports.Remove(entity);
        await SaveAsync(cancellationToken);
    }

    public async Task<PaginatedListEnvelope<EducationRecordResponse>> ListEducationRecordsAsync(PaginationRequest pagination, int? residentId, CancellationToken cancellationToken)
    {
        var query = dbContext.EducationRecords.AsNoTracking();
        if (residentId.HasValue) query = query.Where(x => x.ResidentId == residentId.Value);
        query = query.OrderByDescending(x => x.RecordDate).ThenByDescending(x => x.Id);
        return PaginationEnvelopeFactory.Create(
            await query.Skip((pagination.Page - 1) * pagination.Limit).Take(pagination.Limit).Select(x => new EducationRecordResponse
            {
                Id = x.Id, ResidentId = x.ResidentId, RecordDate = x.RecordDate, EducationLevel = x.EducationLevel, EnrollmentStatus = x.EnrollmentStatus, ProgressScore = x.ProgressScore, ProgramType = x.ProgramType, Notes = x.Notes, CreatedAt = x.CreatedAt, UpdatedAt = x.UpdatedAt
            }).ToListAsync(cancellationToken),
            await query.CountAsync(cancellationToken),
            pagination);
    }

    public async Task<EducationRecordResponse> CreateEducationRecordAsync(CreateEducationRecordRequest? request, CancellationToken cancellationToken)
    {
        request ??= new(null, null, null, null, null, null, null);
        var entity = new EducationRecord
        {
            ResidentId = Required(request.ResidentId, "residentId is required"),
            RecordDate = ValidDate(request.RecordDate),
            EducationLevel = RequiredText(request.EducationLevel, "educationLevel is required"),
            EnrollmentStatus = RequiredText(request.EnrollmentStatus, "enrollmentStatus is required"),
            ProgressScore = request.ProgressScore,
            ProgramType = NullIfWhiteSpace(request.ProgramType),
            Notes = NullIfWhiteSpace(request.Notes),
            CreatedAt = timeProvider.GetUtcNow(),
            UpdatedAt = timeProvider.GetUtcNow()
        };
        dbContext.EducationRecords.Add(entity);
        await SaveAsync(cancellationToken);
        return new EducationRecordResponse { Id = entity.Id, ResidentId = entity.ResidentId, RecordDate = entity.RecordDate, EducationLevel = entity.EducationLevel, EnrollmentStatus = entity.EnrollmentStatus, ProgressScore = entity.ProgressScore, ProgramType = entity.ProgramType, Notes = entity.Notes, CreatedAt = entity.CreatedAt, UpdatedAt = entity.UpdatedAt };
    }

    public async Task<EducationRecordResponse> UpdateEducationRecordAsync(int id, UpdateEducationRecordRequest? request, CancellationToken cancellationToken)
    {
        request ??= new(null, null, null, null, null, null);
        var entity = await dbContext.EducationRecords.SingleOrDefaultAsync(x => x.Id == id, cancellationToken) ?? throw NotFound();
        if (request.RecordDate is not null) entity.RecordDate = ValidDate(request.RecordDate);
        if (request.EducationLevel is not null) entity.EducationLevel = request.EducationLevel;
        if (request.EnrollmentStatus is not null) entity.EnrollmentStatus = request.EnrollmentStatus;
        if (request.ProgressScore.HasValue) entity.ProgressScore = request.ProgressScore;
        if (request.ProgramType is not null) entity.ProgramType = NullIfWhiteSpace(request.ProgramType);
        if (request.Notes is not null) entity.Notes = NullIfWhiteSpace(request.Notes);
        entity.UpdatedAt = timeProvider.GetUtcNow();
        await SaveAsync(cancellationToken);
        return new EducationRecordResponse { Id = entity.Id, ResidentId = entity.ResidentId, RecordDate = entity.RecordDate, EducationLevel = entity.EducationLevel, EnrollmentStatus = entity.EnrollmentStatus, ProgressScore = entity.ProgressScore, ProgramType = entity.ProgramType, Notes = entity.Notes, CreatedAt = entity.CreatedAt, UpdatedAt = entity.UpdatedAt };
    }

    public async Task DeleteEducationRecordAsync(int id, CancellationToken cancellationToken)
    {
        var entity = await dbContext.EducationRecords.SingleOrDefaultAsync(x => x.Id == id, cancellationToken) ?? throw NotFound();
        dbContext.EducationRecords.Remove(entity);
        await SaveAsync(cancellationToken);
    }

    public async Task<PaginatedListEnvelope<HealthRecordResponse>> ListHealthRecordsAsync(PaginationRequest pagination, int? residentId, CancellationToken cancellationToken)
    {
        var query = dbContext.HealthRecords.AsNoTracking();
        if (residentId.HasValue) query = query.Where(x => x.ResidentId == residentId.Value);
        query = query.OrderByDescending(x => x.RecordDate).ThenByDescending(x => x.Id);
        return PaginationEnvelopeFactory.Create(
            await query.Skip((pagination.Page - 1) * pagination.Limit).Take(pagination.Limit).Select(x => new HealthRecordResponse
            {
                Id = x.Id, ResidentId = x.ResidentId, RecordDate = x.RecordDate, HealthScore = x.HealthScore, MentalHealthStatus = x.MentalHealthStatus, PhysicalHealthStatus = x.PhysicalHealthStatus, TraumaProgress = x.TraumaProgress, MedicationStatus = x.MedicationStatus, NextAppointment = x.NextAppointment, Notes = x.Notes, CreatedAt = x.CreatedAt, UpdatedAt = x.UpdatedAt
            }).ToListAsync(cancellationToken),
            await query.CountAsync(cancellationToken),
            pagination);
    }

    public async Task<HealthRecordResponse> CreateHealthRecordAsync(CreateHealthRecordRequest? request, CancellationToken cancellationToken)
    {
        request ??= new(null, null, null, null, null, null, null, null, null);
        var entity = new HealthRecord
        {
            ResidentId = Required(request.ResidentId, "residentId is required"),
            RecordDate = ValidDate(request.RecordDate),
            HealthScore = request.HealthScore,
            MentalHealthStatus = NullIfWhiteSpace(request.MentalHealthStatus),
            PhysicalHealthStatus = NullIfWhiteSpace(request.PhysicalHealthStatus),
            TraumaProgress = NullIfWhiteSpace(request.TraumaProgress),
            MedicationStatus = NullIfWhiteSpace(request.MedicationStatus),
            NextAppointment = OptionalDate(request.NextAppointment),
            Notes = NullIfWhiteSpace(request.Notes),
            CreatedAt = timeProvider.GetUtcNow(),
            UpdatedAt = timeProvider.GetUtcNow()
        };
        dbContext.HealthRecords.Add(entity);
        await SaveAsync(cancellationToken);
        return new HealthRecordResponse { Id = entity.Id, ResidentId = entity.ResidentId, RecordDate = entity.RecordDate, HealthScore = entity.HealthScore, MentalHealthStatus = entity.MentalHealthStatus, PhysicalHealthStatus = entity.PhysicalHealthStatus, TraumaProgress = entity.TraumaProgress, MedicationStatus = entity.MedicationStatus, NextAppointment = entity.NextAppointment, Notes = entity.Notes, CreatedAt = entity.CreatedAt, UpdatedAt = entity.UpdatedAt };
    }

    public async Task<HealthRecordResponse> UpdateHealthRecordAsync(int id, UpdateHealthRecordRequest? request, CancellationToken cancellationToken)
    {
        request ??= new(null, null, null, null, null, null, null, null);
        var entity = await dbContext.HealthRecords.SingleOrDefaultAsync(x => x.Id == id, cancellationToken) ?? throw NotFound();
        if (request.RecordDate is not null) entity.RecordDate = ValidDate(request.RecordDate);
        if (request.HealthScore.HasValue) entity.HealthScore = request.HealthScore;
        if (request.MentalHealthStatus is not null) entity.MentalHealthStatus = NullIfWhiteSpace(request.MentalHealthStatus);
        if (request.PhysicalHealthStatus is not null) entity.PhysicalHealthStatus = NullIfWhiteSpace(request.PhysicalHealthStatus);
        if (request.TraumaProgress is not null) entity.TraumaProgress = NullIfWhiteSpace(request.TraumaProgress);
        if (request.MedicationStatus is not null) entity.MedicationStatus = NullIfWhiteSpace(request.MedicationStatus);
        if (request.NextAppointment is not null) entity.NextAppointment = OptionalDate(request.NextAppointment);
        if (request.Notes is not null) entity.Notes = NullIfWhiteSpace(request.Notes);
        entity.UpdatedAt = timeProvider.GetUtcNow();
        await SaveAsync(cancellationToken);
        return new HealthRecordResponse { Id = entity.Id, ResidentId = entity.ResidentId, RecordDate = entity.RecordDate, HealthScore = entity.HealthScore, MentalHealthStatus = entity.MentalHealthStatus, PhysicalHealthStatus = entity.PhysicalHealthStatus, TraumaProgress = entity.TraumaProgress, MedicationStatus = entity.MedicationStatus, NextAppointment = entity.NextAppointment, Notes = entity.Notes, CreatedAt = entity.CreatedAt, UpdatedAt = entity.UpdatedAt };
    }

    public async Task DeleteHealthRecordAsync(int id, CancellationToken cancellationToken)
    {
        var entity = await dbContext.HealthRecords.SingleOrDefaultAsync(x => x.Id == id, cancellationToken) ?? throw NotFound();
        dbContext.HealthRecords.Remove(entity);
        await SaveAsync(cancellationToken);
    }

    private static Expression<Func<ProcessRecording, ProcessRecordingResponse>> MapProcessRecording() => x => new ProcessRecordingResponse
    {
        Id = x.Id,
        ResidentId = x.ResidentId,
        ResidentCode = x.Resident.ResidentCode,
        WorkerId = x.WorkerId,
        WorkerName = x.Worker.FirstName + " " + x.Worker.LastName,
        SafehouseId = x.SafehouseId,
        SessionDate = x.SessionDate,
        Duration = x.Duration,
        EmotionalStateStart = x.EmotionalStateStart,
        EmotionalStateEnd = x.EmotionalStateEnd,
        ProgressNoted = x.ProgressNoted,
        ConcernFlag = x.ConcernFlag,
        ReferralMade = x.ReferralMade,
        FollowUpRequired = x.FollowUpRequired,
        SessionNotes = x.SessionNotes,
        Tags = x.Tags,
        CreatedAt = x.CreatedAt
    };

    private static Expression<Func<CaseConference, CaseConferenceResponse>> MapCaseConference() => x => new CaseConferenceResponse
    {
        Id = x.Id,
        ResidentId = x.ResidentId,
        ResidentCode = x.Resident.ResidentCode,
        SafehouseId = x.SafehouseId,
        SafehouseName = x.Safehouse.Name,
        ScheduledDate = x.ScheduledDate,
        CompletedDate = x.CompletedDate,
        Status = x.Status,
        Attendees = x.Attendees,
        Decisions = x.Decisions,
        NextSteps = x.NextSteps,
        NextConferenceDate = x.NextConferenceDate,
        CreatedAt = x.CreatedAt
    };

    private static Expression<Func<InterventionPlan, InterventionPlanResponse>> MapInterventionPlan() => x => new InterventionPlanResponse
    {
        Id = x.Id,
        ResidentId = x.ResidentId,
        ResidentCode = x.Resident.ResidentCode,
        SafehouseId = x.SafehouseId,
        SafehouseName = x.Safehouse.Name,
        WorkerId = x.WorkerId,
        WorkerName = x.Worker.FirstName + " " + x.Worker.LastName,
        Category = x.Category,
        Title = x.Title,
        Status = x.Status,
        TargetDate = x.TargetDate,
        CompletedDate = x.CompletedDate,
        Services = x.Services,
        Milestones = x.Milestones,
        SuccessProbability = x.SuccessProbability,
        Notes = x.Notes,
        CreatedAt = x.CreatedAt
    };

    private static Expression<Func<IncidentReport, IncidentResponse>> MapIncident() => x => new IncidentResponse
    {
        Id = x.Id,
        ResidentId = x.ResidentId,
        ResidentCode = x.Resident != null ? x.Resident.ResidentCode : null,
        SafehouseId = x.SafehouseId,
        SafehouseName = x.Safehouse.Name,
        ReportedBy = x.ReportedBy,
        ReportedByName = x.Reporter.FirstName + " " + x.Reporter.LastName,
        IncidentDate = x.IncidentDate,
        IncidentType = x.IncidentType,
        Severity = x.Severity,
        Status = x.Status,
        Description = x.Description,
        Resolution = x.Resolution,
        ResolutionDate = x.ResolutionDate,
        FollowUpRequired = x.FollowUpRequired,
        CreatedAt = x.CreatedAt
    };

    private async Task SaveAsync(CancellationToken cancellationToken)
    {
        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException exception) when (exception.InnerException is PostgresException postgresException)
        {
            throw postgresException.SqlState switch
            {
                PostgresErrorCodes.UniqueViolation => new ApiException(StatusCodes.Status409Conflict, "A record with that value already exists"),
                PostgresErrorCodes.ForeignKeyViolation => new ApiException(StatusCodes.Status400BadRequest, "Invalid reference provided"),
                _ => exception
            };
        }
    }

    private static ApiException NotFound() => new(StatusCodes.Status404NotFound, "Not found");
    private static int Required(int? value, string message) => value ?? throw new ApiException(StatusCodes.Status400BadRequest, message);
    private static string RequiredText(string? value, string message) => string.IsNullOrWhiteSpace(value) ? throw new ApiException(StatusCodes.Status400BadRequest, message) : value.Trim();
    private static string ValidDate(string? value)
    {
        var input = RequiredText(value, "Invalid date format — use YYYY-MM-DD");
        if (!DateOnly.TryParseExact(input, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out _))
        {
            throw new ApiException(StatusCodes.Status400BadRequest, "Invalid date format — use YYYY-MM-DD");
        }
        return input;
    }
    private static string? OptionalDate(string? value) => value is null ? null : string.IsNullOrWhiteSpace(value) ? null : ValidDate(value);
    private static string? NullIfWhiteSpace(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
