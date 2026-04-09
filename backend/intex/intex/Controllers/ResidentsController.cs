using Intex.Infrastructure.AdminStaff;
using Intex.Infrastructure.AdminStaff.Contracts;
using Intex.Infrastructure.Api.Contracts;
using Intex.Infrastructure.Api.Pagination;
using Intex.Infrastructure.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Intex.Controllers;

[ApiController]
[Route("api/residents")]
[Authorize(Policy = AuthPolicies.StaffOrAbove)]
public sealed class ResidentsController(AdminStaffReadService adminStaffReadService) : ControllerBase
{
    [HttpPost]
    [ProducesResponseType(typeof(ResidentListItemResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status409Conflict)]
    public Task<IActionResult> Create(
        [FromServices] AdminStaffMutationService adminStaffMutationService,
        [FromBody] CreateResidentRequest? request,
        CancellationToken cancellationToken)
    {
        return CreateResidentCore(adminStaffMutationService, request, cancellationToken);
    }

    [HttpGet("stats")]
    [ProducesResponseType(typeof(ResidentStatsResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetStats(CancellationToken cancellationToken)
    {
        var response = await adminStaffReadService.GetResidentStatsAsync(cancellationToken);
        return Ok(response);
    }

    [HttpGet("{id:int}/timeline")]
    [ProducesResponseType(typeof(IReadOnlyCollection<ResidentTimelineEventResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetTimeline(int id, CancellationToken cancellationToken)
    {
        var response = await adminStaffReadService.GetResidentTimelineAsync(id, cancellationToken);
        return Ok(response);
    }

    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(ResidentListItemResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(int id, CancellationToken cancellationToken)
    {
        var response = await adminStaffReadService.GetResidentAsync(id, cancellationToken);
        return Ok(response);
    }

    [HttpGet]
    [ProducesResponseType(typeof(PaginatedListEnvelope<ResidentListItemResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> List(
        [FromQuery] string? page,
        [FromQuery] string? limit,
        [FromQuery] string? pageSize,
        [FromQuery] int? safehouseId,
        [FromQuery] string? caseStatus,
        [FromQuery] string? riskLevel,
        [FromQuery] string? reintegrationStatus,
        CancellationToken cancellationToken)
    {
        var pagination = PaginationResolver.Resolve(page, limit, pageSize);
        var response = await adminStaffReadService.ListResidentsAsync(
            pagination,
            safehouseId,
            caseStatus,
            riskLevel,
            reintegrationStatus,
            cancellationToken);

        return Ok(response);
    }

    [HttpPatch("{id:int}")]
    [ProducesResponseType(typeof(ResidentListItemResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Update(
        int id,
        [FromServices] AdminStaffMutationService adminStaffMutationService,
        [FromBody] UpdateResidentRequest? request,
        CancellationToken cancellationToken)
    {
        var response = await adminStaffMutationService.UpdateResidentAsync(id, request, cancellationToken);
        return Ok(response);
    }

    [Authorize(Policy = AuthPolicies.AdminOrAbove)]
    [HttpDelete("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(
        int id,
        [FromServices] AdminStaffMutationService adminStaffMutationService,
        CancellationToken cancellationToken)
    {
        await adminStaffMutationService.DeleteResidentAsync(id, cancellationToken);
        return NoContent();
    }

    private async Task<IActionResult> CreateResidentCore(
        AdminStaffMutationService adminStaffMutationService,
        CreateResidentRequest? request,
        CancellationToken cancellationToken)
    {
        var response = await adminStaffMutationService.CreateResidentAsync(request, cancellationToken);
        return StatusCode(StatusCodes.Status201Created, response);
    }
}
