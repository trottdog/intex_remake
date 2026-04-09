using backend.intex.DTOs.Common;
using backend.intex.Infrastructure.Data.EntityFramework;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.intex.Controllers;

[AllowAnonymous]
[Route("healthz")]
public sealed class HealthController(BeaconDbContext dbContext) : ApiControllerBase
{
    [HttpGet]
    [ProducesResponseType<HealthStatusResponse>(StatusCodes.Status200OK)]
    public ActionResult<HealthStatusResponse> Get() => Ok(new HealthStatusResponse("ok"));

    [HttpGet("ready")]
    [ProducesResponseType<HealthStatusResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status503ServiceUnavailable)]
    public async Task<ActionResult<HealthStatusResponse>> Ready(CancellationToken cancellationToken)
    {
        var canConnect = await dbContext.Database.CanConnectAsync(cancellationToken);
        if (!canConnect)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new ErrorResponse("Database not ready"));
        }

        return Ok(new HealthStatusResponse("ok"));
    }
}
