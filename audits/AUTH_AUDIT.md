# Auth And Shared API Audit

## Sources Reviewed

- `NodeApp/docs/api/AUTH.md`
- `NodeApp/docs/api/COMPATIBILITY_SUMMARY.md`
- `NodeApp/docs/api/VALIDATION_AND_ERRORS.md`
- `NodeApp/docs/api/ROUTES.md`
- `NodeApp/docs/api/FRONTEND_API_DEPENDENCIES.md`
- `NodeApp/docs/api/openapi.yaml`
- frontend runtime usage:
  - `NodeApp/artifacts/beacon/src/services/api.ts`
  - `NodeApp/artifacts/beacon/src/contexts/AuthContext.tsx`

## Frontend-Required Behavior Confirmed

### JWT Claim Names

Current auth foundation issues JWTs with these claim/payload names:

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

This matches the documented frontend contract.

### Expiry

- JWT expiry is `8 hours`.
- Signing algorithm remains HS256.

### Error Response Shape

- Shared error contract remains `{ "error": "<string>" }`.
- Bearer challenge/forbidden responses use the shared error shape.
- Shared exception pipeline also uses the same shape.

### 401 vs 403 Behavior

Current auth foundation behavior matches frontend expectations:

- missing or malformed auth on protected routes:
  - `401 { error: "Authentication required" }`
- invalid or expired bearer token:
  - `401 { error: "Invalid or expired token" }`
- disabled or missing DB user after token validation:
  - `401 { error: "Account is disabled or not found" }`
- authenticated but wrong role:
  - `403 { error: "Insufficient permissions" }`

This aligns with the frontend client behavior in `api.ts`, which globally logs out on any `401` and redirects on any `403`.

### Optional Auth For `/auth/me`

- Shared optional-auth helper exists and can authenticate bearer tokens without forcing a challenge.
- This is the correct direction for `/api/auth/me`.

Important integration note:

- Controllers must use the optional-auth helper on an anonymous route for `/api/auth/me`.
- The frontend `AuthContext` will treat any accidental `401` from `/api/auth/me` as a forced logout because of the global unauthorized handler.

### CamelCase Output

- Shared API JSON serialization is configured for camelCase.
- Shared response records serialize as camelCase.

### Pagination Envelope Structure

- Shared paginated envelope shape is:

```json
{
  "data": [],
  "total": 0,
  "pagination": {
    "total": 0,
    "page": 1,
    "limit": 20,
    "totalPages": 0
  }
}
```

- This matches the documented frontend contract.
- Shared pagination helper resolves both `limit` and `pageSize`, with `pageSize` winning when both are present.

## Confirmed Inconsistencies Found And Fixed

### 1. JWT validation secret could diverge from JWT issuance secret

Problem:

- Bearer validation was originally resolving `JwtSecretProvider` from a separately built service provider inside auth registration.
- In development, that could generate a different ephemeral secret than the one used by token issuance.
- Result: issued tokens could fail validation immediately.

Fix applied:

- JWT bearer options now use the application’s actual registered `JwtSecretProvider` through named options configuration.

### 2. Nullable JWT payload fields were being written as empty strings

Problem:

- `lastLogin` and `supporterId` were initially written as empty string claims when null.
- That did not match the documented payload contract closely enough.

Fix applied:

- JWT issuance now writes the documented payload fields directly into the token payload, preserving nullable values instead of coercing them to empty strings.

## Docs vs Frontend Conflicts

### Optional auth is stricter in frontend impact than in docs

Docs:

- `AUTH.md` and `ROUTES.md` describe `/api/auth/me` as optional-auth.

Frontend behavior:

- `api.ts` dispatches a global logout on any `401`.
- `AuthContext.tsx` listens for that and clears in-memory auth state.

Decision:

- Preferred actual frontend-required behavior.
- `/api/auth/me` must not return `401` when no token is present.
- This does not weaken core security because the route is explicitly documented as optional-auth and should return `{ user: null }` when unauthenticated.

## No Remaining Confirmed Infrastructure Drift

After the fixes above, no confirmed inconsistencies remain in the audited infrastructure for:

- JWT claim names
- expiry
- error response shape
- 401 vs 403 behavior
- camelCase output
- paginated list envelope structure

The remaining requirement is controller usage discipline:

- `/api/auth/me` must be implemented using optional-auth semantics rather than standard authorization attributes alone.

## Verification

- `dotnet build` succeeded after the audit fixes.
