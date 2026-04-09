using Intex.Infrastructure.Auth.Contracts;

namespace Intex.Infrastructure.Auth.Jwt;

public interface IJwtTokenService
{
    string CreateToken(AuthUserClaims user);
}
