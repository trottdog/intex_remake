using backend.intex.DTOs.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.intex.Controllers;

[AllowAnonymous]
[Route("healthz")]
public sealed class HealthController : ApiControllerBase
{
    [HttpGet]
    [ProducesResponseType<HealthStatusResponse>(StatusCodes.Status200OK)]
    public ActionResult<HealthStatusResponse> Get() => Ok(new HealthStatusResponse("ok"));
}
