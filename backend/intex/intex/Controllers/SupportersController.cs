using System.Security.Claims;
using backend.intex.DTOs.Common;
using backend.intex.DTOs.Supporters;
using backend.intex.Infrastructure.Auth;
using backend.intex.Services.Abstractions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.intex.Controllers;

[Authorize]
[Route("supporters")]
public sealed class SupportersController(ISupporterService supporterService) : ApiControllerBase
{
    [Authorize(Policy = PolicyNames.DonorOnly)]
    [HttpGet("me")]
    [ProducesResponseType<SupporterResponseDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SupporterResponseDto>> GetMyProfile(CancellationToken cancellationToken)
    {
        var supporterId = User.GetSupporterId();
        if (!supporterId.HasValue)
        {
            return NotFound(new ErrorResponse("Donor profile not found"));
        }

        var supporter = await supporterService.GetMyProfileAsync(supporterId.Value, cancellationToken);
        return supporter is null
            ? NotFound(new ErrorResponse("Not found"))
            : Ok(supporter);
    }

    [Authorize(Policy = PolicyNames.DonorOnly)]
    [HttpPatch("me")]
    [ProducesResponseType<SupporterResponseDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SupporterResponseDto>> UpdateMyProfile([FromBody] UpdateMySupporterProfileRequest request, CancellationToken cancellationToken)
    {
        var supporterId = User.GetSupporterId();
        if (!supporterId.HasValue)
        {
            return NotFound(new ErrorResponse("Donor profile not found"));
        }

        var result = await supporterService.UpdateMyProfileAsync(supporterId.Value, request, cancellationToken);
        if (result.ErrorMessage == "No fields to update")
        {
            return BadRequest(new ErrorResponse(result.ErrorMessage));
        }

        if (result.Supporter is null)
        {
            return NotFound(new ErrorResponse(result.ErrorMessage ?? "Not found"));
        }

        return Ok(result.Supporter);
    }

    [Authorize(Policy = PolicyNames.DonorOnly)]
    [HttpGet("me/recurring")]
    [ProducesResponseType<RecurringStatusResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<RecurringStatusResponse>> GetRecurringStatus(CancellationToken cancellationToken)
    {
        var supporterId = User.GetSupporterId();
        if (!supporterId.HasValue)
        {
            return NotFound(new ErrorResponse("Donor profile not found"));
        }

        var response = await supporterService.GetRecurringStatusAsync(supporterId.Value, cancellationToken);
        return response is null
            ? NotFound(new ErrorResponse("Not found"))
            : Ok(response);
    }

    [Authorize(Policy = PolicyNames.DonorOnly)]
    [HttpPatch("me/recurring")]
    [ProducesResponseType<RecurringStatusResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<RecurringStatusResponse>> UpdateRecurringStatus([FromBody] UpdateRecurringRequest request, CancellationToken cancellationToken)
    {
        var supporterId = User.GetSupporterId();
        if (!supporterId.HasValue)
        {
            return NotFound(new ErrorResponse("Donor profile not found"));
        }

        var result = await supporterService.UpdateRecurringStatusAsync(supporterId.Value, request, cancellationToken);
        if (result.ErrorMessage == "recurringEnabled must be a boolean")
        {
            return BadRequest(new ErrorResponse(result.ErrorMessage));
        }

        if (result.Response is null)
        {
            return NotFound(new ErrorResponse(result.ErrorMessage ?? "Not found"));
        }

        return Ok(result.Response);
    }

    [Authorize(Policy = PolicyNames.StaffOrAbove)]
    [HttpGet("stats")]
    [ProducesResponseType<SupporterStatsResponseDto>(StatusCodes.Status200OK)]
    public async Task<ActionResult<SupporterStatsResponseDto>> GetStats(CancellationToken cancellationToken)
        => Ok(await supporterService.GetStatsAsync(cancellationToken));

    [HttpGet("{id:long}/giving-stats")]
    [ProducesResponseType<SupporterGivingStatsDto>(StatusCodes.Status200OK)]
    public async Task<ActionResult<SupporterGivingStatsDto>> GetGivingStats(long id, CancellationToken cancellationToken)
        => Ok(await supporterService.GetGivingStatsAsync(id, cancellationToken));

    [Authorize(Policy = PolicyNames.StaffOrAbove)]
    [HttpGet]
    [ProducesResponseType<StandardPagedResponse<SupporterResponseDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<StandardPagedResponse<SupporterResponseDto>>> ListSupporters([FromQuery] ListSupportersQuery query, CancellationToken cancellationToken)
        => Ok(await supporterService.ListSupportersAsync(query, cancellationToken));

    [Authorize(Policy = PolicyNames.StaffOrAbove)]
    [HttpPost]
    [ProducesResponseType<SupporterResponseDto>(StatusCodes.Status201Created)]
    public async Task<ActionResult<SupporterResponseDto>> CreateSupporter([FromBody] CreateSupporterRequest request, CancellationToken cancellationToken)
    {
        var created = await supporterService.CreateSupporterAsync(request, cancellationToken);
        return StatusCode(StatusCodes.Status201Created, created);
    }

    [HttpGet("{id:long}")]
    [ProducesResponseType<SupporterResponseDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SupporterResponseDto>> GetSupporter(long id, CancellationToken cancellationToken)
    {
        var supporter = await supporterService.GetSupporterAsync(id, cancellationToken);
        return supporter is null ? NotFound(new ErrorResponse("Not found")) : Ok(supporter);
    }

    [Authorize(Policy = PolicyNames.StaffOrAbove)]
    [HttpPatch("{id:long}")]
    [ProducesResponseType<SupporterResponseDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SupporterResponseDto>> UpdateSupporter(long id, [FromBody] UpdateSupporterRequest request, CancellationToken cancellationToken)
    {
        var supporter = await supporterService.UpdateSupporterAsync(id, request, cancellationToken);
        return supporter is null ? NotFound(new ErrorResponse("Not found")) : Ok(supporter);
    }

    [Authorize(Policy = PolicyNames.AdminOrAbove)]
    [HttpDelete("{id:long}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> DeleteSupporter(long id, CancellationToken cancellationToken)
    {
        await supporterService.DeleteSupporterAsync(id, cancellationToken);
        return NoContent();
    }
}
