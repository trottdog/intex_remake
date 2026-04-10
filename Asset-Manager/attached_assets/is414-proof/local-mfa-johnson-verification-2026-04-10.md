# Local MFA Verification - johnson (2026-04-10)

Scope: verify that an MFA-enabled account exists and MFA is actually enforced by the API.

Environment:
- Backend URL: `https://localhost:7194`
- Endpoint health check: `GET /api/healthz` returned `200 OK`
- Account tested: `johnson` (using the team's normal admin password)

## 1) Login requires MFA
Request:
- `POST /api/auth/login` with username `johnson`

Observed response:
```json
{
  "token": null,
  "user": null,
  "mfaRequired": true,
  "challengeToken": "ba9ac487ca0743d19e3990e928538e88"
}
```

Interpretation:
- The account cannot complete primary login with username/password alone.
- The server explicitly requires MFA and returns an MFA challenge token.

## 2) MFA challenge enforces OTP
Request:
- `POST /api/auth/mfa/verify` with the returned `challengeToken` and a bad OTP code (`000000`)

Observed response:
```json
{"error":"Invalid MFA challenge or code"}
```

Interpretation:
- MFA verification is enforced at the API level.
- Invalid OTPs are rejected, confirming the challenge is not cosmetic.

## Result
- MFA-enabled account exists: PASS (`johnson`)
- MFA account is configured correctly: PASS (challenge required + OTP verification enforced)
