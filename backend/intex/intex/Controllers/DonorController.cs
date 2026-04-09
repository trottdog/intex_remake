using backend.intex.DTOs.Common;
using backend.intex.Infrastructure.Auth;
using backend.intex.Infrastructure.Data.EntityFramework;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.intex.Controllers;

[Authorize(Policy = PolicyNames.DonorOnly)]
[Route("donor")]
public sealed class DonorController(BeaconDbContext dbContext) : ApiControllerBase
{
    [HttpGet("notifications")]
    public async Task<IActionResult> GetNotifications(CancellationToken cancellationToken)
    {
        var supporterId = User.GetSupporterId();
        if (!supporterId.HasValue)
        {
            return Ok(new { data = Array.Empty<object>(), totalUnread = 0 });
        }

        var viewedUpdateIds = await dbContext.DonorViewedItems.AsNoTracking()
            .Where(item => item.SupporterId == supporterId.Value && item.ItemType != null && EF.Functions.ILike(item.ItemType, "update"))
            .Select(item => item.ItemId)
            .ToListAsync(cancellationToken);

        var updates = await dbContext.ProgramUpdates.AsNoTracking()
            .Where(item => item.IsPublished == true)
            .OrderByDescending(item => item.UpdateId)
            .Take(20)
            .Select(item => new
            {
                id = item.UpdateId,
                itemType = "update",
                title = item.Title,
                summary = item.Summary,
                publishedAt = item.PublishedAt ?? item.CreatedAt,
                isRead = viewedUpdateIds.Contains(item.UpdateId)
            })
            .ToListAsync(cancellationToken);

        return Ok(new { data = updates, totalUnread = updates.Count(item => !item.isRead) });
    }

    [HttpPost("viewed-items")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> MarkViewed([FromBody] MarkViewedRequest request, CancellationToken cancellationToken)
    {
        var supporterId = User.GetSupporterId();
        if (!supporterId.HasValue)
        {
            return BadRequest(new ErrorResponse("supporterId is required"));
        }

        if (string.IsNullOrWhiteSpace(request.ItemType) || request.ItemIds is null || request.ItemIds.Count == 0)
        {
            return BadRequest(new ErrorResponse("itemType and itemIds are required"));
        }

        var now = DateTime.UtcNow;
        var itemType = request.ItemType.Trim();
        foreach (var itemId in request.ItemIds.Distinct())
        {
            var exists = await dbContext.DonorViewedItems.AnyAsync(
                item => item.SupporterId == supporterId.Value && item.ItemId == itemId && item.ItemType == itemType,
                cancellationToken);
            if (exists)
            {
                continue;
            }

            dbContext.DonorViewedItems.Add(new Entities.Database.DonorViewedItem
            {
                SupporterId = supporterId.Value,
                ItemId = itemId,
                ItemType = itemType,
                ViewedAt = now
            });
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    public sealed class MarkViewedRequest
    {
        public string? ItemType { get; init; }
        public List<long> ItemIds { get; init; } = [];
    }
}
