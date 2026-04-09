using Intex.Infrastructure.Api.Contracts;
using Intex.Infrastructure.Api.Errors;
using Intex.Infrastructure.Auth;
using Intex.Infrastructure.Auth.Contracts;
using Intex.Infrastructure.Auth.OptionalAuth;
using Intex.Infrastructure.Auth.Principal;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Intex.Controllers;

[ApiController]
[Route("api/auth")]
public sealed class AuthController(AuthApplicationService authApplicationService) : ControllerBase
{
    [AllowAnonymous]
    [HttpPost("login")]
    [ProducesResponseType(typeof(LoginResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Login([FromBody] LoginRequest? request, CancellationToken cancellationToken)
    {
        if (request is null
            || string.IsNullOrWhiteSpace(request.Username)
            || string.IsNullOrWhiteSpace(request.Password))
        {
            return BadRequest(new ErrorResponse("Username and password are required"));
        }

        var response = await authApplicationService.LoginAsync(request.Username, request.Password, cancellationToken);
        return Ok(response);
    }

    [AllowAnonymous]
    [HttpPost("logout")]
    [ProducesResponseType(typeof(MessageResponse), StatusCodes.Status200OK)]
    public IActionResult Logout()
    {
        return Ok(new MessageResponse("Logged out successfully"));
    }

    [AllowAnonymous]
    [HttpGet("me")]
    [ProducesResponseType(typeof(MeResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> Me(CancellationToken cancellationToken)
    {
        await HttpContext.TryAuthenticateBearerAsync(cancellationToken);
        var authenticatedUser = User.GetAuthenticatedUser();
        var response = await authApplicationService.GetMeAsync(authenticatedUser, cancellationToken);

        return Ok(response);
    }

    [Authorize(Policy = AuthPolicies.AnyAuthenticatedUser)]
    [HttpPost("change-password")]
    [ProducesResponseType(typeof(MessageResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest? request, CancellationToken cancellationToken)
    {
        if (request is null
            || string.IsNullOrWhiteSpace(request.CurrentPassword)
            || string.IsNullOrWhiteSpace(request.NewPassword))
        {
            return BadRequest(new ErrorResponse("currentPassword and newPassword are required"));
        }

        var authenticatedUser = User.GetAuthenticatedUser()
            ?? throw new ApiException(StatusCodes.Status401Unauthorized, "Authentication required");

        await authApplicationService.ChangePasswordAsync(
            authenticatedUser.Id,
            request.CurrentPassword,
            request.NewPassword,
            cancellationToken);

        return Ok(new MessageResponse("Password changed successfully"));
    }

    public sealed record LoginRequest(string? Username, string? Password);

    public sealed record ChangePasswordRequest(string? CurrentPassword, string? NewPassword);
}
