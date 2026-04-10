namespace backend.intex.DTOs.Auth;

public sealed record MfaSetupResponse(
    string ManualEntryKey,
    string OtpAuthUri,
    string QrCodeSvg,
    int ExpiresInSeconds
);
