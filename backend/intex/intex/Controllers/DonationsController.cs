using backend.intex.DTOs.Common;
using backend.intex.DTOs.Donations;
using backend.intex.Infrastructure.Auth;
using backend.intex.Services.Abstractions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.intex.Controllers;

[Route("donations")]
public sealed class DonationsController(IDonationService donationService) : ApiControllerBase
{
    [Authorize(Policy = PolicyNames.DonorOnly)]
    [HttpGet("my-ledger")]
    [ProducesResponseType<StandardPagedResponse<DonationResponseDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<StandardPagedResponse<DonationResponseDto>>> GetMyLedger([FromQuery] ListDonationLedgerQuery query, CancellationToken cancellationToken)
        => Ok(await donationService.ListMyLedgerAsync(User.GetSupporterId(), query, cancellationToken));

    [Authorize(Policy = PolicyNames.StaffOrAbove)]
    [HttpGet("trends")]
    [ProducesResponseType<DonationTrendsResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<DonationTrendsResponse>> GetTrends([FromQuery] DonationTrendsQuery query, CancellationToken cancellationToken)
        => Ok(await donationService.GetDonationTrendsAsync(query.Months, cancellationToken));

    [Authorize(Policy = PolicyNames.StaffOrAbove)]
    [HttpGet]
    [ProducesResponseType<StandardPagedResponse<DonationResponseDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<StandardPagedResponse<DonationResponseDto>>> ListDonations([FromQuery] ListDonationsQuery query, CancellationToken cancellationToken)
        => Ok(await donationService.ListDonationsAsync(query, User.GetRole(), User.GetAssignedSafehouseIds(), cancellationToken));

    [Authorize(Policy = PolicyNames.StaffOrAbove)]
    [HttpPost]
    [ProducesResponseType<DonationResponseDto>(StatusCodes.Status201Created)]
    public async Task<ActionResult<DonationResponseDto>> CreateDonation([FromBody] CreateDonationRequest request, CancellationToken cancellationToken)
    {
        var created = await donationService.CreateDonationAsync(request, cancellationToken);
        return StatusCode(StatusCodes.Status201Created, created);
    }

    [Authorize]
    [HttpGet("{id:long}")]
    [ProducesResponseType<DonationResponseDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<DonationResponseDto>> GetDonation(long id, CancellationToken cancellationToken)
    {
        var donation = await donationService.GetDonationAsync(id, User.GetRole(), User.GetAssignedSafehouseIds(), cancellationToken);
        return donation is null ? NotFound(new ErrorResponse("Not found")) : Ok(donation);
    }

    [Authorize(Policy = PolicyNames.StaffOrAbove)]
    [HttpPatch("{id:long}")]
    [ProducesResponseType<DonationResponseDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<DonationResponseDto>> UpdateDonation(long id, [FromBody] UpdateDonationRequest request, CancellationToken cancellationToken)
    {
        var updated = await donationService.UpdateDonationAsync(id, request, cancellationToken);
        return updated is null ? NotFound(new ErrorResponse("Not found")) : Ok(updated);
    }

    [Authorize(Policy = PolicyNames.AdminOrAbove)]
    [HttpDelete("{id:long}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteDonation(long id, CancellationToken cancellationToken)
    {
        var deleted = await donationService.DeleteDonationAsync(id, cancellationToken);
        return deleted ? NoContent() : NotFound(new ErrorResponse("Not found"));
    }

    [Authorize(Policy = PolicyNames.DonorOnly)]
    [HttpPost("give")]
    [ProducesResponseType<DonationWithMessageResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<DonationWithMessageResponse>> Give([FromBody] GiveDonationRequest request, CancellationToken cancellationToken)
    {
        var result = await donationService.GiveDonationAsync(User.GetSupporterId(), request, cancellationToken);
        return result.Response is null
            ? BadRequest(new ErrorResponse(result.ErrorMessage ?? "Failed to record donation"))
            : StatusCode(StatusCodes.Status201Created, result.Response);
    }

    [AllowAnonymous]
    [HttpPost("public")]
    [ProducesResponseType<PublicDonationResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<PublicDonationResponse>> PublicDonate([FromBody] PublicDonationRequest request, CancellationToken cancellationToken)
    {
        var result = await donationService.CreatePublicDonationAsync(request, cancellationToken);
        return result.Response is null
            ? BadRequest(new ErrorResponse(result.ErrorMessage ?? "Failed to record donation"))
            : StatusCode(StatusCodes.Status201Created, result.Response);
    }
}
