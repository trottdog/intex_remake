using backend.intex.DTOs.Campaigns;
using backend.intex.DTOs.Common;

namespace backend.intex.Services.Abstractions;

public interface ICampaignService
{
    Task<ListResponse<CampaignResponseDto>> ListCampaignsAsync(string? role, CancellationToken cancellationToken = default);
    Task<CampaignResponseDto?> GetCampaignAsync(long campaignId, CancellationToken cancellationToken = default);
    Task<(CampaignResponseDto? Campaign, string? ErrorMessage)> CreateCampaignAsync(CreateCampaignRequest request, int? currentUserId, CancellationToken cancellationToken = default);
    Task<(CampaignResponseDto? Campaign, string? ErrorMessage)> UpdateCampaignAsync(long campaignId, UpdateCampaignRequest request, CancellationToken cancellationToken = default);
    Task DeleteCampaignAsync(long campaignId, CancellationToken cancellationToken = default);
    Task<(CampaignDonateResponse? Response, string? ErrorMessage, int? StatusCode)> DonateAsync(long campaignId, long? supporterId, CampaignDonateRequest request, CancellationToken cancellationToken = default);
}
