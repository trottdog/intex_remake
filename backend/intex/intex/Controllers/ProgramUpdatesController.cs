using System.Text.Json;
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
        var orderedQuery = role == BeaconRoles.Donor
            ? query.OrderByDescending(item => item.PublishedAt).ThenByDescending(item => item.UpdateId)
            : query.OrderByDescending(item => item.CreatedAt).ThenByDescending(item => item.UpdateId);

        var rows = await orderedQuery
            .Skip((resolvedPage - 1) * resolvedPageSize)
            .Take(resolvedPageSize)
            .Select(item => new
            {
                item.UpdateId,
                Id = item.UpdateId,
                item.Title,
                Content = item.Summary,
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

    [Authorize(Policy = PolicyNames.StaffOrAbove)]
    [HttpPost]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Create([FromBody] UpsertProgramUpdateRequest request, CancellationToken cancellationToken)
    {
        var title = request.Title?.Trim();
        if (string.IsNullOrWhiteSpace(title))
        {
            return BadRequest(new ErrorResponse("title is required"));
        }

        var now = DateTime.UtcNow;
        var entity = new ProgramUpdate
        {
            Title = title,
            Summary = request.Summary ?? request.Content,
            Category = NormalizeNullable(request.Category),
            IsPublished = request.IsPublished,
            PublishedAt = request.IsPublished == true ? now : null,
            CreatedBy = User.GetUserId(),
            CreatedAt = now,
            UpdatedAt = now
        };

        dbContext.ProgramUpdates.Add(entity);
        await dbContext.SaveChangesAsync(cancellationToken);
        return StatusCode(StatusCodes.Status201Created, await BuildResponseAsync(entity.UpdateId, cancellationToken));
    }

    [Authorize(Policy = PolicyNames.StaffOrAbove)]
    [HttpPatch("{id:long}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Update(long id, [FromBody] UpsertProgramUpdateRequest request, CancellationToken cancellationToken)
    {
        var entity = await dbContext.ProgramUpdates.FirstOrDefaultAsync(item => item.UpdateId == id, cancellationToken);
        if (entity is null)
        {
            return NotFound(new ErrorResponse("Not found"));
        }

        var now = DateTime.UtcNow;
        var entry = dbContext.Entry(entity);

        if (request.Title is not null)
        {
            var title = request.Title.Trim();
            if (string.IsNullOrWhiteSpace(title))
            {
                return BadRequest(new ErrorResponse("title is required"));
            }

            entry.Property(nameof(ProgramUpdate.Title)).CurrentValue = title;
        }

        if (request.Summary is not null || request.Content is not null)
        {
            entry.Property(nameof(ProgramUpdate.Summary)).CurrentValue = request.Summary ?? request.Content;
        }

        if (request.Category is not null)
        {
            entry.Property(nameof(ProgramUpdate.Category)).CurrentValue = NormalizeNullable(request.Category);
        }

        if (request.IsPublished.HasValue)
        {
            entry.Property(nameof(ProgramUpdate.IsPublished)).CurrentValue = request.IsPublished;
            if (request.IsPublished == true && !entity.PublishedAt.HasValue)
            {
                entry.Property(nameof(ProgramUpdate.PublishedAt)).CurrentValue = now;
            }
        }

        entry.Property(nameof(ProgramUpdate.UpdatedAt)).CurrentValue = now;
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
                Content = item.Summary,
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

    public sealed class UpsertProgramUpdateRequest
    {
        public string? Title { get; init; }
        public string? Summary { get; init; }
        public string? Content { get; init; }
        public string? Category { get; init; }
        public bool? IsPublished { get; init; }
    }

    private static string? NormalizeNullable(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
