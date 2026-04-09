# Auth Endpoint Audit

## Sources Reviewed

- `NodeApp/docs/api/FRONTEND_API_DEPENDENCIES.md`
- `NodeApp/docs/api/COMPATIBILITY_SUMMARY.md`
- `NodeApp/docs/api/AUTH.md`
- `NodeApp/docs/api/VALIDATION_AND_ERRORS.md`
- `NodeApp/docs/api/ROUTES.md`
- `NodeApp/docs/api/openapi.yaml`
- frontend runtime usage:
  - `NodeApp/artifacts/beacon/src/services/auth.service.ts`
  - `NodeApp/artifacts/beacon/src/services/api.ts`
  - `NodeApp/artifacts/beacon/src/contexts/AuthContext.tsx`

## Strict Verification

### 1. Exact Route Paths And HTTP Methods

Verified implementation:

- `GET /api/healthz`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/auth/change-password`

Result:

- No route path mismatches found.
- No HTTP method mismatches found.

## 2. Request / Response Shape Verification

### `GET /api/healthz`

Expected:

```json
{ "status": "ok" }
```

Implemented:

- returns `200`
- body shape is exactly `{ status: "ok" }`

Result:

- No mismatch found.

### `POST /api/auth/login`

Expected request body:

```json
{ "username": "...", "password": "..." }
```

Implemented request handling:

- requires both `username` and `password`
- treats null/empty/whitespace as invalid
- returns `400 { "error": "Username and password are required" }`

Expected response body:

```json
{
  "token": "<jwt>",
  "user": {
    "id": 1,
    "username": "...",
    "email": "...",
    "firstName": "...",
    "lastName": "...",
    "role": "...",
    "isActive": true,
    "mfaEnabled": false,
    "lastLogin": "ISO8601 or null",
    "supporterId": null,
    "safehouses": [1, 2]
  }
}
```

Implemented response shape:

- `token`
- `user.id`
- `user.username`
- `user.email`
- `user.firstName`
- `user.lastName`
- `user.role`
- `user.isActive`
- `user.mfaEnabled`
- `user.lastLogin`
- `user.supporterId`
- `user.safehouses`

Notes:

- `safehouses` is included in the login response body.
- `lastLogin` is returned as an ISO 8601 string after the update to `last_login`.

Result:

- No response shape mismatches found.

### `POST /api/auth/logout`

Expected:

```json
{ "message": "Logged out successfully" }
```

Implemented:

- `200`
- `{ "message": "Logged out successfully" }`

Result:

- No mismatch found.

### `GET /api/auth/me`

Expected unauthenticated:

```json
{ "user": null }
```

Expected authenticated:

```json
{
  "user": {
    "id": 1,
    "username": "...",
    "email": "...",
    "firstName": "...",
    "lastName": "...",
    "role": "...",
    "isActive": true,
    "mfaEnabled": false,
    "lastLogin": "ISO8601 or null",
    "supporterId": null,
    "safehouses": [1, 2]
  }
}
```

Implemented:

- unauthenticated returns `200 { "user": null }`
- authenticated returns `200` with the expected wrapped `user` object
- response includes `safehouses`

Result:

- No response wrapping mismatch found.
- No field casing mismatch found.

### `POST /api/auth/change-password`

Expected request body:

```json
{ "currentPassword": "...", "newPassword": "..." }
```

Expected success response:

```json
{ "message": "Password changed successfully" }
```

Expected validation behavior:

- missing fields:
  - `400 { "error": "currentPassword and newPassword are required" }`
- weak new password:
  - `400 { "error": "Password must contain: ..." }`
- wrong current password:
  - `401 { "error": "Current password is incorrect" }`

Implemented:

- request field names match exactly
- success message matches exactly
- aggregated password validation format matches the documented change-password format

Result:

- No request or response shape mismatches found.

## 3. 401 vs 403 Behavior

Frontend expectation from `api.ts` / `AuthContext.tsx`:

- any `401` triggers global logout
- any `403` redirects to `/forbidden`

Verified shared auth behavior:

- protected-route missing/malformed bearer auth:
  - `401 { "error": "Authentication required" }`
- invalid/expired token:
  - `401 { "error": "Invalid or expired token" }`
- disabled/not-found DB user after token validation:
  - `401 { "error": "Account is disabled or not found" }`
- insufficient role:
  - `403 { "error": "Insufficient permissions" }`

Endpoint-specific impact:

- `/api/auth/change-password` is protected and correctly uses the shared 401 behavior
- `/api/auth/me` is anonymous with optional auth and does not challenge on missing token

Result:

- No confirmed 401/403 behavior mismatches found for the implemented slice.

## 4. Login Response Body vs JWT Payload

### Login Response Body

Confirmed login response body includes:

- `token`
- `user`
- `user.safehouses`

### JWT Payload

Confirmed JWT payload includes these application fields:

- `id`
- `username`
- `email`
- `firstName`
- `lastName`
- `role`
- `isActive`
- `mfaEnabled`
- `lastLogin`
- `supporterId`

Confirmed JWT payload excludes:

- `safehouses`

Result:

- No mismatch found between documented login-body contract and documented JWT payload contract.

## 5. Mismatches Found

No confirmed endpoint mismatches were found in:

- route paths
- HTTP methods
- request field names
- response wrapping
- field casing
- login response body contract
- JWT payload contract
- 401 vs 403 behavior
- `/api/auth/me` unauthenticated behavior

## 6. Frontend vs Docs Conflict Review

One important compatibility rule is driven more strongly by the real frontend than by the prose docs:

- `/api/auth/me` must not emit `401` when unauthenticated
- because the frontend global API client treats any `401` as a forced logout event

The current implementation correctly follows the frontend-required behavior:

- it returns `200 { "user": null }` when no token is present

This does not conflict with core security because `/api/auth/me` is explicitly documented as optional-auth.

## Final Result

The implemented health/auth slice is aligned with:

- the documented API contract
- the shared auth/response foundation
- the real frontend login/auth service usage

No additional fixes were required during this audit.
