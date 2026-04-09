using backend.intex.DTOs.Common;
using backend.intex.DTOs.Safehouses;
using backend.intex.Infrastructure.Auth;
using backend.intex.Services.Abstractions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.intex.Controllers;

[Authorize(Policy = PolicyNames.StaffOrAbove)]
[Route("safehouses")]
public sealed class SafehousesController(ISafehouseService safehouseService) : ApiControllerBase
{
    [HttpGet]
    [ProducesResponseType<StandardPagedResponse<SafehouseResponseDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<StandardPagedResponse<SafehouseResponseDto>>> ListSafehouses([FromQuery] ListSafehousesQuery query, CancellationToken cancellationToken)
        => Ok(await safehouseService.ListSafehousesAsync(query, cancellationToken));

    [HttpGet("{id:long}")]
    [ProducesResponseType<SafehouseResponseDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SafehouseResponseDto>> GetSafehouse(long id, CancellationToken cancellationToken)
    {
        var safehouse = await safehouseService.GetSafehouseAsync(id, cancellationToken);
        return safehouse is null ? NotFound(new ErrorResponse("Not found")) : Ok(safehouse);
    }

    [HttpGet("{id:long}/metrics")]
    [ProducesResponseType<IReadOnlyList<SafehouseMetricDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<SafehouseMetricDto>>> GetMetrics(long id, [FromQuery] SafehouseMetricsQuery query, CancellationToken cancellationToken)
        => Ok(await safehouseService.GetSafehouseMetricsAsync(id, query.Months, cancellationToken));

    [Authorize(Policy = PolicyNames.AdminOrAbove)]
    [HttpPost]
    [ProducesResponseType<SafehouseResponseDto>(StatusCodes.Status201Created)]
    public async Task<ActionResult<SafehouseResponseDto>> CreateSafehouse([FromBody] CreateSafehouseRequest request, CancellationToken cancellationToken)
    {
        var created = await safehouseService.CreateSafehouseAsync(request, cancellationToken);
        return StatusCode(StatusCodes.Status201Created, created);
    }

    [Authorize(Policy = PolicyNames.AdminOrAbove)]
    [HttpPatch("{id:long}")]
    [ProducesResponseType<SafehouseResponseDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<SafehouseResponseDto>> UpdateSafehouse(long id, [FromBody] UpdateSafehouseRequest request, CancellationToken cancellationToken)
    {
        var updated = await safehouseService.UpdateSafehouseAsync(id, request, cancellationToken);
        return updated is null ? NotFound(new ErrorResponse("Not found")) : Ok(updated);
    }

    [Authorize(Policy = PolicyNames.AdminOrAbove)]
    [HttpDelete("{id:long}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> DeleteSafehouse(long id, CancellationToken cancellationToken)
    {
        await safehouseService.DeleteSafehouseAsync(id, cancellationToken);
        return NoContent();
    }
}
