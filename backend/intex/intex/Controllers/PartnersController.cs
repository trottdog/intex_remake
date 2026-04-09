using Intex.Infrastructure.Api.Pagination;
using Intex.Infrastructure.Auth;
using Intex.Infrastructure.ExtendedAdmin;
using Intex.Infrastructure.ExtendedAdmin.Contracts;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Intex.Controllers;

[ApiController]
[Route("api/partners")]
public sealed class PartnersController(ExtendedAdminService service) : ControllerBase
{
    [Authorize(Policy = AuthPolicies.StaffOrAbove)]
    [HttpGet]
    public async Task<IActionResult> List(
        [FromQuery] string? page,
        [FromQuery] string? limit,
        [FromQuery] string? pageSize,
        [FromQuery] string? search,
        [FromQuery] string? programArea,
        CancellationToken cancellationToken)
        => Ok(await service.ListPartnersAsync(PaginationResolver.Resolve(page, limit, pageSize), search, programArea, cancellationToken));

    [Authorize(Policy = AuthPolicies.StaffOrAbove)]
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id, CancellationToken cancellationToken)
        => Ok(await service.GetPartnerAsync(id, cancellationToken));

    [Authorize(Policy = AuthPolicies.AdminOrAbove)]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreatePartnerRequest? request, CancellationToken cancellationToken)
        => StatusCode(StatusCodes.Status201Created, await service.CreatePartnerAsync(request, cancellationToken));

    [Authorize(Policy = AuthPolicies.AdminOrAbove)]
    [HttpPatch("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdatePartnerRequest? request, CancellationToken cancellationToken)
        => Ok(await service.UpdatePartnerAsync(id, request, cancellationToken));

    [Authorize(Policy = AuthPolicies.AdminOrAbove)]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
    {
        await service.DeletePartnerAsync(id, cancellationToken);
        return NoContent();
    }
}
