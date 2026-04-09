using Intex.Infrastructure.Api.Contracts;
using Intex.Infrastructure.Api.Pagination;
using Intex.Infrastructure.Auth;
using Intex.Infrastructure.Auth.Contracts;
using Intex.Infrastructure.Auth.Principal;
using Intex.Infrastructure.SuperAdmin;
using Intex.Infrastructure.SuperAdmin.Contracts;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Intex.Controllers;

[ApiController]
[Route("api/users")]
[Authorize(Policy = AuthPolicies.SuperAdminOnly)]
public sealed class UsersController(SuperAdminService superAdminService) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(PaginatedListEnvelope<UserResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> List(
        [FromQuery] string? page,
        [FromQuery] string? limit,
        [FromQuery] string? pageSize,
        [FromQuery] string? role,
        CancellationToken cancellationToken)
    {
        var pagination = PaginationResolver.Resolve(page, limit, pageSize);
        var response = await superAdminService.ListUsersAsync(pagination, role, cancellationToken);
        return Ok(response);
    }

    [HttpPost]
    [ProducesResponseType(typeof(UserResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Create([FromBody] CreateUserRequest? request, CancellationToken cancellationToken)
    {
        var response = await superAdminService.CreateUserAsync(request, cancellationToken);
        return StatusCode(StatusCodes.Status201Created, response);
    }

    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(UserResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(int id, CancellationToken cancellationToken)
    {
        var response = await superAdminService.GetUserByIdAsync(id, cancellationToken);
        return Ok(response);
    }

    [HttpPatch("{id:int}")]
    [ProducesResponseType(typeof(UserResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateUserRequest? request, CancellationToken cancellationToken)
    {
        var response = await superAdminService.UpdateUserAsync(id, request, cancellationToken);
        return Ok(response);
    }

    [HttpDelete("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
    {
        var authenticatedUser = GetRequiredAuthenticatedUser();
        await superAdminService.DeleteUserAsync(authenticatedUser.Id, id, cancellationToken);
        return NoContent();
    }

    [HttpPost("{id:int}/disable")]
    [ProducesResponseType(typeof(UserResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Disable(int id, CancellationToken cancellationToken)
    {
        var response = await superAdminService.SetUserEnabledAsync(id, false, cancellationToken);
        return Ok(response);
    }

    [HttpPost("{id:int}/enable")]
    [ProducesResponseType(typeof(UserResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Enable(int id, CancellationToken cancellationToken)
    {
        var response = await superAdminService.SetUserEnabledAsync(id, true, cancellationToken);
        return Ok(response);
    }

    private AuthenticatedUser GetRequiredAuthenticatedUser()
    {
        return User.GetAuthenticatedUser()
            ?? throw new InvalidOperationException("Authenticated user context was expected.");
    }
}
