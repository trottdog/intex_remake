using System.IdentityModel.Tokens.Jwt;
using backend.intex.Infrastructure.Auth;
using backend.intex.Services.Abstractions;
using Microsoft.IdentityModel.Tokens;

namespace backend.intex.Services.Security;

public sealed class JwtTokenReader(SymmetricSecurityKey signingKey) : IJwtTokenReader
{
    public int? TryReadUserId(string? authorizationHeader)
    {
        if (string.IsNullOrWhiteSpace(authorizationHeader) || !authorizationHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        var token = authorizationHeader["Bearer ".Length..].Trim();
        if (string.IsNullOrWhiteSpace(token))
        {
            return null;
        }

        var handler = new JwtSecurityTokenHandler();

        try
        {
            var principal = handler.ValidateToken(token, new TokenValidationParameters
            {
                ValidateIssuer = false,
                ValidateAudience = false,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = signingKey,
                ClockSkew = TimeSpan.Zero,
                RoleClaimType = ClaimNames.Role,
                NameClaimType = ClaimNames.Username
            }, out _);

            var userIdClaim = principal.FindFirst(ClaimNames.UserId)?.Value;
            return int.TryParse(userIdClaim, out var userId) ? userId : null;
        }
        catch
        {
            return null;
        }
    }
}
