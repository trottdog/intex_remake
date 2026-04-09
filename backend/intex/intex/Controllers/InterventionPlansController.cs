using Intex.Infrastructure.Api.Pagination;
using Intex.Infrastructure.Auth;
using Intex.Infrastructure.CaseManagement;
using Intex.Infrastructure.CaseManagement.Contracts;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Intex.Controllers;

[ApiController]
[Route("api/intervention-plans")]
[Authorize(Policy = AuthPolicies.StaffOrAbove)]
public sealed class InterventionPlansController(CaseManagementService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string? page, [FromQuery] string? limit, [FromQuery] string? pageSize, [FromQuery] int? residentId, [FromQuery] int? safehouseId, [FromQuery] string? status, CancellationToken cancellationToken)
        => Ok(await service.ListInterventionPlansAsync(PaginationResolver.Resolve(page, limit, pageSize), residentId, safehouseId, status, cancellationToken));
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id, CancellationToken cancellationToken) => Ok(await service.GetInterventionPlanAsync(id, cancellationToken));
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateInterventionPlanRequest? request, CancellationToken cancellationToken) => StatusCode(201, await service.CreateInterventionPlanAsync(request, cancellationToken));
    [HttpPatch("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateInterventionPlanRequest? request, CancellationToken cancellationToken) => Ok(await service.UpdateInterventionPlanAsync(id, request, cancellationToken));
    [Authorize(Policy = AuthPolicies.AdminOrAbove)]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken) { await service.DeleteInterventionPlanAsync(id, cancellationToken); return NoContent(); }
}
