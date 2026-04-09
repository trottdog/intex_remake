using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;

namespace Intex.Infrastructure.Auth.OptionalAuth;

public static class HttpContextAuthExtensions
{
    public static async Task<bool> TryAuthenticateBearerAsync(this HttpContext httpContext, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        var result = await httpContext.AuthenticateAsync(JwtBearerDefaults.AuthenticationScheme);
        if (!result.Succeeded || result.Principal is null)
        {
            return false;
        }

        httpContext.User = result.Principal;
        return true;
    }
}
