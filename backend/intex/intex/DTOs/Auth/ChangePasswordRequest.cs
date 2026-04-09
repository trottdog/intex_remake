namespace backend.intex.DTOs.Auth;

public sealed record ChangePasswordRequest(
    string CurrentPassword,
    string NewPassword
);
