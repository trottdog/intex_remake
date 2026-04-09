using Intex.Infrastructure.Api.Pagination;
using Intex.Infrastructure.Auth;
using Intex.Infrastructure.CaseManagement;
using Intex.Infrastructure.CaseManagement.Contracts;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Intex.Controllers;

[ApiController]
[Route("api/case-conferences")]
[Authorize(Policy = AuthPolicies.StaffOrAbove)]
public sealed class CaseConferencesController(CaseManagementService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string? page, [FromQuery] string? limit, [FromQuery] string? pageSize, [FromQuery] int? residentId, [FromQuery] int? safehouseId, [FromQuery] string? status, [FromQuery] bool? upcoming, CancellationToken cancellationToken)
        => Ok(await service.ListCaseConferencesAsync(PaginationResolver.Resolve(page, limit, pageSize), residentId, safehouseId, status, upcoming, cancellationToken));
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id, CancellationToken cancellationToken) => Ok(await service.GetCaseConferenceAsync(id, cancellationToken));
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateCaseConferenceRequest? request, CancellationToken cancellationToken) => StatusCode(201, await service.CreateCaseConferenceAsync(request, cancellationToken));
    [HttpPatch("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateCaseConferenceRequest? request, CancellationToken cancellationToken) => Ok(await service.UpdateCaseConferenceAsync(id, request, cancellationToken));
    [Authorize(Policy = AuthPolicies.AdminOrAbove)]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken) { await service.DeleteCaseConferenceAsync(id, cancellationToken); return NoContent(); }
}
