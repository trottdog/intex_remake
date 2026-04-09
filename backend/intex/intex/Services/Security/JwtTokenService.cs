using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text.Json;
using backend.intex.DTOs.Auth;
using backend.intex.Infrastructure.Auth;
using backend.intex.Services.Abstractions;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace backend.intex.Services.Security;

public sealed class JwtTokenService(
    SymmetricSecurityKey signingKey,
    IOptions<JwtOptions> jwtOptions) : IJwtTokenService
{
    public string CreateToken(AuthUserDto user)
    {
        var now = DateTime.UtcNow;
        var expires = now.AddHours(jwtOptions.Value.ExpiryHours <= 0 ? 8 : jwtOptions.Value.ExpiryHours);

        var claims = new List<Claim>
        {
            new(ClaimNames.UserId, user.Id.ToString()),
            new(ClaimNames.Username, user.Username),
            new(ClaimNames.Email, user.Email),
            new(ClaimNames.FirstName, user.FirstName),
            new(ClaimNames.LastName, user.LastName),
            new(ClaimNames.Role, user.Role),
            new(ClaimNames.IsActive, user.IsActive.ToString().ToLowerInvariant()),
            new(ClaimNames.MfaEnabled, user.MfaEnabled.ToString().ToLowerInvariant())
        };

        if (!string.IsNullOrWhiteSpace(user.LastLogin))
        {
            claims.Add(new Claim(ClaimNames.LastLogin, user.LastLogin));
        }

        if (user.SupporterId.HasValue)
        {
            claims.Add(new Claim(ClaimNames.SupporterId, user.SupporterId.Value.ToString()));
        }

        claims.Add(new Claim(ClaimNames.Safehouses, JsonSerializer.Serialize(user.Safehouses), JsonClaimValueTypes.JsonArray));

        var credentials = new SigningCredentials(signingKey, SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(
            claims: claims,
            notBefore: now,
            expires: expires,
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
