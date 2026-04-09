# DEPLOYMENT_READINESS

This backend is prepared for Azure App Service with Supabase PostgreSQL and a Vercel frontend.

## What is now production-ready

- **Supabase PostgreSQL config**: runtime resolves `ConnectionStrings:PostgreSql` first, then `DATABASE_URL`.
- **Forwarded headers**: `X-Forwarded-For` and `X-Forwarded-Proto` support is enabled and can be toggled via `AzureHosting__UseForwardedHeaders`.
- **HTTPS + HSTS**:
  - `UseHttpsRedirection()` is enabled.
  - HSTS is enabled in non-development when `AzureHosting__UseHsts=true`.
- **CORS for Vercel**:
  - supports `CORS_ALLOWED_ORIGINS` (comma-separated),
  - plus single-origin shortcuts `VERCEL_FRONTEND_ORIGIN` and `FRONTEND_ORIGIN`,
  - merged with `Cors:AllowedOrigins` from appsettings.
- **JWT secret enforcement**:
  - production startup fails if `Jwt:Secret` / `JWT_SECRET` is missing.
- **Health endpoints**:
  - liveness: `GET /api/healthz`
  - readiness (DB connectivity): `GET /api/healthz/ready` (returns 503 if DB unavailable)
- **Azure/App Insights compatible logging**:
  - structured single-line console logging with UTC timestamp format.
  - optional Application Insights telemetry when `APPLICATIONINSIGHTS_CONNECTION_STRING` is present.

---

## Files added for deployment setup

- `.env.example`
- `appsettings.Production.template.json`

Use them as templates for Azure App Settings and secure environment provisioning.

---

## Required Azure App Settings (concise)

Set these in **Azure App Service > Configuration > Application settings**:

1. `ASPNETCORE_ENVIRONMENT=Production`
2. `ConnectionStrings__PostgreSql=<supabase-pooler-connection-string>`
3. `JWT_SECRET=<strong-random-secret-at-least-32-chars>`
4. `CORS_ALLOWED_ORIGINS=https://<your-vercel-app>.vercel.app`
5. `AzureHosting__UseForwardedHeaders=true`
6. `AzureHosting__UseHsts=true`

Recommended:

- `APPLICATIONINSIGHTS_CONNECTION_STRING=<value>` (if using App Insights)
- `Supabase__Url=https://<project-ref>.supabase.co`

Notes:

- `DATABASE_URL` can be set as a fallback, but `ConnectionStrings__PostgreSql` is preferred.
- If you have multiple frontend origins (preview + prod), set `CORS_ALLOWED_ORIGINS` as comma-separated values.

---

## Required Vercel frontend env vars (concise)

For the frontend deployment, set:

1. `VITE_API_BASE_URL=https://<your-azure-app>.azurewebsites.net`
2. `VITE_API_TIMEOUT_MS=30000` (or your preferred timeout)

If your frontend currently uses different names, keep those names but ensure they map to the same values above.

---

## Azure App Service runtime checklist

- Runtime stack: .NET (matching project target runtime).
- HTTPS only: enabled.
- Health check path: `/api/healthz/ready`.
- Always On: enabled (recommended for API cold-start reduction).
- Startup command: none required for standard ASP.NET Core app startup.

---

## Smoke test after deploy

Run these against the Azure URL:

1. `GET /api/healthz` → `200 {"status":"ok"}`
2. `GET /api/healthz/ready` → `200 {"status":"ok"}`
3. `OPTIONS /api/healthz` with `Origin: https://<your-vercel-app>.vercel.app` → includes `Access-Control-Allow-Origin`
4. `GET /api/does-not-exist` → JSON error envelope `{"error":"Not found"}`
