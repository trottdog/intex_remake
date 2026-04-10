using backend.intex.DTOs.Auth;
using backend.intex.DTOs.Common;
using backend.intex.Infrastructure.Auth;
using backend.intex.Infrastructure.Configuration;
using backend.intex.Services.Abstractions;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.Options;
using System.Security.Claims;
using System.Text;
using System.Text.Json;

namespace backend.intex.Controllers;

[Route("auth")]
public sealed class AuthController(
    IAuthService authService,
    IOptions<GoogleAuthOptions> googleAuthOptions,
    IOptions<FrontendCorsOptions> frontendCorsOptions) : ApiControllerBase
{
    [AllowAnonymous]
    [HttpPost("register-donor")]
    [ProducesResponseType<RegisterDonorResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<RegisterDonorResponse>> RegisterDonor([FromBody] RegisterDonorRequest request, CancellationToken cancellationToken)
    {
        var result = await authService.RegisterDonorAsync(request, cancellationToken);
        if (result.Response is null)
        {
            if (result.IsConflict)
            {
                return Conflict(new ErrorResponse(result.ErrorMessage ?? "Username or email already exists"));
            }

            return BadRequest(new ErrorResponse(result.ErrorMessage ?? "Failed to create donor account"));
        }

        return StatusCode(StatusCodes.Status201Created, result.Response);
    }

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
    [HttpGet("mfa")]
    [ProducesResponseType<MfaStatusResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<MfaStatusResponse>> GetMfaStatus(CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (!userId.HasValue)
        {
            return Unauthorized(new ErrorResponse("Authentication required"));
        }

        var response = await authService.GetMfaStatusAsync(userId.Value, cancellationToken);
        return response is null
            ? Unauthorized(new ErrorResponse("Authentication required"))
            : Ok(response);
    }

    [Authorize]
    [HttpPost("mfa/setup")]
    [ProducesResponseType<MfaSetupResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<MfaSetupResponse>> SetupMfa(CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (!userId.HasValue)
        {
            return Unauthorized(new ErrorResponse("Authentication required"));
        }

        var result = await authService.BeginMfaSetupAsync(userId.Value, cancellationToken);
        if (result.Response is null)
        {
            if (result.IsConflict)
            {
                return Conflict(new ErrorResponse(result.ErrorMessage ?? "MFA is already enabled."));
            }

            return BadRequest(new ErrorResponse(result.ErrorMessage ?? "Unable to start MFA setup."));
        }

        return Ok(result.Response);
    }

    [Authorize]
    [HttpPost("mfa/enable")]
    [ProducesResponseType<MfaStatusResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<MfaStatusResponse>> EnableMfa([FromBody] MfaCodeRequest request, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (!userId.HasValue)
        {
            return Unauthorized(new ErrorResponse("Authentication required"));
        }

        var result = await authService.EnableMfaAsync(userId.Value, request, cancellationToken);
        if (result.Response is null)
        {
            if (result.IsConflict)
            {
                return Conflict(new ErrorResponse(result.ErrorMessage ?? "MFA is already enabled."));
            }

            return BadRequest(new ErrorResponse(result.ErrorMessage ?? "Unable to enable MFA."));
        }

        return Ok(result.Response);
    }

    [Authorize]
    [HttpPost("mfa/disable")]
    [ProducesResponseType<MfaStatusResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<MfaStatusResponse>> DisableMfa([FromBody] MfaCodeRequest request, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();
        if (!userId.HasValue)
        {
            return Unauthorized(new ErrorResponse("Authentication required"));
        }

        var result = await authService.DisableMfaAsync(userId.Value, request, cancellationToken);
        return result.Response is null
            ? BadRequest(new ErrorResponse(result.ErrorMessage ?? "Unable to disable MFA."))
            : Ok(result.Response);
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

    [AllowAnonymous]
    [HttpGet("oauth/google/start")]
    [ProducesResponseType(StatusCodes.Status302Found)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status503ServiceUnavailable)]
    public IActionResult StartGoogleLogin([FromQuery] string? returnUrl)
    {
        var frontendCallbackUrl = ResolveFrontendCallbackUrl(returnUrl);

        if (!googleAuthOptions.Value.IsConfigured)
        {
            return Redirect(BuildFrontendRedirect(frontendCallbackUrl, new Dictionary<string, string>
            {
                ["error"] = "Google authentication is not configured"
            }));
        }

        var completionUrl = Url.ActionLink(
            nameof(CompleteGoogleLogin),
            values: new { returnUrl = frontendCallbackUrl });

        if (string.IsNullOrWhiteSpace(completionUrl))
        {
            return Redirect(BuildFrontendRedirect(frontendCallbackUrl, new Dictionary<string, string>
            {
                ["error"] = "Failed to start Google authentication"
            }));
        }

        var properties = new AuthenticationProperties
        {
            RedirectUri = completionUrl
        };
        properties.Items["returnUrl"] = frontendCallbackUrl;

        return Challenge(properties, ExternalAuthSchemes.Google);
    }

    [AllowAnonymous]
    [HttpGet("oauth/google/complete")]
    public async Task<IActionResult> CompleteGoogleLogin([FromQuery] string? returnUrl, CancellationToken cancellationToken)
    {
        var authResult = await HttpContext.AuthenticateAsync(ExternalAuthSchemes.ExternalCookie);
        var frontendCallbackUrl = authResult.Properties?.Items.TryGetValue("returnUrl", out var storedReturnUrl) == true
            ? ResolveFrontendCallbackUrl(storedReturnUrl)
            : ResolveFrontendCallbackUrl(returnUrl);

        if (!authResult.Succeeded || authResult.Principal is null)
        {
            await HttpContext.SignOutAsync(ExternalAuthSchemes.ExternalCookie);
            return Redirect(BuildFrontendRedirect(frontendCallbackUrl, new Dictionary<string, string>
            {
                ["error"] = "Google sign-in could not be completed"
            }));
        }

        var subject = authResult.Principal.FindFirstValue(ClaimTypes.NameIdentifier);
        var email = authResult.Principal.FindFirstValue(ClaimTypes.Email);
        var firstName = authResult.Principal.FindFirstValue(ClaimTypes.GivenName);
        var lastName = authResult.Principal.FindFirstValue(ClaimTypes.Surname);
        var displayName = authResult.Principal.FindFirstValue(ClaimTypes.Name);

        var response = string.IsNullOrWhiteSpace(subject)
            ? null
            : await authService.LoginWithGoogleAsync(subject, email, firstName, lastName, displayName, cancellationToken);

        await HttpContext.SignOutAsync(ExternalAuthSchemes.ExternalCookie);

        if (response is null)
        {
            return Redirect(BuildFrontendRedirect(frontendCallbackUrl, new Dictionary<string, string>
            {
                ["error"] = "This Google account is not authorized"
            }));
        }

        if (response.MfaRequired && !string.IsNullOrWhiteSpace(response.ChallengeToken))
        {
            return Redirect(BuildFrontendRedirect(frontendCallbackUrl, new Dictionary<string, string>
            {
                ["mfaRequired"] = "true",
                ["challengeToken"] = response.ChallengeToken
            }));
        }

        if (string.IsNullOrWhiteSpace(response.Token) || response.User is null)
        {
            return Redirect(BuildFrontendRedirect(frontendCallbackUrl, new Dictionary<string, string>
            {
                ["error"] = "Google sign-in returned an incomplete session"
            }));
        }

        var serializedUser = JsonSerializer.Serialize(response.User);
        var encodedUser = WebEncoders.Base64UrlEncode(Encoding.UTF8.GetBytes(serializedUser));
        return Redirect(BuildFrontendRedirect(frontendCallbackUrl, new Dictionary<string, string>
        {
            ["token"] = response.Token,
            ["user"] = encodedUser
        }));
    }

    private string ResolveFrontendCallbackUrl(string? returnUrl)
    {
        var configuredOrigins = frontendCorsOptions.Value.AllowedOrigins
            .Where(static origin => !string.IsNullOrWhiteSpace(origin))
            .Select(origin => origin.TrimEnd('/'))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        if (Uri.TryCreate(returnUrl, UriKind.Absolute, out var returnUri)
            && (returnUri.Scheme == Uri.UriSchemeHttps || returnUri.Scheme == Uri.UriSchemeHttp))
        {
            var candidateOrigin = returnUri.GetLeftPart(UriPartial.Authority).TrimEnd('/');
            if (configuredOrigins.Contains(candidateOrigin, StringComparer.OrdinalIgnoreCase))
            {
                return $"{candidateOrigin}/auth/callback";
            }
        }

        var fallbackOrigin = configuredOrigins.FirstOrDefault();
        if (!string.IsNullOrWhiteSpace(fallbackOrigin))
        {
            return $"{fallbackOrigin}/auth/callback";
        }

        return $"{Request.Scheme}://{Request.Host}/auth/callback";
    }

    private static string BuildFrontendRedirect(string callbackUrl, IReadOnlyDictionary<string, string> values)
    {
        var fragment = string.Join(
            "&",
            values.Select(pair => $"{Uri.EscapeDataString(pair.Key)}={Uri.EscapeDataString(pair.Value)}"));
        return $"{callbackUrl}#{fragment}";
    }
}
