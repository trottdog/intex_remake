using System.IdentityModel.Tokens.Jwt;
using System.Text;
using Intex.Infrastructure.Auth.Contracts;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace Intex.Infrastructure.Auth.Jwt;

public sealed class JwtTokenService(
    IOptions<JwtOptions> jwtOptions,
    JwtSecretProvider jwtSecretProvider,
    TimeProvider timeProvider) : IJwtTokenService
{
    private readonly JwtOptions _jwtOptions = jwtOptions.Value;

    public string CreateToken(AuthUserClaims user)
    {
        var now = timeProvider.GetUtcNow();
        var credentials = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecretProvider.Secret)),
            SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _jwtOptions.Issuer,
            audience: _jwtOptions.Audience,
            claims: null,
            notBefore: now.UtcDateTime,
            expires: now.AddHours(_jwtOptions.ExpiryHours).UtcDateTime,
            signingCredentials: credentials);

        token.Payload[AuthClaimTypes.Id] = user.Id;
        token.Payload[AuthClaimTypes.Username] = user.Username;
        token.Payload[AuthClaimTypes.Email] = user.Email;
        token.Payload[AuthClaimTypes.FirstName] = user.FirstName;
        token.Payload[AuthClaimTypes.LastName] = user.LastName;
        token.Payload[AuthClaimTypes.Role] = user.Role;
        token.Payload[AuthClaimTypes.IsActive] = user.IsActive;
        token.Payload[AuthClaimTypes.MfaEnabled] = user.MfaEnabled;
        token.Payload[AuthClaimTypes.LastLogin] = user.LastLogin;
        token.Payload[AuthClaimTypes.SupporterId] = user.SupporterId;

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
