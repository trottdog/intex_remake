using Intex.Infrastructure.Auth;
using Intex.Infrastructure.ExtendedAdmin;
using Intex.Infrastructure.ExtendedAdmin.Contracts;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Intex.Controllers;

[ApiController]
[Route("api/in-kind-donation-items")]
public sealed class InKindDonationItemsController(ExtendedAdminService service) : ControllerBase
{
    [Authorize(Policy = AuthPolicies.StaffOrAbove)]
    [HttpGet]
    public async Task<IActionResult> List(
        [FromQuery] int? donationId,
        [FromQuery] string? category,
        [FromQuery] int? page,
        [FromQuery] int? pageSize,
        CancellationToken cancellationToken)
    {
        var resolvedPage = page.GetValueOrDefault(1);
        var resolvedPageSize = pageSize ?? 20;
        var response = await service.ListInKindDonationItemsAsync(
            resolvedPage,
            resolvedPageSize,
            donationId,
            category,
            cancellationToken);

        return Ok(response);
    }

    [Authorize(Policy = AuthPolicies.StaffOrAbove)]
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id, CancellationToken cancellationToken)
        => Ok(await service.GetInKindDonationItemAsync(id, cancellationToken));

    [Authorize(Policy = AuthPolicies.StaffOrAbove)]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateInKindDonationItemRequest? request, CancellationToken cancellationToken)
        => StatusCode(StatusCodes.Status201Created, await service.CreateInKindDonationItemAsync(request, cancellationToken));

    [Authorize(Policy = AuthPolicies.AdminOrAbove)]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
    {
        await service.DeleteInKindDonationItemAsync(id, cancellationToken);
        return NoContent();
    }
}
