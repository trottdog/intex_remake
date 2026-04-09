# Environment Variables and Secrets — Beacon Platform

**Purpose:** Document every environment variable, config dependency, external service integration, and deployment assumption required to run this project outside of Replit. This is the canonical reference for rebuilding the app on any other infrastructure.

All findings come from actual source code analysis. No secret values are included.

---

## Table of Contents

1. [Quick Reference — All Variables](#1-quick-reference--all-variables)
2. [Database Connection Requirements](#2-database-connection-requirements)
3. [Auth and Session Secrets](#3-auth-and-session-secrets)
4. [CORS and Network Configuration](#4-cors-and-network-configuration)
5. [Frontend Base URL and Backend Base URL Config](#5-frontend-base-url-and-backend-base-url-config)
6. [Logging Configuration](#6-logging-configuration)
7. [Build and Runtime Environment Assumptions](#7-build-and-runtime-environment-assumptions)
8. [Third-Party APIs and External Services](#8-third-party-apis-and-external-services)
9. [File Upload and Storage Config](#9-file-upload-and-storage-config)
10. [Replit-Specific Variables](#10-replit-specific-variables)
11. [Hardcoded Values That Must Be Extracted](#11-hardcoded-values-that-must-be-extracted)
12. [Potential Secret Exposure Risks](#12-potential-secret-exposure-risks)

---

## 1. Quick Reference — All Variables

| Variable | Component | Required | Sensitive | Default | Vercel + Azure note |
|---|---|---|---|---|---|
| `DATABASE_URL` | Backend, DB tooling | **Yes** | **Yes** | none — throws on startup | Use Supabase pooler URL for runtime; Supabase direct URL for migrations |
| `JWT_SECRET` | Backend | **Yes in production** | **Yes** | Ephemeral random (dev only) | Store in Azure Key Vault; reference via App Setting |
| `NODE_ENV` | Backend, Frontend build | Yes | No | `"development"` | Set `production` in Azure App Settings |
| `PORT` | Backend, Frontend | **Yes** | No | Backend throws; frontend defaults to `5173` | Azure sets this automatically; Vercel does not use it (static host) |
| `CORS_ALLOWED_ORIGINS` | Backend | No | No | All origins allowed in dev | **Required** — must include Vercel deployment URLs |
| `VITE_API_BASE_URL` | Frontend (build-time) | No | No | `""` (empty — uses proxy in dev) | **Required on Vercel** — must be the Azure backend URL |
| `VITE_BASE_PATH` | Frontend standalone build | No | No | `"/"` | Set `"/"` on Vercel |
| `BASE_PATH` | Frontend, Mockup sandbox | Yes (Replit sets it) | No | Frontend defaults `"/"`, mockup throws | Not used by Vercel; omit or set `"/"` |
| `LOG_LEVEL` | Backend | No | No | `"info"` | Set via Azure App Settings |
| `PGSSLMODE` | `pg` driver (library) | No | No | Library default | Not needed; Supabase SSL handled by connection string |
| `PGCONNECT_TIMEOUT` | `pg` driver (library) | No | No | `0` (none) | Not needed |
| `NODE_PG_FORCE_NATIVE` | `pg` driver (library) | No | No | Not set | Do not set |
| `REPL_ID` | Mockup sandbox | No | No | Not set outside Replit | Not applicable |

---

## 2. Database Connection Requirements

### `DATABASE_URL`

| Property | Value |
|---|---|
| **Variable name** | `DATABASE_URL` |
| **Used in** | `artifacts/api-server/src/lib/db.ts`, `lib/db/drizzle.config.ts` |
| **Component** | Backend (runtime), DB tooling (migrations, seed) |
| **Required** | Yes — both files throw/fail at startup if absent |
| **Sensitive** | Yes — contains host, port, credentials, database name |
| **Purpose** | PostgreSQL connection string. Passed directly to the `pg` connection pool via Drizzle ORM |
| **Example** | `postgresql://user:password@host:5432/dbname` |
| **Migration notes** | Works with any PostgreSQL-compatible provider: Neon, Supabase, Azure Database for PostgreSQL, Railway, Amazon RDS. Set as a secret/env var in the deployment platform — never commit. |

#### SSL behavior

The database connection automatically enables SSL with `rejectUnauthorized: false` when `NODE_ENV === "production"`:

```typescript
ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false
```

This is the correct setting for most managed PostgreSQL providers (Neon, Supabase, Heroku, Railway) that use self-signed or intermediate certificates. If migrating to a provider that requires full certificate chain validation, this line must be changed.

#### Supabase-specific notes (target database provider)

Supabase provides two distinct connection strings — they serve different purposes and must not be mixed:

| Connection type | URL format | Port | Use for |
|---|---|---|---|
| **Pooler (Transaction mode)** | `postgresql://postgres.[ref]:[pass]@aws-0-[region].pooler.supabase.com:6543/postgres` | `6543` | App runtime (`DATABASE_URL` in Azure App Settings) |
| **Direct connection** | `postgresql://postgres:[pass]@db.[ref].supabase.co:5432/postgres` | `5432` | Drizzle migrations and schema push (`DATABASE_URL` at migration time) |

**Why two strings matter:**
- The pooler uses pgBouncer in **transaction mode**. It does not support session-level state (e.g., `SET` commands, advisory locks, prepared statements). The current Beacon app does not use any of these, so the pooler is safe for runtime.
- Drizzle `db:push` (schema migrations) require a direct connection because pgBouncer transaction mode may not reliably handle DDL statements.
- Always use the pooler URL in the Azure backend's `DATABASE_URL` App Setting to benefit from connection pooling and avoid exhausting Supabase's direct connection limit.

**SSL:** Supabase enforces SSL. The existing `rejectUnauthorized: false` setting works with Supabase's certificates. No additional SSL configuration is needed.

**Connection string format for Supabase pooler (with pgBouncer hint):**
```
postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true
```
The `?pgbouncer=true` query parameter tells the `pg` driver to disable prepared statements, which is required in transaction pooling mode. **Add this parameter to the runtime `DATABASE_URL`.**

**Supabase IPv6:** Supabase's pooler supports both IPv4 and IPv6. Azure App Service supports both. No extra configuration is needed.

#### Additional PostgreSQL env vars (from `pg` library — not application-level)

These are standard `pg` library environment variables, not set by the application code itself. They have no effect unless set in the OS environment:

| Variable | Purpose | Relevant? |
|---|---|---|
| `PGSSLMODE` | Controls SSL mode for `pg` connections | Low — only if needed to override connection string SSL setting |
| `PGCONNECT_TIMEOUT` | Connection timeout in seconds | Low — library default (0 = no timeout) |
| `NODE_PG_FORCE_NATIVE` | Forces use of native `pg` bindings | Low — do not set unless native bindings are installed |

#### Drizzle ORM tooling

The `lib/db` package includes migration and seed tooling. All commands require `DATABASE_URL`:

```bash
pnpm --filter @workspace/db run push        # Push schema to DB
pnpm --filter @workspace/db run push-force  # Force push (use with caution)
pnpm --filter @workspace/db run seed        # Seed demo data
```

---

## 3. Auth and Session Secrets

### `JWT_SECRET`

| Property | Value |
|---|---|
| **Variable name** | `JWT_SECRET` |
| **Used in** | `artifacts/api-server/src/middleware/auth.ts` |
| **Component** | Backend only |
| **Required** | **Required in production.** Optional in development (falls back to ephemeral). |
| **Sensitive** | **Yes** — anyone with this secret can forge valid JWT tokens for any user at any role |
| **Purpose** | Signs and verifies all JWT bearer tokens. Tokens are HS256-signed with this secret. |
| **Example** | `your-very-long-random-secret-at-least-48-bytes-hex` |
| **Migration notes** | Must be set as a secret/env var in the deployment platform. Never commit. Should be at minimum 32 bytes of cryptographically random data. Rotate by changing the value — all existing tokens become invalid immediately. |

#### Fallback behavior

When `JWT_SECRET` is not set and `NODE_ENV !== "production"`:

```typescript
const ephemeral = randomBytes(48).toString("hex");
console.warn("[auth] WARNING: JWT_SECRET not set. Using ephemeral secret — all tokens will be invalidated on restart.");
return ephemeral;
```

- In development: A new secret is generated on every server restart. All previously issued tokens become invalid after any restart.
- In production: The server throws a hard error and refuses to start. This is intentional.

**Migration to .NET:** The .NET backend must use the same algorithm (HS256) and same secret value to validate tokens issued by the Express server. If the .NET backend issues new tokens and the Express backend is decommissioned simultaneously, any existing browser sessions will be logged out on first request (users must log in again).

There is no token blacklist and no refresh token mechanism. All token state lives in the JWT payload itself.

#### Azure-specific notes for `JWT_SECRET`

**Storage recommendation:** Store `JWT_SECRET` in **Azure Key Vault** and reference it in Azure App Settings using the Key Vault reference syntax:
```
@Microsoft.KeyVault(SecretUri=https://your-vault.vault.azure.net/secrets/jwt-secret/)
```
This prevents the secret value from appearing in the Azure portal UI or in deployment logs.

**Alternative (simpler):** Set `JWT_SECRET` directly as an Azure App Service Application Setting (marked as "slot setting" to prevent accidental override during deployment slot swaps). This is acceptable if Azure Key Vault is not available.

**For the .NET Web API on Azure:** Use `Microsoft.AspNetCore.Authentication.JwtBearer` with:
- Algorithm: `SecurityAlgorithms.HmacSha256` (HS256)
- `IssuerSigningKey`: `SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret))`
- Validation: `ValidateIssuer = false`, `ValidateAudience = false`, `ValidateLifetime = true`
- The same `JWT_SECRET` value must be used — tokens issued by the Express backend will be valid for the .NET backend, and vice versa.

**Cross-domain token delivery:** The React frontend stores the JWT in memory (React context) and sends it as `Authorization: Bearer <token>`. Since Vercel and Azure are on different domains, the bearer token mechanism is CORS-safe — no cookie SameSite restrictions apply. This is an advantage of the current stateless JWT design.

---

## 4. CORS and Network Configuration

### `CORS_ALLOWED_ORIGINS`

| Property | Value |
|---|---|
| **Variable name** | `CORS_ALLOWED_ORIGINS` |
| **Used in** | `artifacts/api-server/src/app.ts` |
| **Component** | Backend |
| **Required** | Required in production |
| **Sensitive** | No |
| **Purpose** | Comma-separated list of allowed CORS origins. Controls which frontend origins can send cross-origin requests to the API. |
| **Example** | `https://beacon.example.com,https://app.beacon.org` |

#### CORS policy behavior

```typescript
const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS
  ? process.env.CORS_ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : [];

// In dev with no origins set: allow all
if (allowedOrigins.length === 0 && process.env.NODE_ENV !== "production") return callback(null, true);
// Otherwise: strict allowlist
if (allowedOrigins.includes(origin)) return callback(null, true);
```

**In development with no env var set:** All origins allowed — intentional for local development flexibility.

**In production with no env var set:** All requests from any origin will be CORS-rejected. This is a silent security bug — the API will be unreachable from any browser-based frontend. **Always set `CORS_ALLOWED_ORIGINS` in production.**

Additional CORS settings (hardcoded, not configurable via env):
- `credentials: false` — no cookies involved in auth
- `allowedHeaders: ["Content-Type", "Authorization"]`
- `methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"]`

**CSP connect-src:** The backend's Content-Security-Policy header also references `VITE_API_BASE_URL` for its `connect-src` directive. See §5 for details.

#### Vercel + Azure CORS requirements

On Vercel + Azure, the frontend and backend are on **separate domains**. Every browser request from the React SPA to the Azure API is cross-origin. `CORS_ALLOWED_ORIGINS` **must** be set in Azure App Settings.

**What origins to include:**

| Origin type | Example | Notes |
|---|---|---|
| Production domain | `https://beacon.vercel.app` | Or custom domain if configured |
| Vercel preview deployments | `https://beacon-git-*.vercel.app` | Pattern-based; the current Express CORS impl only supports exact-match strings, not wildcards |
| Local development | `http://localhost:5173` | Not needed in Azure — only needed in local dev |

**Vercel preview deployment CORS problem:** Vercel automatically creates unique preview URLs for every branch and pull request (e.g., `https://beacon-git-feature-xyz-orgname.vercel.app`). The current Express CORS implementation uses an exact-match allowlist — it does not support wildcard patterns. Each new preview URL will be CORS-rejected unless explicitly added.

**Options to resolve preview CORS:**
1. Add all expected preview URLs to `CORS_ALLOWED_ORIGINS` before deployment (impractical for many branches).
2. Extend the CORS origin check in `app.ts` to support regex or wildcard matching for `*.vercel.app` origins in non-production environments only.
3. Accept CORS rejection on preview deployments and only test against the production Vercel URL.
4. Use Vercel's environment variable scoping to point preview builds at a development-mode API that allows all origins.

**For the .NET backend on Azure:** ASP.NET Core's CORS middleware supports policy-based origin matching, including wildcard-like patterns per ASP.NET Core conventions. The `CORS_ALLOWED_ORIGINS` environment variable value should be read and parsed identically — comma-separated list of exact origins.

---

## 5. Frontend Base URL and Backend Base URL Config

### `VITE_API_BASE_URL`

| Property | Value |
|---|---|
| **Variable name** | `VITE_API_BASE_URL` |
| **Used in** | `artifacts/beacon/src/services/api.ts` (frontend, build-time), `artifacts/api-server/src/middleware/security.ts` (backend, runtime) |
| **Component** | Frontend (baked into JS bundle at build time), Backend (CSP header) |
| **Required** | No |
| **Sensitive** | No |
| **Purpose** | Sets the API origin prefix prepended to every API call from the frontend. Also added to the backend's CSP `connect-src` directive. |
| **Example (production)** | `https://api.beacon.org` |
| **Default** | `""` (empty string) — requests go to the same origin |

#### Two very different uses of this variable

**In the frontend (`services/api.ts`):**
```typescript
const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";
// All requests: fetch(`${API_BASE}/api/auth/login`, ...)
```

When empty (the default in Replit), all API calls use relative URLs (`/api/...`). In development, Vite's dev server proxies `/api` to `http://localhost:8080`. In Replit production deployment, the path router handles this. If deploying the frontend and backend to separate domains, `VITE_API_BASE_URL` must be set to the full backend origin (e.g., `https://api.beacon.org`).

**In the backend (`middleware/security.ts`):**
```typescript
const API_BASE = process.env.VITE_API_BASE_URL ?? "";
const connectSrc = ["'self'", API_BASE].filter(Boolean).join(" ");
```

The backend uses this to build a CSP `connect-src` header allowing the frontend to call the API. If frontend and backend are on different origins, this must match the backend origin.

**Standalone build (`vite.config.standalone.ts`):**
```typescript
define: {
  "import.meta.env.VITE_API_BASE_URL": JSON.stringify(
    process.env.VITE_API_BASE_URL ?? "http://localhost:8080"
  ),
}
```
The standalone build configuration (used for building outside of Replit) defaults to `http://localhost:8080` if no env var is set.

#### Vercel + Azure configuration for `VITE_API_BASE_URL`

This is the **most critical environment variable** for the Vercel + Azure split-domain architecture.

- Set `VITE_API_BASE_URL` as an **Environment Variable in the Vercel dashboard** (not a secret — it is baked into the public JS bundle).
- It must be set to the full Azure backend origin, e.g.: `https://beacon-api.azurewebsites.net`
- Set it for the **Production** environment in Vercel. Also set it for **Preview** and **Development** environments if those should hit a different API (e.g., a staging backend).
- Without this variable set, the built Vercel bundle will call `/api/...` as relative URLs — which point to Vercel's static file server, not the Azure backend. Every API call will 404.
- Vite bakes the value at build time (`import.meta.env.VITE_API_BASE_URL`). Changing the Azure URL after building requires a **Vercel redeploy**.

**What `VITE_API_BASE_URL` does NOT do:**
- It does not affect the backend. The backend reads this var for CSP header generation, but on Azure, the backend builds independently of Vercel.
- It is not a secret — it will be visible in the browser's JS bundle. Never use it for sensitive values.

**CSP note for the .NET Azure backend:** The backend's `security.ts` uses `VITE_API_BASE_URL` to populate the `connect-src` CSP header. The .NET replacement must replicate this logic: read a config value for the allowed frontend origin and include it in the `connect-src` directive.

---

### `PORT`

| Property | Value |
|---|---|
| **Variable name** | `PORT` |
| **Used in** | `artifacts/api-server/src/index.ts`, `artifacts/beacon/vite.config.ts`, `artifacts/mockup-sandbox/vite.config.ts` |
| **Component** | Backend (required), Frontend build (used for dev server port) |
| **Required** | Backend throws `Error` if missing. Frontend defaults to `5173`. Mockup sandbox throws if missing. |
| **Sensitive** | No |
| **Purpose** | Sets the listening port. In Replit, each artifact receives a unique port assigned by the platform. |

| Service | Port in Replit | Source |
|---|---|---|
| API Server | `8080` | `artifact.toml` production env |
| Frontend (Beacon) | `18245` | `artifact.toml` `[services.env]` |
| Mockup Sandbox | `8081` | `artifact.toml` `[services.env]` |

**Migration note:** On external platforms (Heroku, Railway, Render, Azure App Service), `PORT` is set automatically by the platform at runtime. The code already handles this correctly. Do not hard-code the port.

**Azure App Service:** Azure injects `PORT` automatically via the `WEBSITES_PORT` environment variable (defaults to `8080` if not set). The existing `process.env.PORT` reference in `index.ts` will receive the correct value. Do not set `PORT` manually in Azure App Settings — let Azure assign it.

**Vercel:** The Vercel static host does not use `PORT`. The React SPA is served by Vercel's CDN. `PORT` is only relevant to the Azure backend.

---

### `BASE_PATH`

| Property | Value |
|---|---|
| **Variable name** | `BASE_PATH` |
| **Used in** | `artifacts/beacon/vite.config.ts`, `artifacts/mockup-sandbox/vite.config.ts` |
| **Component** | Frontend build-time config |
| **Required** | Mockup sandbox throws if missing. Frontend defaults to `"/"`. |
| **Sensitive** | No |
| **Purpose** | Sets the Vite `base` option, which controls the base URL path for all asset references in the built output. In Replit, each artifact is served at a different path prefix (e.g., `/`, `/__mockup`). |
| **Example** | `/` for the main app, `/__mockup` for the mockup sandbox |

**Migration note:** Outside of Replit, the frontend is typically served at `/` (the root). Set `BASE_PATH=/` or simply omit it (the default `"/"` applies). The frontend router uses `import.meta.env.BASE_URL` (Vite's built-in variable, not a custom env var) to set the wouter `base` prop, ensuring all client-side routes account for the base path.

### `VITE_BASE_PATH`

| Property | Value |
|---|---|
| **Variable name** | `VITE_BASE_PATH` |
| **Used in** | `artifacts/beacon/vite.config.standalone.ts` only |
| **Component** | Frontend standalone build only |
| **Required** | No |
| **Sensitive** | No |
| **Purpose** | Alternative base path variable used in the standalone build config (for building the frontend independently of Replit's `BASE_PATH` injection). |
| **Default** | `"/"` |

---

## 6. Logging Configuration

### `LOG_LEVEL`

| Property | Value |
|---|---|
| **Variable name** | `LOG_LEVEL` |
| **Used in** | `artifacts/api-server/src/lib/logger.ts` |
| **Component** | Backend |
| **Required** | No |
| **Sensitive** | No |
| **Purpose** | Controls the minimum log level for the pino structured logger. |
| **Default** | `"info"` |
| **Valid values** | `"trace"`, `"debug"`, `"info"`, `"warn"`, `"error"`, `"fatal"`, `"silent"` |
| **Example** | `LOG_LEVEL=debug` for verbose output during development |

The logger redacts sensitive fields from log output — the `Authorization` header, `Cookie` header, and `Set-Cookie` response header are never logged, even at `trace` level.

**Format behavior:**
- In development (`NODE_ENV !== "production"`): `pino-pretty` transport is used for human-readable colorized output.
- In production: Raw JSON lines (pino default) — compatible with log aggregators such as Datadog, Loggly, Papertrail, or Azure Monitor.

---

## 7. Build and Runtime Environment Assumptions

### `NODE_ENV`

| Property | Value |
|---|---|
| **Variable name** | `NODE_ENV` |
| **Used in** | Multiple backend and frontend files |
| **Required** | No — defaults to `"development"` |
| **Sensitive** | No |
| **Valid values** | `"development"`, `"production"`, `"test"` |

Behavior differences by value:

| Behavior | `development` | `production` |
|---|---|---|
| JWT_SECRET | Ephemeral fallback allowed | Must be set — throws on startup |
| HTTP→HTTPS redirect | Disabled | Enabled (checks `x-forwarded-proto`) |
| PostgreSQL SSL | Disabled | `{ rejectUnauthorized: false }` |
| CORS | All origins allowed (if no `CORS_ALLOWED_ORIGINS`) | Strict allowlist only |
| Pino log format | pino-pretty (colorized) | JSON lines |
| Replit cartographer plugin | Loaded (if `REPL_ID` also set) | Not loaded |

The API server dev script explicitly sets `NODE_ENV=development`:
```json
"dev": "export NODE_ENV=development && pnpm run build && pnpm run start"
```

The production artifact config sets `NODE_ENV=production` in the run env.

---

### Node.js and PostgreSQL Runtime Versions

From `.replit` / `replit.nix`:

| Runtime | Version | Notes |
|---|---|---|
| Node.js | `nodejs-24` (Nix module) | LTS v24.x |
| PostgreSQL | `postgresql-16` (Nix module) | Provided by Replit's built-in database |

**Migration note:** The codebase uses ES modules (`"type": "module"` in all `package.json` files). Node.js 18+ is required. Node.js 20 LTS is the minimum recommended version for external deployment. PostgreSQL 14+ is compatible; the schema uses no version-specific features beyond standard SQL and JSONB.

---

### Package Manager

The workspace uses `pnpm` (version determined by the Nix environment). The `pnpm-workspace.yaml` defines the monorepo structure:

```
artifacts/*
lib/*
lib/integrations/*
scripts
```

All cross-package references use `workspace:*` protocol. External deployment requires `pnpm` to be installed — `npm install` or `yarn install` will not correctly resolve workspace links.

---

### Vite Dev Server Proxy

**File:** `artifacts/beacon/vite.config.ts`

```typescript
proxy: {
  "/api": {
    target: "http://localhost:8080",
    changeOrigin: true,
  },
},
```

This hardcoded proxy is **only active during development** (`vite dev`). In production static builds, no proxy exists — the frontend must be served behind a reverse proxy that routes `/api/*` to the backend, or `VITE_API_BASE_URL` must be set to the full backend origin.

**This `localhost:8080` value is not configurable via an env var** in the standard Vite config. It assumes the API server is always on port 8080 locally. To change this for local development, the value in `vite.config.ts` must be edited directly.

---

## 8. Third-Party APIs and External Services

**No third-party API integrations currently exist.** The application has no dependencies on any external service API. Specifically:

| Service category | Status | Notes |
|---|---|---|
| Payment processing | Not integrated | Donation amounts are recorded in the DB but no payment gateway (Stripe, PayMongo, etc.) is integrated. Demo submissions succeed without processing. |
| Email delivery | Not integrated | No SMTP, no transactional email API (SendGrid, Postmark, Resend, etc.). No password reset, no welcome emails, no notifications are sent. |
| File/image storage | Not integrated | No file uploads exist. No S3, GCS, Cloudinary, or similar. |
| OAuth / social login | Not integrated | Authentication is username + password only. No Google, Facebook, or other OAuth providers. |
| Push notifications | Not integrated | No FCM, APNs, or web push. |
| SMS | Not integrated | No Twilio, Vonage, or similar. |
| Analytics | Not integrated | No Google Analytics, Mixpanel, Plausible, or tracking scripts embedded in the frontend. A cookie consent banner exists in the UI but no actual analytics SDK is loaded. |
| CDN | Not integrated | Assets are served directly from the application. |
| ML inference | Not integrated (demo data) | The super admin ML dashboard displays ML prediction data stored in the PostgreSQL database. There is no external ML inference API call — data is generated by the seed script and stored in the `ml_pipeline_runs` and `ml_prediction_snapshots` tables. |

---

## 9. File Upload and Storage Config

No file upload capability exists in the current codebase. There are no:
- Multipart form handlers
- S3 SDK or any object storage client
- `multer`, `busboy`, or similar middleware
- Upload-related API endpoints
- Frontend file input components connected to an upload endpoint

**Migration note:** If file uploads are added in the future (e.g., resident photos, document uploads), a storage provider configuration will need to be added. Recommended providers for a .NET migration: Azure Blob Storage, AWS S3, or Cloudflare R2.

---

## 10. Replit-Specific Variables

These variables are injected by the Replit platform and are not portable to other environments.

### `REPL_ID`

| Property | Value |
|---|---|
| **Variable name** | `REPL_ID` |
| **Used in** | `artifacts/mockup-sandbox/vite.config.ts` |
| **Component** | Mockup sandbox (Replit-specific design tool) |
| **Required** | No |
| **Purpose** | Detects whether the app is running inside Replit. Used to conditionally load the `@replit/vite-plugin-cartographer` plugin, which enables Replit's component explorer feature. |

```typescript
...(process.env.NODE_ENV !== "production" && process.env.REPL_ID !== undefined
  ? [await import("@replit/vite-plugin-cartographer").then(...)]
  : []),
```

**Migration note:** This check is safe to leave in the code outside Replit — if `REPL_ID` is not set, the plugin is not loaded and no error occurs. However, the `@replit/vite-plugin-cartographer` and other `@replit/*` packages are in the catalog and may not resolve correctly outside Replit's environment. The mockup sandbox itself is a Replit-internal design tool and is unlikely to be deployed externally.

### Platform-injected variables used by artifact config

These variables are set by Replit's artifact system in `artifact.toml` and are not application code — they configure how the platform runs each service:

| Variable | Service | Value |
|---|---|---|
| `PORT` | API Server | `8080` (production) |
| `PORT` | Beacon frontend | `18245` |
| `PORT` | Mockup sandbox | `8081` |
| `BASE_PATH` | Beacon frontend | `"/"` |
| `BASE_PATH` | Mockup sandbox | `"/__mockup"` |
| `NODE_ENV` | API Server build | `"production"` |
| `NODE_ENV` | API Server run | `"production"` |

**Migration note:** These values must be manually set in the deployment environment's env config (e.g., `.env`, Heroku config vars, Azure App Settings, Docker environment).

### `DATABASE_URL` — Replit auto-provisioned

Replit automatically provides `DATABASE_URL` for the built-in PostgreSQL database via the `postgresql-16` Nix module. Outside Replit, this must be manually set to point to the target database.

---

## 11. Hardcoded Values That Must Be Extracted

These are values embedded directly in source code that would need to be extracted to environment variables for full portability.

### 1. Vite Dev Proxy Target — `http://localhost:8080`

**File:** `artifacts/beacon/vite.config.ts`

```typescript
proxy: {
  "/api": {
    target: "http://localhost:8080",  // hardcoded
    changeOrigin: true,
  },
},
```

**Impact:** Development only — only active during `vite dev`. In production, the built static files use `VITE_API_BASE_URL` instead. No action needed for production deployment, but developers on different setups must edit this file if the API server runs on a different port.

**Suggested fix:** Read from an env var: `target: process.env.VITE_PROXY_TARGET ?? "http://localhost:8080"`.

---

### 2. Standalone Build Default API URL — `http://localhost:8080`

**File:** `artifacts/beacon/vite.config.standalone.ts`

```typescript
"import.meta.env.VITE_API_BASE_URL": JSON.stringify(
  process.env.VITE_API_BASE_URL ?? "http://localhost:8080"
),
```

**Impact:** Only applies to standalone builds. If building outside Replit using the standalone config and no `VITE_API_BASE_URL` is set, the built bundle will call `http://localhost:8080` — which will fail in any deployed environment. **Always set `VITE_API_BASE_URL` when building with the standalone config.**

---

### 3. API Server Port — `8080`

**File:** `artifacts/beacon/vite.config.ts` (proxy target), `artifact.toml` (production env)

The value `8080` for the API server port appears in the proxy configuration and production run config. It is consistent but not configurable without editing source files.

---

### 4. Demo Password Strings in Seed Script

**File:** `lib/db/src/seed.ts`

```typescript
const pw = await bcrypt.hash("Admin@12345678!", 12);
const donorPw = await bcrypt.hash("Donor@12345678!", 12);
```

The demo account passwords are hardcoded as strings in the seed script and are also documented in the application UI (`LoginPage.tsx` shows "Demo environment" notice). These are **intentional demo credentials** but represent a risk if the seed script is run against a production database.

**Risk level:** Medium. The passwords are bcrypt-hashed before insertion, but any developer with DB access and knowledge of the seed script can derive the plaintext passwords.

**Migration note:** Before production deployment, the seed script should be either disabled or rewritten to read initial passwords from environment variables.

---

### 5. Demo User Email Addresses

**File:** `lib/db/src/seed.ts`

Demo account email addresses (`superadmin@beacon.org`, `admin@beacon.org`, etc.) are hardcoded in the seed script. These are placeholder values for the demo environment, but they represent data that should not be committed to source for a real-world deployment.

---

## 12. Potential Secret Exposure Risks

### Risk 1 — `JWT_SECRET` absent in development (MEDIUM)

**Description:** When `JWT_SECRET` is not set, an ephemeral random secret is generated at startup with a console warning. A developer running the app without setting `JWT_SECRET` will see tokens silently invalidated on every restart.

**Exposure vector:** If a developer accidentally leaves `JWT_SECRET` unset and deploys to production, the production guard (`throws Error in production`) will prevent startup. However, if `NODE_ENV` is not correctly set to `"production"`, the ephemeral fallback would silently activate, causing all tokens to invalidate on every deployment.

**Mitigation:** Always set `JWT_SECRET` as a secret. Ensure `NODE_ENV=production` is set in all deployed environments. Consider adding a check that fails startup if `JWT_SECRET` is shorter than 32 characters.

---

### Risk 2 — `DATABASE_URL` full connection string (HIGH)

**Description:** `DATABASE_URL` contains the username, password, host, and database name in a single string. If logged, committed, or surfaced in an error message, it exposes full database access.

**Current protection:** The pino logger explicitly redacts `Authorization` and `Cookie` headers, but does not explicitly guard against `DATABASE_URL` appearing in log output. If an unhandled error bubbles the connection config to a log, it could expose credentials.

**Exposure vector:** Startup error messages from the `pg` library can include parts of the connection string in their error output. If the DB is unreachable on startup and unhandled errors are logged verbosely, parts of `DATABASE_URL` may appear in logs.

**Mitigation:** Never commit `DATABASE_URL` to version control. Set it as a secret in the deployment platform. Consider wrapping the DB pool initialization in a try-catch that masks connection strings from error messages.

---

### Risk 3 — Demo passwords in committed source code (LOW-MEDIUM)

**File:** `lib/db/src/seed.ts`

**Description:** The strings `"Admin@12345678!"` and `"Donor@12345678!"` are committed plaintext in source code. While they are bcrypt-hashed before insertion, the plaintext values are visible to anyone with repository access.

**Exposure vector:** Anyone who clones the repository can read the demo passwords. Since these credentials work against the live demo database, this is a low risk for the demo environment but a higher risk if the seed script is ever used to initialize a production database.

**Mitigation:** Accept this for the demo environment. Before any real-data deployment, remove plaintext demo passwords from the seed script and generate credentials via a separate secure provisioning process.

---

### Risk 4 — `VITE_API_BASE_URL` baked into frontend bundle (LOW)

**Description:** `VITE_API_BASE_URL` is a Vite build-time variable that gets inlined into the JavaScript bundle at build time. Anyone can inspect the built JS and read this value.

**Exposure vector:** Not a secret — it is the public URL of the API server. However, if this variable is confused with a secret and a secret value is ever assigned to it, it would be exposed in the bundle.

**Mitigation:** `VITE_API_BASE_URL` is a public configuration value and should never hold secrets. Ensure any variable prefixed with `VITE_` in Vite projects is treated as public-facing.

---

### Risk 5 — No secret committed to git (CONFIRMED — no issue)

A full search of all `.ts`, `.tsx`, and `.js` source files found no API keys, tokens, passwords (other than the seed demo strings documented above), or connection strings committed to source code. The `.env` file pattern was not found — there are no `.env`, `.env.local`, or similar files in the workspace.

---

### Risk 6 — CORS misconfiguration in production (MEDIUM)

**Description:** If `CORS_ALLOWED_ORIGINS` is not set in production, all cross-origin browser requests to the API will fail silently (CORS-rejected, no server-side error). This is not a secret exposure risk but a configuration risk that would make the deployed API unusable from a browser.

**Exposure vector:** Deploying without `CORS_ALLOWED_ORIGINS` in production would mean the API accepts no browser requests. All authenticated API calls from the frontend would fail.

**Mitigation:** Always set `CORS_ALLOWED_ORIGINS` to include the frontend origin in any production or staging deployment. Include both `www` and non-`www` variants if applicable.

---

## Summary: Minimum Variables Required to Run Outside Replit

### Backend (Express API server)

```bash
DATABASE_URL=postgresql://user:password@host:5432/beacon_db
JWT_SECRET=your-cryptographically-random-secret-minimum-48-characters
NODE_ENV=production
PORT=8080
CORS_ALLOWED_ORIGINS=https://your-frontend-domain.com
```

### Frontend (Beacon SPA) — build-time

```bash
NODE_ENV=production
VITE_API_BASE_URL=https://your-api-domain.com   # omit if frontend and API share the same origin
BASE_PATH=/                                        # or omit — defaults to /
```

### DB tooling (migrations / seed)

```bash
DATABASE_URL=postgresql://user:password@host:5432/beacon_db
```

### Optional for all

```bash
LOG_LEVEL=info    # backend logging verbosity
```

---

## 13. Target Architecture: Vercel + Azure + Supabase Migration Checklist

This section documents what must be done — and why — when migrating to the target architecture: **React SPA on Vercel**, **.NET Web API on Azure App Service**, **PostgreSQL on Supabase**.

---

### 13.1 Architecture overview

```
Browser
  │
  ├── HTTPS GET /  →  Vercel CDN  →  React SPA (static bundle)
  │                                        │
  │                                        │ Authorization: Bearer <token>
  │                                        ▼
  └── HTTPS /api/*  →  Azure App Service  →  .NET Web API
                                               │
                                               │ DATABASE_URL (pooler)
                                               ▼
                                          Supabase PostgreSQL
```

Key architecture change vs. Replit: the frontend and backend are on **separate origins**. This is the root cause of all CORS, VITE_API_BASE_URL, and connection string requirements documented below.

---

### 13.2 Vercel (React SPA) — Configuration checklist

| Item | Action required | Notes |
|---|---|---|
| `VITE_API_BASE_URL` | **Set in Vercel dashboard** | Must be the full Azure backend URL (e.g., `https://beacon-api.azurewebsites.net`). Required for every environment: Production, Preview, Development. |
| `VITE_BASE_PATH` | Set to `"/"` or omit | Vercel serves from root. Default `"/"` is correct. |
| `BASE_PATH` | Not used by Vercel | Replit-specific; omit from Vercel env config. |
| `NODE_ENV` | Set to `"production"` for prod builds | Vercel sets this automatically during `vercel build`. |
| SPA routing | Create `vercel.json` | Required so Vercel serves `index.html` for all non-asset routes (client-side routing via wouter). |
| Build command | `pnpm --filter @workspace/beacon run build` | Or `pnpm run build:standalone` for the standalone config. |
| Output directory | `artifacts/beacon/dist` | Configure as the Vercel output directory. |
| Vite dev proxy | Not applicable | The `proxy` block in `vite.config.ts` is dev-only. Irrelevant on Vercel. |

**Required `vercel.json` for SPA routing:**
```json
{
  "rewrites": [
    { "source": "/((?!api).*)", "destination": "/index.html" }
  ]
}
```
Without this, refreshing any deep-linked page (e.g., `/admin/residents/42`) will return a 404 from Vercel's static file server.

**Vercel environment variable scoping:** Vercel lets you set env vars per environment (Production / Preview / Development). Set `VITE_API_BASE_URL` to the production Azure URL for Production, and optionally to a staging/dev Azure instance for Preview and Development.

---

### 13.3 Azure App Service (.NET Web API) — Configuration checklist

| Item | Action required | Notes |
|---|---|---|
| `DATABASE_URL` | Set in App Settings (or Key Vault ref) | Use Supabase **pooler** URL with `?pgbouncer=true` (port 6543). Mark as sensitive. |
| `JWT_SECRET` | Set in App Settings (or Key Vault ref) | Must be identical to the secret used to sign tokens. Minimum 32 bytes. Mark as sensitive. |
| `NODE_ENV` | Set to `"production"` | Required to enable all production safeguards. |
| `CORS_ALLOWED_ORIGINS` | Set in App Settings | Comma-separated list including the Vercel production URL and any preview URLs. |
| `LOG_LEVEL` | Optional — set as desired | `"info"` is a safe default for production. |
| `PORT` | Do NOT set manually | Azure injects this automatically. |
| HTTPS termination | Handled by Azure | Azure App Service terminates TLS before the app. The `x-forwarded-proto` header check in the existing middleware works correctly with Azure's proxy headers. |
| `VITE_API_BASE_URL` | Not used by .NET backend | The .NET replacement does not read this variable. The equivalent is a config value for the CSP `connect-src` directive. Use an `ALLOWED_FRONTEND_ORIGIN` config value instead. |

**Deployment slots:** Azure supports staging/production slot swapping. Mark `JWT_SECRET`, `DATABASE_URL`, and `CORS_ALLOWED_ORIGINS` as "slot settings" to prevent them from being swapped accidentally.

**Startup health check:** Azure App Service can be configured to call `/api/healthz` to determine if a deployment is healthy before switching traffic. Configure this in the App Service's "Health check" setting.

---

### 13.4 Supabase (PostgreSQL) — Configuration checklist

| Item | Action required | Notes |
|---|---|---|
| Runtime `DATABASE_URL` | Pooler URL (port 6543) + `?pgbouncer=true` | Set in Azure App Settings. Enables connection pooling. |
| Migration `DATABASE_URL` | Direct URL (port 5432) | Use only during schema push / Drizzle migrations. Do not use the pooler for DDL. |
| SSL | Already handled | `rejectUnauthorized: false` in the current code works with Supabase's certificate chain. |
| Prepared statements | Must be disabled | Add `?pgbouncer=true` to the pooler URL. This signals the `pg` driver to disable named prepared statements, which pgBouncer transaction mode does not support. |
| Row-level security (RLS) | Evaluate | Supabase enables RLS by default. The current schema does not use RLS. Either disable RLS on all tables (via Supabase dashboard) or define permissive policies. If the backend connects as the `postgres` user (service role), RLS is bypassed automatically. |
| Connection limit | Monitor | Supabase's free and Pro tiers have direct connection limits. The pooler (pgBouncer) avoids hitting this limit. Always use the pooler for the app runtime. |
| Database region | Choose closest to Azure region | To minimize latency, co-locate the Supabase project in the same region as the Azure App Service (e.g., both in `Southeast Asia` for Philippines deployment). |
| Migrations | Run against direct URL before cutover | Run `pnpm --filter @workspace/db run push` using the **direct** Supabase `DATABASE_URL` to apply the Drizzle schema before switching the app to production. |
| Seed data | Run against direct URL once | Run `pnpm --filter @workspace/db run seed` using the **direct** URL for initial demo data load. |

---

### 13.5 Auth and session handling across separate domains

The current auth design is **already correct** for cross-domain deployment. No code changes are required to the auth flow.

| Concern | Current behavior | Impact on Vercel + Azure |
|---|---|---|
| Token storage | In-memory React context (not `localStorage`, not cookie) | Safe. No SameSite or HttpOnly issues. Token is cleared on tab close/refresh. |
| Token transport | `Authorization: Bearer <token>` header | CORS-safe. Bearer tokens are not subject to cookie-based cross-origin restrictions. |
| Server-side session | None — fully stateless JWT | No session affinity required on Azure. Load balancing between multiple instances works without sticky sessions. |
| Cookie requirements | None — `credentials: false` | No `SameSite=None; Secure` requirements. No `Access-Control-Allow-Credentials: true` required. |
| Token expiry | 8 hours (HS256 JWT) | Tokens expire 8 hours after login. No refresh mechanism exists. Users are logged out after 8 hours or on any 401 response. |

**One caution:** Because tokens are in-memory, a browser page refresh logs the user out on the frontend (token is lost from React context). This is the current behavior in Replit as well — it is not introduced by the Vercel + Azure migration.

---

### 13.6 File uploads and storage

No file upload capability currently exists. If added during the .NET migration:

| Option | Notes |
|---|---|
| **Azure Blob Storage** | Natural fit for Azure-hosted backend. SDK: `Azure.Storage.Blobs`. |
| **Supabase Storage** | Built into Supabase; useful if uploads need to be associated with DB records via RLS. |
| **Cloudflare R2** | S3-compatible, low cost, global CDN. Accessible from any backend. |

If file uploads are added, new environment variables will be required (storage account name, container name, SAS token or connection string). Document them here when implemented.

---

### 13.7 Minimum viable config for Vercel + Azure + Supabase

**Azure App Settings (backend):**
```
DATABASE_URL=postgresql://postgres.[ref]:[pass]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true
JWT_SECRET=<minimum 32 bytes of cryptographically random hex>
NODE_ENV=production
CORS_ALLOWED_ORIGINS=https://your-app.vercel.app
LOG_LEVEL=info
```

**Vercel Environment Variables (frontend build):**
```
VITE_API_BASE_URL=https://beacon-api.azurewebsites.net
NODE_ENV=production
```

**Local machine — migrations only (run once, then discard):**
```
DATABASE_URL=postgresql://postgres:[pass]@db.[ref].supabase.co:5432/postgres
```

**`vercel.json` (place at the Beacon SPA root or workspace root):**
```json
{
  "rewrites": [
    { "source": "/((?!api).*)", "destination": "/index.html" }
  ]
}
```
