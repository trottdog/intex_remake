using backend.intex.DTOs.Common;
using backend.intex.DTOs.Residents;

namespace backend.intex.Services.Abstractions;

public interface IResidentService
{
    Task<ResidentStatsResponseDto> GetStatsAsync(long? safehouseId, string? role, IReadOnlyList<long> assignedSafehouses, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<ResidentTimelineEventDto>?> GetTimelineAsync(long residentId, string? role, IReadOnlyList<long> assignedSafehouses, CancellationToken cancellationToken = default);
    Task<StandardPagedResponse<ResidentResponseDto>> ListResidentsAsync(ListResidentsQuery query, string? role, IReadOnlyList<long> assignedSafehouses, CancellationToken cancellationToken = default);
    Task<(ResidentResponseDto? Resident, string? ErrorMessage)> CreateResidentAsync(CreateResidentRequest request, string? role, IReadOnlyList<long> assignedSafehouses, CancellationToken cancellationToken = default);
    Task<ResidentResponseDto?> GetResidentAsync(long residentId, string? role, IReadOnlyList<long> assignedSafehouses, CancellationToken cancellationToken = default);
    Task<(ResidentResponseDto? Resident, string? ErrorMessage)> UpdateResidentAsync(long residentId, UpdateResidentRequest request, string? role, IReadOnlyList<long> assignedSafehouses, CancellationToken cancellationToken = default);
    Task<bool> DeleteResidentAsync(long residentId, string? role, IReadOnlyList<long> assignedSafehouses, CancellationToken cancellationToken = default);
}
