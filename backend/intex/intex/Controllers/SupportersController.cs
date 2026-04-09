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
[Route("api/supporters")]
public sealed class SupportersController(
    DonorPortalService donorPortalService,
    AdminStaffReadService adminStaffReadService) : ControllerBase
{
    [Authorize(Policy = AuthPolicies.StaffOrAbove)]
    [HttpPost]
    [ProducesResponseType(typeof(SupporterMeResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Create(
        [FromServices] AdminStaffMutationService adminStaffMutationService,
        [FromBody] CreateSupporterRequest? request,
        CancellationToken cancellationToken)
    {
        var response = await adminStaffMutationService.CreateSupporterAsync(request, cancellationToken);
        return StatusCode(StatusCodes.Status201Created, response);
    }

    [Authorize(Policy = AuthPolicies.StaffOrAbove)]
    [HttpGet("stats")]
    [ProducesResponseType(typeof(SupporterStatsResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetStats(CancellationToken cancellationToken)
    {
        var response = await adminStaffReadService.GetSupporterStatsAsync(cancellationToken);
        return Ok(response);
    }

    [Authorize(Policy = AuthPolicies.DonorOnly)]
    [HttpGet("me")]
    [ProducesResponseType(typeof(SupporterMeResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetMe(CancellationToken cancellationToken)
    {
        var authenticatedUser = GetRequiredAuthenticatedUser();
        var response = await donorPortalService.GetMySupporterProfileAsync(authenticatedUser, cancellationToken);
        return Ok(response);
    }

    [Authorize(Policy = AuthPolicies.DonorOnly)]
    [HttpPatch("me")]
    [ProducesResponseType(typeof(SupporterMeResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> PatchMe(
        [FromBody] UpdateMySupporterProfileRequest? request,
        CancellationToken cancellationToken)
    {
        request ??= new UpdateMySupporterProfileRequest(null, null, null, null, null);

        var authenticatedUser = GetRequiredAuthenticatedUser();
        var response = await donorPortalService.UpdateMySupporterProfileAsync(authenticatedUser, request, cancellationToken);
        return Ok(response);
    }

    [Authorize(Policy = AuthPolicies.StaffOrAbove)]
    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(SupporterMeResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(int id, CancellationToken cancellationToken)
    {
        var response = await adminStaffReadService.GetSupporterAsync(id, cancellationToken);
        return Ok(response);
    }

    [Authorize(Policy = AuthPolicies.DonorOrStaffOrAbove)]
    [HttpGet("{id:int}/giving-stats")]
    [ProducesResponseType(typeof(SupporterGivingStatsResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetGivingStats(int id, CancellationToken cancellationToken)
    {
        var authenticatedUser = GetRequiredAuthenticatedUser();
        var response = await donorPortalService.GetSupporterGivingStatsAsync(
            authenticatedUser,
            authenticatedUser.Role,
            id,
            cancellationToken);

        return Ok(response);
    }

    [Authorize(Policy = AuthPolicies.StaffOrAbove)]
    [HttpGet]
    [ProducesResponseType(typeof(PaginatedListEnvelope<SupporterListItemResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> List(
        [FromQuery] string? page,
        [FromQuery] string? limit,
        [FromQuery] string? pageSize,
        CancellationToken cancellationToken)
    {
        var pagination = PaginationResolver.Resolve(page, limit, pageSize);
        var response = await adminStaffReadService.ListSupportersAsync(pagination, cancellationToken);
        return Ok(response);
    }

    [Authorize(Policy = AuthPolicies.StaffOrAbove)]
    [HttpPatch("{id:int}")]
    [ProducesResponseType(typeof(SupporterMeResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Update(
        int id,
        [FromServices] AdminStaffMutationService adminStaffMutationService,
        [FromBody] UpdateSupporterRequest? request,
        CancellationToken cancellationToken)
    {
        var response = await adminStaffMutationService.UpdateSupporterAsync(id, request, cancellationToken);
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
        await adminStaffMutationService.DeleteSupporterAsync(id, cancellationToken);
        return NoContent();
    }

    private AuthenticatedUser GetRequiredAuthenticatedUser()
    {
        return User.GetAuthenticatedUser()
            ?? throw new InvalidOperationException("Authenticated user context was expected.");
    }
}
