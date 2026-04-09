using backend.intex.DTOs.Common;
using backend.intex.DTOs.Records;
using backend.intex.Infrastructure.Auth;
using backend.intex.Services.Abstractions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.intex.Controllers;

[Authorize(Policy = PolicyNames.StaffOrAbove)]
[Route("health-records")]
public sealed class HealthRecordsController(IResidentRecordService service, IUserScopeService userScopeService) : ApiControllerBase
{
    [HttpGet]
    [ProducesResponseType<StandardPagedResponse<HealthRecordResponseDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<StandardPagedResponse<HealthRecordResponseDto>>> List([FromQuery] ListHealthRecordsQuery query, CancellationToken cancellationToken)
        => Ok(await service.ListHealthRecordsAsync(query, User.GetRole(), await userScopeService.GetAssignedSafehousesAsync(User, cancellationToken), cancellationToken));

    [HttpGet("{id:long}")]
    [ProducesResponseType<HealthRecordResponseDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<HealthRecordResponseDto>> Get(long id, CancellationToken cancellationToken)
    {
        var item = await service.GetHealthRecordAsync(id, User.GetRole(), await userScopeService.GetAssignedSafehousesAsync(User, cancellationToken), cancellationToken);
        return item is null ? NotFound(new ErrorResponse("Not found")) : Ok(item);
    }

    [HttpPost]
    [ProducesResponseType<HealthRecordResponseDto>(StatusCodes.Status201Created)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<HealthRecordResponseDto>> Create([FromBody] CreateHealthRecordRequest request, CancellationToken cancellationToken)
    {
        var result = await service.CreateHealthRecordAsync(request, User.GetRole(), await userScopeService.GetAssignedSafehousesAsync(User, cancellationToken), cancellationToken);
        return result.Record is null
            ? BadRequest(new ErrorResponse(result.ErrorMessage ?? "Failed to create health record"))
            : StatusCode(StatusCodes.Status201Created, result.Record);
    }

    [HttpPatch("{id:long}")]
    [ProducesResponseType<HealthRecordResponseDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<HealthRecordResponseDto>> Update(long id, [FromBody] UpdateHealthRecordRequest request, CancellationToken cancellationToken)
    {
        var result = await service.UpdateHealthRecordAsync(id, request, User.GetRole(), await userScopeService.GetAssignedSafehousesAsync(User, cancellationToken), cancellationToken);
        if (result.Record is not null)
        {
            return Ok(result.Record);
        }

        return result.ErrorMessage == "Not found"
            ? NotFound(new ErrorResponse("Not found"))
            : BadRequest(new ErrorResponse(result.ErrorMessage ?? "Failed to update health record"));
    }

    [HttpDelete("{id:long}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(long id, CancellationToken cancellationToken)
    {
        var deleted = await service.DeleteHealthRecordAsync(id, User.GetRole(), await userScopeService.GetAssignedSafehousesAsync(User, cancellationToken), cancellationToken);
        return deleted ? NoContent() : NotFound(new ErrorResponse("Not found"));
    }
}
