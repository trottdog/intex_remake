using System.Text.Json;
using backend.intex.Entities.Database;

namespace backend.intex.Repositories.Abstractions;

public interface ISafehouseRepository
{
    Task<IReadOnlyList<Safehouse>> ListPublicSafehousesAsync(CancellationToken cancellationToken = default);
    Task<(IReadOnlyList<Safehouse> Safehouses, int Total)> ListSafehousesAsync(int page, int pageSize, CancellationToken cancellationToken = default);
    Task<Safehouse?> GetSafehouseByIdAsync(long safehouseId, CancellationToken cancellationToken = default);
    Task<Safehouse> CreateSafehouseAsync(Safehouse safehouse, CancellationToken cancellationToken = default);
    Task<Safehouse?> UpdateSafehouseAsync(long safehouseId, IReadOnlyDictionary<string, JsonElement> fields, CancellationToken cancellationToken = default);
    Task DeleteSafehouseIfExistsAsync(long safehouseId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<SafehouseMonthlyMetric>> ListMetricsAsync(long safehouseId, int months, CancellationToken cancellationToken = default);
}
