namespace backend.intex.DTOs.Auth;

public sealed record MfaStatusResponse(
    bool Enabled,
    bool EnrollmentPending
);
