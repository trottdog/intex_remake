# Auth and Authorization Matrix — Beacon Platform

**Purpose:** Document exactly how authentication and authorization currently work across the frontend and Express backend, as the canonical reference for recreating this behavior safely in a .NET replacement backend.
All observations are derived from actual source code, not desired or assumed behavior.

---

## Table of Contents

1. [Authentication Mechanism](#1-authentication-mechanism)
2. [Token Lifecycle](#2-token-lifecycle)
3. [Frontend Auth Behavior](#3-frontend-auth-behavior)
   - [Login Flow](#31-login-flow)
   - [Logout Flow](#32-logout-flow)
   - [Session Persistence](#33-session-persistence)
   - [Protected Routes and Route Guards](#34-protected-routes-and-route-guards)
   - [Role-Based Rendering](#35-role-based-rendering)
   - [Navigation Gating](#36-navigation-gating)
   - [Redirect Behavior Summary](#37-redirect-behavior-summary)
4. [Backend Auth Behavior](#4-backend-auth-behavior)
   - [Middleware Chain](#41-middleware-chain)
   - [requireAuth](#42-requireauth)
   - [requireRoles](#43-requireroles)
   - [optionalAuth](#44-optionalauth)
   - [getUserSafehouses — Safehouse Scoping](#45-getsafehousessafehouse-scoping)
   - [Password Handling](#46-password-handling)
5. [Current Role Model](#5-current-role-model)
6. [Authorization Matrix — All Endpoints](#6-authorization-matrix--all-endpoints)
7. [Authorization Gaps and Inconsistencies](#7-authorization-gaps-and-inconsistencies)
8. [What the .NET Backend Must Preserve Exactly](#8-what-the-net-backend-must-preserve-exactly)
9. [What Can Be Improved Later After Parity Is Reached](#9-what-can-be-improved-later-after-parity-is-reached)

---

## 1. Authentication Mechanism

| Property | Current implementation |
|---|---|
| Mechanism | Stateless JWT bearer tokens |
| Token transport | `Authorization: Bearer <token>` request header — no cookies |
| Token algorithm | HS256 (jsonwebtoken default, symmetric HMAC-SHA256) |
| Token expiry | **8 hours** from issue |
| Token payload | Full `AuthUser` object embedded directly in the JWT body |
| Signing secret | `JWT_SECRET` environment variable. In development, falls back to an **ephemeral** 48-byte random secret generated at startup — all tokens are invalidated on server restart when this fallback is active |
| Storage on client | **In-memory React state only** — no `localStorage`, no `sessionStorage`, no cookies |
| Persistence on page refresh | **None** — token is lost on page refresh, user must log in again |
| Session cookies | Not used. CORS config explicitly sets `credentials: false` |
| Refresh tokens | Not implemented |
| MFA | `mfaEnabled` field exists in the user schema and is returned in the JWT payload, but no MFA enforcement logic exists anywhere in either codebase |

---

## 2. Token Lifecycle

```
User submits username + password
        │
        ▼
POST /api/auth/login
  ├── DB lookup by username
  ├── isActive check (returns 401 if false)
  ├── bcrypt.compare (returns 401 if wrong)
  ├── UPDATE lastLogin timestamp
  ├── SELECT safehouse assignments from staff_safehouse_assignments
  ├── Build AuthUser payload
  └── jwt.sign(payload, JWT_SECRET, { expiresIn: "8h" })
        │
        ▼
Response: { token, user: AuthUser }
        │
        ▼
Frontend stores token + user in React useState
Sets tokenGetter in both custom client and orval client
        │
        ▼
All subsequent requests: Authorization: Bearer <token>
        │
        ▼
requireAuth middleware (every protected route):
  ├── Extract token from Authorization header
  ├── jwt.verify(token, JWT_SECRET) → decode AuthUser
  ├── DB lookup by decoded.id → verify isActive === true
  └── Attach decoded user to req.user → next()
        │
        ▼
Token expiry after 8 hours → 401 response
        │
        ▼
Frontend receives 401 → fires "beacon:unauthorized" DOM event
        │
        ▼
AuthContext listener calls logout():
  ├── setToken(null)
  ├── setUser(null)
  ├── setAuthTokenGetter(null) [orval client]
  └── setApiTokenGetter(null) [custom client]
        │
        ▼
User sees login page
```

**No token blacklisting exists.** A token remains valid until expiry regardless of:
- Server restart (if JWT_SECRET is properly set in env)
- Password change
- User account being disabled (but disabled accounts are rejected on every `requireAuth` DB check)

---

## 3. Frontend Auth Behavior

### 3.1 Login Flow

**File:** `pages/LoginPage.tsx`, `services/auth.service.ts`, `contexts/AuthContext.tsx`

1. User types username and password into the login form at `/login`.
2. On form submit: calls `loginApi(username, password)` → `POST /api/auth/login` with body `{ username, password }`.
3. On success: calls `flushSync(() => login(data.token, data.user))`.
   - `flushSync` forces synchronous React state flush before continuing — ensures the auth state is set before navigation.
   - `login()` stores `token` and `user` in React state and registers token getters for both HTTP clients.
4. Role-based redirect (executed after `flushSync`):
   - `"super_admin"` → `/superadmin`
   - `"admin"` or `"staff"` → `/admin`
   - `"donor"` → `/donor`
   - anything else → `/`
5. On error: `ApiError` message is displayed in the form. No auto-retry. No lockout UI.

**Important:** There is no "remember me" option. No token is persisted anywhere. Refreshing the page after login produces a logged-out state.

---

### 3.2 Logout Flow

Two independent paths trigger logout:

**Path A — Explicit logout (user clicks sign-out button):**
- DashboardLayout renders a `<Button onClick={logout}>` sign-out icon in the header.
- `logout()` from `AuthContext` clears all state: `token = null`, `user = null`, both token getters = null.
- No server call is made. No `POST /api/auth/logout` is called on explicit logout.
- User is left on whatever page they were on — no forced redirect. However, `ProtectedRoute` detects `!isAuthenticated` and redirects to `/login`.

**Path B — Session expiry / 401 response:**
- Any API call returning status `401` fires `window.dispatchEvent(new CustomEvent("beacon:unauthorized"))`.
- `AuthContext` has a `window.addEventListener("beacon:unauthorized", handleUnauthorized)` that calls `logout()`.
- Same state clearing as Path A.

**Path C — `POST /api/auth/logout` (backend):**
- This route accepts no token and performs no validation. It returns `{ message: "Logged out successfully" }` to any caller.
- This route is **not currently called** by the frontend logout action — it is a no-op endpoint.

---

### 3.3 Session Persistence

| Mechanism | Used? | Notes |
|---|---|---|
| `localStorage` | No | Not referenced anywhere in auth code |
| `sessionStorage` | No | Not referenced anywhere in auth code |
| Cookies (auth) | No | CORS `credentials: false`; no `Set-Cookie` issued |
| Cookie (theme) | Yes | `beacon_theme` cookie for dark/light preference only — unrelated to auth |
| React state (in-memory) | Yes | Token and user live here only |
| Cookie consent cookie | Yes | UI-only preference — unrelated to auth |

**Practical effect:** Every page refresh results in a logged-out state. The user must log in again. This is the current behavior — whether intentional or an oversight is unclear.

---

### 3.4 Protected Routes and Route Guards

**File:** `components/ProtectedRoute.tsx`, `components/PublicRoute.tsx`, `App.tsx`

#### ProtectedRoute

```tsx
<ProtectedRoute roles={["admin", "staff"]}>
  <AdminLayout><AdminDashboard /></AdminLayout>
</ProtectedRoute>
```

Behavior:
1. If `isLoading`: renders a full-screen loading div (wait for auth state to resolve).
2. If `!isAuthenticated`: redirects to `/login` via `useEffect`.
3. If authenticated but `role` is not in `roles[]`: redirects to the user's **own portal** (not `/forbidden`):
   - donor → `/donor`
   - admin/staff → `/admin`
   - super_admin → `/superadmin`
   - other → `/`
4. While redirect is pending (within same render): returns `null` (renders nothing).

**Critical behavior:** Wrong-role access redirects to the user's home portal, not to `/forbidden`. The `/forbidden` page is only reached when the API returns HTTP 403.

#### PublicRoute

Applied to `/login` only. Behavior:
1. If `isLoading`: renders loading div.
2. If authenticated: redirects to the user's portal (same portal mapping as ProtectedRoute).
3. If not authenticated: renders children (the login page).

**Effect:** An already-authenticated user cannot visit `/login`. They are bounced to their portal.

#### Unprotected routes (no guard)

These pages are rendered for anyone without any auth check:
- `/` (LandingPage)
- `/about`
- `/impact`
- `/socials`
- `/donate`
- `/privacy`
- `/forbidden`

---

### 3.5 Role-Based Rendering

Role-conditional UI is rendered in several places using `user?.role` from `AuthContext`:

**DashboardLayout header:** Security shield button (link to `/superadmin/security`) is visible only when `user?.role === "super_admin"`.

```tsx
{user?.role === "super_admin" && (
  <Link href="/superadmin/security">
    <Button variant="ghost" size="icon" className="text-destructive">
      <Shield className="w-4 h-4" />
    </Button>
  </Link>
)}
```

**DonorLayout notification polling:** Notifications are only fetched when `!!token && user?.role === "donor"`. Staff/admin using the donor layout accidentally would not trigger notification polling.

**AdminLayout safehouse badge:** If `user.safehouses` is non-empty, a safehouse name badge is shown in the sidebar header. Fetched via unauthenticated `GET /api/public/safehouses` — the AdminLayout calls this regardless of token validity.

**Campaign visibility (backend-enforced, frontend transparent):** The campaign list (`/api/campaigns`) returns different data based on role — donors see only active campaigns, admin/staff/super_admin see all. The frontend does not conditionally render based on role here; it renders whatever the API returns.

---

### 3.6 Navigation Gating

Each portal has its own fixed nav definition — there is no dynamic nav building based on role. The nav is hardcoded per layout file:

| Layout | Portal | Nav items |
|---|---|---|
| `AdminLayout` | `Admin Portal` | 15 items including Dashboard, Residents, Case Mgt, Incidents, Donors, Partners, Donations, Program Updates, Reports, Settings |
| `SuperAdminLayout` | `Super Admin` | 18 items including Executive Dashboard, Residents, Operations, Fundraising, Content, Administration, Intelligence, Security, System |
| `DonorLayout` | `Donor Portal` | 6 items: Dashboard, My Giving, My Impact, Campaigns, Updates, Profile |
| `PublicLayout` | (public) | Landing-page nav, no auth items |

Nav visibility is controlled entirely by which layout is rendered, which is controlled by `ProtectedRoute roles`. There are no conditional nav items within a layout based on sub-roles.

**Note:** `/admin/program-updates` and `/superadmin/program-updates` both render `ProgramUpdatesManagementPage` — the same component is rendered in both admin and superadmin portals but wrapped in different layouts and guarded by different `ProtectedRoute roles`.

---

### 3.7 Redirect Behavior Summary

| Scenario | Current behavior |
|---|---|
| Unauthenticated user visits `/admin/*` | Redirected to `/login` |
| Unauthenticated user visits `/superadmin/*` | Redirected to `/login` |
| Unauthenticated user visits `/donor/*` | Redirected to `/login` |
| Authenticated donor visits `/admin/*` | Redirected to `/donor` |
| Authenticated admin visits `/superadmin/*` | Redirected to `/admin` |
| Authenticated admin visits `/donor/*` | Redirected to `/admin` |
| Authenticated super_admin visits `/admin/*` | Redirected to `/superadmin` |
| Authenticated user visits `/login` | Redirected to their own portal |
| API returns 401 | `beacon:unauthorized` event → logout → `/login` on next navigation |
| API returns 403 | Immediate redirect to `/forbidden` via `window.location.href` |
| Page refresh | User is logged out (no token persistence) — redirected to `/login` by ProtectedRoute |

---

## 4. Backend Auth Behavior

### 4.1 Middleware Chain

Applied globally (before all routes) in `app.ts`:

```
HTTP→HTTPS redirect (production only)
  ↓
securityHeaders (sets Content-Security-Policy, X-Frame-Options, etc.)
  ↓
rateLimiter (500 requests / 60 seconds — global, per-IP)
  ↓
pino-http (structured request logging; strips query strings from logged URLs)
  ↓
cors (allowedOrigins from CORS_ALLOWED_ORIGINS env; in dev with no origins set: allow all)
     credentials: false
     allowedHeaders: ["Content-Type", "Authorization"]
     methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"]
  ↓
express.json({ limit: "10mb" })
  ↓
express.urlencoded({ extended: true })
  ↓
sanitizeInput (custom middleware — sanitizes request body fields)
  ↓
Route handlers (each adds auth middleware as needed per route)
```

**No auth middleware is applied globally.** Auth is opt-in per route using `requireAuth`, `requireRoles`, or `optionalAuth`.

---

### 4.2 requireAuth

**Source:** `middleware/auth.ts`

```typescript
export async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentication required" });
  }
  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    // Live DB check — not cache
    const [dbUser] = await db.select({ id, isActive }).from(usersTable)
      .where(eq(usersTable.id, decoded.id)).limit(1);
    if (!dbUser || !dbUser.isActive) {
      return res.status(401).json({ error: "Account is disabled or not found" });
    }
    req.user = decoded;  // JWT payload, NOT the DB row
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
```

**Behavior details:**
- Requires `Authorization: Bearer <token>` header. No other header format is accepted.
- Performs a live DB query on **every authenticated request** to verify `isActive`. This is the only field checked live — all other user data (role, email, safehouses) comes from the JWT payload.
- `req.user` is set to the **decoded JWT payload** — not a fresh DB fetch. This means if a user's role or safehouse assignments change, they take effect only after their token expires (up to 8 hours later) unless they log out and back in.
- Returns HTTP 401 (not 403) when the token is missing, malformed, expired, or when the user account is disabled.

**Important implication:** Disabling a user account (`isActive = false`) takes effect immediately for new requests (the DB check catches it). But a previously valid token is not actively revoked — the user's existing session will fail on the next API call. Since there is no token blacklist, a disabled user's token remains cryptographically valid but will be rejected by the DB check.

---

### 4.3 requireRoles

**Source:** `middleware/auth.ts`

```typescript
export function requireRoles(...roles: AuthUser["role"][]) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Authentication required" });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    return next();
  };
}
```

**Behavior details:**
- Always applied **after** `requireAuth` in the route chain (e.g., `router.get("/path", requireAuth, requireRoles("admin"), handler)`).
- Returns 403 (not 401) if the user is authenticated but has the wrong role.
- Role check is against the JWT payload's role field — live DB role is not re-fetched.

---

### 4.4 optionalAuth

**Source:** `middleware/auth.ts`

```typescript
export function optionalAuth(req, _res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    try {
      req.user = jwt.verify(token, JWT_SECRET) as AuthUser;
    } catch {
      // Silently ignore invalid/expired tokens
    }
  }
  next(); // Always continues regardless
}
```

**Used on:** `GET /api/auth/me` only.

**Critical difference from requireAuth:** Does NOT perform a DB live-check. If the token is structurally valid but the user has been disabled in the DB, `optionalAuth` will still set `req.user` with the stale JWT data. This is a minor inconsistency — `/api/auth/me` trusts a valid JWT even for disabled users.

---

### 4.5 getUserSafehouses — Safehouse Scoping

**Source:** `middleware/auth.ts`

```typescript
export function getUserSafehouses(user: AuthUser | undefined): number[] | null {
  if (!user || user.role === "super_admin") return null;  // unrestricted
  if (user.safehouses && user.safehouses.length > 0) return user.safehouses;
  return null; // unassigned admin/staff: sees all data (backward compatible)
}
```

This function is called within multiple route handlers to scope data queries to the user's assigned safehouses. It is **not** a middleware — it runs inside the route handler, not in the middleware chain.

**Scoping behavior by role:**

| Role | safehouses in JWT | getUserSafehouses result | Data access |
|---|---|---|---|
| super_admin | any | `null` | Unrestricted — all data |
| admin | [1, 2] | `[1, 2]` | Only safehouses 1 and 2 |
| staff | [3] | `[3]` | Only safehouse 3 |
| admin | `[]` (no assignments) | `null` | **Unrestricted — all data** (backward-compatible fallback) |
| staff | `[]` (no assignments) | `null` | **Unrestricted — all data** (backward-compatible fallback) |
| donor | any | not called | Donor data is scoped by `supporterId` per route |

**The unassigned admin/staff fallback is a potential gap** (documented in §7).

**Routes that use safehouse scoping:**
- `GET /api/residents`
- `GET /api/donations`
- `GET /api/incident-reports`
- `GET /api/superadmin/donors/churn`
- `GET /api/superadmin/residents/regression/distribution`
- `GET /api/superadmin/residents/regression/watchlist`
- `GET /api/superadmin/residents/reintegration/funnel`
- `GET /api/superadmin/residents/reintegration/table`
- `GET /api/superadmin/safehouses/health`
- `GET /api/superadmin/safehouses/:id/health-history` (IDOR guard)
- `GET /api/superadmin/donors/:id/donations-recent` (IDOR guard)

---

### 4.6 Password Handling

| Property | Value |
|---|---|
| Hash algorithm | bcrypt |
| Cost factor | 12 rounds |
| Enforcement | Password rules checked in `POST /api/auth/change-password` and `POST /api/users` |
| Rules | Min 12 chars, at least one uppercase, lowercase, digit, special character |
| `passwordHash` in API responses | Never returned in any endpoint (explicitly omitted in all user responses) |

---

## 5. Current Role Model

Five roles exist. The role string is stored in the `users` table and embedded in the JWT payload.

| Role | String value | Description | Portal |
|---|---|---|---|
| `public` | `"public"` | Not used in practice — no routes require this role specifically, and no user would have it as a persisted role | None |
| `donor` | `"donor"` | Authenticated supporter with a linked `supporterId`. Can give donations, view own history, view campaigns/updates | `/donor` |
| `staff` | `"staff"` | Case worker / frontline staff. Read + write access to resident care and case management within assigned safehouses | `/admin` |
| `admin` | `"admin"` | Safehouse administrator. All staff permissions + manage partners, donations, allocations, impact snapshots | `/admin` |
| `super_admin` | `"super_admin"` | Organisation-level administrator. Unrestricted access + ML dashboard + user management + campaigns + system settings | `/superadmin` |

**Role hierarchy is not formally enforced** — each route specifies exactly which roles are allowed. There is no inheritance (e.g., `super_admin` is not automatically considered as `admin` on routes that list `["admin"]`). Super admin routes that also allow admin explicitly list `"admin"` in the allowed roles array.

**Donor-specific field:** `supporterId` in the JWT payload. Used by donor routes to scope data to the authenticated donor's own records. If `supporterId` is null for a donor user, donor-specific endpoints that require it return empty or error responses.

---

## 6. Authorization Matrix — All Endpoints

Legend:
- **Public** = No auth required
- **Auth** = Any authenticated user (any role)
- **Donor** = `requireRoles("donor")`
- **Staff+** = `requireRoles("staff", "admin", "super_admin")`
- **Admin+** = `requireRoles("admin", "super_admin")`
- **Super** = `requireRoles("super_admin")`
- **Super/Admin** = `requireRoles("super_admin", "admin")`
- **Any Auth** = `requireAuth` only, no `requireRoles`
- **Optional** = `optionalAuth` (token used if present, no failure if absent)

| Path | Method | Auth Level | DB Scoping | Frontend Route Guard | Migration Risk if Changed |
|---|---|---|---|---|---|
| `/api/healthz` | GET | Public | None | None | Low |
| `/api/auth/login` | POST | Public | None | None | **Critical** — shape of response directly parsed into AuthUser |
| `/api/auth/logout` | POST | Public | None | None | Low — not called by frontend |
| `/api/auth/change-password` | POST | Auth (any) | Own user only | None | Medium — field names and error format |
| `/api/auth/me` | GET | Optional | Own user | None | Medium — orval client bootstrap |
| `/api/dashboard/admin-summary` | GET | Staff+ | Safehouse-scoped | `ProtectedRoute roles={["admin","staff"]}` | High — large composite shape |
| `/api/dashboard/donor-summary` | GET | Donor | Own supporterId | `ProtectedRoute roles={["donor"]}` | High — many fields read by donor dashboard |
| `/api/dashboard/executive-summary` | GET | Admin+ | None | `ProtectedRoute roles={["super_admin"]}` | High — large composite shape |
| `/api/dashboard/public-impact` | GET | **MISSING** | None | None | **Critical** — frontend calls this, returns 404 currently |
| `/api/public/safehouses` | GET | Public | None | None | Medium — AdminLayout calls without token |
| `/api/safehouses` | GET | Staff+ | None | `ProtectedRoute` | Medium |
| `/api/safehouses` | POST | Admin+ | None | `ProtectedRoute roles={["super_admin"]}` (frontend) | Low |
| `/api/safehouses/:id` | GET | Staff+ | None | `ProtectedRoute` | Low |
| `/api/safehouses/:id` | PATCH | Admin+ | None | `ProtectedRoute roles={["super_admin"]}` | Low |
| `/api/safehouses/:id` | DELETE | Admin+ | None | `ProtectedRoute roles={["super_admin"]}` | Low |
| `/api/safehouses/:id/metrics` | GET | Staff+ | None | Not found in frontend nav | Low |
| `/api/partners` | GET | Staff+ | None | `ProtectedRoute roles={["admin","staff"]}` | Low |
| `/api/partners` | POST | Admin+ | None | `ProtectedRoute roles={["admin","staff"]}` (frontend) | Low |
| `/api/partners/:id` | GET | Staff+ | None | `ProtectedRoute` | Low |
| `/api/partners/:id` | PATCH | Admin+ | None | `ProtectedRoute` | Low |
| `/api/partners/:id` | DELETE | Admin+ | None | `ProtectedRoute` | Low |
| `/api/partner-assignments` | GET | Staff+ | None | `ProtectedRoute roles={["admin","staff"]}` | Low |
| `/api/partner-assignments` | POST | Admin+ | None | `ProtectedRoute` | Low |
| `/api/partner-assignments/:id` | PATCH | Admin+ | None | `ProtectedRoute` | Low |
| `/api/partner-assignments/:id` | DELETE | Admin+ | None | `ProtectedRoute` | Low |
| `/api/supporters/me` | GET | Donor | Own supporterId | `ProtectedRoute roles={["donor"]}` | Medium — field names |
| `/api/supporters/me` | PATCH | Donor | Own supporterId | `ProtectedRoute roles={["donor"]}` | Medium |
| `/api/supporters/me/recurring` | GET | Donor | Own supporterId | `ProtectedRoute roles={["donor"]}` | **High** — `recurringEnabled` key name critical |
| `/api/supporters/me/recurring` | PATCH | Donor | Own supporterId | `ProtectedRoute roles={["donor"]}` | High |
| `/api/supporters/stats` | GET | Staff+ | None | `ProtectedRoute roles={["admin","staff"]}` | Low |
| `/api/supporters/:id/giving-stats` | GET | **Any Auth** | None | Staff/admin pages | **Gap** — see §7 |
| `/api/supporters` | GET | Staff+ | None | `ProtectedRoute` | Low |
| `/api/supporters` | POST | Staff+ | None | Not in frontend UI | Low |
| `/api/supporters/:id` | GET | **Any Auth** | None | Staff/admin pages | **Gap** — see §7 |
| `/api/supporters/:id` | PATCH | Staff+ | None | `ProtectedRoute` | Low |
| `/api/supporters/:id` | DELETE | Admin+ | None | `ProtectedRoute` | Low |
| `/api/donations/my-ledger` | GET | Donor | Own supporterId | `ProtectedRoute roles={["donor"]}` | High — `amount` as float |
| `/api/donations/trends` | GET | Staff+ | None | `ProtectedRoute roles={["admin","staff"]}` | Medium — dual alias fields |
| `/api/donations` | GET | Staff+ | Safehouse-scoped | `ProtectedRoute` | High — computed fields |
| `/api/donations` | POST | Staff+ | None | `ProtectedRoute` | Low |
| `/api/donations/:id` | GET | **Any Auth** | None | Staff/admin pages | **Gap** — see §7 |
| `/api/donations/:id` | PATCH | Staff+ | None | `ProtectedRoute` | Low |
| `/api/donations/:id` | DELETE | Admin+ | None | `ProtectedRoute` | Low |
| `/api/donations/give` | POST | Donor | Own supporterId | `ProtectedRoute roles={["donor"]}` | **High** — `message` field shown in UI |
| `/api/donations/public` | POST | **Public** | None | None (public donate page) | **High** — no auth, must stay public |
| `/api/donation-allocations` | GET | Staff+ | None | `ProtectedRoute` | Medium |
| `/api/donation-allocations` | POST | Staff+ | None | `ProtectedRoute` | Medium |
| `/api/donation-allocations/:id` | DELETE | Staff+ | None | `ProtectedRoute` | Low |
| `/api/in-kind-donation-items` | GET | Staff+ | None | Not in frontend nav | Low |
| `/api/in-kind-donation-items` | POST | Staff+ | None | Not in frontend nav | Low |
| `/api/in-kind-donation-items/:id` | GET | Staff+ | None | Not in frontend nav | Low |
| `/api/in-kind-donation-items/:id` | DELETE | Admin+ | None | Not in frontend nav | Low |
| `/api/campaigns` | GET | **Any Auth** | Role-conditional filter | `ProtectedRoute` (any role portal) | **High** — filtering rules critical |
| `/api/campaigns/:id` | GET | **Any Auth** | None | `ProtectedRoute` | Medium |
| `/api/campaigns` | POST | Super | None | `ProtectedRoute roles={["super_admin"]}` | Low |
| `/api/campaigns/:id` | PATCH | Super | None | `ProtectedRoute roles={["super_admin"]}` | Low |
| `/api/campaigns/:id` | DELETE | Super | None | `ProtectedRoute roles={["super_admin"]}` | Low |
| `/api/campaigns/:id/donate` | POST | Donor | Own supporterId | `ProtectedRoute roles={["donor"]}` | **High** — response fields shown in UI |
| `/api/residents/stats` | GET | Staff+ | None | `ProtectedRoute roles={["admin","staff"]}` | Medium |
| `/api/residents/:id/timeline` | GET | Staff+ | None | `ProtectedRoute roles={["admin","staff"]}` | Medium |
| `/api/residents` | GET | Staff+ | Safehouse-scoped | `ProtectedRoute roles={["admin","staff"]}` | **High** — computed aliases required |
| `/api/residents` | POST | Staff+ | None | `ProtectedRoute` | Low |
| `/api/residents/:id` | GET | Staff+ | None | `ProtectedRoute` | High — computed aliases |
| `/api/residents/:id` | PATCH | Staff+ | None | `ProtectedRoute` | Medium |
| `/api/residents/:id` | DELETE | Admin+ | None | `ProtectedRoute` | Low |
| `/api/process-recordings` | GET | Staff+ | Safehouse-scoped (implied) | `ProtectedRoute roles={["admin","staff"]}` | Low |
| `/api/process-recordings` | POST | Staff+ | None | `ProtectedRoute` | Low |
| `/api/process-recordings/:id` | GET | Staff+ | None | `ProtectedRoute` | Low |
| `/api/process-recordings/:id` | PATCH | Staff+ | None | `ProtectedRoute` | Low |
| `/api/process-recordings/:id` | DELETE | Staff+ | None | `ProtectedRoute` | Low |
| `/api/home-visitations` | GET | Staff+ | None | `ProtectedRoute roles={["admin","staff"]}` | Low |
| `/api/home-visitations` | POST | Staff+ | None | `ProtectedRoute` | Low |
| `/api/home-visitations/:id` | PATCH | Staff+ | None | `ProtectedRoute` | Low |
| `/api/home-visitations/:id` | DELETE | Staff+ | None | `ProtectedRoute` | Low |
| `/api/case-conferences` | GET | Staff+ | None | `ProtectedRoute roles={["admin","staff"]}` | Low |
| `/api/case-conferences` | POST | Staff+ | None | `ProtectedRoute` | Low |
| `/api/case-conferences/:id` | PATCH | Staff+ | None | `ProtectedRoute` | Low |
| `/api/case-conferences/:id` | DELETE | Staff+ | None | `ProtectedRoute` | Low |
| `/api/intervention-plans` | GET | Staff+ | None | `ProtectedRoute roles={["admin","staff"]}` | Low |
| `/api/intervention-plans` | POST | Staff+ | None | `ProtectedRoute` | Low |
| `/api/intervention-plans/:id` | PATCH | Staff+ | None | `ProtectedRoute` | Low |
| `/api/intervention-plans/:id` | DELETE | Staff+ | None | `ProtectedRoute` | Low |
| `/api/incident-reports` | GET | Staff+ | Safehouse-scoped | `ProtectedRoute roles={["admin","staff"]}` | Low |
| `/api/incident-reports` | POST | Staff+ | None | `ProtectedRoute` | Low |
| `/api/incident-reports/:id` | GET | Staff+ | None | `ProtectedRoute` | Low |
| `/api/incident-reports/:id` | PATCH | Staff+ | None | `ProtectedRoute` | Low |
| `/api/incident-reports/:id` | DELETE | Staff+ | None | `ProtectedRoute` | Low |
| `/api/education-records` | GET | Staff+ | None | `ProtectedRoute roles={["admin","staff"]}` | Low |
| `/api/education-records` | POST | Staff+ | None | `ProtectedRoute` | Low |
| `/api/education-records/:id` | PATCH | Staff+ | None | `ProtectedRoute` | Low |
| `/api/education-records/:id` | DELETE | Staff+ | None | `ProtectedRoute` | Low |
| `/api/health-records` | GET | Staff+ | None | `ProtectedRoute roles={["admin","staff"]}` | Low |
| `/api/health-records` | POST | Staff+ | None | `ProtectedRoute` | Low |
| `/api/health-records/:id` | PATCH | Staff+ | None | `ProtectedRoute` | Low |
| `/api/health-records/:id` | DELETE | Staff+ | None | `ProtectedRoute` | Low |
| `/api/social-media-posts` | GET | Auth (donor, staff, admin, super_admin) | None | Mixed — see §7 | **Medium** — auth ambiguity |
| `/api/social-media-posts/analytics` | GET | Staff+ | None | `ProtectedRoute roles={["admin","staff"]}` | Low |
| `/api/social-media-posts` | POST | Staff+ | None | `ProtectedRoute` | Low |
| `/api/social-media-posts/:id` | GET | Staff+ | None | `ProtectedRoute` | Low |
| `/api/social-media-posts/:id` | PATCH | Staff+ | None | `ProtectedRoute` | Low |
| `/api/social-media-posts/:id` | DELETE | Admin+ | None | `ProtectedRoute` | Low |
| `/api/impact-snapshots` | GET | **Public** | Published only | None (public page) | **High** — must remain public |
| `/api/impact-snapshots/:id` | GET | **Public** | Published only | None | Medium |
| `/api/admin/impact-snapshots` | GET | Admin+ | None | `ProtectedRoute roles={["super_admin"]}` | High — path must stay `/api/admin/...` |
| `/api/admin/impact-snapshots/:id` | GET | Admin+ | None | `ProtectedRoute roles={["super_admin"]}` | Medium |
| `/api/impact-snapshots` | POST | Admin+ | None | `ProtectedRoute roles={["super_admin"]}` | Medium |
| `/api/impact-snapshots/:id` | PATCH | Admin+ | None | `ProtectedRoute roles={["super_admin"]}` | Medium |
| `/api/impact-snapshots/:id` | DELETE | Admin+ | None | `ProtectedRoute roles={["super_admin"]}` | Low |
| `/api/impact-snapshots/:id/publish` | POST | Admin+ | None | `ProtectedRoute roles={["super_admin"]}` | Medium |
| `/api/impact-snapshots/:id/unpublish` | POST | Admin+ | None | `ProtectedRoute roles={["super_admin"]}` | Low |
| `/api/ml/predictions` | GET | Staff+ | None | Not specifically guarded | Low |
| `/api/ml/pipelines` | GET | Staff+ | None | Not specifically guarded | Low |
| `/api/ml/predictions/:entityType/:entityId` | GET | Staff+ | None | Not in frontend nav | Low |
| `/api/ml/insights` | GET | Staff+ | None | Not specifically guarded | Low |
| `/api/program-updates` | GET | **Any Auth** | Role-conditional filter | `ProtectedRoute` (any portal) | High — role-conditional filtering |
| `/api/program-updates` | POST | Staff+ | None | `ProtectedRoute roles={["super_admin"]}` or admin | Low |
| `/api/program-updates/:id` | PATCH | Staff+ | None | `ProtectedRoute` | Low |
| `/api/program-updates/:id` | DELETE | Admin+ | None | `ProtectedRoute` | Low |
| `/api/donor/notifications` | GET | Donor | Own supporterId | `DonorLayout` (implicit, checks role) | Medium |
| `/api/donor/viewed-items` | POST | Donor | Own supporterId | `ProtectedRoute roles={["donor"]}` | Medium — field names |
| `/api/users` | GET | Super | None | `ProtectedRoute roles={["super_admin"]}` | Low |
| `/api/users` | POST | Super | None | `ProtectedRoute roles={["super_admin"]}` | Medium — password rules |
| `/api/users/:id` | GET | Super | None | `ProtectedRoute roles={["super_admin"]}` | Low |
| `/api/users/:id` | PATCH | Super | None | `ProtectedRoute roles={["super_admin"]}` | Low |
| `/api/users/:id` | DELETE | Super | Self-delete check | `ProtectedRoute roles={["super_admin"]}` | Medium — self-delete must return 400 |
| `/api/users/:id/disable` | POST | Super | None | `ProtectedRoute roles={["super_admin"]}` | Low |
| `/api/users/:id/enable` | POST | Super | None | `ProtectedRoute roles={["super_admin"]}` | Low |
| `/api/audit-logs` | GET | **MISSING** | None | `ProtectedRoute roles={["super_admin"]}` | **Critical** — frontend calls this |
| `/api/superadmin/overview/action-queue` | GET | Super | None | `ProtectedRoute roles={["super_admin"]}` | High — shape |
| `/api/superadmin/overview/funding-gap` | GET | Super | None | `ProtectedRoute roles={["super_admin"]}` | High — shape |
| `/api/superadmin/overview/safehouse-health-mini` | GET | Super/Admin | Safehouse-scoped for admin | `ProtectedRoute roles={["super_admin"]}` (frontend) | Medium |
| `/api/superadmin/donors/churn` | GET | Super/Admin | Safehouse-scoped for admin | `ProtectedRoute roles={["super_admin"]}` | High — email redaction for admin |
| `/api/superadmin/donors/:id/donations-recent` | GET | Super/Admin | IDOR guard for admin | `ProtectedRoute roles={["super_admin"]}` | High — IDOR |
| `/api/superadmin/donors/upgrade` | GET | Super | None | `ProtectedRoute roles={["super_admin"]}` | Medium |
| `/api/superadmin/attribution/sankey` | GET | Super | None | `ProtectedRoute roles={["super_admin"]}` | Medium |
| `/api/superadmin/attribution/programs` | GET | Super | None | `ProtectedRoute roles={["super_admin"]}` | Medium |
| `/api/superadmin/attribution/export` | GET | Super | None | Not in frontend nav | Low |
| `/api/superadmin/campaigns/effectiveness` | GET | Super | None | `ProtectedRoute roles={["super_admin"]}` | Medium |
| `/api/superadmin/campaigns/:id/ml-flags` | PATCH | Super | None | `ProtectedRoute roles={["super_admin"]}` | Medium |
| `/api/superadmin/social/heatmap` | GET | Super/Admin | None | `ProtectedRoute roles={["super_admin"]}` | High — `insufficientData` flag |
| `/api/superadmin/social/recommendation` | GET | Super/Admin | None | `ProtectedRoute roles={["super_admin"]}` | Low |
| `/api/superadmin/social/posts` | GET | Super/Admin | None | `ProtectedRoute roles={["super_admin"]}` | Medium |
| `/api/superadmin/residents/regression/distribution` | GET | Super/Admin | Safehouse-scoped for admin | `ProtectedRoute roles={["super_admin"]}` | High — restricted count in meta |
| `/api/superadmin/residents/regression/watchlist` | GET | Super/Admin | Safehouse-scoped + restricted exclusion | `ProtectedRoute roles={["super_admin"]}` | **Critical** — privacy rule |
| `/api/superadmin/residents/:id` | PATCH | Super | None | `ProtectedRoute roles={["super_admin"]}` | Low |
| `/api/superadmin/residents/reintegration/funnel` | GET | Super/Admin | Restricted exclusion | `ProtectedRoute roles={["super_admin"]}` | High |
| `/api/superadmin/residents/reintegration/table` | GET | Super/Admin | Safehouse-scoped + restricted exclusion | `ProtectedRoute roles={["super_admin"]}` | **Critical** — privacy rule |
| `/api/superadmin/interventions/effectiveness` | GET | Super/Admin | None | `ProtectedRoute roles={["super_admin"]}` | Medium |
| `/api/superadmin/interventions/effectiveness/:category/plans` | GET | Super/Admin | None | `ProtectedRoute roles={["super_admin"]}` | Low |
| `/api/superadmin/safehouses/health` | GET | Super/Admin | Safehouse-scoped for admin | `ProtectedRoute roles={["super_admin"]}` | **High** — peerRank null for admin |
| `/api/superadmin/safehouses/health/compare` | GET | Super | None | `ProtectedRoute roles={["super_admin"]}` | High — param name drift |
| `/api/superadmin/safehouses/:id/health-history` | GET | Super/Admin | IDOR guard for admin | `ProtectedRoute roles={["super_admin"]}` | High — IDOR |
| `/api/superadmin/ml/pipelines` | GET | Super | None | `ProtectedRoute roles={["super_admin"]}` | Medium |
| `/api/superadmin/ml/score-distribution` | GET | Super | None | `ProtectedRoute roles={["super_admin"]}` | Low |
| `/api/superadmin/ml/band-distribution` | GET | Super | None | `ProtectedRoute roles={["super_admin"]}` | Low |
| `/api/superadmin/ml/feature-importance/:runId` | GET | Super | None | `ProtectedRoute roles={["super_admin"]}` | Low |
| `/api/superadmin/donors/:id` | PATCH | Super | None | `ProtectedRoute roles={["super_admin"]}` | Low |

---

## 7. Authorization Gaps and Inconsistencies

### Gap 1 — Overly broad access on `GET /api/supporters/:id` and `GET /api/supporters/:id/giving-stats`

**Current behavior:** `requireAuth` only, no `requireRoles`. Any authenticated user — including donors — can fetch any supporter's profile and giving stats by guessing an integer ID.

**Risk:** A donor could enumerate other donors' giving history via sequential integer IDs. No IDOR protection exists on these endpoints.

**Actual frontend usage:** Only called by staff/admin pages within `ProtectedRoute roles={["admin","staff"]}`, so the gap is not currently exploitable through the normal UI, but it is exploitable via direct API calls.

---

### Gap 2 — Overly broad access on `GET /api/donations/:id`

**Current behavior:** `requireAuth` only, no `requireRoles`. Any authenticated user can fetch any donation record by ID.

**Risk:** Same IDOR risk as Gap 1. A donor with a valid token could read any donation record.

---

### Gap 3 — Unassigned admin/staff see all data

**Current behavior:** `getUserSafehouses()` returns `null` when `user.safehouses` is empty for admin/staff. When the function returns `null`, no safehouse filter is applied, and the query returns all data.

**Stated intent:** The code comment says "unassigned admin/staff see all data (backward compatible)" — so this is deliberate.

**Risk:** An admin with no safehouse assignments has the same data access as a super_admin for scoped-data endpoints. This may be unintended for some deployments.

---

### Gap 4 — `optionalAuth` does not check `isActive`

**Current behavior:** `GET /api/auth/me` uses `optionalAuth` which calls `jwt.verify()` without a DB lookup. A disabled user with a valid token (not yet expired) would have `req.user` populated and receive their profile data.

**Risk:** Low in practice — `/api/auth/me` is used for client bootstrap, not for sensitive data access. All data routes use `requireAuth` which does perform the DB check.

---

### Gap 5 — Social media posts auth ambiguity

**Current behavior:** `GET /api/social-media-posts` requires auth (donor, staff, admin, super_admin). However, `public.service.ts` lists this as a no-auth service call in its hook definition.

**Actual behavior:** The frontend calls this endpoint only when a user is logged in (donor portal calls it with a token, public page may call it without one). If called without a token, the backend returns 401. The public pages that call this may not have a token, resulting in a silent failure (the ApiError is thrown, React Query marks the query as errored, and the UI renders empty).

**Uncertainty:** Whether the public `SocialsPage` always fails to show posts or whether it's never reached without a token is unclear without running the app. This needs investigation before migration.

---

### Gap 6 — No brute-force protection on login

**Current behavior:** The global rate limiter (500 req / 60 seconds per IP) applies to all routes including login. No specific login-rate limit, no account lockout, no CAPTCHA, no failed-attempt counting.

**Risk:** 500 requests per minute is sufficient for a credential-stuffing attack from a single IP. Not blocking for the current demo environment but should be addressed before production.

---

### Gap 7 — Token not invalidated on password change

**Current behavior:** Changing a password via `POST /api/auth/change-password` updates the bcrypt hash in the DB. Existing valid JWTs issued before the password change remain valid until expiry (up to 8 hours).

**Risk:** If a user changes their password due to a suspected compromise, any attacker with the old token retains access for up to 8 hours.

---

### Gap 8 — No token refresh mechanism

**Current behavior:** Tokens expire after exactly 8 hours. The frontend has no refresh mechanism. On expiry, the next API call returns 401, which triggers `beacon:unauthorized` → logout.

**User experience:** Users are silently logged out mid-session after 8 hours with no warning.

---

### Gap 9 — `super_admin` not explicitly included in some Admin+ routes

**Current behavior:** Some routes specify `requireRoles("admin", "super_admin")`. However, super admins access most of these via the `/superadmin/*` pages (which use the superadmin portal), not the admin portal. No frontend route guard prevents super_admin from calling these API routes directly.

**Risk:** None — super_admin is listed in the allowed roles where needed. The comment is included for clarity during migration.

---

### Gap 10 — Frontend ProtectedRoute wrong-role redirect does not go to /forbidden

**Current behavior:** Wrong-role access redirects to the user's own portal (e.g., donor visiting `/admin` gets sent to `/donor`).

**Consistency:** The `/forbidden` page exists and is reached only on API 403 responses, not on frontend route guard failures. These are two different UX paths for the same conceptual access denial.

---

### Gap 11 — Admin access to some super_admin ML routes

**Current behavior (backend):** Several super admin ML routes explicitly allow `"admin"` role:
- `/api/superadmin/overview/safehouse-health-mini`
- `/api/superadmin/donors/churn`
- `/api/superadmin/donors/:id/donations-recent`
- `/api/superadmin/social/heatmap`
- `/api/superadmin/social/recommendation`
- `/api/superadmin/social/posts`
- `/api/superadmin/residents/regression/distribution`
- `/api/superadmin/residents/regression/watchlist`
- `/api/superadmin/residents/reintegration/funnel`
- `/api/superadmin/residents/reintegration/table`
- `/api/superadmin/interventions/effectiveness`
- `/api/superadmin/interventions/effectiveness/:category/plans`
- `/api/superadmin/safehouses/health`
- `/api/superadmin/safehouses/:id/health-history`

**Current behavior (frontend):** All `/superadmin/*` page routes are guarded with `ProtectedRoute roles={["super_admin"]}`. An admin cannot navigate to these pages through the UI.

**Inconsistency:** The backend allows admin access to certain ML endpoints, but the frontend never sends an admin to these routes. An admin with a valid token could call these endpoints directly via API and receive data (with email redaction and safehouse scoping applied). This may be intentional for future admin-facing ML panels, but currently produces a gap between frontend and backend access rules.

---

## 8. What the .NET Backend Must Preserve Exactly

1. **JWT bearer token scheme.** Accept `Authorization: Bearer <token>` header. No other auth transport.

2. **Login response shape.** `POST /api/auth/login` must return exactly `{ token: string, user: AuthUser }` at the top level. The `AuthUser` fields must match exactly:
   - `id: number`, `username: string`, `email: string`, `firstName: string`, `lastName: string`
   - `role: "public" | "donor" | "staff" | "admin" | "super_admin"` (exact snake_case strings)
   - `isActive: boolean`, `mfaEnabled: boolean`
   - `lastLogin?: string | null` (ISO 8601)
   - `supporterId?: number | null`
   - `safehouses?: number[]` (array of integer safehouseIds from `staff_safehouse_assignments`)

3. **Safehouse assignments in login payload.** The `safehouses` array must be populated from `staff_safehouse_assignments` at login time and embedded in the token payload. Subsequent requests must read this from the token — no re-fetch per request.

4. **Live `isActive` check on every authenticated request.** Every call to a `requireAuth`-protected route must verify the user is still active in the DB. This ensures disabled accounts cannot use valid tokens for more than one additional request.

5. **401 for auth failures, 403 for role failures.** Specifically:
   - Missing/malformed/expired token → 401
   - Valid token but disabled account → 401
   - Valid token + wrong role → 403
   - Never return 403 for a missing token

6. **403 response causes frontend redirect to `/forbidden`.** The client uses `window.location.href = "/forbidden"` on 403. This must be triggered only by genuine role violations, not auth failures.

7. **Error body shape.** `{ "error": string }`. This exact key name is extracted by `ApiError`. Any other key is lost.

8. **CORS `credentials: false`.** No cookies are involved in auth. The `Authorization` header must be allowed. Origin policy must allow the SPA origin.

9. **Role-conditional response filtering** (server enforced, not client enforced):
   - `GET /api/campaigns` → donors see only active campaigns
   - `GET /api/program-updates` → donors see only published updates
   - `GET /api/superadmin/safehouses/health` → `peerRank` must be null for admin role
   - `GET /api/superadmin/donors/churn` → `email` must be redacted to `***@***.***` for admin role

10. **Safehouse scoping rules.** Replicate `getUserSafehouses()` behavior exactly:
    - `super_admin` → no filter (see all data)
    - admin/staff with assigned safehouses → filter to assigned safehouses
    - admin/staff with no assignments → no filter (backward-compatible; sees all data)

11. **`ml_scores_restricted = true` exclusion.** Residents with this flag must be excluded from row-level super admin ML endpoints. Counts of excluded residents must appear in `meta.totalRestricted`.

12. **IDOR guards.** Admin role accessing per-resource endpoints must be validated against their allowed safehouses:
    - `GET /api/superadmin/donors/:id/donations-recent`
    - `GET /api/superadmin/safehouses/:id/health-history`

13. **`passwordHash` never in responses.** No user API response may include any password hash.

14. **`DELETE /api/users/:id` self-delete prevention.** Must return 400 if the caller's own `id` matches the target `id`.

15. **Password rules on user creation and change-password.** Min 12 chars, uppercase, lowercase, digit, special character. Must return 400 with `{ "error": string }` on rule violation.

16. **Stateless logout.** `POST /api/auth/logout` requires no auth and does nothing meaningful server-side. Keep it for compatibility but do not add server-side session invalidation unless a token blacklist is also added.

17. **Token expiry duration.** Match the 8-hour expiry to preserve the expected session length. (The frontend has no refresh mechanism — changing the expiry without also adding refresh will disrupt users.)

18. **`GET /api/auth/me` returns `{ user: null }` for unauthenticated callers**, not 401. The orval client bootstrap depends on this behavior.

---

## 9. What Can Be Improved Later After Parity Is Reached

These are genuine security or UX improvements that should not be conflated with the migration work. They require frontend changes and should be tackled as separate initiatives after the .NET backend is proven to work with the existing frontend.

1. **Token persistence across page refresh.** Store the token in `sessionStorage` or a `HttpOnly` cookie to survive page refreshes. Requires frontend changes to `AuthContext`.

2. **Token refresh mechanism.** Issue refresh tokens at login; use silent refresh before the 8-hour access token expiry. Requires frontend changes and new backend endpoints.

3. **Token revocation on password change.** Invalidate all existing tokens when a password is changed (requires a token blacklist or session table). Currently the token remains valid for up to 8 hours after a password change.

4. **Login-specific rate limiting.** Add a per-username rate limit (e.g., 10 attempts / 15 minutes) in addition to the global IP rate limit to prevent credential stuffing.

5. **Account lockout.** Temporarily disable accounts after N consecutive failed login attempts. Track failed attempts in the DB.

6. **IDOR protection on `GET /api/supporters/:id` and `/api/donations/:id`.** Add role check or ownership check — currently any authenticated user can read any resource by integer ID.

7. **Fix unassigned admin/staff data access.** Consider whether an admin with no safehouse assignments should truly see all data, or should see nothing and be required to be explicitly assigned.

8. **MFA enforcement.** The `mfaEnabled` flag exists on the user schema and in the JWT payload but no MFA challenge exists anywhere. If MFA is desired, a challenge flow must be added to login.

9. **Audit trailing for auth events.** Log login success, login failure, password change, and account disable events in the audit log table (which also needs to be implemented — see §7 Gap for `/api/audit-logs`).

10. **Consistent wrong-role UX.** Consider redirecting wrong-role frontend access to `/forbidden` instead of the user's own portal, for clarity. Currently, `/forbidden` is only reached via API 403.

11. **`optionalAuth` live DB check.** Add the same `isActive` DB check to `optionalAuth` for consistency with `requireAuth`.

12. **Social media posts — clarify public vs. authenticated.** Determine whether `GET /api/social-media-posts` should be public or require auth, and make the frontend and backend consistent.
