using backend.intex.DTOs.CaseManagement;
using backend.intex.DTOs.Common;
using backend.intex.Infrastructure.Auth;
using backend.intex.Services.Abstractions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.intex.Controllers;

[Authorize(Policy = PolicyNames.StaffOrAbove)]
[Route("home-visitations")]
public sealed class HomeVisitationsController(ICaseManagementService service, IUserScopeService userScopeService) : ApiControllerBase
{
    [HttpGet]
    [ProducesResponseType<StandardPagedResponse<HomeVisitationResponseDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<StandardPagedResponse<HomeVisitationResponseDto>>> List([FromQuery] ListHomeVisitationsQuery query, CancellationToken cancellationToken)
        => Ok(await service.ListHomeVisitationsAsync(query, User.GetRole(), await userScopeService.GetAssignedSafehousesAsync(User, cancellationToken), cancellationToken));

    [HttpGet("{id:long}")]
    [ProducesResponseType<HomeVisitationResponseDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<HomeVisitationResponseDto>> Get(long id, CancellationToken cancellationToken)
    {
        var item = await service.GetHomeVisitationAsync(id, User.GetRole(), await userScopeService.GetAssignedSafehousesAsync(User, cancellationToken), cancellationToken);
        return item is null ? NotFound(new ErrorResponse("Not found")) : Ok(item);
    }

    [HttpPost]
    [ProducesResponseType<HomeVisitationResponseDto>(StatusCodes.Status201Created)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<HomeVisitationResponseDto>> Create([FromBody] CreateHomeVisitationRequest request, CancellationToken cancellationToken)
    {
        var result = await service.CreateHomeVisitationAsync(request, User.GetRole(), await userScopeService.GetAssignedSafehousesAsync(User, cancellationToken), cancellationToken);
        return result.Visitation is null
            ? BadRequest(new ErrorResponse(result.ErrorMessage ?? "Failed to create home visitation"))
            : StatusCode(StatusCodes.Status201Created, result.Visitation);
    }

    [HttpPatch("{id:long}")]
    [ProducesResponseType<HomeVisitationResponseDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<HomeVisitationResponseDto>> Update(long id, [FromBody] UpdateHomeVisitationRequest request, CancellationToken cancellationToken)
    {
        var result = await service.UpdateHomeVisitationAsync(id, request, User.GetRole(), await userScopeService.GetAssignedSafehousesAsync(User, cancellationToken), cancellationToken);
        if (result.Visitation is not null)
        {
            return Ok(result.Visitation);
        }

        return result.ErrorMessage == "Not found"
            ? NotFound(new ErrorResponse("Not found"))
            : BadRequest(new ErrorResponse(result.ErrorMessage ?? "Failed to update home visitation"));
    }

    [HttpDelete("{id:long}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(long id, CancellationToken cancellationToken)
    {
        var deleted = await service.DeleteHomeVisitationAsync(id, User.GetRole(), await userScopeService.GetAssignedSafehousesAsync(User, cancellationToken), cancellationToken);
        return deleted ? NoContent() : NotFound(new ErrorResponse("Not found"));
    }
}
