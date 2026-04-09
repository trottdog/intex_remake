using System.Globalization;
using backend.intex.DTOs.Campaigns;
using backend.intex.DTOs.Common;
using backend.intex.Entities.Database;
using backend.intex.Infrastructure.Auth;
using backend.intex.Repositories.Abstractions;
using backend.intex.Services.Abstractions;

namespace backend.intex.Services.Campaigns;

public sealed class CampaignService(ICampaignRepository campaignRepository, IDonationRepository donationRepository) : ICampaignService
{
    public async Task<ListResponse<CampaignResponseDto>> ListCampaignsAsync(string? role, CancellationToken cancellationToken = default)
    {
        var showAll = role is BeaconRoles.SuperAdmin or BeaconRoles.Admin or BeaconRoles.Staff;
        var campaigns = await campaignRepository.ListCampaignsAsync(showAll, cancellationToken);
        return new ListResponse<CampaignResponseDto>(campaigns.Select(MapCampaign).ToList(), campaigns.Count);
    }

    public async Task<CampaignResponseDto?> GetCampaignAsync(long campaignId, CancellationToken cancellationToken = default)
    {
        var campaign = await campaignRepository.GetCampaignAsync(campaignId, cancellationToken);
        return campaign is null ? null : MapCampaign(campaign);
    }

    public async Task<(CampaignResponseDto? Campaign, string? ErrorMessage)> CreateCampaignAsync(CreateCampaignRequest request, int? currentUserId, CancellationToken cancellationToken = default)
    {
        var title = request.Title?.Trim();
        if (string.IsNullOrWhiteSpace(title))
        {
            return (null, "Title is required");
        }

        var created = await campaignRepository.CreateCampaignAsync(new Campaign
        {
            Title = title,
            Description = NormalizeNullableText(request.Description),
            Category = NormalizeNullableText(request.Category),
            Goal = request.Goal.HasValue ? decimal.Round(request.Goal.Value, 2) : null,
            Deadline = request.Deadline,
            Status = string.IsNullOrWhiteSpace(request.Status) ? "draft" : request.Status,
            CreatedBy = currentUserId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        }, cancellationToken);

        var campaign = await campaignRepository.GetCampaignAsync(created.CampaignId, cancellationToken);
        return campaign is null ? (MapCampaign(created), null) : (MapCampaign(campaign), null);
    }

    public async Task<(CampaignResponseDto? Campaign, string? ErrorMessage)> UpdateCampaignAsync(long campaignId, UpdateCampaignRequest request, CancellationToken cancellationToken = default)
    {
        if (request.Fields.TryGetValue("title", out var titleField) &&
            (titleField.ValueKind != System.Text.Json.JsonValueKind.String || string.IsNullOrWhiteSpace(titleField.GetString())))
        {
            return (null, "Title is required");
        }

        var updated = await campaignRepository.UpdateCampaignAsync(campaignId, request.Fields, cancellationToken);
        if (updated is null)
        {
            return (null, "Campaign not found");
        }

        var campaign = await campaignRepository.GetCampaignAsync(campaignId, cancellationToken);
        return campaign is null ? (MapCampaign(updated), null) : (MapCampaign(campaign), null);
    }

    public Task DeleteCampaignAsync(long campaignId, CancellationToken cancellationToken = default) =>
        campaignRepository.DeleteCampaignAsync(campaignId, cancellationToken);

    public async Task<(CampaignDonateResponse? Response, string? ErrorMessage, int? StatusCode)> DonateAsync(long campaignId, long? supporterId, CampaignDonateRequest request, CancellationToken cancellationToken = default)
    {
        if (!request.Amount.HasValue || request.Amount.Value <= 0)
        {
            return (null, "A valid positive amount is required", StatusCodes.Status400BadRequest);
        }

        if (!supporterId.HasValue)
        {
            return (null, "No donor profile linked to this account", StatusCodes.Status400BadRequest);
        }

        var campaign = await campaignRepository.GetCampaignAsync(campaignId, cancellationToken);
        if (campaign is null || !string.Equals(campaign.Status, "active", StringComparison.Ordinal))
        {
            return (null, "Campaign not found or not accepting donations", StatusCodes.Status404NotFound);
        }

        var amount = decimal.Round(request.Amount.Value, 2);
        var donation = await donationRepository.CreateDonationAsync(new Donation
        {
            SupporterId = supporterId.Value,
            CampaignId = campaign.CampaignId,
            CampaignName = campaign.Title,
            DonationType = "monetary",
            DonationDate = DateOnly.FromDateTime(DateTime.UtcNow),
            IsRecurring = false,
            ChannelSource = string.IsNullOrWhiteSpace(request.ChannelSource) ? "online" : request.ChannelSource,
            CurrencyCode = string.IsNullOrWhiteSpace(request.CurrencyCode) ? "PHP" : request.CurrencyCode,
            Amount = amount,
            Notes = NormalizeNullableText(request.Notes)
        }, cancellationToken);

        return (new CampaignDonateResponse(
            donation.DonationId,
            campaign.CampaignId,
            campaign.Title,
            amount,
            $"Thank you! Your donation of ₱{amount.ToString("#,0.##", CultureInfo.InvariantCulture)} to \"{campaign.Title}\" has been recorded."),
            null,
            StatusCodes.Status201Created);
    }

    private static CampaignResponseDto MapCampaign(Campaign campaign) =>
        new(
            campaign.CampaignId,
            campaign.Title,
            campaign.Description,
            campaign.Category,
            campaign.Goal.HasValue ? decimal.Round(campaign.Goal.Value, 2) : null,
            campaign.Deadline?.ToString("yyyy-MM-dd"),
            campaign.Status ?? string.Empty,
            campaign.CreatedBy,
            FormatTimestamp(campaign.CreatedAt),
            FormatTimestamp(campaign.UpdatedAt),
            0m,
            0);

    private static CampaignResponseDto MapCampaign(CampaignAggregateRecord campaign) =>
        new(
            campaign.CampaignId,
            campaign.Title,
            campaign.Description,
            campaign.Category,
            campaign.Goal.HasValue ? decimal.Round(campaign.Goal.Value, 2) : null,
            campaign.Deadline?.ToString("yyyy-MM-dd"),
            campaign.Status ?? string.Empty,
            campaign.CreatedBy,
            FormatTimestamp(campaign.CreatedAt),
            FormatTimestamp(campaign.UpdatedAt),
            decimal.Round(campaign.TotalRaised, 2),
            campaign.DonorCount);

    private static string? FormatTimestamp(DateTime? value) =>
        value?.ToUniversalTime().ToString("O");

    private static string? NormalizeNullableText(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
