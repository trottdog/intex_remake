using System.Text.Json;
using System.Text.Json.Serialization;
using backend.intex.DTOs.Common;
using backend.intex.Entities.Database;
using backend.intex.Infrastructure.Auth;
using backend.intex.Infrastructure.Data.EntityFramework;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.intex.Controllers;

[Route("impact-snapshots")]
public sealed class ImpactSnapshotsController(BeaconDbContext dbContext) : ApiControllerBase
{
    [AllowAnonymous]
    [HttpGet]
    [ProducesResponseType<StandardPagedResponse<object>>(StatusCodes.Status200OK)]
    public Task<ActionResult<StandardPagedResponse<object>>> ListPublic(
        [FromQuery] int page = 1,
        [FromQuery] int? pageSize = null,
        [FromQuery] int? limit = null,
        CancellationToken cancellationToken = default) =>
        ListCore(page, pageSize, limit, adminView: false, cancellationToken);

    [Authorize(Policy = PolicyNames.AdminOrAbove)]
    [HttpPost]
    [ProducesResponseType(StatusCodes.Status201Created)]
    public async Task<IActionResult> Create([FromBody] JsonFieldsRequest request, CancellationToken cancellationToken)
    {
        var fieldMap = new Dictionary<string, JsonElement>(request.Fields, StringComparer.OrdinalIgnoreCase);
        if (!fieldMap.ContainsKey("isPublished"))
        {
            fieldMap["isPublished"] = JsonSerializer.SerializeToElement(false);
        }

        var entity = EntityJsonMerge.DeserializeEntity<PublicImpactSnapshot>(fieldMap);
        dbContext.PublicImpactSnapshots.Add(entity);
        await dbContext.SaveChangesAsync(cancellationToken);
        return StatusCode(StatusCodes.Status201Created, await BuildResponseAsync(entity.SnapshotId, cancellationToken));
    }

    [Authorize(Policy = PolicyNames.AdminOrAbove)]
    [HttpPatch("{id:long}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Update(long id, [FromBody] JsonFieldsRequest request, CancellationToken cancellationToken)
    {
        var entity = await dbContext.PublicImpactSnapshots.FirstOrDefaultAsync(item => item.SnapshotId == id, cancellationToken);
        if (entity is null)
        {
            return NotFound(new ErrorResponse("Not found"));
        }

        EntityJsonMerge.ApplyMergedValues(dbContext, entity, request.Fields);
        await dbContext.SaveChangesAsync(cancellationToken);
        return Ok(await BuildResponseAsync(id, cancellationToken));
    }

    [Authorize(Policy = PolicyNames.AdminOrAbove)]
    [HttpDelete("{id:long}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Delete(long id, CancellationToken cancellationToken)
    {
        var entity = await dbContext.PublicImpactSnapshots.FirstOrDefaultAsync(item => item.SnapshotId == id, cancellationToken);
        if (entity is null)
        {
            return NoContent();
        }

        dbContext.PublicImpactSnapshots.Remove(entity);
        await dbContext.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    [Authorize(Policy = PolicyNames.AdminOrAbove)]
    [HttpPost("{id:long}/publish")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Publish(long id, CancellationToken cancellationToken)
    {
        var entity = await dbContext.PublicImpactSnapshots.FirstOrDefaultAsync(item => item.SnapshotId == id, cancellationToken);
        if (entity is null)
        {
            return NotFound(new ErrorResponse("Not found"));
        }

        var fields = new Dictionary<string, JsonElement>(StringComparer.OrdinalIgnoreCase)
        {
            ["isPublished"] = JsonSerializer.SerializeToElement(true),
            ["publishedAt"] = JsonSerializer.SerializeToElement(DateTime.UtcNow)
        };
        EntityJsonMerge.ApplyMergedValues(dbContext, entity, fields);
        await dbContext.SaveChangesAsync(cancellationToken);
        return Ok(await BuildResponseAsync(id, cancellationToken));
    }

    [Authorize(Policy = PolicyNames.AdminOrAbove)]
    [HttpPost("{id:long}/unpublish")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Unpublish(long id, CancellationToken cancellationToken)
    {
        var entity = await dbContext.PublicImpactSnapshots.FirstOrDefaultAsync(item => item.SnapshotId == id, cancellationToken);
        if (entity is null)
        {
            return NotFound(new ErrorResponse("Not found"));
        }

        var fields = new Dictionary<string, JsonElement>(StringComparer.OrdinalIgnoreCase)
        {
            ["isPublished"] = JsonSerializer.SerializeToElement(false),
            ["publishedAt"] = JsonSerializer.SerializeToElement<DateTime?>(null)
        };
        EntityJsonMerge.ApplyMergedValues(dbContext, entity, fields);
        await dbContext.SaveChangesAsync(cancellationToken);
        return Ok(await BuildResponseAsync(id, cancellationToken));
    }

    internal async Task<ActionResult<StandardPagedResponse<object>>> ListCore(
        int page,
        int? pageSize,
        int? limit,
        bool adminView,
        CancellationToken cancellationToken)
    {
        var resolvedPage = page <= 0 ? 1 : page;
        var resolvedPageSize = Math.Clamp(pageSize ?? limit ?? 20, 1, 2000);
        var query = dbContext.PublicImpactSnapshots.AsNoTracking();
        if (!adminView)
        {
            query = query.Where(item => item.IsPublished == true);
        }

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
                item.PublishedAt,
                ProjectedGapPhp30d = item.ProjectedGapPhp30d.HasValue ? (decimal?)decimal.Round(item.ProjectedGapPhp30d.Value, 2) : null,
                item.FundingGapBand,
                item.FundingGapUpdatedAt
            })
            .ToListAsync(cancellationToken);

        var totalPages = total == 0 ? 0 : (int)Math.Ceiling(total / (double)resolvedPageSize);
        return Ok(new StandardPagedResponse<object>(
            rows.Cast<object>().ToList(),
            total,
            new StandardPaginationMeta(resolvedPage, resolvedPageSize, totalPages, resolvedPage < totalPages, resolvedPage > 1)));
    }

    private async Task<object?> BuildResponseAsync(long id, CancellationToken cancellationToken)
    {
        return await dbContext.PublicImpactSnapshots.AsNoTracking()
            .Where(item => item.SnapshotId == id)
            .Select(item => new
            {
                item.SnapshotId,
                Id = item.SnapshotId,
                SnapshotDate = item.SnapshotDate.HasValue ? item.SnapshotDate.Value.ToString("yyyy-MM-dd") : null,
                item.Headline,
                Title = item.Headline,
                item.SummaryText,
                Summary = item.SummaryText,
                MetricPayloadJson = item.MetricPayloadJson != null ? item.MetricPayloadJson.RootElement : (object?)null,
                item.IsPublished,
                item.PublishedAt,
                ProjectedGapPhp30d = item.ProjectedGapPhp30d.HasValue ? (decimal?)decimal.Round(item.ProjectedGapPhp30d.Value, 2) : null,
                item.FundingGapBand,
                item.FundingGapUpdatedAt
            })
            .FirstOrDefaultAsync(cancellationToken);
    }

    public sealed class JsonFieldsRequest
    {
        [JsonExtensionData]
        public Dictionary<string, JsonElement> Fields { get; init; } = new(StringComparer.OrdinalIgnoreCase);
    }
}
