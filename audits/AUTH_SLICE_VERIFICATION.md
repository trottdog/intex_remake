# Auth Slice Verification

## Implemented Endpoints

- `GET /api/healthz`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/auth/change-password`

## Contract Checks

- Route paths match the documented `/api/...` paths exactly.
- Error responses use `{ "error": "..." }`.
- Logout is stateless and returns `200` with `{ "message": "Logged out successfully" }`.
- `/api/auth/me` returns `200 { "user": null }` when unauthenticated.
- Login updates `users.last_login` before issuing the response token.
- Login and `/api/auth/me` include `safehouses` in the response body user object, but not in the JWT payload.
- Change-password uses aggregated password validation messaging.

## Build Verification

- Verified with `dotnet build` in:
  - `/Users/natemacbook/Desktop/intex/backend/intex/intex`

## Manual Endpoint Verification Suggestions

1. `GET /api/healthz`
   - Expect `200`
   - Body: `{ "status": "ok" }`
2. `POST /api/auth/logout`
   - Expect `200`
   - Body: `{ "message": "Logged out successfully" }`
3. `GET /api/auth/me` without token
   - Expect `200`
   - Body: `{ "user": null }`
4. `POST /api/auth/login` with valid credentials from seeded data
   - Expect `200`
   - Body contains `token` and `user.safehouses`
5. `POST /api/auth/change-password` without token
   - Expect `401`
   - Body uses `{ "error": ... }`
6. `POST /api/auth/change-password` with weak new password
   - Expect `400`
   - Body error begins with `Password must contain:`
