using Intex.Infrastructure.Api.Contracts;
using Intex.Infrastructure.Api.Pagination;
using Intex.Infrastructure.Auth;
using Intex.Infrastructure.SuperAdmin;
using Intex.Infrastructure.SuperAdmin.Contracts;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Intex.Controllers;

[ApiController]
[Route("api/audit-logs")]
[Authorize(Policy = AuthPolicies.SuperAdminOnly)]
public sealed class AuditLogsController(SuperAdminService superAdminService) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(PaginatedListEnvelope<AuditLogResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> List(
        [FromQuery] string? page,
        [FromQuery] string? limit,
        [FromQuery] string? pageSize,
        [FromQuery] int? actorId,
        [FromQuery] string? action,
        [FromQuery] string? entityType,
        CancellationToken cancellationToken)
    {
        var pagination = PaginationResolver.Resolve(page, limit, pageSize, defaultLimit: 50);
        var response = await superAdminService.ListAuditLogsAsync(pagination, actorId, action, entityType, cancellationToken);
        return Ok(response);
    }
}
