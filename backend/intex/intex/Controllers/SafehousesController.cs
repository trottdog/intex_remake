using Intex.Infrastructure.Api.Contracts;
using Intex.Infrastructure.Api.Pagination;
using Intex.Infrastructure.Auth;
using Intex.Infrastructure.ExtendedAdmin;
using Intex.Infrastructure.ExtendedAdmin.Contracts;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Intex.Controllers;

[ApiController]
[Route("api/safehouses")]
public sealed class SafehousesController(ExtendedAdminService service) : ControllerBase
{
    [Authorize(Policy = AuthPolicies.StaffOrAbove)]
    [HttpGet]
    public async Task<IActionResult> List(
        [FromQuery] string? page,
        [FromQuery] string? limit,
        [FromQuery] string? pageSize,
        [FromQuery] string? search,
        CancellationToken cancellationToken)
        => Ok(await service.ListSafehousesAsync(PaginationResolver.Resolve(page, limit, pageSize), search, cancellationToken));

    [Authorize(Policy = AuthPolicies.StaffOrAbove)]
    [HttpGet("{id:int}/metrics")]
    public async Task<IActionResult> GetMetrics(int id, [FromQuery] int? months, CancellationToken cancellationToken)
        => Ok(await service.GetSafehouseMetricsAsync(id, months ?? 12, cancellationToken));

    [Authorize(Policy = AuthPolicies.StaffOrAbove)]
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id, CancellationToken cancellationToken)
        => Ok(await service.GetSafehouseAsync(id, cancellationToken));

    [Authorize(Policy = AuthPolicies.AdminOrAbove)]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateSafehouseRequest? request, CancellationToken cancellationToken)
        => StatusCode(StatusCodes.Status201Created, await service.CreateSafehouseAsync(request, cancellationToken));

    [Authorize(Policy = AuthPolicies.AdminOrAbove)]
    [HttpPatch("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateSafehouseRequest? request, CancellationToken cancellationToken)
        => Ok(await service.UpdateSafehouseAsync(id, request, cancellationToken));

    [Authorize(Policy = AuthPolicies.AdminOrAbove)]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
    {
        await service.DeleteSafehouseAsync(id, cancellationToken);
        return NoContent();
    }
}
