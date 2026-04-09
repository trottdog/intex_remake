using Intex.Infrastructure.AdminStaff;
using Intex.Infrastructure.AdminStaff.Contracts;
using Intex.Infrastructure.Api.Contracts;
using Intex.Infrastructure.Api.Pagination;
using Intex.Infrastructure.Auth;
using Intex.Infrastructure.Auth.Contracts;
using Intex.Infrastructure.Auth.Principal;
using Intex.Infrastructure.Donor;
using Intex.Infrastructure.Donor.Contracts;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Intex.Controllers;

[ApiController]
[Route("api/donations")]
public sealed class DonationsController(
    DonorPortalService donorPortalService,
    AdminStaffReadService adminStaffReadService) : ControllerBase
{
    [Authorize(Policy = AuthPolicies.StaffOrAbove)]
    [HttpPost]
    [ProducesResponseType(typeof(DonationListItemResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Create(
        [FromServices] AdminStaffMutationService adminStaffMutationService,
        [FromBody] CreateDonationRequest? request,
        CancellationToken cancellationToken)
    {
        var response = await adminStaffMutationService.CreateDonationAsync(request, cancellationToken);
        return StatusCode(StatusCodes.Status201Created, response);
    }

    [Authorize(Policy = AuthPolicies.StaffOrAbove)]
    [HttpGet("trends")]
    [ProducesResponseType(typeof(DonationTrendListResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetTrends(
        [FromQuery] int? months,
        CancellationToken cancellationToken)
    {
        var response = await adminStaffReadService.GetDonationTrendsAsync(months ?? 12, cancellationToken);
        return Ok(response);
    }

    [Authorize(Policy = AuthPolicies.DonorOnly)]
    [HttpGet("my-ledger")]
    [ProducesResponseType(typeof(PaginatedListEnvelope<DonationLedgerItemResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetMyLedger(
        [FromQuery] string? page,
        [FromQuery] string? limit,
        [FromQuery] string? pageSize,
        CancellationToken cancellationToken)
    {
        var authenticatedUser = GetRequiredAuthenticatedUser();
        var pagination = PaginationResolver.Resolve(page, limit, pageSize);
        var response = await donorPortalService.GetMyDonationLedgerAsync(authenticatedUser, pagination, cancellationToken);
        return Ok(response);
    }

    [Authorize(Policy = AuthPolicies.StaffOrAbove)]
    [HttpGet]
    [ProducesResponseType(typeof(PaginatedListEnvelope<DonationListItemResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> List(
        [FromQuery] string? page,
        [FromQuery] string? limit,
        [FromQuery] string? pageSize,
        [FromQuery] int? supporterId,
        CancellationToken cancellationToken)
    {
        var pagination = PaginationResolver.Resolve(page, limit, pageSize);
        var response = await adminStaffReadService.ListDonationsAsync(pagination, supporterId, cancellationToken);
        return Ok(response);
    }

    [Authorize(Policy = AuthPolicies.AnyAuthenticatedUser)]
    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(DonationLedgerItemResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(int id, CancellationToken cancellationToken)
    {
        var authenticatedUser = GetRequiredAuthenticatedUser();
        var response = await donorPortalService.GetDonationByIdAsync(
            authenticatedUser,
            authenticatedUser.Role,
            id,
            cancellationToken);

        return Ok(response);
    }

    [Authorize(Policy = AuthPolicies.StaffOrAbove)]
    [HttpPatch("{id:int}")]
    [ProducesResponseType(typeof(DonationListItemResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Update(
        int id,
        [FromServices] AdminStaffMutationService adminStaffMutationService,
        [FromBody] UpdateDonationRequest? request,
        CancellationToken cancellationToken)
    {
        var response = await adminStaffMutationService.UpdateDonationAsync(id, request, cancellationToken);
        return Ok(response);
    }

    [Authorize(Policy = AuthPolicies.AdminOrAbove)]
    [HttpDelete("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(
        int id,
        [FromServices] AdminStaffMutationService adminStaffMutationService,
        CancellationToken cancellationToken)
    {
        await adminStaffMutationService.DeleteDonationAsync(id, cancellationToken);
        return NoContent();
    }

    private AuthenticatedUser GetRequiredAuthenticatedUser()
    {
        return User.GetAuthenticatedUser()
            ?? throw new InvalidOperationException("Authenticated user context was expected.");
    }
}
