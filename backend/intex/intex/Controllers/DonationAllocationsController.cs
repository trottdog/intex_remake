using backend.intex.DTOs.Common;
using backend.intex.DTOs.Donations;
using backend.intex.Infrastructure.Auth;
using backend.intex.Services.Abstractions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.intex.Controllers;

[Authorize(Policy = PolicyNames.StaffOrAbove)]
[Route("donation-allocations")]
public sealed class DonationAllocationsController(IDonationService donationService, IUserScopeService userScopeService) : ApiControllerBase
{
    [HttpGet]
    [ProducesResponseType<DonationAllocationsResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<DonationAllocationsResponse>> ListAllocations([FromQuery] ListDonationAllocationsQuery query, CancellationToken cancellationToken)
        => Ok(await donationService.ListDonationAllocationsAsync(query, User.GetRole(), await userScopeService.GetAssignedSafehousesAsync(User, cancellationToken), cancellationToken));

    [HttpPost]
    [ProducesResponseType<DonationAllocationResponseDto>(StatusCodes.Status201Created)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<DonationAllocationResponseDto>> CreateAllocation([FromBody] CreateDonationAllocationRequest request, CancellationToken cancellationToken)
    {
        var result = await donationService.CreateDonationAllocationAsync(request, User.GetRole(), await userScopeService.GetAssignedSafehousesAsync(User, cancellationToken), cancellationToken);
        if (result.Response is null && result.ErrorMessage == "Not found")
        {
            return NotFound(new ErrorResponse("Not found"));
        }

        return result.Response is null
            ? BadRequest(new ErrorResponse(result.ErrorMessage ?? "Failed to create allocation"))
            : StatusCode(StatusCodes.Status201Created, result.Response);
    }

    [HttpDelete("{id:long}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> DeleteAllocation(long id, CancellationToken cancellationToken)
    {
        _ = await donationService.DeleteDonationAllocationAsync(id, User.GetRole(), await userScopeService.GetAssignedSafehousesAsync(User, cancellationToken), cancellationToken);
        return NoContent();
    }
}
