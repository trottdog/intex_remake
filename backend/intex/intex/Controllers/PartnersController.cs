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
[Route("partners")]
public sealed class PartnersController(BeaconDbContext dbContext) : ApiControllerBase
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

        var query = dbContext.Partners.AsNoTracking();
        var total = await query.CountAsync(cancellationToken);
        var rows = await query
            .OrderBy(item => item.PartnerName)
            .ThenBy(item => item.PartnerId)
            .Skip((resolvedPage - 1) * resolvedPageSize)
            .Take(resolvedPageSize)
            .Select(item => new
            {
                item.PartnerId,
                Id = item.PartnerId,
                item.PartnerName,
                Name = item.PartnerName,
                item.PartnerType,
                item.RoleType,
                item.ContactName,
                ContactEmail = item.Email,
                item.Email,
                item.Phone,
                item.Region,
                item.Status,
                StartDate = item.StartDate.HasValue ? item.StartDate.Value.ToString("yyyy-MM-dd") : null,
                EndDate = item.EndDate.HasValue ? item.EndDate.Value.ToString("yyyy-MM-dd") : null,
                item.Notes
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
        var entity = EntityJsonMerge.DeserializeEntity<Partner>(request.Fields);
        dbContext.Partners.Add(entity);
        await dbContext.SaveChangesAsync(cancellationToken);
        return StatusCode(StatusCodes.Status201Created, await BuildResponseAsync(entity.PartnerId, cancellationToken));
    }

    [HttpPatch("{id:long}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Update(long id, [FromBody] JsonFieldsRequest request, CancellationToken cancellationToken)
    {
        var entity = await dbContext.Partners.FirstOrDefaultAsync(item => item.PartnerId == id, cancellationToken);
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
        var entity = await dbContext.Partners.FirstOrDefaultAsync(item => item.PartnerId == id, cancellationToken);
        if (entity is null)
        {
            return NoContent();
        }

        dbContext.Partners.Remove(entity);
        await dbContext.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    private async Task<object?> BuildResponseAsync(long id, CancellationToken cancellationToken)
    {
        return await dbContext.Partners.AsNoTracking()
            .Where(item => item.PartnerId == id)
            .Select(item => new
            {
                item.PartnerId,
                Id = item.PartnerId,
                item.PartnerName,
                Name = item.PartnerName,
                item.PartnerType,
                item.RoleType,
                item.ContactName,
                ContactEmail = item.Email,
                item.Email,
                item.Phone,
                item.Region,
                item.Status,
                StartDate = item.StartDate.HasValue ? item.StartDate.Value.ToString("yyyy-MM-dd") : null,
                EndDate = item.EndDate.HasValue ? item.EndDate.Value.ToString("yyyy-MM-dd") : null,
                item.Notes
            })
            .FirstOrDefaultAsync(cancellationToken);
    }

    public sealed class JsonFieldsRequest
    {
        [JsonExtensionData]
        public Dictionary<string, JsonElement> Fields { get; init; } = new(StringComparer.OrdinalIgnoreCase);
    }
}
