# MIDDLEWARE_AND_VALIDATION_AUDIT.md

> **Purpose** — Exhaustive audit of the Express request pipeline: every middleware layer, its registration order and scope, all validation behaviors, all error-handling shapes, and the gaps the .NET backend must address.
>
> **Target migration stack**: Frontend → Vercel | Backend → Azure (.NET Web API) | Database → Supabase (PostgreSQL)
>
> Last updated: 2026-04-09

---

## 1. Middleware Registry — Execution Order

All middleware is registered in `artifacts/api-server/src/app.ts` at **global scope** unless noted otherwise. Requests pass through layers in the order listed below before reaching any route handler.

```
Incoming request
       │
       ▼
[1] HTTP→HTTPS redirect      (production only, via x-forwarded-proto header)
       │
       ▼
[2] securityHeaders           (custom middleware — security.ts)
       │
       ▼
[3] rateLimiter(500, 60_000)  (custom middleware — security.ts)
       │
       ▼
[4] pinoHttp logger           (pino-http)
       │
       ▼
[5] cors()                    (cors package)
       │
       ▼
[6] express.json({ limit:"10mb" })
       │
       ▼
[7] express.urlencoded({ extended: true })
       │
       ▼
[8] sanitizeInput             (custom middleware — security.ts)
       │
       ▼
[9] /api router               (routes/index.ts)
       │
       ▼
[9a] requireAuth              (route-level — middleware/auth.ts)
       │
       ▼
[9b] requireRoles(...)        (route-level — middleware/auth.ts)
       │
       ▼
[10] Route handler
```

There is **no global error-handling middleware** (`app.use((err, req, res, next) => {...})`). All error handling is done inside individual route handlers via `try/catch`.

---

## 2. Middleware Detail

### 2.1 HTTP → HTTPS Redirect

| Property | Value |
|---|---|
| File | `app.ts` (inline, lines 11–16) |
| Scope | Global, runs before all other middleware |
| Active when | `NODE_ENV === "production"` AND `x-forwarded-proto` header is `"http"` |
| Behavior | Returns HTTP 301 to `https://${host}${url}` |
| Options | None |

**Migration note**: Azure App Service and Azure Front Door automatically handle HTTPS termination and forward `x-forwarded-proto`. The equivalent ASP.NET Core middleware is `app.UseHttpsRedirection()` and `app.UseForwardedHeaders()` (with `X-Forwarded-Proto` whitelisted). When hosting behind Azure Front Door, configure `ForwardedHeadersOptions.KnownNetworks` or `KnownProxies` to trust the forwarded headers.

---

### 2.2 Security Headers (`securityHeaders`)

| Property | Value |
|---|---|
| File | `artifacts/api-server/src/middleware/security.ts` |
| Scope | Global — every response |
| Registration | `app.use(securityHeaders)` in `app.ts` |

**Headers set on every response**:

| Header | Value |
|---|---|
| `Content-Security-Policy` | `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; connect-src 'self' <VITE_API_BASE_URL>; frame-ancestors 'none'; base-uri 'self'; form-action 'self'` |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `X-XSS-Protection` | `1; mode=block` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` |

**CSP `connect-src` note**: The `VITE_API_BASE_URL` environment variable is read at module initialization. If this env var is absent, `connect-src` only includes `'self'`.

**Migration note**: In ASP.NET Core, use `app.UseHsts()` for HSTS. Set all other headers via a custom middleware or the `NWebsec.AspNetCore.Middleware` / `SecurityHeaders` NuGet packages. The CSP `connect-src` value must be set to the Vercel frontend domain (not `'self'`) in the Azure backend. `X-XSS-Protection` is deprecated in modern browsers but harmless to keep.

---

### 2.3 Rate Limiter (`rateLimiter`)

| Property | Value |
|---|---|
| File | `artifacts/api-server/src/middleware/security.ts` |
| Scope | Global — every request |
| Registration | `app.use(rateLimiter(500, 60_000))` |
| Limit | 500 requests per IP per 60 seconds |
| Key | Client IP address (`req.ip`) |
| Storage | In-process `Map<string, { count, resetAt }>` — **not distributed** |
| Response on limit exceeded | HTTP 429 `{ "error": "Too many requests. Please try again later." }` |

**Gaps**:
- The in-process `Map` does not survive restarts and is not shared across multiple server instances. Effective rate limiting in Azure requires a distributed store (Redis via Azure Cache for Redis).
- No `Retry-After` header is set in the 429 response.
- IP derivation uses `req.ip` which trusts Express's `trust proxy` setting (not explicitly configured — defaults to `false`). Behind Azure Application Gateway or Front Door, the real client IP is in `X-Forwarded-For`.

**Migration note**: Use ASP.NET Core's `RateLimiter` middleware (`Microsoft.AspNetCore.RateLimiting`). For distributed rate limiting, use `AspNetCoreRateLimit` with Redis backing. Configure `app.UseForwardedHeaders()` to correctly resolve client IP from `X-Forwarded-For`.

---

### 2.4 Request Logger (`pino-http`)

| Property | Value |
|---|---|
| File | `app.ts` (inline) + `artifacts/api-server/src/lib/logger.ts` |
| Scope | Global — every request |
| Library | `pino-http` wrapping a `pino` logger instance |
| Log level | `process.env.LOG_LEVEL` (default: `"info"`) |
| Format | JSON (production) / pretty-printed with colors (development) |

**Serializer behavior** (what is logged per request/response):

- Request: `{ id, method, url }` — URL is **stripped of query string** (`url.split("?")[0]`)
- Response: `{ statusCode }`

**Redacted fields** (never appear in logs):
- `req.headers.authorization`
- `req.headers.cookie`
- `res.headers['set-cookie']`

**Migration note**: Use `Serilog` or `Microsoft.Extensions.Logging` with `Application Insights` in Azure. Configure a structured logging sink (Azure Monitor / Log Analytics). Ensure `Authorization` headers are not logged. In Azure, `LOG_LEVEL` maps to the ASP.NET Core log level filter.

---

### 2.5 CORS

| Property | Value |
|---|---|
| File | `app.ts` (inline) |
| Scope | Global — every request |
| Library | `cors` npm package |
| `origin` behavior | Dynamic: reads `CORS_ALLOWED_ORIGINS` env var (comma-separated list) |
| Credentials | `false` — `Access-Control-Allow-Credentials` is NOT set |
| Allowed headers | `Content-Type`, `Authorization` |
| Allowed methods | `GET`, `POST`, `PATCH`, `PUT`, `DELETE`, `OPTIONS` |

**Origin resolution logic**:

```
if CORS_ALLOWED_ORIGINS not set AND NODE_ENV !== "production":
    → allow all origins (return true)
elif origin is in CORS_ALLOWED_ORIGINS list:
    → allow
else:
    → deny (callback(null, false))
```

**Important**: When `origin` is absent (e.g., server-to-server requests, curl without Origin header), the callback receives `origin = undefined` and returns `callback(null, false)` — the request is still processed, but no CORS headers are set. This means **same-origin requests work but cross-origin requests without an `Origin` header get no CORS headers**.

**Gaps**:
- `credentials: false` means the frontend cannot send cookies or use `withCredentials`. Since the app uses Bearer tokens (not cookies), this is intentional.
- No preflight cache (`maxAge`) is configured.

**Migration note**: In ASP.NET Core, use `app.UseCors()` with a named policy. Set `WithOrigins(allowedOrigins)` from environment config and `WithHeaders("Content-Type", "Authorization")`. Since `credentials: false`, do NOT call `.AllowCredentials()`. Set the Vercel deployment URL as the allowed origin in Azure App Service environment variables (`CORS_ALLOWED_ORIGINS`). Preflight caching: add `.SetPreflightMaxAge(TimeSpan.FromHours(1))`.

---

### 2.6 JSON Body Parser

| Property | Value |
|---|---|
| Registration | `app.use(express.json({ limit: "10mb" }))` |
| Scope | Global |
| Content-Type | `application/json` |
| Limit | 10 MB |

**Behavior**: Parses JSON body into `req.body`. If Content-Type is not `application/json`, body is not parsed (remains `undefined`).

**Migration note**: ASP.NET Core parses JSON bodies automatically via the `[FromBody]` attribute or `app.UseRouting()` + controller defaults. The 10 MB limit maps to `options.MaxRequestBodySize = 10 * 1024 * 1024` in `KestrelServerLimits`. In Azure App Service, also check the `maxAllowedContentLength` in `web.config` if using IIS.

---

### 2.7 URL-Encoded Body Parser

| Property | Value |
|---|---|
| Registration | `app.use(express.urlencoded({ extended: true }))` |
| Scope | Global |
| Content-Type | `application/x-www-form-urlencoded` |
| `extended: true` | Uses `qs` library — allows nested objects |

**Usage**: No route in the current codebase explicitly expects `application/x-www-form-urlencoded` input. All frontend API calls send JSON.

**Migration note**: Can be omitted in .NET if no form-encoded endpoints are needed. If needed, use `[FromForm]`.

---

### 2.8 Input Sanitizer (`sanitizeInput`)

| Property | Value |
|---|---|
| File | `artifacts/api-server/src/middleware/security.ts` |
| Scope | Global — runs on every request with a body |
| Applied to | `req.body` only (NOT query params, NOT path params, NOT headers) |

**`stripHtml()` recursive function behavior**:

- `string` → strips `<script>...</script>` tags, all HTML tags, `javascript:` protocol, `on*=` event handlers, and trims whitespace
- `array` → maps recursively
- `object` → recurses into each value
- non-string primitives → returned as-is

**Gaps**:
- Query parameters and path parameters are **not sanitized**. Only `req.body` is processed.
- The regex for `<script>` (`<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>`) handles inline scripts but not dynamically constructed payloads.
- No validation that body fields are the expected type (number, date, etc.).

**Migration note**: In ASP.NET Core, HTML sanitization is handled by model binding and the `[FromBody]` attribute, which rejects unexpected content types. For XSS protection, use the `HtmlEncoder` class or the `Ganss.XSS.HtmlSanitizer` NuGet package. Apply to string properties in DTOs before persistence. Query params and path params should be validated via `[FromQuery]` model binding with DataAnnotations or FluentValidation.

---

### 2.9 Authentication Middleware (`requireAuth`)

| Property | Value |
|---|---|
| File | `artifacts/api-server/src/middleware/auth.ts` |
| Scope | Route-level (applied per route or router, not globally) |
| Type | JWT Bearer token validation |
| Algorithm | HS256 |
| Secret | `JWT_SECRET` env var (ephemeral random 48-byte hex if not set in non-production) |
| Token expiry | **8 hours** (set in `signToken()`) |
| Header expected | `Authorization: Bearer <token>` |

**`requireAuth` flow**:

1. Checks for `Authorization: Bearer ...` header → 401 if absent.
2. Extracts and verifies JWT with `JWT_SECRET` → 401 if invalid/expired.
3. Queries the `users` table to confirm `isActive = true` → 401 if user not found or disabled.
4. Sets `req.user = decoded` (JWT payload as `AuthUser`).
5. Calls `next()`.

**`AuthUser` payload shape (what is signed into the JWT)**:

```ts
{
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "public" | "donor" | "staff" | "admin" | "super_admin";
  isActive: boolean;
  mfaEnabled: boolean;
  lastLogin?: string | null;
  supporterId?: number | null;
  safehouses?: number[];   // safehouse IDs the user is assigned to
}
```

**Live DB check on every authenticated request**: `requireAuth` queries `users` to verify `isActive` on every request. This adds one DB round-trip per authenticated call — there is no caching.

**`JWT_SECRET` fallback**: In non-production environments, if `JWT_SECRET` is not set, an ephemeral random secret is generated at startup. All tokens are invalidated on server restart. A `console.warn` is emitted but the server does not exit.

**Gaps**:
- No token revocation mechanism. Disabling a user (`isActive = false`) blocks future requests via the DB check, but does not invalidate already-issued tokens before the 8-hour expiry.
- `mfaEnabled` field is stored in the JWT but no MFA challenge is implemented in any route.
- No refresh token mechanism. After 8 hours, the frontend must re-login.

**Migration note**: Use `Microsoft.AspNetCore.Authentication.JwtBearer` for HS256 JWT validation. Configure:
```csharp
options.TokenValidationParameters = new TokenValidationParameters {
  ValidateIssuerSigningKey = true,
  IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
  ValidateIssuer = false,
  ValidateAudience = false,
  ClockSkew = TimeSpan.Zero,
};
```
Store `JWT_SECRET` in Azure Key Vault. The DB `isActive` check should be replicated as a custom `IClaimsTransformation` or custom middleware that validates the user's active status from cache or DB. Consider adding a short-TTL distributed cache (Redis) to avoid a DB round-trip on every request.

---

### 2.10 Optional Authentication Middleware (`optionalAuth`)

| Property | Value |
|---|---|
| File | `artifacts/api-server/src/middleware/auth.ts` |
| Scope | Route-level |
| Used by | `GET /api/auth/me` only |

**Behavior**: Attempts JWT verification. If the token is present and valid, sets `req.user`. If absent or invalid, silently ignores (no error response). Calls `next()` unconditionally. Does NOT perform the DB `isActive` check.

**Migration note**: Implement as a separate policy that does not require authorization, but enriches the `ClaimsPrincipal` if a valid token is present.

---

### 2.11 Role Authorization Middleware (`requireRoles`)

| Property | Value |
|---|---|
| File | `artifacts/api-server/src/middleware/auth.ts` |
| Scope | Route-level — always placed after `requireAuth` |
| Usage | `requireRoles("admin", "super_admin")` etc. — variadic role list |

**Behavior**: If `req.user.role` is NOT in the provided role list → HTTP 403 `{ "error": "Insufficient permissions" }`. Otherwise calls `next()`.

**Role hierarchy** (informal — no code enforces hierarchy, each endpoint explicitly lists allowed roles):

| Role | Typical access |
|---|---|
| `public` | Not used in any route guard — reserved |
| `donor` | Own ledger, campaigns (active only), public updates, social media |
| `staff` | All resident/case/record data within assigned safehouses |
| `admin` | All above + user management within safehouses, impact admin |
| `super_admin` | Unrestricted access to all endpoints, ML dashboards |

**Migration note**: In ASP.NET Core, use `[Authorize(Roles = "admin,super_admin")]` on controllers/actions, or a `Policy`-based approach with `RequireRole(...)`. The `role` claim from the JWT payload must be mapped to the `ClaimTypes.Role` claim type during token validation, or use a custom claim name and a matching `AuthorizationPolicy`.

---

### 2.12 Safehouse Scoping Helper (`getUserSafehouses`)

| Property | Value |
|---|---|
| File | `artifacts/api-server/src/middleware/auth.ts` |
| Type | Utility function, not Express middleware |
| Called from | Route handlers in `safehouses.ts`, `residents.ts`, `caseManagement.ts`, `donations.ts`, `dashboard.ts` |

**Behavior**:
- `super_admin` → returns `null` (unrestricted)
- User with `safehouses.length > 0` → returns `number[]` (allowed safehouse IDs from JWT payload)
- User with no safehouse assignments → returns `null` (backward-compatible: unassigned admin/staff see all data)

**Important**: The allowed safehouse IDs come from the **JWT payload**, not from a fresh DB lookup. If assignments change, the user must log in again.

**Migration note**: In .NET, extract safehouse IDs from the JWT claims in a custom `IClaimsTransformation` or decode in each controller. Alternatively, fetch current assignments from DB/cache in a scoped service per request.

---

### 2.13 No Cookie / Session Middleware

No cookies are used anywhere in the application. There is no `express-session`, `cookie-parser`, or any session store. Authentication is entirely stateless via Bearer tokens.

**Migration note**: No session store is needed in .NET. The ASP.NET Core auth pipeline should be configured for JWT-only (no cookie scheme).

---

### 2.14 No File Upload Middleware

No file upload handling (`multer`, `busboy`, etc.) is present anywhere. No route accepts multipart/form-data. File attachment metadata (if any) is stored as text fields in the DB.

**Migration note**: If future features require file uploads, use Azure Blob Storage. Do NOT store files in the DB or on the App Service filesystem (ephemeral in Azure).

---

### 2.15 No Global Error Handler

Express allows a four-argument `(err, req, res, next)` middleware for global error catching. **None is registered**. All errors are handled inside `try/catch` blocks in individual route handlers.

**Consequence**: If a middleware throws an unhandled synchronous exception, Express's default handler will return an HTML 500 error page (not JSON). This is a correctness gap — see Section 5.2.

---

## 3. Validation Audit

### 3.1 Request Body Validation

Validation is **sparse and inconsistent** across routes. Only a handful of routes perform explicit field checks; the majority pass `req.body` directly to Drizzle insert/update without any prior validation.

#### Routes WITH explicit body validation:

| Route | Validated fields | Validation behavior |
|---|---|---|
| `POST /api/auth/login` | `username`, `password` | Presence check → 400 if missing |
| `POST /api/auth/change-password` | `currentPassword`, `newPassword` | Presence + password policy rules → 400 |
| `POST /api/users` | `password` | `validatePassword()` → 400 if fails |
| `POST /api/donations/give` | `amount` | Presence + `isNaN` + `> 0` → 400 |
| `POST /api/donations/public` | `amount` | Presence + `isNaN` + `> 0` → 400 |
| `POST /api/donation-allocations` | `donationId`, `programArea`, `amountAllocated` | Presence + `amountAllocated > 0` → 400 |
| `POST /api/program-updates` | `title` | Presence + `.trim()` check → 400 |
| `PATCH /api/supporters/me` | Multiple fields | Explicit allowlist (only `firstName`, `lastName`, `phone`, `organizationName`); 400 if no fields present |
| `PATCH /api/supporters/me/recurring` | `recurringEnabled` | `typeof === "boolean"` check → 400 |
| `POST /api/donor/viewed-items` | `itemType`, `itemIds` | Presence + `itemIds.length > 0` → 400 |
| `DELETE /api/users/:id` | Self-delete guard | 400 if `id === req.user.id` |

#### Routes WITHOUT explicit body validation (pass-through to DB):

The majority of POST/PATCH routes accept `req.body` and pass it directly to Drizzle:
- `POST /api/residents`, `PATCH /api/residents/:id`
- `POST /api/safehouses`, `PATCH /api/safehouses/:id`
- `POST /api/supporters`, `PATCH /api/supporters/:id`
- `POST /api/donations` (admin), `PATCH /api/donations/:id`
- All case management routes (`process-recordings`, `home-visitations`, `case-conferences`, `intervention-plans`, `incident-reports`)
- `POST /api/in-kind-donation-items`
- `POST /api/campaigns`, `PATCH /api/campaigns/:id`
- `POST /api/social-media`, `PATCH /api/social-media/:id`
- `POST /api/impact-snapshots`, `PATCH /api/impact-snapshots/:id`
- `POST /api/ml/...`

**Risk**: Any unrecognized field in `req.body` is passed to Drizzle, which silently ignores extra columns (they are not inserted). However, missing required columns will cause a PostgreSQL constraint error, which is caught and returns a generic 500 — no meaningful validation message is given to the caller.

**Password policy** (used in `auth.ts` and `users.ts`):
- Minimum 12 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one digit
- At least one special character (non-alphanumeric)

---

### 3.2 Query Parameter Validation

No query parameter validation middleware exists. Query params are used in two patterns:

#### Pagination params:
- `page` and `limit`/`pageSize` are parsed with `parseInt()`. If non-numeric, `parseInt` returns `NaN`; `resolveLimit()` falls back to `defaultLimit` (20). `parseInt` on `page` returning `NaN` would cause `offset = NaN * limitNum`, which PostgreSQL interprets as `OFFSET 0`.
- No `400` is returned for invalid pagination params.

#### Filter params:
- `safehouseId`, `residentId`, `donationId`, etc. are parsed with `parseInt()` without validation.
- `fundType` in donations list accepts string values `"general"` or `"directed"` — no validation; any other value simply adds no filter.
- `months` in dashboard/executive-summary is clamped: `Math.max(1, Math.min(24, parseInt(...)))` — this is the only range-clamped query param.
- `dateRange` in `superadminMl.ts` accepts `"30d"`, `"90d"`, `"6mo"`, `"12mo"`, `"custom"` — no validation, unknown values default to `90d` behavior.

#### Inconsistencies:
- Some routes use `req.query.limit` only; others accept both `limit` and `pageSize` (resolved by `resolveLimit()`).
- `req.query` values are cast to `Record<string, string>` with `as Record<string, string>`, bypassing TypeScript's array-value type for repeated query params.

---

### 3.3 Path Parameter Validation

All path params (`:id`, `:entityId`, etc.) are parsed with `parseInt()` without checking whether the result is `NaN`. Examples:

```ts
parseInt(req.params.id as string)   // used everywhere
```

If `req.params.id` is `"abc"`, `parseInt("abc")` returns `NaN`. This is passed to Drizzle `WHERE id = NaN`, which PostgreSQL may interpret as `WHERE id = NULL` (matching nothing), returning a 404 — or may throw an error caught as a 500, depending on the ORM layer.

**No route explicitly validates that `:id` is a valid integer and returns 400.**

---

### 3.4 File Validation

Not applicable — no file uploads exist.

---

### 3.5 Business Rule Validation

These business rules are explicitly validated in route handlers:

| Rule | Location | Enforcement |
|---|---|---|
| Password complexity (12 chars, upper, lower, digit, special) | `auth.ts` (change-password), `users.ts` (create) | Returns 400 with specific error message |
| Donation amount must be numeric and > 0 | `donations.ts` (`/give`, `/public`) | Returns 400 |
| Allocation amount must be > 0 | `donations.ts` (`/donation-allocations`) | Returns 400 |
| `recurringEnabled` must be boolean | `supporters.ts` | Returns 400 |
| Cannot delete own user account | `users.ts` | Returns 400 |
| Donor must have `supporterId` to donate | `donations.ts` | Returns 400 |
| Donor must have `supporterId` to view notifications | `programUpdates.ts` | Returns 404 |
| `program_update` title must be non-empty (trimmed) | `programUpdates.ts` | Returns 400 |
| `itemIds` must be non-empty array | `programUpdates.ts` | Returns 400 |
| `PATCH /supporters/me` requires at least one field | `supporters.ts` | Returns 400 |

**Missing business rules** (no validation exists):
- Safehouse capacity check when admitting a resident
- Duplicate username/email check on user create (relies on DB unique constraint → generic 500)
- Date field format validation (e.g., `donationDate`, `sessionDate` are passed as raw strings)
- Enum field validation (e.g., `role`, `donationType`, `caseStatus` — invalid values cause a DB constraint error → 500)
- Required FK relationships (e.g., `residentId` for case management records — no check that resident exists)

---

## 4. Error Handling Audit

### 4.1 Error Response Shapes

Every route uses one of three error shapes:

**Shape A — Generic error string** (used in ~90% of routes):
```json
{ "error": "Failed" }
```
Status codes: 500

**Shape B — Descriptive error string** (used in auth, validation, and a few business rules):
```json
{ "error": "Authentication required" }
{ "error": "Insufficient permissions" }
{ "error": "Username and password are required" }
{ "error": "Invalid or expired token" }
{ "error": "Account is disabled or not found" }
{ "error": "A valid donation amount is required" }
{ "error": "Password must contain: at least 12 characters, an uppercase letter" }
{ "error": "Too many requests. Please try again later." }
{ "error": "Cannot delete your own account" }
{ "error": "No donor profile linked to this account" }
```

**Shape C — Not found**:
```json
{ "error": "Not found" }
```
Status 404. Also `{ "user": null }` from `GET /api/auth/me` when user not found.

**Shape D — Health check success (no error)**:
```json
{ "status": "ok" }
```
From `GET /api/healthz` (uses `HealthCheckResponse` Zod schema).

**Summary of status codes in use**:

| Status | Meaning |
|---|---|
| 200 | Successful GET, PATCH |
| 201 | Successful POST (create) |
| 204 | Successful DELETE (no body) |
| 400 | Bad request / validation failure |
| 401 | Unauthenticated (no/invalid/expired token, or `isActive = false`) |
| 403 | Unauthorized (wrong role) |
| 404 | Resource not found |
| 429 | Rate limit exceeded |
| 500 | Any unhandled/DB error |

**Inconsistency**: Some DELETE routes return 204 on success but do not first confirm the resource exists (they delete by ID and do not check affected rows). A DELETE of a non-existent ID returns 204 instead of 404.

---

### 4.2 Async Error Handling Pattern

All route handlers follow this pattern:

```ts
router.METHOD("/path", middleware, async (req, res) => {
  try {
    // ... DB call ...
    return res.json(...);
  } catch (err) {
    console.error(err);        // sometimes omitted
    return res.status(500).json({ error: "Failed" });
  }
});
```

**Key behaviors**:
- All errors are swallowed at the route level. The original exception is logged to console but **never exposed in the API response**.
- Some handlers omit `console.error(err)` — the error is silently swallowed with only a generic 500 response.
- The `catch` block uses an empty variable `catch { }` (no `catch (err)`) in many routes — the error is unlogged.
- There is no structured error object, no error code, no stack trace in any API response.

**No global Express error handler** (`(err, req, res, next) => {...}`) exists. If a middleware throws synchronously before reaching the route handler (e.g., JSON parse failure from malformed body), Express's default handler returns an HTML error page, not JSON.

**Migration note**: In ASP.NET Core, use `app.UseExceptionHandler()` with a custom problem details handler to ensure all unhandled exceptions return a JSON `{ "error": "..." }` response, not an HTML page. Use `ProblemDetails` (RFC 7807) or a custom error envelope. Structure error logging with `ILogger<T>` and Application Insights.

---

### 4.3 DB Constraint Violations

When a Drizzle insert/update violates a DB constraint (unique, not-null, FK, enum), the error propagates to the `catch` block and returns HTTP 500 `{ "error": "Failed" }`. The frontend has no way to distinguish:
- Duplicate username (unique constraint)
- Missing required field (not-null constraint)
- Invalid enum value
- FK violation (e.g., inserting a case record for a non-existent resident)

All of these return the same `500 { "error": "Failed" }`.

**Migration note**: In .NET, catch `PostgresException` (Npgsql), inspect `SqlState` (PostgreSQL error codes), and return appropriate 400/409 responses with meaningful error messages:
- `23505` (unique_violation) → 409 Conflict
- `23502` (not_null_violation) → 400 Bad Request
- `23503` (foreign_key_violation) → 400 Bad Request
- `22P02` (invalid_text_representation / enum) → 400 Bad Request

---

## 5. Security and Robustness Gaps

### 5.1 No Global JSON Error Handler for Malformed Bodies

If the client sends a body with `Content-Type: application/json` but malformed JSON, `express.json()` throws a `SyntaxError`. This falls through to Express's default error handler, returning an HTML response — not JSON. The frontend would fail to parse this as expected.

**Fix in .NET**: `app.UseExceptionHandler()` with a JSON problem details formatter handles this automatically.

### 5.2 Unlogged Errors (Silent `catch {}`)

Many route handlers use `catch { return res.status(500).json({ error: "Failed" }); }` with no `err` binding and no logging. Errors are invisible in production logs.

### 5.3 No Request ID Propagation

`pino-http` assigns a request ID (`req.id`) but it is not returned in any response header. Error responses cannot be correlated to a log entry by the client or support team.

**Fix in .NET**: Add `X-Request-Id` response header via middleware; log the same ID.

### 5.4 `parseInt` on Path Params Without NaN Guard

Passing `NaN` to a DB `WHERE id = NaN` query produces unpredictable behavior (likely 404 or DB error). The correct behavior is a 400.

### 5.5 In-Process Rate Limiter

Not shared across instances or restarts. Easily bypassed by a client that rotates IPs.

### 5.6 No Input Validation on Query Params or Path Params

Only `req.body` is sanitized. Query strings can contain arbitrary HTML/script content that may be stored in derived data structures or reflected in error messages.

### 5.7 JWT Contains Full User Profile (Including Safehouse IDs)

The JWT payload includes `safehouses`, `email`, `firstName`, `lastName`, `supporterId`, and `mfaEnabled`. If the user's safehouses change, the JWT reflects the old assignments until it expires (8 hours). The DB `isActive` check mitigates only account disabling, not safehouse reassignment.

### 5.8 No Audit Logging

No write operation records who made it, when, or what changed. There is no `audit_logs` table in use (the `GET /api/audit-logs` endpoint doesn't exist either). This is a significant compliance gap for a platform handling sensitive safehouse resident data.

### 5.9 No HTTPS Enforcement in Non-Production

The HTTP→HTTPS redirect only activates when `NODE_ENV === "production"`. In staging environments, HTTP requests are served without redirect.

### 5.10 `sanitizeInput` Not Applied to Nested JSON Arrays

The `stripHtml` function recurses into objects and arrays in `req.body`, but does not sanitize keys — only values. A malicious key name (e.g., `__proto__`) could potentially cause prototype pollution on older Node.js versions.

---

## 6. Summary Tables

### 6.1 Middleware Behaviors to Preserve for Frontend Compatibility

These behaviors are observed by the frontend and must be exactly replicated in the .NET backend:

| # | Behavior | Frontend impact if broken |
|---|---|---|
| 1 | All error responses are JSON `{ "error": "..." }` — never HTML | Frontend JSON.parse would fail |
| 2 | `Authorization: Bearer <token>` → 401 `{ "error": "Authentication required" }` | Frontend auth redirect logic depends on 401 |
| 3 | Wrong role → 403 `{ "error": "Insufficient permissions" }` | Frontend may need to differentiate 401 vs 403 |
| 4 | Successful POST → 201 | Frontend may check for `res.status === 201` |
| 5 | Successful DELETE → 204 (no body) | Frontend must not try to parse response body |
| 6 | `CORS_ALLOWED_ORIGINS` must include the Vercel deployment URL | All cross-origin requests fail without this |
| 7 | `Content-Type: application/json` must be set on all JSON responses | Frontend `response.json()` depends on Content-Type |
| 8 | `Authorization` header is allowed (not stripped by CORS preflight) | Token cannot be sent without this |
| 9 | Rate limit exceeded → 429 `{ "error": "Too many requests. Please try again later." }` | Frontend may surface this message |
| 10 | Password change error → 400 with specific message (e.g., "Password must contain: ...") | Frontend surfaces this exact string |
| 11 | Pagination envelope: `{ data, total, pagination: { total, page, limit, totalPages } }` | All list views depend on this shape |
| 12 | `GET /api/healthz` → `{ "status": "ok" }` | Health check / load balancer probe |

### 6.2 Security or Robustness Gaps Discovered

| ID | Gap | Severity | Recommended fix |
|---|---|---|---|
| G1 | No global JSON error handler — malformed JSON body returns HTML | High | Add `UseExceptionHandler` with JSON formatter |
| G2 | Silent `catch {}` in many routes — errors not logged | High | Bind `err` and log with structured logger |
| G3 | `parseInt(req.params.id)` without NaN guard | Medium | Return 400 if NaN |
| G4 | In-process rate limiter not shared across instances | Medium | Use Redis-backed distributed rate limiter |
| G5 | DB constraint violations return generic 500 | Medium | Map PostgreSQL error codes to 400/409 |
| G6 | No request ID in error responses | Low | Add `X-Request-Id` response header |
| G7 | No audit log for write operations | High | Implement audit log table + write in .NET |
| G8 | JWT contains safehouse assignments (stale on reassignment) | Medium | Fetch assignments from DB/cache on auth |
| G9 | No token revocation | Low | Short-lived tokens + refresh token flow |
| G10 | Query params not sanitized | Low | Add input validation for query params |
| G11 | DELETE does not confirm existence before returning 204 | Low | Check affected rows; return 404 if none |

### 6.3 Likely ASP.NET Core Equivalents

| Express construct | ASP.NET Core equivalent |
|---|---|
| `app.use(securityHeaders)` | `app.Use(...)` middleware with `Response.Headers.Append(...)` or `SecurityHeaders` NuGet |
| `app.use(rateLimiter(...))` | `app.UseRateLimiter()` (ASP.NET 7+) + Redis backend |
| `pinoHttp(logger)` | `app.UseHttpLogging()` or `Serilog.AspNetCore` request logging |
| `app.use(cors(...))` | `app.UseCors(policy => policy.WithOrigins(...).WithHeaders(...))` |
| `express.json({ limit: "10mb" })` | Default MVC JSON + `KestrelServerLimits.MaxRequestBodySize` |
| `express.urlencoded(...)` | `[FromForm]` attribute (if needed) |
| `sanitizeInput` | Custom middleware or DTO-level `HtmlSanitizer` on string properties |
| `requireAuth` | `JwtBearerHandler` + `[Authorize]` + custom `IClaimsTransformation` for DB check |
| `optionalAuth` | Separate auth scheme with `[Authorize(AuthenticationSchemes = "OptionalBearer")]` |
| `requireRoles(...)` | `[Authorize(Roles = "admin,super_admin")]` or `RequireAuthorizationPolicy` |
| `getUserSafehouses(user)` | Custom `IAuthorizationRequirement` + handler reading claims |
| `try/catch + res.status(500)` | `app.UseExceptionHandler("/error")` + `ProblemDetails` controller |
| `console.error(err)` | `ILogger<T>.LogError(err, ...)` → Application Insights |
| Ephemeral `JWT_SECRET` fallback | Throw on missing secret — no ephemeral fallback in production |
| `HTTP→HTTPS redirect` | `app.UseHttpsRedirection()` + `app.UseForwardedHeaders()` |
| No session/cookie | No `app.UseSession()` — JWT only |

---

## 7. Vercel + Azure + Supabase Migration Notes

### 7.1 CORS (Cross-Domain)

The frontend (Vercel) and backend (Azure) are on different domains. The Express CORS config must be replicated exactly:

- Set `CORS_ALLOWED_ORIGINS` to the Vercel production URL (e.g., `https://beacon.vercel.app`) in Azure App Service environment.
- Also add the Vercel preview URL pattern for staging (e.g., `https://beacon-*.vercel.app`) if preview deployments need to call the API.
- Do NOT use `*` wildcard in production — the frontend sends `Authorization` headers.
- ASP.NET Core: `credentials` is `false` in Express — do NOT call `.AllowCredentials()` in the CORS policy.

### 7.2 Auth / Token Handling Across Domains

- Tokens are Bearer tokens sent via `Authorization` header — no cookies.
- This works across domains without `SameSite` or cookie configuration concerns.
- `JWT_SECRET` must be identical between all backend instances. Store in Azure Key Vault; inject as App Setting.
- Token expiry is 8 hours (coded in `signToken()`). The .NET backend must sign tokens with the same algorithm (HS256) and same secret to be compatible with existing sessions.

### 7.3 Environment Variables and Secrets

| Variable | Current usage | Azure equivalent |
|---|---|---|
| `JWT_SECRET` | Signs and verifies JWTs | Azure Key Vault secret → App Service config |
| `DATABASE_URL` | Supabase PostgreSQL connection string | Azure Key Vault secret → App Service config |
| `CORS_ALLOWED_ORIGINS` | Comma-separated allowed origins | Azure App Service Application Settings |
| `NODE_ENV` | Controls HTTPS redirect, ephemeral JWT secret, log format | `ASPNETCORE_ENVIRONMENT` (`Production`/`Development`) |
| `LOG_LEVEL` | Pino log level | `Logging:LogLevel:Default` in `appsettings.json` |
| `PORT` | Server listen port | Managed by Azure App Service (always 80/443 externally) |
| `VITE_API_BASE_URL` | Injected into CSP `connect-src` | Not applicable to .NET — set on Vercel frontend only |

### 7.4 Database / Connection Strings

- Supabase pooler URL (port 6543, `?pgbouncer=true`) for runtime connections.
- Supabase direct URL (port 5432) for schema migrations only.
- Npgsql connection string format: `Host=db.xxx.supabase.co;Port=6543;Database=postgres;Username=postgres;Password=<password>;Ssl Mode=Require;Trust Server Certificate=true`
- For pgBouncer: set `No Reset On Close=true` in Npgsql connection string (pgBouncer does not support connection reset).

### 7.5 File Uploads / Storage

No file uploads currently exist. If added in the future, use **Azure Blob Storage** (not the App Service filesystem). Generate pre-signed upload URLs on the .NET backend; have the client upload directly to Blob Storage.

### 7.6 API Base URL Configuration

The Vercel frontend reads `VITE_API_BASE_URL` (set as a Vercel environment variable) to construct all API calls. This must point to the Azure App Service URL (e.g., `https://beacon-api.azurewebsites.net`). No changes to frontend service files are needed if this variable is set correctly.

### 7.7 Health Check Endpoint

`GET /api/healthz` returns `{ "status": "ok" }`. This must be preserved as-is for Azure App Service health probes and any uptime monitoring. Map to an unprotected endpoint in .NET (no `[Authorize]`).
