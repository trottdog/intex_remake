using System.Text.Json;
using backend.intex.Entities.Database;
using backend.intex.Infrastructure.Data.EntityFramework;
using backend.intex.Repositories.Abstractions;
using Microsoft.EntityFrameworkCore;

namespace backend.intex.Repositories.EntityFramework;

public sealed class SafehouseRepository(BeaconDbContext dbContext) : ISafehouseRepository
{
    public async Task<IReadOnlyList<Safehouse>> ListPublicSafehousesAsync(CancellationToken cancellationToken = default) =>
        await dbContext.Safehouses
            .AsNoTracking()
            .OrderBy(safehouse => safehouse.Name)
            .ThenBy(safehouse => safehouse.SafehouseId)
            .ToListAsync(cancellationToken);

    public async Task<(IReadOnlyList<Safehouse> Safehouses, int Total)> ListSafehousesAsync(int page, int pageSize, CancellationToken cancellationToken = default)
    {
        var query = dbContext.Safehouses.AsNoTracking();
        var total = await query.CountAsync(cancellationToken);
        var safehouses = await query
            .OrderBy(safehouse => safehouse.Name)
            .ThenBy(safehouse => safehouse.SafehouseId)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        return (safehouses, total);
    }

    public Task<Safehouse?> GetSafehouseByIdAsync(long safehouseId, CancellationToken cancellationToken = default) =>
        dbContext.Safehouses
            .AsNoTracking()
            .FirstOrDefaultAsync(safehouse => safehouse.SafehouseId == safehouseId, cancellationToken);

    public async Task<Safehouse> CreateSafehouseAsync(Safehouse safehouse, CancellationToken cancellationToken = default)
    {
        dbContext.Safehouses.Add(safehouse);
        await dbContext.SaveChangesAsync(cancellationToken);
        return safehouse;
    }

    public async Task<Safehouse?> UpdateSafehouseAsync(long safehouseId, IReadOnlyDictionary<string, JsonElement> fields, CancellationToken cancellationToken = default)
    {
        var entity = await dbContext.Safehouses.FirstOrDefaultAsync(safehouse => safehouse.SafehouseId == safehouseId, cancellationToken);
        if (entity is null)
        {
            return null;
        }

        var updated = new Safehouse
        {
            SafehouseId = entity.SafehouseId,
            SafehouseCode = entity.SafehouseCode,
            Name = entity.Name,
            Region = entity.Region,
            City = entity.City,
            Province = entity.Province,
            Country = entity.Country,
            OpenDate = entity.OpenDate,
            Status = entity.Status,
            CapacityGirls = entity.CapacityGirls,
            CapacityStaff = entity.CapacityStaff,
            CurrentOccupancy = entity.CurrentOccupancy,
            Notes = entity.Notes
        };

        foreach (var (key, value) in fields)
        {
            switch (key)
            {
                case "safehouseCode":
                    updated = updated.WithSafehouseCode(ReadNullableString(value));
                    break;
                case "name":
                    updated = updated.WithName(ReadNullableString(value));
                    break;
                case "region":
                    updated = updated.WithRegion(ReadNullableString(value));
                    break;
                case "city":
                    updated = updated.WithCity(ReadNullableString(value));
                    break;
                case "province":
                    updated = updated.WithProvince(ReadNullableString(value));
                    break;
                case "country":
                    updated = updated.WithCountry(ReadNullableString(value));
                    break;
                case "openDate":
                    updated = updated.WithOpenDate(ReadNullableDateOnly(value));
                    break;
                case "status":
                    updated = updated.WithStatus(ReadNullableString(value));
                    break;
                case "capacityGirls":
                    updated = updated.WithCapacityGirls(ReadNullableInt(value));
                    break;
                case "capacityStaff":
                    updated = updated.WithCapacityStaff(ReadNullableInt(value));
                    break;
                case "currentOccupancy":
                    updated = updated.WithCurrentOccupancy(ReadNullableInt(value));
                    break;
                case "notes":
                    updated = updated.WithNotes(ReadNullableString(value));
                    break;
                case "capacity":
                    updated = updated.WithCapacityGirls(ReadNullableInt(value));
                    break;
                case "location":
                    updated = updated.WithCity(ReadNullableString(value));
                    break;
                case "description":
                    updated = updated.WithNotes(ReadNullableString(value));
                    break;
            }
        }

        dbContext.Entry(entity).CurrentValues.SetValues(updated);
        await dbContext.SaveChangesAsync(cancellationToken);
        return updated;
    }

    public async Task DeleteSafehouseIfExistsAsync(long safehouseId, CancellationToken cancellationToken = default)
    {
        var entity = await dbContext.Safehouses.FirstOrDefaultAsync(safehouse => safehouse.SafehouseId == safehouseId, cancellationToken);
        if (entity is null)
        {
            return;
        }

        dbContext.Safehouses.Remove(entity);
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<SafehouseMonthlyMetric>> ListMetricsAsync(long safehouseId, int months, CancellationToken cancellationToken = default) =>
        await dbContext.SafehouseMonthlyMetrics
            .AsNoTracking()
            .Where(metric => metric.SafehouseId == safehouseId)
            .OrderByDescending(metric => metric.MonthStart)
            .ThenByDescending(metric => metric.MetricId)
            .Take(months)
            .ToListAsync(cancellationToken);

    private static string? ReadNullableString(JsonElement value) =>
        value.ValueKind == JsonValueKind.Null ? null : value.GetString();

    private static int? ReadNullableInt(JsonElement value)
    {
        if (value.ValueKind == JsonValueKind.Null)
        {
            return null;
        }

        return value.ValueKind switch
        {
            JsonValueKind.Number when value.TryGetInt32(out var intValue) => intValue,
            JsonValueKind.String when int.TryParse(value.GetString(), out var stringValue) => stringValue,
            _ => throw new InvalidOperationException("The request body is invalid.")
        };
    }

    private static DateOnly? ReadNullableDateOnly(JsonElement value)
    {
        if (value.ValueKind == JsonValueKind.Null)
        {
            return null;
        }

        if (value.ValueKind == JsonValueKind.String && DateOnly.TryParse(value.GetString(), out var parsed))
        {
            return parsed;
        }

        throw new InvalidOperationException("The request body is invalid.");
    }
}

internal static class SafehouseRepositoryExtensions
{
    public static Safehouse WithSafehouseCode(this Safehouse safehouse, string? value) => new()
    {
        SafehouseId = safehouse.SafehouseId,
        SafehouseCode = value,
        Name = safehouse.Name,
        Region = safehouse.Region,
        City = safehouse.City,
        Province = safehouse.Province,
        Country = safehouse.Country,
        OpenDate = safehouse.OpenDate,
        Status = safehouse.Status,
        CapacityGirls = safehouse.CapacityGirls,
        CapacityStaff = safehouse.CapacityStaff,
        CurrentOccupancy = safehouse.CurrentOccupancy,
        Notes = safehouse.Notes
    };

    public static Safehouse WithName(this Safehouse safehouse, string? value) => new()
    {
        SafehouseId = safehouse.SafehouseId,
        SafehouseCode = safehouse.SafehouseCode,
        Name = value,
        Region = safehouse.Region,
        City = safehouse.City,
        Province = safehouse.Province,
        Country = safehouse.Country,
        OpenDate = safehouse.OpenDate,
        Status = safehouse.Status,
        CapacityGirls = safehouse.CapacityGirls,
        CapacityStaff = safehouse.CapacityStaff,
        CurrentOccupancy = safehouse.CurrentOccupancy,
        Notes = safehouse.Notes
    };

    public static Safehouse WithRegion(this Safehouse safehouse, string? value) => new()
    {
        SafehouseId = safehouse.SafehouseId,
        SafehouseCode = safehouse.SafehouseCode,
        Name = safehouse.Name,
        Region = value,
        City = safehouse.City,
        Province = safehouse.Province,
        Country = safehouse.Country,
        OpenDate = safehouse.OpenDate,
        Status = safehouse.Status,
        CapacityGirls = safehouse.CapacityGirls,
        CapacityStaff = safehouse.CapacityStaff,
        CurrentOccupancy = safehouse.CurrentOccupancy,
        Notes = safehouse.Notes
    };

    public static Safehouse WithCity(this Safehouse safehouse, string? value) => new()
    {
        SafehouseId = safehouse.SafehouseId,
        SafehouseCode = safehouse.SafehouseCode,
        Name = safehouse.Name,
        Region = safehouse.Region,
        City = value,
        Province = safehouse.Province,
        Country = safehouse.Country,
        OpenDate = safehouse.OpenDate,
        Status = safehouse.Status,
        CapacityGirls = safehouse.CapacityGirls,
        CapacityStaff = safehouse.CapacityStaff,
        CurrentOccupancy = safehouse.CurrentOccupancy,
        Notes = safehouse.Notes
    };

    public static Safehouse WithProvince(this Safehouse safehouse, string? value) => new()
    {
        SafehouseId = safehouse.SafehouseId,
        SafehouseCode = safehouse.SafehouseCode,
        Name = safehouse.Name,
        Region = safehouse.Region,
        City = safehouse.City,
        Province = value,
        Country = safehouse.Country,
        OpenDate = safehouse.OpenDate,
        Status = safehouse.Status,
        CapacityGirls = safehouse.CapacityGirls,
        CapacityStaff = safehouse.CapacityStaff,
        CurrentOccupancy = safehouse.CurrentOccupancy,
        Notes = safehouse.Notes
    };

    public static Safehouse WithCountry(this Safehouse safehouse, string? value) => new()
    {
        SafehouseId = safehouse.SafehouseId,
        SafehouseCode = safehouse.SafehouseCode,
        Name = safehouse.Name,
        Region = safehouse.Region,
        City = safehouse.City,
        Province = safehouse.Province,
        Country = value,
        OpenDate = safehouse.OpenDate,
        Status = safehouse.Status,
        CapacityGirls = safehouse.CapacityGirls,
        CapacityStaff = safehouse.CapacityStaff,
        CurrentOccupancy = safehouse.CurrentOccupancy,
        Notes = safehouse.Notes
    };

    public static Safehouse WithOpenDate(this Safehouse safehouse, DateOnly? value) => new()
    {
        SafehouseId = safehouse.SafehouseId,
        SafehouseCode = safehouse.SafehouseCode,
        Name = safehouse.Name,
        Region = safehouse.Region,
        City = safehouse.City,
        Province = safehouse.Province,
        Country = safehouse.Country,
        OpenDate = value,
        Status = safehouse.Status,
        CapacityGirls = safehouse.CapacityGirls,
        CapacityStaff = safehouse.CapacityStaff,
        CurrentOccupancy = safehouse.CurrentOccupancy,
        Notes = safehouse.Notes
    };

    public static Safehouse WithStatus(this Safehouse safehouse, string? value) => new()
    {
        SafehouseId = safehouse.SafehouseId,
        SafehouseCode = safehouse.SafehouseCode,
        Name = safehouse.Name,
        Region = safehouse.Region,
        City = safehouse.City,
        Province = safehouse.Province,
        Country = safehouse.Country,
        OpenDate = safehouse.OpenDate,
        Status = value,
        CapacityGirls = safehouse.CapacityGirls,
        CapacityStaff = safehouse.CapacityStaff,
        CurrentOccupancy = safehouse.CurrentOccupancy,
        Notes = safehouse.Notes
    };

    public static Safehouse WithCapacityGirls(this Safehouse safehouse, int? value) => new()
    {
        SafehouseId = safehouse.SafehouseId,
        SafehouseCode = safehouse.SafehouseCode,
        Name = safehouse.Name,
        Region = safehouse.Region,
        City = safehouse.City,
        Province = safehouse.Province,
        Country = safehouse.Country,
        OpenDate = safehouse.OpenDate,
        Status = safehouse.Status,
        CapacityGirls = value,
        CapacityStaff = safehouse.CapacityStaff,
        CurrentOccupancy = safehouse.CurrentOccupancy,
        Notes = safehouse.Notes
    };

    public static Safehouse WithCapacityStaff(this Safehouse safehouse, int? value) => new()
    {
        SafehouseId = safehouse.SafehouseId,
        SafehouseCode = safehouse.SafehouseCode,
        Name = safehouse.Name,
        Region = safehouse.Region,
        City = safehouse.City,
        Province = safehouse.Province,
        Country = safehouse.Country,
        OpenDate = safehouse.OpenDate,
        Status = safehouse.Status,
        CapacityGirls = safehouse.CapacityGirls,
        CapacityStaff = value,
        CurrentOccupancy = safehouse.CurrentOccupancy,
        Notes = safehouse.Notes
    };

    public static Safehouse WithCurrentOccupancy(this Safehouse safehouse, int? value) => new()
    {
        SafehouseId = safehouse.SafehouseId,
        SafehouseCode = safehouse.SafehouseCode,
        Name = safehouse.Name,
        Region = safehouse.Region,
        City = safehouse.City,
        Province = safehouse.Province,
        Country = safehouse.Country,
        OpenDate = safehouse.OpenDate,
        Status = safehouse.Status,
        CapacityGirls = safehouse.CapacityGirls,
        CapacityStaff = safehouse.CapacityStaff,
        CurrentOccupancy = value,
        Notes = safehouse.Notes
    };

    public static Safehouse WithNotes(this Safehouse safehouse, string? value) => new()
    {
        SafehouseId = safehouse.SafehouseId,
        SafehouseCode = safehouse.SafehouseCode,
        Name = safehouse.Name,
        Region = safehouse.Region,
        City = safehouse.City,
        Province = safehouse.Province,
        Country = safehouse.Country,
        OpenDate = safehouse.OpenDate,
        Status = safehouse.Status,
        CapacityGirls = safehouse.CapacityGirls,
        CapacityStaff = safehouse.CapacityStaff,
        CurrentOccupancy = safehouse.CurrentOccupancy,
        Notes = value
    };
}
