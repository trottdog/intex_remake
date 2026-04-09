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
[Route("in-kind-donation-items")]
public sealed class InKindDonationItemsController(BeaconDbContext dbContext) : ApiControllerBase
{
    [HttpGet]
    [ProducesResponseType<StandardPagedResponse<object>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<StandardPagedResponse<object>>> List(
        [FromQuery] int page = 1,
        [FromQuery] int? pageSize = null,
        [FromQuery] int? limit = null,
        [FromQuery] long? donationId = null,
        [FromQuery] string? itemCategory = null,
        CancellationToken cancellationToken = default)
    {
        var resolvedPage = page <= 0 ? 1 : page;
        var resolvedPageSize = Math.Clamp(pageSize ?? limit ?? 20, 1, 2000);

        var query = dbContext.InKindDonationItems.AsNoTracking();
        if (donationId.HasValue)
        {
            query = query.Where(item => item.DonationId == donationId.Value);
        }

        if (!string.IsNullOrWhiteSpace(itemCategory))
        {
            query = query.Where(item => item.ItemCategory != null && EF.Functions.ILike(item.ItemCategory, itemCategory));
        }

        var total = await query.CountAsync(cancellationToken);
        var rows = await query
            .OrderByDescending(item => item.ItemId)
            .Skip((resolvedPage - 1) * resolvedPageSize)
            .Take(resolvedPageSize)
            .Select(item => new
            {
                item.ItemId,
                Id = item.ItemId,
                item.DonationId,
                item.ItemName,
                item.ItemCategory,
                Quantity = item.Quantity.HasValue ? (decimal?)decimal.Round(item.Quantity.Value, 2) : null,
                item.UnitOfMeasure,
                EstimatedUnitValue = item.EstimatedUnitValue.HasValue ? (decimal?)decimal.Round(item.EstimatedUnitValue.Value, 2) : null,
                item.IntendedUse,
                item.ReceivedCondition
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
        var entity = EntityJsonMerge.DeserializeEntity<InKindDonationItem>(request.Fields);
        dbContext.InKindDonationItems.Add(entity);
        await dbContext.SaveChangesAsync(cancellationToken);
        return StatusCode(StatusCodes.Status201Created, await BuildResponseAsync(entity.ItemId, cancellationToken));
    }

    [HttpGet("{id:long}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Get(long id, CancellationToken cancellationToken)
    {
        var item = await BuildResponseAsync(id, cancellationToken);
        return item is null ? NotFound(new ErrorResponse("Not found")) : Ok(item);
    }

    [Authorize(Policy = PolicyNames.AdminOrAbove)]
    [HttpDelete("{id:long}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Delete(long id, CancellationToken cancellationToken)
    {
        var entity = await dbContext.InKindDonationItems.FirstOrDefaultAsync(item => item.ItemId == id, cancellationToken);
        if (entity is not null)
        {
            dbContext.InKindDonationItems.Remove(entity);
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        return NoContent();
    }

    private async Task<object?> BuildResponseAsync(long id, CancellationToken cancellationToken)
    {
        return await dbContext.InKindDonationItems.AsNoTracking()
            .Where(item => item.ItemId == id)
            .Select(item => new
            {
                item.ItemId,
                Id = item.ItemId,
                item.DonationId,
                item.ItemName,
                item.ItemCategory,
                Quantity = item.Quantity.HasValue ? (decimal?)decimal.Round(item.Quantity.Value, 2) : null,
                item.UnitOfMeasure,
                EstimatedUnitValue = item.EstimatedUnitValue.HasValue ? (decimal?)decimal.Round(item.EstimatedUnitValue.Value, 2) : null,
                item.IntendedUse,
                item.ReceivedCondition
            })
            .FirstOrDefaultAsync(cancellationToken);
    }

    public sealed class JsonFieldsRequest
    {
        [JsonExtensionData]
        public Dictionary<string, JsonElement> Fields { get; init; } = new(StringComparer.OrdinalIgnoreCase);
    }
}
