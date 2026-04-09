using Intex.Infrastructure.Api.Pagination;
using Intex.Infrastructure.Auth;
using Intex.Infrastructure.CaseManagement;
using Intex.Infrastructure.CaseManagement.Contracts;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Intex.Controllers;

[ApiController]
[Route("api/incidents")]
[Authorize(Policy = AuthPolicies.StaffOrAbove)]
public sealed class IncidentsController(CaseManagementService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string? page, [FromQuery] string? limit, [FromQuery] string? pageSize, [FromQuery] int? residentId, [FromQuery] int? safehouseId, [FromQuery] string? severity, [FromQuery] string? status, CancellationToken cancellationToken)
        => Ok(await service.ListIncidentsAsync(PaginationResolver.Resolve(page, limit, pageSize), residentId, safehouseId, severity, status, cancellationToken));
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id, CancellationToken cancellationToken) => Ok(await service.GetIncidentAsync(id, cancellationToken));
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateIncidentRequest? request, CancellationToken cancellationToken) => StatusCode(201, await service.CreateIncidentAsync(request, cancellationToken));
    [HttpPatch("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateIncidentRequest? request, CancellationToken cancellationToken) => Ok(await service.UpdateIncidentAsync(id, request, cancellationToken));
    [Authorize(Policy = AuthPolicies.AdminOrAbove)]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken) { await service.DeleteIncidentAsync(id, cancellationToken); return NoContent(); }
}
