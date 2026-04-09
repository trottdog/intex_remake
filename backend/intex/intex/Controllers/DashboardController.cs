using Intex.Infrastructure.AdminStaff;
using Intex.Infrastructure.AdminStaff.Contracts;
using Intex.Infrastructure.Auth;
using Intex.Infrastructure.Auth.Contracts;
using Intex.Infrastructure.Auth.Principal;
using Intex.Infrastructure.Donor;
using Intex.Infrastructure.Donor.Contracts;
using Intex.Infrastructure.Public;
using Intex.Infrastructure.Public.Contracts;
using Intex.Infrastructure.SuperAdmin;
using Intex.Infrastructure.SuperAdmin.Contracts;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Intex.Controllers;

[ApiController]
[Route("api/dashboard")]
public sealed class DashboardController(
    AdminStaffReadService adminStaffReadService,
    PublicReadService publicReadService,
    DonorPortalService donorPortalService,
    SuperAdminService superAdminService) : ControllerBase
{
    [Authorize(Policy = AuthPolicies.StaffOrAbove)]
    [HttpGet("admin-summary")]
    [ProducesResponseType(typeof(AdminDashboardSummaryResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAdminSummary(CancellationToken cancellationToken)
    {
        var response = await adminStaffReadService.GetAdminDashboardSummaryAsync(cancellationToken);
        return Ok(response);
    }

    [AllowAnonymous]
    [HttpGet("public-impact")]
    [ProducesResponseType(typeof(PublicImpactSummaryResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPublicImpact(CancellationToken cancellationToken)
    {
        var response = await publicReadService.GetPublicImpactAsync(cancellationToken);
        return Ok(response);
    }

    [Authorize(Policy = AuthPolicies.DonorOnly)]
    [HttpGet("donor-summary")]
    [ProducesResponseType(typeof(DonorDashboardSummaryResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetDonorSummary(CancellationToken cancellationToken)
    {
        var authenticatedUser = User.GetAuthenticatedUser()
            ?? throw new InvalidOperationException("Authenticated user context was expected.");

        var response = await donorPortalService.GetDonorDashboardSummaryAsync(authenticatedUser, cancellationToken);
        return Ok(response);
    }

    [Authorize(Policy = AuthPolicies.SuperAdminOnly)]
    [HttpGet("executive-summary")]
    [ProducesResponseType(typeof(ExecutiveDashboardSummaryResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetExecutiveSummary(CancellationToken cancellationToken)
    {
        var response = await superAdminService.GetExecutiveDashboardSummaryAsync(cancellationToken);
        return Ok(response);
    }
}
