using System.Text.Json;
using backend.intex.Entities.Database;

namespace backend.intex.Repositories.Abstractions;

public interface IResidentRepository
{
    Task<(IReadOnlyList<Resident> Residents, int Total)> ListResidentsAsync(int page, int pageSize, long? safehouseId, string? caseStatus, IReadOnlyList<long> allowedSafehouses, bool enforceSafehouseScope, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Resident>> ListResidentsForStatsAsync(long? safehouseId, IReadOnlyList<long> allowedSafehouses, bool enforceSafehouseScope, CancellationToken cancellationToken = default);
    Task<Resident?> GetResidentAsync(long residentId, IReadOnlyList<long> allowedSafehouses, bool enforceSafehouseScope, CancellationToken cancellationToken = default);
    Task<Resident> CreateResidentAsync(IReadOnlyDictionary<string, JsonElement> fields, CancellationToken cancellationToken = default);
    Task<Resident?> UpdateResidentAsync(long residentId, IReadOnlyDictionary<string, JsonElement> fields, CancellationToken cancellationToken = default);
    Task<bool> DeleteResidentAsync(long residentId, CancellationToken cancellationToken = default);
    Task<IReadOnlyDictionary<long, string?>> GetSafehouseNamesAsync(IReadOnlyList<long> safehouseIds, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<ResidentTimelineRecord>> GetResidentTimelineAsync(long residentId, CancellationToken cancellationToken = default);
}

public sealed record ResidentTimelineRecord(
    string Id,
    string EventType,
    DateOnly? EventDate,
    string Title,
    string? Description,
    string? Severity
);
