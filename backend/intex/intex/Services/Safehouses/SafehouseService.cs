using backend.intex.DTOs.Common;
using backend.intex.DTOs.Safehouses;
using backend.intex.Entities.Database;
using backend.intex.Infrastructure.Auth;
using backend.intex.Repositories.Abstractions;
using backend.intex.Services.Abstractions;

namespace backend.intex.Services.Safehouses;

public sealed class SafehouseService(ISafehouseRepository safehouseRepository) : ISafehouseService
{
    public async Task<PublicSafehouseListResponse> ListPublicSafehousesAsync(CancellationToken cancellationToken = default)
    {
        var safehouses = await safehouseRepository.ListPublicSafehousesAsync(cancellationToken);
        return new PublicSafehouseListResponse(
            safehouses.Select(safehouse => new PublicSafehouseDto(
                safehouse.SafehouseId,
                safehouse.Name,
                safehouse.Name))
            .ToList());
    }

    public async Task<StandardPagedResponse<SafehouseResponseDto>> ListSafehousesAsync(ListSafehousesQuery query, string? role, IReadOnlyList<long> assignedSafehouses, CancellationToken cancellationToken = default)
    {
        var page = query.Page <= 0 ? 1 : query.Page;
        var pageSize = ResolvePageSize(query.PageSize, query.Limit);
        var enforceScope = role is BeaconRoles.Staff or BeaconRoles.Admin;
        var (safehouses, total) = await safehouseRepository.ListSafehousesAsync(page, pageSize, assignedSafehouses, enforceScope, cancellationToken);
        var totalPages = total == 0 ? 0 : (int)Math.Ceiling(total / (double)pageSize);

        return new StandardPagedResponse<SafehouseResponseDto>(
            safehouses.Select(Map).ToList(),
            total,
            new StandardPaginationMeta(page, pageSize, totalPages, page < totalPages, page > 1));
    }

    public async Task<SafehouseResponseDto?> GetSafehouseAsync(long safehouseId, string? role, IReadOnlyList<long> assignedSafehouses, CancellationToken cancellationToken = default)
    {
        var enforceScope = role is BeaconRoles.Staff or BeaconRoles.Admin;
        var safehouse = await safehouseRepository.GetSafehouseByIdAsync(safehouseId, assignedSafehouses, enforceScope, cancellationToken);
        return safehouse is null ? null : Map(safehouse);
    }

    public async Task<SafehouseResponseDto> CreateSafehouseAsync(CreateSafehouseRequest request, CancellationToken cancellationToken = default)
    {
        var safehouse = new Safehouse
        {
            SafehouseCode = request.SafehouseCode,
            Name = request.Name,
            Region = request.Region,
            City = request.City ?? request.Location,
            Province = request.Province,
            Country = request.Country,
            OpenDate = request.OpenDate,
            Status = request.Status,
            CapacityGirls = request.CapacityGirls ?? request.Capacity,
            CapacityStaff = request.CapacityStaff,
            CurrentOccupancy = request.CurrentOccupancy,
            Notes = request.Notes ?? request.Description
        };

        var created = await safehouseRepository.CreateSafehouseAsync(safehouse, cancellationToken);
        return Map(created);
    }

    public async Task<SafehouseResponseDto?> UpdateSafehouseAsync(long safehouseId, UpdateSafehouseRequest request, CancellationToken cancellationToken = default)
    {
        var updated = await safehouseRepository.UpdateSafehouseAsync(safehouseId, request.Fields, cancellationToken);
        return updated is null ? null : Map(updated);
    }

    public Task DeleteSafehouseAsync(long safehouseId, CancellationToken cancellationToken = default) =>
        safehouseRepository.DeleteSafehouseIfExistsAsync(safehouseId, cancellationToken);

    public async Task<IReadOnlyList<SafehouseMetricDto>> GetSafehouseMetricsAsync(long safehouseId, int months, string? role, IReadOnlyList<long> assignedSafehouses, CancellationToken cancellationToken = default)
    {
        var resolvedMonths = Math.Clamp(months <= 0 ? 12 : months, 1, 24);
        var enforceScope = role is BeaconRoles.Staff or BeaconRoles.Admin;
        var metrics = await safehouseRepository.ListMetricsAsync(safehouseId, resolvedMonths, assignedSafehouses, enforceScope, cancellationToken);

        return metrics
            .OrderBy(metric => metric.MonthStart)
            .ThenBy(metric => metric.MetricId)
            .Select(metric => new SafehouseMetricDto(
                metric.MetricId,
                metric.MetricId,
                metric.SafehouseId,
                metric.MonthStart?.ToString("yyyy-MM-dd"),
                metric.MonthStart?.ToString("yyyy-MM-dd"),
                metric.MonthEnd?.ToString("yyyy-MM-dd"),
                metric.ActiveResidents,
                null,
                null,
                metric.AvgEducationProgress,
                metric.AvgHealthScore,
                metric.ProcessRecordingCount,
                metric.HomeVisitationCount,
                metric.HomeVisitationCount,
                metric.IncidentCount,
                metric.Notes,
                metric.CompositeHealthScore,
                metric.PeerRank,
                metric.HealthBand,
                metric.TrendDirection,
                metric.HealthScoreDrivers,
                metric.IncidentSeverityDistribution,
                metric.HealthScoreComputedAt?.ToUniversalTime().ToString("O"),
                metric.HealthScoreRunId))
            .ToList();
    }

    private static SafehouseResponseDto Map(Safehouse safehouse)
    {
        var location = BuildLocation(safehouse);
        return new SafehouseResponseDto(
            safehouse.SafehouseId,
            safehouse.SafehouseId,
            safehouse.SafehouseCode,
            safehouse.Name,
            safehouse.Region,
            safehouse.City,
            safehouse.Province,
            safehouse.Country,
            location,
            safehouse.OpenDate?.ToString("yyyy-MM-dd"),
            safehouse.Status,
            safehouse.CapacityGirls,
            safehouse.CapacityStaff,
            safehouse.CapacityGirls,
            safehouse.CurrentOccupancy,
            safehouse.Notes,
            safehouse.Notes,
            null,
            null,
            null,
            null,
            null);
    }

    private static string? BuildLocation(Safehouse safehouse)
    {
        var parts = new[] { safehouse.City, safehouse.Province, safehouse.Country }
            .Where(static value => !string.IsNullOrWhiteSpace(value))
            .ToArray();

        if (parts.Length > 0)
        {
            return string.Join(", ", parts);
        }

        return !string.IsNullOrWhiteSpace(safehouse.Region) ? safehouse.Region : null;
    }

    private static int ResolvePageSize(int? pageSize, int? limit)
    {
        var resolved = pageSize ?? limit ?? 20;
        return Math.Clamp(resolved, 1, 100);
    }
}
