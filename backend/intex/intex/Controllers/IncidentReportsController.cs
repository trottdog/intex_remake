using backend.intex.DTOs.CaseManagement;
using backend.intex.DTOs.Common;
using backend.intex.Infrastructure.Auth;
using backend.intex.Services.Abstractions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.intex.Controllers;

[Authorize(Policy = PolicyNames.StaffOrAbove)]
[Route("incident-reports")]
public sealed class IncidentReportsController(ICaseManagementService service, IUserScopeService userScopeService) : ApiControllerBase
{
    [HttpGet]
    [ProducesResponseType<StandardPagedResponse<IncidentReportResponseDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<StandardPagedResponse<IncidentReportResponseDto>>> List([FromQuery] ListIncidentReportsQuery query, CancellationToken cancellationToken)
        => Ok(await service.ListIncidentReportsAsync(query, User.GetRole(), await userScopeService.GetAssignedSafehousesAsync(User, cancellationToken), cancellationToken));

    [HttpGet("{id:long}")]
    [ProducesResponseType<IncidentReportResponseDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IncidentReportResponseDto>> Get(long id, CancellationToken cancellationToken)
    {
        var item = await service.GetIncidentReportAsync(id, User.GetRole(), await userScopeService.GetAssignedSafehousesAsync(User, cancellationToken), cancellationToken);
        return item is null ? NotFound(new ErrorResponse("Not found")) : Ok(item);
    }

    [HttpPost]
    [ProducesResponseType<IncidentReportResponseDto>(StatusCodes.Status201Created)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<IncidentReportResponseDto>> Create([FromBody] CreateIncidentReportRequest request, CancellationToken cancellationToken)
    {
        var result = await service.CreateIncidentReportAsync(request, User.GetRole(), await userScopeService.GetAssignedSafehousesAsync(User, cancellationToken), cancellationToken);
        return result.Incident is null
            ? BadRequest(new ErrorResponse(result.ErrorMessage ?? "Failed to create incident report"))
            : StatusCode(StatusCodes.Status201Created, result.Incident);
    }

    [HttpPatch("{id:long}")]
    [ProducesResponseType<IncidentReportResponseDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IncidentReportResponseDto>> Update(long id, [FromBody] UpdateIncidentReportRequest request, CancellationToken cancellationToken)
    {
        var result = await service.UpdateIncidentReportAsync(id, request, User.GetRole(), await userScopeService.GetAssignedSafehousesAsync(User, cancellationToken), cancellationToken);
        if (result.Incident is not null)
        {
            return Ok(result.Incident);
        }

        return result.ErrorMessage == "Not found"
            ? NotFound(new ErrorResponse("Not found"))
            : BadRequest(new ErrorResponse(result.ErrorMessage ?? "Failed to update incident report"));
    }

    [HttpDelete("{id:long}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(long id, CancellationToken cancellationToken)
    {
        var deleted = await service.DeleteIncidentReportAsync(id, User.GetRole(), await userScopeService.GetAssignedSafehousesAsync(User, cancellationToken), cancellationToken);
        return deleted ? NoContent() : NotFound(new ErrorResponse("Not found"));
    }
}
