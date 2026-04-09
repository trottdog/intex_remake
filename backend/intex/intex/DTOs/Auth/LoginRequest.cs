namespace backend.intex.DTOs.Auth;

public sealed record LoginRequest(
    string Username,
    string Password
);
