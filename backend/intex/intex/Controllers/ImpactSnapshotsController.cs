using Intex.Infrastructure.Api.Contracts;
using Intex.Infrastructure.Api.Pagination;
using Intex.Infrastructure.Auth;
using Intex.Infrastructure.Public;
using Intex.Infrastructure.Public.Contracts;
using Intex.Infrastructure.SuperAdmin;
using Intex.Infrastructure.SuperAdmin.Contracts;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Intex.Controllers;

[ApiController]
[Route("api/impact-snapshots")]
public sealed class ImpactSnapshotsController(
    PublicReadService publicReadService,
    SuperAdminService superAdminService) : ControllerBase
{
    [Authorize(Policy = AuthPolicies.AdminOrAbove)]
    [HttpPost]
    [ProducesResponseType(typeof(ImpactSnapshotAdminResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Create(
        [FromBody] CreateImpactSnapshotRequest? request,
        CancellationToken cancellationToken)
    {
        var response = await superAdminService.CreateImpactSnapshotAsync(request, cancellationToken);
        return StatusCode(StatusCodes.Status201Created, response);
    }

    [AllowAnonymous]
    [HttpGet]
    [ProducesResponseType(typeof(PaginatedListEnvelope<ImpactSnapshotResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> ListPublishedSnapshots(
        [FromQuery] string? page,
        [FromQuery] string? limit,
        [FromQuery] string? pageSize,
        [FromQuery] string? published,
        CancellationToken cancellationToken)
    {
        _ = published;

        var pagination = PaginationResolver.Resolve(page, limit, pageSize);
        var response = await publicReadService.ListPublishedImpactSnapshotsAsync(pagination, cancellationToken);
        return Ok(response);
    }

    [AllowAnonymous]
    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(ImpactSnapshotResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetPublishedSnapshot(int id, CancellationToken cancellationToken)
    {
        var response = await publicReadService.GetPublishedImpactSnapshotByIdAsync(id, cancellationToken);
        return Ok(response);
    }

    [Authorize(Policy = AuthPolicies.AdminOrAbove)]
    [HttpPatch("{id:int}")]
    [ProducesResponseType(typeof(ImpactSnapshotAdminResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Update(
        int id,
        [FromBody] UpdateImpactSnapshotRequest? request,
        CancellationToken cancellationToken)
    {
        var response = await superAdminService.UpdateImpactSnapshotAsync(id, request, cancellationToken);
        return Ok(response);
    }

    [Authorize(Policy = AuthPolicies.AdminOrAbove)]
    [HttpDelete("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
    {
        await superAdminService.DeleteImpactSnapshotAsync(id, cancellationToken);
        return NoContent();
    }

    [Authorize(Policy = AuthPolicies.AdminOrAbove)]
    [HttpPost("{id:int}/publish")]
    [ProducesResponseType(typeof(ImpactSnapshotAdminResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Publish(int id, CancellationToken cancellationToken)
    {
        var response = await superAdminService.SetImpactSnapshotPublishedAsync(id, true, cancellationToken);
        return Ok(response);
    }

    [Authorize(Policy = AuthPolicies.AdminOrAbove)]
    [HttpPost("{id:int}/unpublish")]
    [ProducesResponseType(typeof(ImpactSnapshotAdminResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Unpublish(int id, CancellationToken cancellationToken)
    {
        var response = await superAdminService.SetImpactSnapshotPublishedAsync(id, false, cancellationToken);
        return Ok(response);
    }
}
