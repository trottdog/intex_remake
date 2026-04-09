using backend.intex.DTOs.Common;
using backend.intex.DTOs.Safehouses;

namespace backend.intex.Services.Abstractions;

public interface ISafehouseService
{
    Task<PublicSafehouseListResponse> ListPublicSafehousesAsync(CancellationToken cancellationToken = default);
    Task<StandardPagedResponse<SafehouseResponseDto>> ListSafehousesAsync(ListSafehousesQuery query, CancellationToken cancellationToken = default);
    Task<SafehouseResponseDto?> GetSafehouseAsync(long safehouseId, CancellationToken cancellationToken = default);
    Task<SafehouseResponseDto> CreateSafehouseAsync(CreateSafehouseRequest request, CancellationToken cancellationToken = default);
    Task<SafehouseResponseDto?> UpdateSafehouseAsync(long safehouseId, UpdateSafehouseRequest request, CancellationToken cancellationToken = default);
    Task DeleteSafehouseAsync(long safehouseId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<SafehouseMetricDto>> GetSafehouseMetricsAsync(long safehouseId, int months, CancellationToken cancellationToken = default);
}
