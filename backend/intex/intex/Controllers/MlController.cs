using backend.intex.DTOs.Common;
using backend.intex.Infrastructure.Auth;
using backend.intex.Infrastructure.Data.EntityFramework;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace backend.intex.Controllers;

[Authorize(Policy = PolicyNames.StaffOrAbove)]
[Route("ml")]
public sealed class MlController(BeaconDbContext dbContext) : ApiControllerBase
{
    [HttpGet("pipelines")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> ListPipelines(CancellationToken cancellationToken)
    {
        var rows = await dbContext.MlPipelineRuns.AsNoTracking()
            .OrderByDescending(item => item.TrainedAt)
            .ThenByDescending(item => item.RunId)
            .Select(item => new
            {
                item.RunId,
                Id = item.RunId,
                item.PipelineName,
                item.DisplayName,
                item.ModelName,
                item.Status,
                TrainedAt = item.TrainedAt,
                LastRetrained = item.TrainedAt,
                item.DataSource,
                item.ScoredEntityCount
            })
            .ToListAsync(cancellationToken);

        return Ok(new { data = rows });
    }

    [HttpGet("predictions")]
    [ProducesResponseType<StandardPagedResponse<object>>(StatusCodes.Status200OK)]
    public async Task<IActionResult> ListPredictions(
        [FromQuery] int page = 1,
        [FromQuery] int? pageSize = null,
        [FromQuery] string? entityType = null,
        CancellationToken cancellationToken = default)
    {
        var resolvedPage = page <= 0 ? 1 : page;
        var resolvedPageSize = Math.Clamp(pageSize ?? 20, 1, 2000);
        var query = dbContext.MlPredictionSnapshots.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(entityType))
        {
            query = query.Where(item => EF.Functions.ILike(item.EntityType, entityType));
        }

        var total = await query.CountAsync(cancellationToken);
        var rows = await query
            .OrderByDescending(item => item.RecordTimestamp)
            .ThenByDescending(item => item.PredictionId)
            .Skip((resolvedPage - 1) * resolvedPageSize)
            .Take(resolvedPageSize)
            .Select(item => new
            {
                item.PredictionId,
                Id = item.PredictionId,
                item.RunId,
                item.PipelineName,
                item.EntityType,
                item.EntityId,
                item.EntityKey,
                item.EntityLabel,
                item.SafehouseId,
                item.RecordTimestamp,
                item.PredictionValue,
                item.PredictionScore,
                ConfidenceScore = (double?)null,
                item.RankOrder,
                CreatedAt = item.CreatedAt
            })
            .ToListAsync(cancellationToken);

        var totalPages = total == 0 ? 0 : (int)Math.Ceiling(total / (double)resolvedPageSize);
        return Ok(new StandardPagedResponse<object>(
            rows.Cast<object>().ToList(),
            total,
            new StandardPaginationMeta(resolvedPage, resolvedPageSize, totalPages, resolvedPage < totalPages, resolvedPage > 1)));
    }

    [HttpGet("insights")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetInsights(CancellationToken cancellationToken)
    {
        var totalPredictions = await dbContext.MlPredictionSnapshots.AsNoTracking().CountAsync(cancellationToken);
        var activePipelines = await dbContext.MlPipelineRuns.AsNoTracking()
            .Select(item => item.PipelineName)
            .Distinct()
            .CountAsync(cancellationToken);
        var avgConfidence = await dbContext.MlPredictionSnapshots.AsNoTracking()
            .AverageAsync(item => (double?)item.PredictionScore, cancellationToken) ?? 0d;

        var recentPredictions = await dbContext.MlPredictionSnapshots.AsNoTracking()
            .OrderByDescending(item => item.RecordTimestamp)
            .ThenByDescending(item => item.PredictionId)
            .Take(10)
            .Select(item => new
            {
                item.PredictionId,
                Id = item.PredictionId,
                item.RunId,
                item.PipelineName,
                item.EntityType,
                item.EntityId,
                item.EntityKey,
                item.EntityLabel,
                item.SafehouseId,
                item.RecordTimestamp,
                item.PredictionValue,
                item.PredictionScore,
                item.RankOrder,
                CreatedAt = item.CreatedAt
            })
            .ToListAsync(cancellationToken);

        var pipelines = await dbContext.MlPipelineRuns.AsNoTracking()
            .OrderByDescending(item => item.TrainedAt)
            .Take(20)
            .Select(item => new
            {
                item.RunId,
                Id = item.RunId,
                item.PipelineName,
                item.DisplayName,
                item.ModelName,
                item.Status,
                TrainedAt = item.TrainedAt,
                LastRetrained = item.TrainedAt,
                item.DataSource
            })
            .ToListAsync(cancellationToken);

        return Ok(new
        {
            totalPredictions,
            activePipelines,
            avgConfidence = Math.Round(avgConfidence, 4),
            recentPredictions,
            pipelines
        });
    }
}
