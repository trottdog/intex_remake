using backend.intex.DTOs.CaseManagement;
using backend.intex.DTOs.Common;
using backend.intex.Infrastructure.Auth;
using backend.intex.Services.Abstractions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.intex.Controllers;

[Authorize(Policy = PolicyNames.StaffOrAbove)]
[Route("intervention-plans")]
public sealed class InterventionPlansController(ICaseManagementService service, IUserScopeService userScopeService) : ApiControllerBase
{
    [HttpGet]
    [ProducesResponseType<StandardPagedResponse<InterventionPlanResponseDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<StandardPagedResponse<InterventionPlanResponseDto>>> List([FromQuery] ListInterventionPlansQuery query, CancellationToken cancellationToken)
        => Ok(await service.ListInterventionPlansAsync(query, User.GetRole(), await userScopeService.GetAssignedSafehousesAsync(User, cancellationToken), cancellationToken));

    [HttpGet("{id:long}")]
    [ProducesResponseType<InterventionPlanResponseDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<InterventionPlanResponseDto>> Get(long id, CancellationToken cancellationToken)
    {
        var item = await service.GetInterventionPlanAsync(id, User.GetRole(), await userScopeService.GetAssignedSafehousesAsync(User, cancellationToken), cancellationToken);
        return item is null ? NotFound(new ErrorResponse("Not found")) : Ok(item);
    }

    [HttpPost]
    [ProducesResponseType<InterventionPlanResponseDto>(StatusCodes.Status201Created)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<InterventionPlanResponseDto>> Create([FromBody] CreateInterventionPlanRequest request, CancellationToken cancellationToken)
    {
        var result = await service.CreateInterventionPlanAsync(request, User.GetRole(), await userScopeService.GetAssignedSafehousesAsync(User, cancellationToken), cancellationToken);
        return result.Plan is null
            ? BadRequest(new ErrorResponse(result.ErrorMessage ?? "Failed to create intervention plan"))
            : StatusCode(StatusCodes.Status201Created, result.Plan);
    }

    [HttpPatch("{id:long}")]
    [ProducesResponseType<InterventionPlanResponseDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<InterventionPlanResponseDto>> Update(long id, [FromBody] UpdateInterventionPlanRequest request, CancellationToken cancellationToken)
    {
        var result = await service.UpdateInterventionPlanAsync(id, request, User.GetRole(), await userScopeService.GetAssignedSafehousesAsync(User, cancellationToken), cancellationToken);
        if (result.Plan is not null)
        {
            return Ok(result.Plan);
        }

        return result.ErrorMessage == "Not found"
            ? NotFound(new ErrorResponse("Not found"))
            : BadRequest(new ErrorResponse(result.ErrorMessage ?? "Failed to update intervention plan"));
    }

    [HttpDelete("{id:long}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(long id, CancellationToken cancellationToken)
    {
        var deleted = await service.DeleteInterventionPlanAsync(id, User.GetRole(), await userScopeService.GetAssignedSafehousesAsync(User, cancellationToken), cancellationToken);
        return deleted ? NoContent() : NotFound(new ErrorResponse("Not found"));
    }
}
