using backend.intex.DTOs.Common;
using backend.intex.DTOs.Supporters;

namespace backend.intex.Services.Abstractions;

public interface ISupporterService
{
    Task<SupporterResponseDto?> GetMyProfileAsync(long supporterId, CancellationToken cancellationToken = default);
    Task<(SupporterResponseDto? Supporter, string? ErrorMessage)> UpdateMyProfileAsync(long supporterId, UpdateMySupporterProfileRequest request, CancellationToken cancellationToken = default);
    Task<RecurringStatusResponse?> GetRecurringStatusAsync(long supporterId, CancellationToken cancellationToken = default);
    Task<(RecurringStatusResponse? Response, string? ErrorMessage)> UpdateRecurringStatusAsync(long supporterId, UpdateRecurringRequest request, CancellationToken cancellationToken = default);
    Task<SupporterStatsResponseDto> GetStatsAsync(CancellationToken cancellationToken = default);
    Task<SupporterGivingStatsDto> GetGivingStatsAsync(long supporterId, CancellationToken cancellationToken = default);
    Task<SupporterProfileResponseDto?> GetSupporterProfileAsync(long supporterId, CancellationToken cancellationToken = default);
    Task<StandardPagedResponse<SupporterResponseDto>> ListSupportersAsync(ListSupportersQuery query, CancellationToken cancellationToken = default);
    Task<SupporterResponseDto> CreateSupporterAsync(CreateSupporterRequest request, CancellationToken cancellationToken = default);
    Task<SupporterResponseDto?> GetSupporterAsync(long supporterId, CancellationToken cancellationToken = default);
    Task<SupporterResponseDto?> UpdateSupporterAsync(long supporterId, UpdateSupporterRequest request, CancellationToken cancellationToken = default);
    Task DeleteSupporterAsync(long supporterId, CancellationToken cancellationToken = default);
}
