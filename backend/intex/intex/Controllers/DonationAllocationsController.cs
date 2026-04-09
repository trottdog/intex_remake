using Intex.Infrastructure.Auth;
using Intex.Infrastructure.Auth.Contracts;
using Intex.Infrastructure.Auth.Principal;
using Intex.Infrastructure.AdminStaff;
using Intex.Infrastructure.AdminStaff.Contracts;
using Intex.Infrastructure.Api.Contracts;
using Intex.Infrastructure.Donor;
using Intex.Infrastructure.Donor.Contracts;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Intex.Controllers;

[ApiController]
[Route("api/donation-allocations")]
public sealed class DonationAllocationsController(DonorPortalService donorPortalService) : ControllerBase
{
    [Authorize(Policy = AuthPolicies.StaffOrAbove)]
    [HttpPost]
    [ProducesResponseType(typeof(DonationAllocationResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Create(
        [FromServices] AdminStaffMutationService adminStaffMutationService,
        [FromBody] CreateDonationAllocationRequest? request,
        CancellationToken cancellationToken)
    {
        var response = await adminStaffMutationService.CreateDonationAllocationAsync(request, cancellationToken);
        return StatusCode(StatusCodes.Status201Created, response);
    }

    [Authorize(Policy = AuthPolicies.DonorOrStaffOrAbove)]
    [HttpGet]
    [ProducesResponseType(typeof(DonationAllocationListResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> List(
        [FromQuery] int? donationId,
        [FromQuery] int? safehouseId,
        CancellationToken cancellationToken)
    {
        var authenticatedUser = GetRequiredAuthenticatedUser();
        var response = await donorPortalService.GetDonationAllocationsAsync(
            authenticatedUser,
            authenticatedUser.Role,
            donationId,
            safehouseId,
            cancellationToken);

        return Ok(response);
    }

    private AuthenticatedUser GetRequiredAuthenticatedUser()
    {
        return User.GetAuthenticatedUser()
            ?? throw new InvalidOperationException("Authenticated user context was expected.");
    }
}
