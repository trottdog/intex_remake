using Intex.Infrastructure.Auth;
using Intex.Infrastructure.ExtendedAdmin;
using Intex.Infrastructure.ExtendedAdmin.Contracts;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Intex.Controllers;

[ApiController]
[Route("api/partner-assignments")]
public sealed class PartnerAssignmentsController(ExtendedAdminService service) : ControllerBase
{
    [Authorize(Policy = AuthPolicies.StaffOrAbove)]
    [HttpGet]
    public async Task<IActionResult> List([FromQuery] int? partnerId, [FromQuery] int? safehouseId, CancellationToken cancellationToken)
        => Ok(await service.ListPartnerAssignmentsAsync(partnerId, safehouseId, cancellationToken));

    [Authorize(Policy = AuthPolicies.AdminOrAbove)]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreatePartnerAssignmentRequest? request, CancellationToken cancellationToken)
        => StatusCode(StatusCodes.Status201Created, await service.CreatePartnerAssignmentAsync(request, cancellationToken));

    [Authorize(Policy = AuthPolicies.AdminOrAbove)]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
    {
        await service.DeletePartnerAssignmentAsync(id, cancellationToken);
        return NoContent();
    }
}
