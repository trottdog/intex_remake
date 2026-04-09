# Auth Foundation Notes

## JWT Contract

- Signing algorithm: `HS256`
- Transport: `Authorization: Bearer <token>`
- Expiry: `8 hours`
- Stateless only:
  - no cookies
  - no refresh tokens
  - no server-side session state

## Exact JWT Claim Names

The JWT payload is issued with these exact claim names to match the documented frontend contract:

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

Notes:

- `role` is the ASP.NET role claim type for authorization policies.
- `safehouses` is intentionally not part of the JWT payload.
- `safehouses` belongs only in the login response body later, not in token issuance.

## Validation Behavior

- Missing or malformed bearer auth on protected routes should map to:
  - `401 { "error": "Authentication required" }`
- Invalid or expired token should map to:
  - `401 { "error": "Invalid or expired token" }`
- Live database `isActive` failure should map to:
  - `401 { "error": "Account is disabled or not found" }`
- Authenticated but unauthorized role should map to:
  - `403 { "error": "Insufficient permissions" }`

## Live Account Check

- Authenticated JWT requests perform a database lookup against `users`
- The request is rejected if:
  - the user no longer exists
  - `is_active = false`

This preserves the documented “disable takes effect immediately” behavior.

## Optional Auth Support

- Optional bearer auth support is provided via a reusable `HttpContext` extension
- Controllers like `/api/auth/me` can attempt bearer authentication without forcing a `401` when no token is present

## Authorization Policies

- `AnyAuthenticatedUser`
- `DonorOnly`
- `StaffOrAbove`
- `AdminOrAbove`
- `SuperAdminOnly`

Role sets are based on:

- `donor`
- `staff`
- `admin`
- `super_admin`

## Password Services

BCrypt:

- work factor `12`

Password validation modes:

- first-failure validation
  - for user creation behavior
- aggregated validation
  - for change-password behavior
  - returns `Password must contain: ...`
