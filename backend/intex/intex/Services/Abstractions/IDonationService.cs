using backend.intex.DTOs.Common;
using backend.intex.DTOs.Donations;

namespace backend.intex.Services.Abstractions;

public interface IDonationService
{
    Task<StandardPagedResponse<DonationResponseDto>> ListMyLedgerAsync(long? supporterId, ListDonationLedgerQuery query, CancellationToken cancellationToken = default);
    Task<DonationTrendsResponse> GetDonationTrendsAsync(int months, CancellationToken cancellationToken = default);
    Task<StandardPagedResponse<DonationResponseDto>> ListDonationsAsync(ListDonationsQuery query, string? role, IReadOnlyList<long> assignedSafehouses, CancellationToken cancellationToken = default);
    Task<DonationResponseDto?> GetDonationAsync(long donationId, string? role, IReadOnlyList<long> assignedSafehouses, CancellationToken cancellationToken = default);
    Task<DonationResponseDto> CreateDonationAsync(CreateDonationRequest request, CancellationToken cancellationToken = default);
    Task<DonationResponseDto?> UpdateDonationAsync(long donationId, UpdateDonationRequest request, CancellationToken cancellationToken = default);
    Task<bool> DeleteDonationAsync(long donationId, CancellationToken cancellationToken = default);
    Task<(DonationWithMessageResponse? Response, string? ErrorMessage)> GiveDonationAsync(long? supporterId, GiveDonationRequest request, CancellationToken cancellationToken = default);
    Task<(PublicDonationResponse? Response, string? ErrorMessage)> CreatePublicDonationAsync(PublicDonationRequest request, CancellationToken cancellationToken = default);
    Task<DonationAllocationsResponse> ListDonationAllocationsAsync(ListDonationAllocationsQuery query, string? role, IReadOnlyList<long> assignedSafehouses, CancellationToken cancellationToken = default);
    Task<(DonationAllocationResponseDto? Response, string? ErrorMessage)> CreateDonationAllocationAsync(CreateDonationAllocationRequest request, string? role, IReadOnlyList<long> assignedSafehouses, CancellationToken cancellationToken = default);
    Task<bool> DeleteDonationAllocationAsync(long allocationId, string? role, IReadOnlyList<long> assignedSafehouses, CancellationToken cancellationToken = default);
}
