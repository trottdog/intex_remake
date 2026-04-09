using backend.intex.DTOs.Common;
using backend.intex.Infrastructure.Auth;
using backend.intex.Infrastructure.Data.EntityFramework;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.intex.Controllers;

[Authorize(Policy = PolicyNames.AdminOrAbove)]
[Route("admin/impact-snapshots")]
public sealed class AdminImpactSnapshotsController(BeaconDbContext dbContext) : ApiControllerBase
{
    [HttpGet]
    [ProducesResponseType<StandardPagedResponse<object>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<StandardPagedResponse<object>>> List(
        [FromQuery] int page = 1,
        [FromQuery] int? pageSize = null,
        [FromQuery] int? limit = null,
        CancellationToken cancellationToken = default)
    {
        var resolvedPage = page <= 0 ? 1 : page;
        var resolvedPageSize = Math.Clamp(pageSize ?? limit ?? 20, 1, 2000);
        var query = dbContext.PublicImpactSnapshots.AsNoTracking();
        var total = await query.CountAsync(cancellationToken);
        var rows = await query
            .OrderByDescending(item => item.SnapshotId)
            .Skip((resolvedPage - 1) * resolvedPageSize)
            .Take(resolvedPageSize)
            .Select(item => new
            {
                item.SnapshotId,
                Id = item.SnapshotId,
                SnapshotDate = item.SnapshotDate.HasValue ? item.SnapshotDate.Value.ToString("yyyy-MM-dd") : null,
                item.Headline,
                Title = item.Headline,
                item.SummaryText,
                Summary = item.SummaryText,
                item.IsPublished,
                item.PublishedAt
            })
            .ToListAsync(cancellationToken);

        var totalPages = total == 0 ? 0 : (int)Math.Ceiling(total / (double)resolvedPageSize);
        return Ok(new StandardPagedResponse<object>(
            rows.Cast<object>().ToList(),
            total,
            new StandardPaginationMeta(resolvedPage, resolvedPageSize, totalPages, resolvedPage < totalPages, resolvedPage > 1)));
    }
}
