using Intex.Infrastructure.Api.Pagination;
using Intex.Infrastructure.Auth;
using Intex.Infrastructure.CaseManagement;
using Intex.Infrastructure.CaseManagement.Contracts;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Intex.Controllers;

[ApiController]
[Route("api/health-records")]
[Authorize(Policy = AuthPolicies.StaffOrAbove)]
public sealed class HealthRecordsController(CaseManagementService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string? page, [FromQuery] string? limit, [FromQuery] string? pageSize, [FromQuery] int? residentId, CancellationToken cancellationToken)
        => Ok(await service.ListHealthRecordsAsync(PaginationResolver.Resolve(page, limit, pageSize), residentId, cancellationToken));
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateHealthRecordRequest? request, CancellationToken cancellationToken) => StatusCode(201, await service.CreateHealthRecordAsync(request, cancellationToken));
    [HttpPatch("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateHealthRecordRequest? request, CancellationToken cancellationToken) => Ok(await service.UpdateHealthRecordAsync(id, request, cancellationToken));
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken) { await service.DeleteHealthRecordAsync(id, cancellationToken); return NoContent(); }
}
