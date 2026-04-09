using backend.intex.DTOs.Common;
using backend.intex.DTOs.Residents;
using backend.intex.Infrastructure.Auth;
using backend.intex.Services.Abstractions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.intex.Controllers;

[Authorize(Policy = PolicyNames.StaffOrAbove)]
[Route("residents")]
public sealed class ResidentsController(IResidentService residentService, IUserScopeService userScopeService) : ApiControllerBase
{
    [HttpGet("stats")]
    [ProducesResponseType<ResidentStatsResponseDto>(StatusCodes.Status200OK)]
    public async Task<ActionResult<ResidentStatsResponseDto>> GetStats(CancellationToken cancellationToken)
        => Ok(await residentService.GetStatsAsync(User.GetRole(), await userScopeService.GetAssignedSafehousesAsync(User, cancellationToken), cancellationToken));

    [HttpGet("{id:long}/timeline")]
    [ProducesResponseType<IReadOnlyList<ResidentTimelineEventDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IReadOnlyList<ResidentTimelineEventDto>>> GetTimeline(long id, CancellationToken cancellationToken)
    {
        var timeline = await residentService.GetTimelineAsync(id, User.GetRole(), await userScopeService.GetAssignedSafehousesAsync(User, cancellationToken), cancellationToken);
        return timeline is null ? NotFound(new ErrorResponse("Not found")) : Ok(timeline);
    }

    [HttpGet]
    [ProducesResponseType<StandardPagedResponse<ResidentResponseDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<StandardPagedResponse<ResidentResponseDto>>> ListResidents([FromQuery] ListResidentsQuery query, CancellationToken cancellationToken)
        => Ok(await residentService.ListResidentsAsync(query, User.GetRole(), await userScopeService.GetAssignedSafehousesAsync(User, cancellationToken), cancellationToken));

    [HttpPost]
    [ProducesResponseType<ResidentResponseDto>(StatusCodes.Status201Created)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ResidentResponseDto>> CreateResident([FromBody] CreateResidentRequest request, CancellationToken cancellationToken)
    {
        var result = await residentService.CreateResidentAsync(request, User.GetRole(), await userScopeService.GetAssignedSafehousesAsync(User, cancellationToken), cancellationToken);
        return result.Resident is null
            ? BadRequest(new ErrorResponse(result.ErrorMessage ?? "Failed to create resident"))
            : StatusCode(StatusCodes.Status201Created, result.Resident);
    }

    [HttpGet("{id:long}")]
    [ProducesResponseType<ResidentResponseDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ResidentResponseDto>> GetResident(long id, CancellationToken cancellationToken)
    {
        var resident = await residentService.GetResidentAsync(id, User.GetRole(), await userScopeService.GetAssignedSafehousesAsync(User, cancellationToken), cancellationToken);
        return resident is null ? NotFound(new ErrorResponse("Not found")) : Ok(resident);
    }

    [HttpPatch("{id:long}")]
    [ProducesResponseType<ResidentResponseDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ResidentResponseDto>> UpdateResident(long id, [FromBody] UpdateResidentRequest request, CancellationToken cancellationToken)
    {
        var result = await residentService.UpdateResidentAsync(id, request, User.GetRole(), await userScopeService.GetAssignedSafehousesAsync(User, cancellationToken), cancellationToken);
        if (result.Resident is not null)
        {
            return Ok(result.Resident);
        }

        return result.ErrorMessage == "safehouseId is outside your allowed scope"
            ? BadRequest(new ErrorResponse(result.ErrorMessage))
            : NotFound(new ErrorResponse(result.ErrorMessage ?? "Not found"));
    }

    [Authorize(Policy = PolicyNames.AdminOrAbove)]
    [HttpDelete("{id:long}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteResident(long id, CancellationToken cancellationToken)
    {
        var deleted = await residentService.DeleteResidentAsync(id, User.GetRole(), await userScopeService.GetAssignedSafehousesAsync(User, cancellationToken), cancellationToken);
        return deleted ? NoContent() : NotFound(new ErrorResponse("Not found"));
    }
}
