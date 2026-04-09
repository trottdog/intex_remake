using backend.intex.DTOs.Auth;
using backend.intex.DTOs.Common;
using backend.intex.DTOs.Users;
using backend.intex.Infrastructure.Auth;
using backend.intex.Services.Abstractions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.intex.Controllers;

[Authorize(Policy = PolicyNames.SuperAdminOnly)]
[Route("users")]
public sealed class UsersController(IUserService userService) : ApiControllerBase
{
    [HttpGet]
    [ProducesResponseType<StandardPagedResponse<UserResponseDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<StandardPagedResponse<UserResponseDto>>> ListUsers([FromQuery] ListUsersQuery query, CancellationToken cancellationToken)
        => Ok(await userService.ListUsersAsync(query, cancellationToken));

    [HttpGet("{id:int}")]
    [ProducesResponseType<UserResponseDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<UserResponseDto>> GetUser(int id, CancellationToken cancellationToken)
    {
        var user = await userService.GetUserAsync(id, cancellationToken);
        return user is null ? NotFound(new ErrorResponse("Not found")) : Ok(user);
    }

    [HttpPost]
    [ProducesResponseType<UserResponseDto>(StatusCodes.Status201Created)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<UserResponseDto>> CreateUser([FromBody] CreateUserRequest request, CancellationToken cancellationToken)
    {
        var result = await userService.CreateUserAsync(request, cancellationToken);
        return result.User is null
            ? BadRequest(new ErrorResponse(result.ErrorMessage ?? "Failed"))
            : StatusCode(StatusCodes.Status201Created, result.User);
    }

    [HttpPatch("{id:int}")]
    [ProducesResponseType<UserResponseDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<UserResponseDto>> UpdateUser(int id, [FromBody] UpdateUserRequest request, CancellationToken cancellationToken)
    {
        var result = await userService.UpdateUserAsync(id, request, cancellationToken);
        if (result.User is null && result.ErrorMessage == "Not found")
        {
            return NotFound(new ErrorResponse("Not found"));
        }

        return result.User is null
            ? BadRequest(new ErrorResponse(result.ErrorMessage ?? "Failed"))
            : Ok(result.User);
    }

    [HttpPost("{id:int}/disable")]
    [ProducesResponseType<UserResponseDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<UserResponseDto>> DisableUser(int id, CancellationToken cancellationToken)
    {
        var user = await userService.SetUserActiveStateAsync(id, false, cancellationToken);
        return user is null ? NotFound(new ErrorResponse("Not found")) : Ok(user);
    }

    [HttpPost("{id:int}/enable")]
    [ProducesResponseType<UserResponseDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<UserResponseDto>> EnableUser(int id, CancellationToken cancellationToken)
    {
        var user = await userService.SetUserActiveStateAsync(id, true, cancellationToken);
        return user is null ? NotFound(new ErrorResponse("Not found")) : Ok(user);
    }

    [HttpDelete("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteUser(int id, CancellationToken cancellationToken)
    {
        var currentUserId = User.GetUserId();
        if (!currentUserId.HasValue)
        {
            return Unauthorized(new ErrorResponse("Authentication required"));
        }

        var result = await userService.DeleteUserAsync(id, currentUserId.Value, cancellationToken);
        if (!result.Success && result.ErrorMessage == "Cannot delete your own account")
        {
            return BadRequest(new ErrorResponse(result.ErrorMessage));
        }

        if (!result.Success)
        {
            return NotFound(new ErrorResponse(result.ErrorMessage ?? "Not found"));
        }

        return NoContent();
    }
}
