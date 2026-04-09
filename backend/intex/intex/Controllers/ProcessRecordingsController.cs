using Intex.Infrastructure.Api.Contracts;
using Intex.Infrastructure.Api.Pagination;
using Intex.Infrastructure.Auth;
using Intex.Infrastructure.CaseManagement;
using Intex.Infrastructure.CaseManagement.Contracts;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Intex.Controllers;

[ApiController]
[Route("api/process-recordings")]
[Authorize(Policy = AuthPolicies.StaffOrAbove)]
public sealed class ProcessRecordingsController(CaseManagementService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string? page, [FromQuery] string? limit, [FromQuery] string? pageSize, [FromQuery] int? residentId, [FromQuery] int? safehouseId, CancellationToken cancellationToken)
        => Ok(await service.ListProcessRecordingsAsync(PaginationResolver.Resolve(page, limit, pageSize), residentId, safehouseId, cancellationToken));
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id, CancellationToken cancellationToken) => Ok(await service.GetProcessRecordingAsync(id, cancellationToken));
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateProcessRecordingRequest? request, CancellationToken cancellationToken) => StatusCode(201, await service.CreateProcessRecordingAsync(request, cancellationToken));
    [HttpPatch("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateProcessRecordingRequest? request, CancellationToken cancellationToken) => Ok(await service.UpdateProcessRecordingAsync(id, request, cancellationToken));
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken) { await service.DeleteProcessRecordingAsync(id, cancellationToken); return NoContent(); }
}
