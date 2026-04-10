namespace backend.intex.DTOs.Auth;

public sealed record RegisterDonorResponse(
    int Id,
    string Username,
    string Email,
    long? SupporterId
);
