using Intex.Infrastructure.Api.Pagination;
using Intex.Infrastructure.Auth;
using Intex.Infrastructure.CaseManagement;
using Intex.Infrastructure.CaseManagement.Contracts;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Intex.Controllers;

[ApiController]
[Route("api/education-records")]
[Authorize(Policy = AuthPolicies.StaffOrAbove)]
public sealed class EducationRecordsController(CaseManagementService service) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string? page, [FromQuery] string? limit, [FromQuery] string? pageSize, [FromQuery] int? residentId, CancellationToken cancellationToken)
        => Ok(await service.ListEducationRecordsAsync(PaginationResolver.Resolve(page, limit, pageSize), residentId, cancellationToken));
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateEducationRecordRequest? request, CancellationToken cancellationToken) => StatusCode(201, await service.CreateEducationRecordAsync(request, cancellationToken));
    [HttpPatch("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateEducationRecordRequest? request, CancellationToken cancellationToken) => Ok(await service.UpdateEducationRecordAsync(id, request, cancellationToken));
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken) { await service.DeleteEducationRecordAsync(id, cancellationToken); return NoContent(); }
}
