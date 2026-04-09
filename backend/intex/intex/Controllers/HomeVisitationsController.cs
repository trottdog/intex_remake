using Intex.Infrastructure.Api.Pagination;
using Intex.Infrastructure.Auth;
using Intex.Infrastructure.CaseManagement;
using Intex.Infrastructure.CaseManagement.Contracts;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Intex.Controllers;

[ApiController]
[Route("api/home-visitations")]
[Authorize(Policy = AuthPolicies.StaffOrAbove)]
public sealed class HomeVisitationsController(CaseManagementService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string? page, [FromQuery] string? limit, [FromQuery] string? pageSize, [FromQuery] int? residentId, CancellationToken cancellationToken)
        => Ok(await service.ListHomeVisitationsAsync(PaginationResolver.Resolve(page, limit, pageSize), residentId, cancellationToken));
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id, CancellationToken cancellationToken) => Ok(await service.GetHomeVisitationAsync(id, cancellationToken));
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateHomeVisitationRequest? request, CancellationToken cancellationToken) => StatusCode(201, await service.CreateHomeVisitationAsync(request, cancellationToken));
    [HttpPatch("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateHomeVisitationRequest? request, CancellationToken cancellationToken) => Ok(await service.UpdateHomeVisitationAsync(id, request, cancellationToken));
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken) { await service.DeleteHomeVisitationAsync(id, cancellationToken); return NoContent(); }
}
