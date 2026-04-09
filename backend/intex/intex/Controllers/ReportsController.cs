using Intex.Infrastructure.Auth;
using Intex.Infrastructure.ExtendedAdmin;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Intex.Controllers;

[ApiController]
[Route("api/reports")]
[Authorize(Policy = AuthPolicies.StaffOrAbove)]
public sealed class ReportsController(ExtendedAdminService service) : ControllerBase
{
    [HttpGet("donation-trends")]
    public async Task<IActionResult> GetDonationTrends(CancellationToken cancellationToken)
        => Ok(await service.GetDonationTrendReportAsync(cancellationToken));

    [HttpGet("accomplishments")]
    public async Task<IActionResult> GetAccomplishments(CancellationToken cancellationToken)
        => Ok(await service.GetAccomplishmentsReportAsync(cancellationToken));

    [HttpGet("reintegration-stats")]
    public async Task<IActionResult> GetReintegrationStats(CancellationToken cancellationToken)
        => Ok(await service.GetReintegrationStatsReportAsync(cancellationToken));
}
