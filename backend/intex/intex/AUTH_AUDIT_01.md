# Auth Audit 01

Audit date: 2026-04-09

Sources audited against:

- `Asset-Manager/api_docs/API_CONTRACT_SOURCE_OF_TRUTH.md`
- `Asset-Manager/api_docs/AUTH_AND_AUTHORIZATION_MATRIX.md`
- `Asset-Manager/api_docs/FRONTEND_API_CALL_INVENTORY.md`
- `Asset-Manager/api_docs/MIGRATION_GAP_LIST.md`

## Summary

The implemented auth and user core now aligns well with the documented contract for:

- login response shape
- JWT bearer compatibility
- role strings
- bcrypt compatibility
- change-password rules
- safehouse assignment loading
- 401 vs 403 behavior
- JSON error envelope
- route paths and methods for the implemented scope

Several mismatches were found during the audit and were fixed before finalizing this document.

## Fixes Applied During Audit

### 1. `GET /api/auth/me` Optional Auth Semantics

Status: fixed

Issue found:

- the initial .NET implementation used the normal JWT bearer authentication pipeline for `GET /api/auth/me`
- that caused the endpoint to behave more like `requireAuth` than `optionalAuth`

Why that was wrong:

- the docs and migration notes require:
  - no/invalid token -> `{ "user": null }` with HTTP 200
  - disabled-but-valid token -> still return user data for `auth/me` (current Express behavior)

Fix:

- added a dedicated optional token reader
- `GET /api/auth/me` now parses bearer tokens without triggering the live `isActive` rejection path used by protected routes
- invalid or missing token returns `{ "user": null }`
- valid token still resolves the current user profile from the DB and assigned safehouses

### 2. Missing `GET /api/users/{id}`

Status: fixed

Issue found:

- the contract includes `GET /api/users/:id`
- the first .NET pass only implemented list/create/update/enable/disable/delete

Fix:

- added `GET /api/users/{id}` to the users controller

### 3. User Delete Cleanup

Status: fixed

Issue found:

- `DATABASE_ACCESS_MAP.md` documents that user deletion should clear safehouse assignments first
- the first .NET pass deleted the user only

Fix:

- `DELETE /api/users/{id}` now removes `staff_safehouse_assignments` rows for that user before deleting the user

### 4. JWT Payload Closer to Contract Shape

Status: improved

Issue found:

- the first token payload used repeated `safehouse` claims instead of a `safehouses` payload field

Fix:

- token generation now includes a `safehouses` JSON array claim
- custom field names now track the documented payload much more closely:
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
  - `safehouses`

## Audit Results

### Login Response Shape

Result: pass

`POST /api/auth/login` returns:

```json
{
  "token": "...",
  "user": {
    "id": 1,
    "username": "alice",
    "email": "alice@example.com",
    "firstName": "Alice",
    "lastName": "Ng",
    "role": "super_admin",
    "isActive": true,
    "mfaEnabled": false,
    "lastLogin": "2026-04-09T12:34:56.0000000Z",
    "supporterId": null,
    "safehouses": [1, 2]
  }
}
```

The top-level field names match the contract exactly: `token` and `user`.

### JWT Payload Fields

Result: pass with one note

The token payload now carries the contract-auth fields under the expected names.

Note:

- JWTs still naturally include standard token metadata like expiration timestamps
- that is normal and does not conflict with the contract

### Role Strings

Result: pass

The implementation preserves exact role strings:

- `public`
- `donor`
- `staff`
- `admin`
- `super_admin`

Validation is enforced when creating/updating users.

### BCrypt Compatibility

Result: pass

The implementation uses `BCrypt.Net-Next` and hashes passwords with cost factor 12.

This aligns with the migration docs and existing database compatibility requirements.

### Change-Password Rules

Result: pass

`POST /api/auth/change-password` enforces:

- minimum 12 characters
- uppercase
- lowercase
- digit
- special character

Behavior matches the contract:

- password policy failure -> 400 with `{ "error": string }`
- wrong current password -> 401 with `{ "error": string }`
- success -> 200 with `{ "message": "Password changed successfully" }`

### Enable/Disable Behavior

Result: pass

`POST /api/users/{id}/disable`

- sets `isActive` to `false`
- returns the user payload

`POST /api/users/{id}/enable`

- sets `isActive` to `true`
- returns the user payload

Protected authenticated routes perform a live DB `isActive` validation at token-validation time, so disabled accounts are rejected on the next protected request.

### `safehouses[]` Loading

Result: pass

The implementation correctly loads safehouse assignments from `staff_safehouse_assignments` and handles the schema quirk:

- `user_id` is stored as `varchar`
- .NET queries cast the integer user id to `string`

This is used for:

- login payload
- `auth/me`
- user list/detail/update/enable/disable responses

### 401 vs 403 Behavior

Result: pass

Current behavior matches the documented split:

- missing bearer token on protected route -> 401
- invalid/expired token -> 401
- disabled account on protected route -> 401
- authenticated but wrong role -> 403

This is important for React frontend behavior because:

- 401 triggers `beacon:unauthorized`
- 403 redirects the frontend to `/forbidden`

### JSON Error Envelope

Result: pass

Error responses use:

```json
{ "error": "..." }
```

This is preserved in:

- JWT auth challenge responses
- forbidden responses
- controller-level business validation responses
- global exception middleware

### Route Paths and Methods

Result: pass for the audited scope

Implemented and aligned:

- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/change-password`
- `POST /api/auth/logout`
- `GET /api/users`
- `GET /api/users/{id}`
- `POST /api/users`
- `PATCH /api/users/{id}`
- `POST /api/users/{id}/disable`
- `POST /api/users/{id}/enable`
- `DELETE /api/users/{id}`

### Bearer Auth Compatibility with React Frontend

Result: pass

The backend accepts:

- `Authorization: Bearer <token>`

It does not use:

- cookies
- ASP.NET Identity
- server-side sessions

This is compatible with the frontend HTTP client in `artifacts/beacon/src/services/api.ts`.

## Residual Notes

### `auth/me` Behavior Is Intentionally Special

This endpoint now matches the current Express-compatible optional-auth behavior rather than the stricter protected-route auth behavior.

That means:

- it does not use the live `isActive` rejection path
- it still returns `{ "user": null }` for invalid or absent tokens

This is intentional and follows the migration notes.

### Safehouse Data Comes from DB for `auth/me`

This matches the live backend pattern more closely than simply echoing token claims.

### Existing JWTs After Password Change

Current behavior still matches the documented system:

- changing a password updates the hash in the DB
- existing valid JWTs are not blacklisted
- protected requests continue until token expiry unless the account is disabled

## Final Assessment

Current status: auth/user contract-ready for the implemented scope

The auth and user core now matches the documented frontend-facing contract well enough to serve as the basis for the remaining protected business routes.
