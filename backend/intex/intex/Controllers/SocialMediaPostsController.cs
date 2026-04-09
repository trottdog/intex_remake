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

[Route("social-media-posts")]
public sealed class SocialMediaPostsController(BeaconDbContext dbContext) : ApiControllerBase
{
    [Authorize(Policy = PolicyNames.DonorOrStaffOrAbove)]
    [HttpGet]
    [ProducesResponseType<StandardPagedResponse<object>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<StandardPagedResponse<object>>> List(
        [FromQuery] int page = 1,
        [FromQuery] int? pageSize = null,
        [FromQuery] int? limit = null,
        [FromQuery] string? platform = null,
        CancellationToken cancellationToken = default)
    {
        var resolvedPage = page <= 0 ? 1 : page;
        var resolvedPageSize = Math.Clamp(pageSize ?? limit ?? 20, 1, 2000);

        var query = dbContext.SocialMediaPosts.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(platform))
        {
            query = query.Where(item => item.Platform != null && EF.Functions.ILike(item.Platform, platform));
        }

        var total = await query.CountAsync(cancellationToken);
        var rows = await query
            .OrderByDescending(item => item.CreatedAt)
            .ThenByDescending(item => item.PostId)
            .Skip((resolvedPage - 1) * resolvedPageSize)
            .Take(resolvedPageSize)
            .Select(item => new
            {
                item.PostId,
                Id = item.PostId,
                item.Platform,
                item.Caption,
                item.PostType,
                item.MediaType,
                item.ContentTopic,
                item.CreatedAt,
                PostDate = item.CreatedAt,
                item.Likes,
                item.Comments,
                item.Shares,
                item.Reach,
                EngagementRate = item.EngagementRate.HasValue ? (decimal?)decimal.Round(item.EngagementRate.Value, 2) : null,
                item.DonationReferrals,
                EstimatedDonationValuePhp = item.EstimatedDonationValuePhp.HasValue ? (decimal?)decimal.Round(item.EstimatedDonationValuePhp.Value, 2) : null,
                ConversionPredictionScore = item.ConversionPredictionScore,
                PredictedReferralCount = item.PredictedReferralCount.HasValue ? (decimal?)decimal.Round(item.PredictedReferralCount.Value, 2) : null,
                PredictedDonationValuePhp = item.PredictedDonationValuePhp.HasValue ? (decimal?)decimal.Round(item.PredictedDonationValuePhp.Value, 2) : null,
                item.ConversionBand
            })
            .ToListAsync(cancellationToken);

        var totalPages = total == 0 ? 0 : (int)Math.Ceiling(total / (double)resolvedPageSize);
        return Ok(new StandardPagedResponse<object>(
            rows.Cast<object>().ToList(),
            total,
            new StandardPaginationMeta(resolvedPage, resolvedPageSize, totalPages, resolvedPage < totalPages, resolvedPage > 1)));
    }

    [Authorize(Policy = PolicyNames.DonorOrStaffOrAbove)]
    [HttpGet("{id:long}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Get(long id, CancellationToken cancellationToken)
    {
        var item = await BuildResponseAsync(id, cancellationToken);
        return item is null ? NotFound(new ErrorResponse("Not found")) : Ok(item);
    }

    [Authorize(Policy = PolicyNames.StaffOrAbove)]
    [HttpPost]
    [ProducesResponseType(StatusCodes.Status201Created)]
    public async Task<IActionResult> Create([FromBody] JsonFieldsRequest request, CancellationToken cancellationToken)
    {
        var entity = EntityJsonMerge.DeserializeEntity<SocialMediaPost>(request.Fields);
        dbContext.SocialMediaPosts.Add(entity);
        await dbContext.SaveChangesAsync(cancellationToken);
        return StatusCode(StatusCodes.Status201Created, await BuildResponseAsync(entity.PostId, cancellationToken));
    }

    [Authorize(Policy = PolicyNames.StaffOrAbove)]
    [HttpPatch("{id:long}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Update(long id, [FromBody] JsonFieldsRequest request, CancellationToken cancellationToken)
    {
        var entity = await dbContext.SocialMediaPosts.FirstOrDefaultAsync(item => item.PostId == id, cancellationToken);
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
        var entity = await dbContext.SocialMediaPosts.FirstOrDefaultAsync(item => item.PostId == id, cancellationToken);
        if (entity is null)
        {
            return NoContent();
        }

        dbContext.SocialMediaPosts.Remove(entity);
        await dbContext.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    [Authorize(Policy = PolicyNames.DonorOrStaffOrAbove)]
    [HttpGet("analytics")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> Analytics(CancellationToken cancellationToken)
    {
        var totalPosts = await dbContext.SocialMediaPosts.AsNoTracking().CountAsync(cancellationToken);
        var totalReach = await dbContext.SocialMediaPosts.AsNoTracking().SumAsync(item => (long?)item.Reach, cancellationToken) ?? 0L;
        var avgEngagementRate = await dbContext.SocialMediaPosts.AsNoTracking().AverageAsync(item => (decimal?)item.EngagementRate, cancellationToken) ?? 0m;
        var donationReferrals = await dbContext.SocialMediaPosts.AsNoTracking().SumAsync(item => (long?)item.DonationReferrals, cancellationToken) ?? 0L;

        var byPlatform = await dbContext.SocialMediaPosts.AsNoTracking()
            .GroupBy(item => item.Platform ?? "Unknown")
            .Select(group => new
            {
                platform = group.Key,
                count = group.Count(),
                reach = group.Sum(item => item.Reach ?? 0)
            })
            .OrderByDescending(item => item.count)
            .ToListAsync(cancellationToken);

        return Ok(new
        {
            totalPosts,
            totalReach,
            avgEngagementRate = decimal.Round(avgEngagementRate, 2),
            donationReferrals,
            byPlatform
        });
    }

    private async Task<object?> BuildResponseAsync(long id, CancellationToken cancellationToken)
    {
        return await dbContext.SocialMediaPosts.AsNoTracking()
            .Where(item => item.PostId == id)
            .Select(item => new
            {
                item.PostId,
                Id = item.PostId,
                item.Platform,
                item.Caption,
                item.PostType,
                item.MediaType,
                item.ContentTopic,
                item.CreatedAt,
                PostDate = item.CreatedAt,
                item.Likes,
                item.Comments,
                item.Shares,
                item.Reach,
                EngagementRate = item.EngagementRate.HasValue ? (decimal?)decimal.Round(item.EngagementRate.Value, 2) : null,
                item.DonationReferrals,
                EstimatedDonationValuePhp = item.EstimatedDonationValuePhp.HasValue ? (decimal?)decimal.Round(item.EstimatedDonationValuePhp.Value, 2) : null,
                ConversionPredictionScore = item.ConversionPredictionScore,
                PredictedReferralCount = item.PredictedReferralCount.HasValue ? (decimal?)decimal.Round(item.PredictedReferralCount.Value, 2) : null,
                PredictedDonationValuePhp = item.PredictedDonationValuePhp.HasValue ? (decimal?)decimal.Round(item.PredictedDonationValuePhp.Value, 2) : null,
                item.ConversionBand
            })
            .FirstOrDefaultAsync(cancellationToken);
    }

    public sealed class JsonFieldsRequest
    {
        [JsonExtensionData]
        public Dictionary<string, JsonElement> Fields { get; init; } = new(StringComparer.OrdinalIgnoreCase);
    }
}
