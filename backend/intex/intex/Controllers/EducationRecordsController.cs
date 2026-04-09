using backend.intex.DTOs.Common;
using backend.intex.DTOs.Records;
using backend.intex.Infrastructure.Auth;
using backend.intex.Services.Abstractions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.intex.Controllers;

[Authorize(Policy = PolicyNames.StaffOrAbove)]
[Route("education-records")]
public sealed class EducationRecordsController(IResidentRecordService service, IUserScopeService userScopeService) : ApiControllerBase
{
    [HttpGet]
    [ProducesResponseType<StandardPagedResponse<EducationRecordResponseDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<StandardPagedResponse<EducationRecordResponseDto>>> List([FromQuery] ListEducationRecordsQuery query, CancellationToken cancellationToken)
        => Ok(await service.ListEducationRecordsAsync(query, User.GetRole(), await userScopeService.GetAssignedSafehousesAsync(User, cancellationToken), cancellationToken));

    [HttpGet("{id:long}")]
    [ProducesResponseType<EducationRecordResponseDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<EducationRecordResponseDto>> Get(long id, CancellationToken cancellationToken)
    {
        var item = await service.GetEducationRecordAsync(id, User.GetRole(), await userScopeService.GetAssignedSafehousesAsync(User, cancellationToken), cancellationToken);
        return item is null ? NotFound(new ErrorResponse("Not found")) : Ok(item);
    }

    [HttpPost]
    [ProducesResponseType<EducationRecordResponseDto>(StatusCodes.Status201Created)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<EducationRecordResponseDto>> Create([FromBody] CreateEducationRecordRequest request, CancellationToken cancellationToken)
    {
        var result = await service.CreateEducationRecordAsync(request, User.GetRole(), await userScopeService.GetAssignedSafehousesAsync(User, cancellationToken), cancellationToken);
        return result.Record is null
            ? BadRequest(new ErrorResponse(result.ErrorMessage ?? "Failed to create education record"))
            : StatusCode(StatusCodes.Status201Created, result.Record);
    }

    [HttpPatch("{id:long}")]
    [ProducesResponseType<EducationRecordResponseDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<EducationRecordResponseDto>> Update(long id, [FromBody] UpdateEducationRecordRequest request, CancellationToken cancellationToken)
    {
        var result = await service.UpdateEducationRecordAsync(id, request, User.GetRole(), await userScopeService.GetAssignedSafehousesAsync(User, cancellationToken), cancellationToken);
        if (result.Record is not null)
        {
            return Ok(result.Record);
        }

        return result.ErrorMessage == "Not found"
            ? NotFound(new ErrorResponse("Not found"))
            : BadRequest(new ErrorResponse(result.ErrorMessage ?? "Failed to update education record"));
    }

    [HttpDelete("{id:long}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(long id, CancellationToken cancellationToken)
    {
        var deleted = await service.DeleteEducationRecordAsync(id, User.GetRole(), await userScopeService.GetAssignedSafehousesAsync(User, cancellationToken), cancellationToken);
        return deleted ? NoContent() : NotFound(new ErrorResponse("Not found"));
    }
}
