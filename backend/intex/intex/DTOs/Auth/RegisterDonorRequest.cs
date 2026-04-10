namespace backend.intex.DTOs.Auth;

public sealed record RegisterDonorRequest(
    string FirstName,
    string LastName,
    string Email,
    string Username,
    string Password
);
