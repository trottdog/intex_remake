# .NET 10 Backend Baseline

This scaffold establishes the non-business foundation for the Azure-hosted .NET 10 Web API that will replace the Express backend while preserving the Beacon API contract.

## What Was Added

- `Program.cs` startup wiring for:
  - `/api` route prefix convention for future controllers
  - JSON camelCase serialization
  - invalid model-state responses shaped as `{ "error": string }`
  - global JSON/exception middleware shaped as `{ "error": string }`
  - forwarded headers, HTTPS redirection, HSTS, CORS, authentication, authorization
- Azure + Supabase-oriented configuration structure in:
  - `appsettings.json`
  - `appsettings.Development.json`
- PostgreSQL foundation using `NpgsqlDataSource` and `IPostgresConnectionFactory`
- JWT bearer authentication shell using symmetric HS256-compatible validation
- role constants and authorization policy shells
- shared response types for:
  - standard paginated routes
  - superadmin ML paginated routes
- initial folder scaffolding for:
  - `Controllers`
  - `DTOs`
  - `Entities`
  - `Services`
  - `Repositories`
  - `Infrastructure`

## Contract-Sensitive Decisions Preserved

- API routes are intended to live under `/api`
- JWT-only auth model; no cookies or ASP.NET Identity
- error payload shape uses `error`
- 204 responses remain bodyless by default in ASP.NET Core
- CORS is driven by environment/config rather than hardcoded origins
- JWT bearer validation uses no issuer/audience requirement and zero clock skew to stay aligned with the documented contract

## Important Notes

- No business controllers or route implementations were added yet.
- No entity mappings or repository implementations were added yet.
- No database migrations or schema sync work were added yet.
- The old sample `WeatherForecast` endpoint was removed so the scaffold does not expose a non-contract route.

## What Still Remains

- implement actual route groups and controller actions under `/api`
- add request/response DTOs per contract
- add database entities and query models aligned to `DATABASE_SCHEMA.sql`
- add repository implementations and SQL access patterns for Supabase/PostgreSQL
- add JWT issuance flow for `/api/auth/login`
- add route-level auth/role attributes matching the authorization matrix
- add contract-exact pagination/query handling per endpoint
- add health endpoint, auth endpoints, and all business/domain endpoints
- add integration tests for contract parity
- add production secret/env validation and deployment documentation for Azure App Service / Key Vault / Supabase
