using backend.intex.DTOs.Common;
using backend.intex.Infrastructure.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.intex.Controllers;

[Authorize(Policy = PolicyNames.SuperAdminOnly)]
[Route("audit-logs")]
public sealed class AuditLogsController : ApiControllerBase
{
    [HttpGet]
    [ProducesResponseType<StandardPagedResponse<object>>(StatusCodes.Status200OK)]
    public ActionResult<StandardPagedResponse<object>> List(
        [FromQuery] int page = 1,
        [FromQuery] int? pageSize = null,
        [FromQuery] int? limit = null,
        [FromQuery] int? userId = null,
        [FromQuery] string? action = null)
    {
        var resolvedPage = page <= 0 ? 1 : page;
        var resolvedPageSize = Math.Clamp(pageSize ?? limit ?? 20, 1, 2000);
        var total = 0;
        var totalPages = 0;
        var response = new StandardPagedResponse<object>(
            [],
            total,
            new StandardPaginationMeta(resolvedPage, resolvedPageSize, totalPages, false, resolvedPage > 1));

        _ = userId;
        _ = action;
        return Ok(response);
    }
}
