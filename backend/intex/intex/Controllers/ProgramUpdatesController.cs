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

[Route("program-updates")]
public sealed class ProgramUpdatesController(BeaconDbContext dbContext) : ApiControllerBase
{
    [Authorize(Policy = PolicyNames.DonorOrStaffOrAbove)]
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
        var role = User.GetRole();

        var query = dbContext.ProgramUpdates.AsNoTracking();
        if (role == BeaconRoles.Donor)
        {
            query = query.Where(item => item.IsPublished == true);
        }

        var total = await query.CountAsync(cancellationToken);
        var rows = await query
            .OrderByDescending(item => item.UpdateId)
            .Skip((resolvedPage - 1) * resolvedPageSize)
            .Take(resolvedPageSize)
            .Select(item => new
            {
                item.UpdateId,
                Id = item.UpdateId,
                item.Title,
                item.Summary,
                item.Category,
                item.IsPublished,
                item.PublishedAt,
                item.CreatedBy,
                item.CreatedAt,
                item.UpdatedAt
            })
            .ToListAsync(cancellationToken);

        var totalPages = total == 0 ? 0 : (int)Math.Ceiling(total / (double)resolvedPageSize);
        return Ok(new StandardPagedResponse<object>(
            rows.Cast<object>().ToList(),
            total,
            new StandardPaginationMeta(resolvedPage, resolvedPageSize, totalPages, resolvedPage < totalPages, resolvedPage > 1)));
    }

    [Authorize(Policy = PolicyNames.AdminOrAbove)]
    [HttpPost]
    [ProducesResponseType(StatusCodes.Status201Created)]
    public async Task<IActionResult> Create([FromBody] JsonFieldsRequest request, CancellationToken cancellationToken)
    {
        var fieldMap = new Dictionary<string, JsonElement>(request.Fields, StringComparer.OrdinalIgnoreCase)
        {
            ["createdAt"] = JsonSerializer.SerializeToElement(DateTime.UtcNow),
            ["updatedAt"] = JsonSerializer.SerializeToElement(DateTime.UtcNow)
        };
        if (!fieldMap.ContainsKey("createdBy") && User.GetUserId().HasValue)
        {
            fieldMap["createdBy"] = JsonSerializer.SerializeToElement((long)User.GetUserId()!.Value);
        }

        var entity = EntityJsonMerge.DeserializeEntity<ProgramUpdate>(fieldMap);
        dbContext.ProgramUpdates.Add(entity);
        await dbContext.SaveChangesAsync(cancellationToken);
        return StatusCode(StatusCodes.Status201Created, await BuildResponseAsync(entity.UpdateId, cancellationToken));
    }

    [Authorize(Policy = PolicyNames.AdminOrAbove)]
    [HttpPatch("{id:long}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Update(long id, [FromBody] JsonFieldsRequest request, CancellationToken cancellationToken)
    {
        var entity = await dbContext.ProgramUpdates.FirstOrDefaultAsync(item => item.UpdateId == id, cancellationToken);
        if (entity is null)
        {
            return NotFound(new ErrorResponse("Not found"));
        }

        var fieldMap = new Dictionary<string, JsonElement>(request.Fields, StringComparer.OrdinalIgnoreCase)
        {
            ["updatedAt"] = JsonSerializer.SerializeToElement(DateTime.UtcNow)
        };

        EntityJsonMerge.ApplyMergedValues(dbContext, entity, fieldMap);
        await dbContext.SaveChangesAsync(cancellationToken);
        return Ok(await BuildResponseAsync(id, cancellationToken));
    }

    [Authorize(Policy = PolicyNames.AdminOrAbove)]
    [HttpDelete("{id:long}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Delete(long id, CancellationToken cancellationToken)
    {
        using var tx = await dbContext.Database.BeginTransactionAsync(cancellationToken);
        var dependents = await dbContext.DonorViewedItems
            .Where(item => item.ItemType != null && EF.Functions.ILike(item.ItemType, "update") && item.ItemId == id)
            .ToListAsync(cancellationToken);
        if (dependents.Count > 0)
        {
            dbContext.DonorViewedItems.RemoveRange(dependents);
        }

        var entity = await dbContext.ProgramUpdates.FirstOrDefaultAsync(item => item.UpdateId == id, cancellationToken);
        if (entity is not null)
        {
            dbContext.ProgramUpdates.Remove(entity);
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        await tx.CommitAsync(cancellationToken);
        return NoContent();
    }

    private async Task<object?> BuildResponseAsync(long id, CancellationToken cancellationToken)
    {
        return await dbContext.ProgramUpdates.AsNoTracking()
            .Where(item => item.UpdateId == id)
            .Select(item => new
            {
                item.UpdateId,
                Id = item.UpdateId,
                item.Title,
                item.Summary,
                item.Category,
                item.IsPublished,
                item.PublishedAt,
                item.CreatedBy,
                item.CreatedAt,
                item.UpdatedAt
            })
            .FirstOrDefaultAsync(cancellationToken);
    }

    public sealed class JsonFieldsRequest
    {
        [JsonExtensionData]
        public Dictionary<string, JsonElement> Fields { get; init; } = new(StringComparer.OrdinalIgnoreCase);
    }
}
