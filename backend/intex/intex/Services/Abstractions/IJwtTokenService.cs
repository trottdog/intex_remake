using backend.intex.DTOs.Auth;

namespace backend.intex.Services.Abstractions;

public interface IJwtTokenService
{
    string CreateToken(AuthUserDto user);
}
