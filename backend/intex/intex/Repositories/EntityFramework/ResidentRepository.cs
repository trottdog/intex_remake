using System.Text.Json;
using backend.intex.Entities.Database;
using backend.intex.Infrastructure.Data.EntityFramework;
using backend.intex.Repositories.Abstractions;
using Microsoft.EntityFrameworkCore;

namespace backend.intex.Repositories.EntityFramework;

public sealed class ResidentRepository(BeaconDbContext dbContext) : IResidentRepository
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    public async Task<(IReadOnlyList<Resident> Residents, int Total)> ListResidentsAsync(int page, int pageSize, long? safehouseId, string? caseStatus, IReadOnlyList<long> allowedSafehouses, bool enforceSafehouseScope, CancellationToken cancellationToken = default)
    {
        var query = ApplyResidentFilters(
            ApplyResidentScope(dbContext.Residents.AsNoTracking(), allowedSafehouses, enforceSafehouseScope),
            safehouseId,
            caseStatus);

        var total = await query.CountAsync(cancellationToken);
        var residents = await query
            .OrderByDescending(resident => resident.CreatedAt)
            .ThenByDescending(resident => resident.ResidentId)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return (residents, total);
    }

    public async Task<IReadOnlyList<Resident>> ListResidentsForStatsAsync(long? safehouseId, IReadOnlyList<long> allowedSafehouses, bool enforceSafehouseScope, CancellationToken cancellationToken = default) =>
        await ApplyResidentFilters(
                ApplyResidentScope(dbContext.Residents.AsNoTracking(), allowedSafehouses, enforceSafehouseScope),
                safehouseId,
                caseStatus: null)
            .ToListAsync(cancellationToken);

    public Task<Resident?> GetResidentAsync(long residentId, IReadOnlyList<long> allowedSafehouses, bool enforceSafehouseScope, CancellationToken cancellationToken = default) =>
        ApplyResidentScope(dbContext.Residents.AsNoTracking(), allowedSafehouses, enforceSafehouseScope)
            .FirstOrDefaultAsync(resident => resident.ResidentId == residentId, cancellationToken);

    public async Task<Resident> CreateResidentAsync(IReadOnlyDictionary<string, JsonElement> fields, CancellationToken cancellationToken = default)
    {
        var fieldMap = new Dictionary<string, JsonElement>(fields, StringComparer.OrdinalIgnoreCase);
        fieldMap.Remove("residentId");
        fieldMap.Remove("id");
        fieldMap.Remove("internalCode");
        if (!fieldMap.ContainsKey("createdAt"))
        {
            fieldMap["createdAt"] = JsonSerializer.SerializeToElement(DateTime.UtcNow);
        }
        fieldMap["internalCode"] = JsonSerializer.SerializeToElement(
            await GenerateInternalCodeAsync(ReadNullableLong(fieldMap, "safehouseId"), cancellationToken));

        var resident = JsonSerializer.Deserialize<Resident>(JsonSerializer.Serialize(fieldMap, JsonOptions), JsonOptions)
            ?? throw new InvalidOperationException("The request body is invalid.");

        dbContext.Residents.Add(resident);
        await dbContext.SaveChangesAsync(cancellationToken);
        return resident;
    }

    public async Task<Resident?> UpdateResidentAsync(long residentId, IReadOnlyDictionary<string, JsonElement> fields, CancellationToken cancellationToken = default)
    {
        var entity = await dbContext.Residents.FirstOrDefaultAsync(resident => resident.ResidentId == residentId, cancellationToken);
        if (entity is null)
        {
            return null;
        }

        var merged = MergeResidentFields(entity, fields);

        var updated = JsonSerializer.Deserialize<Resident>(JsonSerializer.Serialize(merged, JsonOptions), JsonOptions)
            ?? throw new InvalidOperationException("The request body is invalid.");

        dbContext.Entry(entity).CurrentValues.SetValues(updated);
        await dbContext.SaveChangesAsync(cancellationToken);
        return entity;
    }

    public async Task<bool> DeleteResidentAsync(long residentId, CancellationToken cancellationToken = default)
    {
        var entity = await dbContext.Residents.FirstOrDefaultAsync(resident => resident.ResidentId == residentId, cancellationToken);
        if (entity is null)
        {
            return false;
        }

        await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);

        await dbContext.CaseConferences
            .Where(conference => conference.ResidentId == residentId)
            .ExecuteDeleteAsync(cancellationToken);

        await dbContext.EducationRecords
            .Where(record => record.ResidentId == residentId)
            .ExecuteDeleteAsync(cancellationToken);

        await dbContext.HealthWellbeingRecords
            .Where(record => record.ResidentId == residentId)
            .ExecuteDeleteAsync(cancellationToken);

        await dbContext.HomeVisitations
            .Where(visit => visit.ResidentId == residentId)
            .ExecuteDeleteAsync(cancellationToken);

        await dbContext.IncidentReports
            .Where(report => report.ResidentId == residentId)
            .ExecuteDeleteAsync(cancellationToken);

        await dbContext.InterventionPlans
            .Where(plan => plan.ResidentId == residentId)
            .ExecuteDeleteAsync(cancellationToken);

        await dbContext.ProcessRecordings
            .Where(recording => recording.ResidentId == residentId)
            .ExecuteDeleteAsync(cancellationToken);

        dbContext.Residents.Remove(entity);
        await dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return true;
    }

    public async Task<IReadOnlyDictionary<long, string?>> GetSafehouseNamesAsync(IReadOnlyList<long> safehouseIds, CancellationToken cancellationToken = default)
    {
        if (safehouseIds.Count == 0)
        {
            return new Dictionary<long, string?>();
        }

        return await dbContext.Safehouses.AsNoTracking()
            .Where(safehouse => safehouseIds.Contains(safehouse.SafehouseId))
            .ToDictionaryAsync(safehouse => safehouse.SafehouseId, safehouse => safehouse.Name, cancellationToken);
    }

    public async Task<IReadOnlyList<ResidentTimelineRecord>> GetResidentTimelineAsync(long residentId, CancellationToken cancellationToken = default)
    {
        var recordings = await dbContext.ProcessRecordings.AsNoTracking()
            .Where(recording => recording.ResidentId == residentId)
            .ToListAsync(cancellationToken);
        var visits = await dbContext.HomeVisitations.AsNoTracking()
            .Where(visit => visit.ResidentId == residentId)
            .ToListAsync(cancellationToken);
        var conferences = await dbContext.CaseConferences.AsNoTracking()
            .Where(conference => conference.ResidentId == residentId)
            .ToListAsync(cancellationToken);
        var plans = await dbContext.InterventionPlans.AsNoTracking()
            .Where(plan => plan.ResidentId == residentId)
            .ToListAsync(cancellationToken);
        var incidents = await dbContext.IncidentReports.AsNoTracking()
            .Where(incident => incident.ResidentId == residentId)
            .ToListAsync(cancellationToken);

        return recordings.Select(recording => new ResidentTimelineRecord(
                $"rec-{recording.RecordingId}",
                "session",
                recording.SessionDate,
                "Session Recording",
                recording.SessionNarrative,
                recording.ConcernsFlagged == true ? "concern" : null))
            .Concat(visits.Select(visit => new ResidentTimelineRecord(
                $"visit-{visit.VisitationId}",
                "home_visit",
                visit.VisitDate,
                "Home Visitation",
                visit.Observations,
                visit.SafetyConcernsNoted == true ? "safety_concern" : null)))
            .Concat(conferences.Select(conference => new ResidentTimelineRecord(
                $"conf-{conference.ConferenceId}",
                "case_conference",
                conference.ConferenceDate,
                "Case Conference",
                conference.DecisionsMade,
                null)))
            .Concat(plans.Select(plan => new ResidentTimelineRecord(
                $"plan-{plan.PlanId}",
                "intervention",
                plan.TargetDate,
                plan.PlanCategory ?? "Intervention Plan",
                plan.PlanDescription,
                null)))
            .Concat(incidents.Select(incident => new ResidentTimelineRecord(
                $"inc-{incident.IncidentId}",
                "incident",
                incident.IncidentDate,
                $"Incident: {incident.IncidentType ?? string.Empty}".TrimEnd(),
                incident.Description,
                incident.Severity)))
            .OrderByDescending(item => item.EventDate)
            .ThenByDescending(item => item.Id, StringComparer.Ordinal)
            .ToList();
    }

    private static IQueryable<Resident> ApplyResidentScope(IQueryable<Resident> query, IReadOnlyList<long> allowedSafehouses, bool enforceSafehouseScope)
    {
        if (!enforceSafehouseScope || allowedSafehouses.Count == 0)
        {
            return query;
        }

        return query.Where(resident => resident.SafehouseId.HasValue && allowedSafehouses.Contains(resident.SafehouseId.Value));
    }

    private static IQueryable<Resident> ApplyResidentFilters(IQueryable<Resident> query, long? safehouseId, string? caseStatus)
    {
        if (safehouseId.HasValue)
        {
            query = query.Where(resident => resident.SafehouseId == safehouseId.Value);
        }

        if (!string.IsNullOrWhiteSpace(caseStatus))
        {
            query = query.Where(resident => resident.CaseStatus == caseStatus);
        }

        return query;
    }

    private static Dictionary<string, JsonElement> MergeResidentFields(Resident resident, IReadOnlyDictionary<string, JsonElement> fields)
    {
        var existing = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(
            JsonSerializer.Serialize(resident, JsonOptions),
            JsonOptions);
        var merged = existing is null
            ? new Dictionary<string, JsonElement>(StringComparer.OrdinalIgnoreCase)
            : new Dictionary<string, JsonElement>(existing, StringComparer.OrdinalIgnoreCase);

        foreach (var (key, value) in fields)
        {
            merged[key] = value;
        }

        return merged;
    }

    private async Task<string> GenerateInternalCodeAsync(long? safehouseId, CancellationToken cancellationToken)
    {
        var nextResidentNumber = (await dbContext.Residents.AsNoTracking()
            .MaxAsync(resident => (long?)resident.ResidentId, cancellationToken) ?? 0) + 1;

        if (!safehouseId.HasValue)
        {
            return $"RES-R{nextResidentNumber:D4}";
        }

        var safehouseCode = await dbContext.Safehouses.AsNoTracking()
            .Where(safehouse => safehouse.SafehouseId == safehouseId.Value)
            .Select(safehouse => safehouse.SafehouseCode)
            .FirstOrDefaultAsync(cancellationToken);

        var prefix = string.IsNullOrWhiteSpace(safehouseCode)
            ? $"SH{safehouseId.Value}"
            : safehouseCode.Trim();

        return $"{prefix}-R{nextResidentNumber:D4}";
    }

    private static long? ReadNullableLong(IReadOnlyDictionary<string, JsonElement> fields, string key)
    {
        if (!fields.TryGetValue(key, out var value) || value.ValueKind == JsonValueKind.Null)
        {
            return null;
        }

        return value.ValueKind == JsonValueKind.Number && value.TryGetInt64(out var number)
            ? number
            : null;
    }
}
