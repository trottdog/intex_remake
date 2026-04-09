using Intex.Infrastructure.Api.Contracts;
using Intex.Infrastructure.Api.Pagination;
using Intex.Infrastructure.Auth;
using Intex.Infrastructure.Donor;
using Intex.Infrastructure.Donor.Contracts;
using Intex.Infrastructure.ExtendedAdmin;
using Intex.Infrastructure.ExtendedAdmin.Contracts;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Intex.Controllers;

[ApiController]
[Route("api/social-media-posts")]
public sealed class SocialMediaPostsController(
    DonorPortalService donorPortalService,
    ExtendedAdminService extendedAdminService) : ControllerBase
{
    [Authorize(Policy = AuthPolicies.DonorOrStaffOrAbove)]
    [HttpGet]
    [ProducesResponseType(typeof(PaginatedListEnvelope<SocialMediaPostResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> List(
        [FromQuery] string? page,
        [FromQuery] string? limit,
        [FromQuery] string? pageSize,
        [FromQuery] string? platform,
        [FromQuery] string? postType,
        CancellationToken cancellationToken)
    {
        var pagination = PaginationResolver.Resolve(page, limit, pageSize);
        var response = await donorPortalService.ListSocialMediaPostsAsync(
            pagination,
            platform,
            postType,
            cancellationToken);

        return Ok(response);
    }

    [Authorize(Policy = AuthPolicies.StaffOrAbove)]
    [HttpGet("analytics")]
    public async Task<IActionResult> GetAnalytics(CancellationToken cancellationToken)
        => Ok(await extendedAdminService.GetSocialMediaAnalyticsAsync(cancellationToken));

    [Authorize(Policy = AuthPolicies.StaffOrAbove)]
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id, CancellationToken cancellationToken)
        => Ok(await extendedAdminService.GetSocialMediaPostAsync(id, cancellationToken));

    [Authorize(Policy = AuthPolicies.StaffOrAbove)]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateSocialMediaPostRequest? request, CancellationToken cancellationToken)
        => StatusCode(StatusCodes.Status201Created, await extendedAdminService.CreateSocialMediaPostAsync(request, cancellationToken));

    [Authorize(Policy = AuthPolicies.StaffOrAbove)]
    [HttpPatch("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateSocialMediaPostRequest? request, CancellationToken cancellationToken)
        => Ok(await extendedAdminService.UpdateSocialMediaPostAsync(id, request, cancellationToken));

    [Authorize(Policy = AuthPolicies.AdminOrAbove)]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
    {
        await extendedAdminService.DeleteSocialMediaPostAsync(id, cancellationToken);
        return NoContent();
    }
}
