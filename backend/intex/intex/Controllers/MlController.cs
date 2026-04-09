using Intex.Infrastructure.Api.Contracts;
using Intex.Infrastructure.Api.Pagination;
using Intex.Infrastructure.Auth;
using Intex.Infrastructure.ExtendedAdmin.Contracts;
using Intex.Infrastructure.SuperAdmin;
using Intex.Infrastructure.SuperAdmin.Contracts;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Intex.Controllers;

[ApiController]
[Route("api/ml")]
[Authorize(Policy = AuthPolicies.StaffOrAbove)]
public sealed class MlController(SuperAdminService superAdminService) : ControllerBase
{
    [HttpGet("predictions")]
    [ProducesResponseType(typeof(PaginatedListEnvelope<MlPredictionResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> ListPredictions(
        [FromQuery] string? pipeline,
        [FromQuery] string? entityType,
        [FromQuery] int? entityId,
        [FromQuery] string? page,
        [FromQuery] string? limit,
        [FromQuery] string? pageSize,
        CancellationToken cancellationToken)
    {
        var pagination = PaginationResolver.Resolve(page, limit, pageSize);
        var response = await superAdminService.ListMlPredictionsAsync(pagination, pipeline, entityType, entityId, cancellationToken);
        return Ok(response);
    }

    [HttpGet("pipelines")]
    [ProducesResponseType(typeof(DataListResponse<MlPipelineResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> ListPipelines(CancellationToken cancellationToken)
    {
        var response = await superAdminService.ListMlPipelinesAsync(cancellationToken);
        return Ok(response);
    }

    [HttpGet("predictions/{entityType}/{entityId:int}")]
    [ProducesResponseType(typeof(PaginatedListEnvelope<MlPredictionResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> ListPredictionsForEntity(
        string entityType,
        int entityId,
        CancellationToken cancellationToken)
    {
        var response = await superAdminService.ListMlPredictionsForEntityAsync(entityType, entityId, cancellationToken);
        return Ok(response);
    }
}
