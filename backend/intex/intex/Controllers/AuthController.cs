using backend.intex.DTOs.Auth;
using backend.intex.DTOs.Common;
using backend.intex.Infrastructure.Auth;
using backend.intex.Services.Abstractions;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace backend.intex.Controllers;

[Route("auth")]
public sealed class AuthController(IAuthService authService) : ApiControllerBase
{
    [AllowAnonymous]
    [HttpPost("login")]
    [ProducesResponseType<LoginResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<LoginResponse>> Login([FromBody] LoginRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
        {
            return Unauthorized(new ErrorResponse("Invalid credentials"));
        }

        var response = await authService.LoginAsync(request, cancellationToken);
        return response is null
            ? Unauthorized(new ErrorResponse("Invalid credentials"))
            : Ok(response);
    }

    [AllowAnonymous]
    [HttpPost("mfa/verify")]
    [ProducesResponseType<LoginResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<LoginResponse>> VerifyMfa([FromBody] MfaVerifyRequest request, CancellationToken cancellationToken)
    {
        var response = await authService.VerifyMfaAsync(request, cancellationToken);
        return response is null
            ? Unauthorized(new ErrorResponse("Invalid MFA challenge or code"))
            : Ok(response);
    }

    [Authorize]
    [HttpPost("change-password")]
    [ProducesResponseType<MessageResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<MessageResponse>> ChangePassword([FromBody] ChangePasswordRequest request, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (!userId.HasValue)
        {
            return Unauthorized(new ErrorResponse("Authentication required"));
        }

        var result = await authService.ChangePasswordAsync(userId.Value, request, cancellationToken);
        if (!result.Success)
        {
            if (result.ErrorMessage == "Current password is incorrect")
            {
                return Unauthorized(new ErrorResponse(result.ErrorMessage));
            }

            return BadRequest(new ErrorResponse(result.ErrorMessage ?? "Failed to change password"));
        }

        return Ok(new MessageResponse("Password changed successfully"));
    }

    [AllowAnonymous]
    [HttpGet("me")]
    [ProducesResponseType<AuthMeResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<AuthMeResponse>> Me(CancellationToken cancellationToken)
    {
        var authorizationHeader = Request.Headers.Authorization.ToString();
        var tokenReader = HttpContext.RequestServices.GetRequiredService<IJwtTokenReader>();
        var userId = tokenReader.TryReadUserId(authorizationHeader);
        if (!userId.HasValue)
        {
            return Ok(new AuthMeResponse(null));
        }

        var currentUser = await authService.GetCurrentUserAsync(userId.Value, cancellationToken);
        return Ok(new AuthMeResponse(currentUser));
    }

    [AllowAnonymous]
    [HttpPost("logout")]
    [ProducesResponseType<MessageResponse>(StatusCodes.Status200OK)]
    public ActionResult<MessageResponse> Logout() => Ok(new MessageResponse("Logged out successfully"));
}
