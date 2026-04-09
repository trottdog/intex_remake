using System.Text.Json;
using backend.intex.DTOs.Records;
using backend.intex.Entities.Database;
using backend.intex.Infrastructure.Data.EntityFramework;
using backend.intex.Repositories.Abstractions;
using Microsoft.EntityFrameworkCore;

namespace backend.intex.Repositories.EntityFramework;

public sealed class ResidentRecordRepository(BeaconDbContext dbContext) : IResidentRecordRepository
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    public async Task<(IReadOnlyList<EducationRecordResponseDto> Data, int Total)> ListEducationRecordsAsync(
        int page,
        int pageSize,
        long? residentId,
        IReadOnlyList<long> allowedSafehouses,
        bool enforceSafehouseScope,
        CancellationToken cancellationToken = default)
    {
        var query = from record in dbContext.EducationRecords.AsNoTracking()
                    join resident in dbContext.Residents.AsNoTracking() on record.ResidentId equals (long?)resident.ResidentId into residentGroup
                    from resident in residentGroup.DefaultIfEmpty()
                    select new { Record = record, resident.SafehouseId };

        if (residentId.HasValue)
        {
            query = query.Where(item => item.Record.ResidentId == residentId.Value);
        }

        if (enforceSafehouseScope && allowedSafehouses.Count > 0)
        {
            query = query.Where(item => item.SafehouseId.HasValue && allowedSafehouses.Contains(item.SafehouseId.Value));
        }

        var total = await query.CountAsync(cancellationToken);
        var rows = await query
            .OrderByDescending(item => item.Record.RecordDate)
            .ThenByDescending(item => item.Record.EducationRecordId)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return (rows.Select(item => new EducationRecordResponseDto
        {
            EducationRecordId = item.Record.EducationRecordId,
            ResidentId = item.Record.ResidentId,
            RecordDate = item.Record.RecordDate?.ToString("yyyy-MM-dd"),
            EducationLevel = item.Record.EducationLevel,
            SchoolName = item.Record.SchoolName,
            EnrollmentStatus = item.Record.EnrollmentStatus,
            AttendanceRate = item.Record.AttendanceRate.HasValue ? decimal.Round(item.Record.AttendanceRate.Value, 2) : null,
            ProgressPercent = item.Record.ProgressPercent.HasValue ? decimal.Round(item.Record.ProgressPercent.Value, 2) : null,
            CompletionStatus = item.Record.CompletionStatus,
            Notes = item.Record.Notes
        }).ToList(), total);
    }

    public async Task<EducationRecordResponseDto?> GetEducationRecordAsync(
        long educationRecordId,
        IReadOnlyList<long> allowedSafehouses,
        bool enforceSafehouseScope,
        CancellationToken cancellationToken = default)
    {
        var query = from record in dbContext.EducationRecords.AsNoTracking()
                    join resident in dbContext.Residents.AsNoTracking() on record.ResidentId equals (long?)resident.ResidentId into residentGroup
                    from resident in residentGroup.DefaultIfEmpty()
                    where record.EducationRecordId == educationRecordId
                    select new { Record = record, resident.SafehouseId };

        if (enforceSafehouseScope && allowedSafehouses.Count > 0)
        {
            query = query.Where(item => item.SafehouseId.HasValue && allowedSafehouses.Contains(item.SafehouseId.Value));
        }

        var item = await query.FirstOrDefaultAsync(cancellationToken);
        return item is null
            ? null
            : new EducationRecordResponseDto
            {
                EducationRecordId = item.Record.EducationRecordId,
                ResidentId = item.Record.ResidentId,
                RecordDate = item.Record.RecordDate?.ToString("yyyy-MM-dd"),
                EducationLevel = item.Record.EducationLevel,
                SchoolName = item.Record.SchoolName,
                EnrollmentStatus = item.Record.EnrollmentStatus,
                AttendanceRate = item.Record.AttendanceRate.HasValue ? decimal.Round(item.Record.AttendanceRate.Value, 2) : null,
                ProgressPercent = item.Record.ProgressPercent.HasValue ? decimal.Round(item.Record.ProgressPercent.Value, 2) : null,
                CompletionStatus = item.Record.CompletionStatus,
                Notes = item.Record.Notes
            };
    }

    public async Task<EducationRecordResponseDto?> CreateEducationRecordAsync(
        IReadOnlyDictionary<string, JsonElement> fields,
        CancellationToken cancellationToken = default)
    {
        var entity = DeserializeEntity<EducationRecord>(fields);
        dbContext.EducationRecords.Add(entity);
        await dbContext.SaveChangesAsync(cancellationToken);
        return await GetEducationRecordAsync(entity.EducationRecordId, [], false, cancellationToken);
    }

    public async Task<EducationRecordResponseDto?> UpdateEducationRecordAsync(
        long educationRecordId,
        IReadOnlyDictionary<string, JsonElement> fields,
        CancellationToken cancellationToken = default)
    {
        var entity = await dbContext.EducationRecords.FirstOrDefaultAsync(item => item.EducationRecordId == educationRecordId, cancellationToken);
        if (entity is null)
        {
            return null;
        }

        ApplyMergedValues(entity, fields);
        await dbContext.SaveChangesAsync(cancellationToken);
        return await GetEducationRecordAsync(educationRecordId, [], false, cancellationToken);
    }

    public async Task<bool> DeleteEducationRecordAsync(long educationRecordId, CancellationToken cancellationToken = default)
    {
        var entity = await dbContext.EducationRecords.FirstOrDefaultAsync(item => item.EducationRecordId == educationRecordId, cancellationToken);
        if (entity is null)
        {
            return false;
        }

        dbContext.EducationRecords.Remove(entity);
        await dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<(IReadOnlyList<HealthRecordResponseDto> Data, int Total)> ListHealthRecordsAsync(
        int page,
        int pageSize,
        long? residentId,
        IReadOnlyList<long> allowedSafehouses,
        bool enforceSafehouseScope,
        CancellationToken cancellationToken = default)
    {
        var query = from record in dbContext.HealthWellbeingRecords.AsNoTracking()
                    join resident in dbContext.Residents.AsNoTracking() on record.ResidentId equals (long?)resident.ResidentId into residentGroup
                    from resident in residentGroup.DefaultIfEmpty()
                    select new { Record = record, resident.SafehouseId };

        if (residentId.HasValue)
        {
            query = query.Where(item => item.Record.ResidentId == residentId.Value);
        }

        if (enforceSafehouseScope && allowedSafehouses.Count > 0)
        {
            query = query.Where(item => item.SafehouseId.HasValue && allowedSafehouses.Contains(item.SafehouseId.Value));
        }

        var total = await query.CountAsync(cancellationToken);
        var rows = await query
            .OrderByDescending(item => item.Record.RecordDate)
            .ThenByDescending(item => item.Record.HealthRecordId)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return (rows.Select(item => new HealthRecordResponseDto
        {
            HealthRecordId = item.Record.HealthRecordId,
            ResidentId = item.Record.ResidentId,
            RecordDate = item.Record.RecordDate?.ToString("yyyy-MM-dd"),
            GeneralHealthScore = item.Record.GeneralHealthScore.HasValue ? decimal.Round(item.Record.GeneralHealthScore.Value, 2) : null,
            NutritionScore = item.Record.NutritionScore.HasValue ? decimal.Round(item.Record.NutritionScore.Value, 2) : null,
            SleepQualityScore = item.Record.SleepQualityScore.HasValue ? decimal.Round(item.Record.SleepQualityScore.Value, 2) : null,
            EnergyLevelScore = item.Record.EnergyLevelScore.HasValue ? decimal.Round(item.Record.EnergyLevelScore.Value, 2) : null,
            HeightCm = item.Record.HeightCm.HasValue ? decimal.Round(item.Record.HeightCm.Value, 2) : null,
            WeightKg = item.Record.WeightKg.HasValue ? decimal.Round(item.Record.WeightKg.Value, 2) : null,
            Bmi = item.Record.Bmi.HasValue ? decimal.Round(item.Record.Bmi.Value, 2) : null,
            MedicalCheckupDone = item.Record.MedicalCheckupDone,
            DentalCheckupDone = item.Record.DentalCheckupDone,
            PsychologicalCheckupDone = item.Record.PsychologicalCheckupDone,
            Notes = item.Record.Notes
        }).ToList(), total);
    }

    public async Task<HealthRecordResponseDto?> GetHealthRecordAsync(
        long healthRecordId,
        IReadOnlyList<long> allowedSafehouses,
        bool enforceSafehouseScope,
        CancellationToken cancellationToken = default)
    {
        var query = from record in dbContext.HealthWellbeingRecords.AsNoTracking()
                    join resident in dbContext.Residents.AsNoTracking() on record.ResidentId equals (long?)resident.ResidentId into residentGroup
                    from resident in residentGroup.DefaultIfEmpty()
                    where record.HealthRecordId == healthRecordId
                    select new { Record = record, resident.SafehouseId };

        if (enforceSafehouseScope && allowedSafehouses.Count > 0)
        {
            query = query.Where(item => item.SafehouseId.HasValue && allowedSafehouses.Contains(item.SafehouseId.Value));
        }

        var item = await query.FirstOrDefaultAsync(cancellationToken);
        return item is null
            ? null
            : new HealthRecordResponseDto
            {
                HealthRecordId = item.Record.HealthRecordId,
                ResidentId = item.Record.ResidentId,
                RecordDate = item.Record.RecordDate?.ToString("yyyy-MM-dd"),
                GeneralHealthScore = item.Record.GeneralHealthScore.HasValue ? decimal.Round(item.Record.GeneralHealthScore.Value, 2) : null,
                NutritionScore = item.Record.NutritionScore.HasValue ? decimal.Round(item.Record.NutritionScore.Value, 2) : null,
                SleepQualityScore = item.Record.SleepQualityScore.HasValue ? decimal.Round(item.Record.SleepQualityScore.Value, 2) : null,
                EnergyLevelScore = item.Record.EnergyLevelScore.HasValue ? decimal.Round(item.Record.EnergyLevelScore.Value, 2) : null,
                HeightCm = item.Record.HeightCm.HasValue ? decimal.Round(item.Record.HeightCm.Value, 2) : null,
                WeightKg = item.Record.WeightKg.HasValue ? decimal.Round(item.Record.WeightKg.Value, 2) : null,
                Bmi = item.Record.Bmi.HasValue ? decimal.Round(item.Record.Bmi.Value, 2) : null,
                MedicalCheckupDone = item.Record.MedicalCheckupDone,
                DentalCheckupDone = item.Record.DentalCheckupDone,
                PsychologicalCheckupDone = item.Record.PsychologicalCheckupDone,
                Notes = item.Record.Notes
            };
    }

    public async Task<HealthRecordResponseDto?> CreateHealthRecordAsync(
        IReadOnlyDictionary<string, JsonElement> fields,
        CancellationToken cancellationToken = default)
    {
        var entity = DeserializeEntity<HealthWellbeingRecord>(fields);
        dbContext.HealthWellbeingRecords.Add(entity);
        await dbContext.SaveChangesAsync(cancellationToken);
        return await GetHealthRecordAsync(entity.HealthRecordId, [], false, cancellationToken);
    }

    public async Task<HealthRecordResponseDto?> UpdateHealthRecordAsync(
        long healthRecordId,
        IReadOnlyDictionary<string, JsonElement> fields,
        CancellationToken cancellationToken = default)
    {
        var entity = await dbContext.HealthWellbeingRecords.FirstOrDefaultAsync(item => item.HealthRecordId == healthRecordId, cancellationToken);
        if (entity is null)
        {
            return null;
        }

        ApplyMergedValues(entity, fields);
        await dbContext.SaveChangesAsync(cancellationToken);
        return await GetHealthRecordAsync(healthRecordId, [], false, cancellationToken);
    }

    public async Task<bool> DeleteHealthRecordAsync(long healthRecordId, CancellationToken cancellationToken = default)
    {
        var entity = await dbContext.HealthWellbeingRecords.FirstOrDefaultAsync(item => item.HealthRecordId == healthRecordId, cancellationToken);
        if (entity is null)
        {
            return false;
        }

        dbContext.HealthWellbeingRecords.Remove(entity);
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
}
