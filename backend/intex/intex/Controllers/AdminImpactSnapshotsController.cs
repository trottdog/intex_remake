using Intex.Infrastructure.Api.Contracts;
using Intex.Infrastructure.Api.Pagination;
using Intex.Infrastructure.Auth;
using Intex.Infrastructure.SuperAdmin;
using Intex.Infrastructure.SuperAdmin.Contracts;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Intex.Controllers;

[ApiController]
[Route("api/admin/impact-snapshots")]
[Authorize(Policy = AuthPolicies.AdminOrAbove)]
public sealed class AdminImpactSnapshotsController(SuperAdminService superAdminService) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(PaginatedListEnvelope<ImpactSnapshotAdminResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> List(
        [FromQuery] string? page,
        [FromQuery] string? limit,
        [FromQuery] string? pageSize,
        CancellationToken cancellationToken)
    {
        var pagination = PaginationResolver.Resolve(page, limit, pageSize);
        var response = await superAdminService.ListAdminImpactSnapshotsAsync(pagination, cancellationToken);
        return Ok(response);
    }

    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(ImpactSnapshotAdminResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(int id, CancellationToken cancellationToken)
    {
        var response = await superAdminService.GetAdminImpactSnapshotByIdAsync(id, cancellationToken);
        return Ok(response);
    }
}
