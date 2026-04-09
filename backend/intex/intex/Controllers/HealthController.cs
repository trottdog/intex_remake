using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Intex.Controllers;

[ApiController]
[AllowAnonymous]
public sealed class HealthController : ControllerBase
{
    [HttpGet("/api/healthz")]
    public IActionResult GetHealth()
    {
        return Ok(new { status = "ok" });
    }
}
