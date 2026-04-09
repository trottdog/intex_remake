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

[Authorize(Policy = PolicyNames.StaffOrAbove)]
[Route("partner-assignments")]
public sealed class PartnerAssignmentsController(BeaconDbContext dbContext) : ApiControllerBase
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
        var query = from assignment in dbContext.PartnerAssignments.AsNoTracking()
                    join safehouse in dbContext.Safehouses.AsNoTracking() on assignment.SafehouseId equals (long?)safehouse.SafehouseId into safehouseGroup
                    from safehouse in safehouseGroup.DefaultIfEmpty()
                    select new
                    {
                        assignment.AssignmentId,
                        assignment.PartnerId,
                        assignment.SafehouseId,
                        assignment.ProgramArea,
                        assignment.AssignmentStart,
                        assignment.AssignmentEnd,
                        assignment.ResponsibilityNotes,
                        assignment.IsPrimary,
                        assignment.Status,
                        SafehouseName = safehouse.Name
                    };

        var total = await query.CountAsync(cancellationToken);
        var rows = await query
            .OrderByDescending(item => item.AssignmentStart)
            .ThenByDescending(item => item.AssignmentId)
            .Skip((resolvedPage - 1) * resolvedPageSize)
            .Take(resolvedPageSize)
            .Select(item => new
            {
                item.AssignmentId,
                Id = item.AssignmentId,
                item.PartnerId,
                item.SafehouseId,
                item.ProgramArea,
                AssignmentStart = item.AssignmentStart.HasValue ? item.AssignmentStart.Value.ToString("yyyy-MM-dd") : null,
                AssignmentEnd = item.AssignmentEnd.HasValue ? item.AssignmentEnd.Value.ToString("yyyy-MM-dd") : null,
                item.ResponsibilityNotes,
                item.IsPrimary,
                item.Status,
                item.SafehouseName
            })
            .ToListAsync(cancellationToken);

        var totalPages = total == 0 ? 0 : (int)Math.Ceiling(total / (double)resolvedPageSize);
        return Ok(new StandardPagedResponse<object>(
            rows.Cast<object>().ToList(),
            total,
            new StandardPaginationMeta(resolvedPage, resolvedPageSize, totalPages, resolvedPage < totalPages, resolvedPage > 1)));
    }

    [HttpPost]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Create([FromBody] JsonFieldsRequest request, CancellationToken cancellationToken)
    {
        var entity = EntityJsonMerge.DeserializeEntity<PartnerAssignment>(request.Fields);
        dbContext.PartnerAssignments.Add(entity);
        await dbContext.SaveChangesAsync(cancellationToken);
        return StatusCode(StatusCodes.Status201Created, await BuildResponseAsync(entity.AssignmentId, cancellationToken));
    }

    [HttpPatch("{id:long}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Update(long id, [FromBody] JsonFieldsRequest request, CancellationToken cancellationToken)
    {
        var entity = await dbContext.PartnerAssignments.FirstOrDefaultAsync(item => item.AssignmentId == id, cancellationToken);
        if (entity is null)
        {
            return NotFound(new ErrorResponse("Not found"));
        }

        EntityJsonMerge.ApplyMergedValues(dbContext, entity, request.Fields);
        await dbContext.SaveChangesAsync(cancellationToken);
        return Ok(await BuildResponseAsync(id, cancellationToken));
    }

    [HttpDelete("{id:long}")]
    [Authorize(Policy = PolicyNames.AdminOrAbove)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Delete(long id, CancellationToken cancellationToken)
    {
        var entity = await dbContext.PartnerAssignments.FirstOrDefaultAsync(item => item.AssignmentId == id, cancellationToken);
        if (entity is null)
        {
            return NoContent();
        }

        dbContext.PartnerAssignments.Remove(entity);
        await dbContext.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    private async Task<object?> BuildResponseAsync(long id, CancellationToken cancellationToken)
    {
        return await (from assignment in dbContext.PartnerAssignments.AsNoTracking()
                      join safehouse in dbContext.Safehouses.AsNoTracking() on assignment.SafehouseId equals (long?)safehouse.SafehouseId into safehouseGroup
                      from safehouse in safehouseGroup.DefaultIfEmpty()
                      where assignment.AssignmentId == id
                      select new
                      {
                          assignment.AssignmentId,
                          Id = assignment.AssignmentId,
                          assignment.PartnerId,
                          assignment.SafehouseId,
                          assignment.ProgramArea,
                          AssignmentStart = assignment.AssignmentStart.HasValue ? assignment.AssignmentStart.Value.ToString("yyyy-MM-dd") : null,
                          AssignmentEnd = assignment.AssignmentEnd.HasValue ? assignment.AssignmentEnd.Value.ToString("yyyy-MM-dd") : null,
                          assignment.ResponsibilityNotes,
                          assignment.IsPrimary,
                          assignment.Status,
                          SafehouseName = safehouse.Name
                      }).FirstOrDefaultAsync(cancellationToken);
    }

    public sealed class JsonFieldsRequest
    {
        [JsonExtensionData]
        public Dictionary<string, JsonElement> Fields { get; init; } = new(StringComparer.OrdinalIgnoreCase);
    }
}
