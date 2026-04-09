using backend.intex.DTOs.CaseManagement;
using backend.intex.DTOs.Common;
using backend.intex.Infrastructure.Auth;
using backend.intex.Services.Abstractions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.intex.Controllers;

[Authorize(Policy = PolicyNames.StaffOrAbove)]
[Route("process-recordings")]
public sealed class ProcessRecordingsController(ICaseManagementService service, IUserScopeService userScopeService) : ApiControllerBase
{
    [HttpGet]
    [ProducesResponseType<StandardPagedResponse<ProcessRecordingResponseDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<StandardPagedResponse<ProcessRecordingResponseDto>>> List([FromQuery] ListProcessRecordingsQuery query, CancellationToken cancellationToken)
        => Ok(await service.ListProcessRecordingsAsync(query, User.GetRole(), await userScopeService.GetAssignedSafehousesAsync(User, cancellationToken), cancellationToken));

    [HttpGet("{id:long}")]
    [ProducesResponseType<ProcessRecordingResponseDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ProcessRecordingResponseDto>> Get(long id, CancellationToken cancellationToken)
    {
        var item = await service.GetProcessRecordingAsync(id, User.GetRole(), await userScopeService.GetAssignedSafehousesAsync(User, cancellationToken), cancellationToken);
        return item is null ? NotFound(new ErrorResponse("Not found")) : Ok(item);
    }

    [HttpPost]
    [ProducesResponseType<ProcessRecordingResponseDto>(StatusCodes.Status201Created)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ProcessRecordingResponseDto>> Create([FromBody] CreateProcessRecordingRequest request, CancellationToken cancellationToken)
    {
        var result = await service.CreateProcessRecordingAsync(request, User.GetRole(), await userScopeService.GetAssignedSafehousesAsync(User, cancellationToken), cancellationToken);
        return result.Recording is null
            ? BadRequest(new ErrorResponse(result.ErrorMessage ?? "Failed to create process recording"))
            : StatusCode(StatusCodes.Status201Created, result.Recording);
    }

    [HttpPatch("{id:long}")]
    [ProducesResponseType<ProcessRecordingResponseDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ProcessRecordingResponseDto>> Update(long id, [FromBody] UpdateProcessRecordingRequest request, CancellationToken cancellationToken)
    {
        var result = await service.UpdateProcessRecordingAsync(id, request, User.GetRole(), await userScopeService.GetAssignedSafehousesAsync(User, cancellationToken), cancellationToken);
        if (result.Recording is not null)
        {
            return Ok(result.Recording);
        }

        return result.ErrorMessage == "Not found"
            ? NotFound(new ErrorResponse("Not found"))
            : BadRequest(new ErrorResponse(result.ErrorMessage ?? "Failed to update process recording"));
    }

    [HttpDelete("{id:long}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(long id, CancellationToken cancellationToken)
    {
        var deleted = await service.DeleteProcessRecordingAsync(id, User.GetRole(), await userScopeService.GetAssignedSafehousesAsync(User, cancellationToken), cancellationToken);
        return deleted ? NoContent() : NotFound(new ErrorResponse("Not found"));
    }
}
