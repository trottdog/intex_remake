using backend.intex.DTOs.Campaigns;
using backend.intex.DTOs.Common;
using backend.intex.Infrastructure.Auth;
using backend.intex.Services.Abstractions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.intex.Controllers;

[Authorize]
[Route("campaigns")]
public sealed class CampaignsController(ICampaignService campaignService) : ApiControllerBase
{
    [HttpGet]
    [ProducesResponseType<ListResponse<CampaignResponseDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<ListResponse<CampaignResponseDto>>> ListCampaigns(CancellationToken cancellationToken)
        => Ok(await campaignService.ListCampaignsAsync(User.GetRole(), cancellationToken));

    [HttpGet("{id:long}")]
    [ProducesResponseType<CampaignResponseDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CampaignResponseDto>> GetCampaign(long id, CancellationToken cancellationToken)
    {
        var campaign = await campaignService.GetCampaignAsync(id, cancellationToken);
        return campaign is null ? NotFound(new ErrorResponse("Campaign not found")) : Ok(campaign);
    }

    [Authorize(Policy = PolicyNames.SuperAdminOnly)]
    [HttpPost]
    [ProducesResponseType<CampaignResponseDto>(StatusCodes.Status201Created)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<CampaignResponseDto>> CreateCampaign([FromBody] CreateCampaignRequest request, CancellationToken cancellationToken)
    {
        var result = await campaignService.CreateCampaignAsync(request, User.GetUserId(), cancellationToken);
        return result.Campaign is null
            ? BadRequest(new ErrorResponse(result.ErrorMessage ?? "Failed to create campaign"))
            : StatusCode(StatusCodes.Status201Created, result.Campaign);
    }

    [Authorize(Policy = PolicyNames.SuperAdminOnly)]
    [HttpPatch("{id:long}")]
    [ProducesResponseType<CampaignResponseDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CampaignResponseDto>> UpdateCampaign(long id, [FromBody] UpdateCampaignRequest request, CancellationToken cancellationToken)
    {
        var result = await campaignService.UpdateCampaignAsync(id, request, cancellationToken);
        if (result.Campaign is not null)
        {
            return Ok(result.Campaign);
        }

        return result.ErrorMessage == "Title is required"
            ? BadRequest(new ErrorResponse(result.ErrorMessage))
            : NotFound(new ErrorResponse(result.ErrorMessage ?? "Campaign not found"));
    }

    [Authorize(Policy = PolicyNames.SuperAdminOnly)]
    [HttpDelete("{id:long}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> DeleteCampaign(long id, CancellationToken cancellationToken)
    {
        await campaignService.DeleteCampaignAsync(id, cancellationToken);
        return NoContent();
    }

    [Authorize(Policy = PolicyNames.DonorOnly)]
    [HttpPost("{id:long}/donate")]
    [ProducesResponseType<CampaignDonateResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CampaignDonateResponse>> Donate(long id, [FromBody] CampaignDonateRequest request, CancellationToken cancellationToken)
    {
        var result = await campaignService.DonateAsync(id, User.GetSupporterId(), request, cancellationToken);
        if (result.Response is not null)
        {
            return StatusCode(result.StatusCode ?? StatusCodes.Status201Created, result.Response);
        }

        return result.StatusCode == StatusCodes.Status404NotFound
            ? NotFound(new ErrorResponse(result.ErrorMessage ?? "Campaign not found or not accepting donations"))
            : BadRequest(new ErrorResponse(result.ErrorMessage ?? "Failed to process donation"));
    }
}
