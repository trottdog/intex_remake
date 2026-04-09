namespace backend.intex.DTOs.Auth;

public sealed record LoginResponse(
    string Token,
    AuthUserDto User
);
