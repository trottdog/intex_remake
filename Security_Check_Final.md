# IS 414 Security Audit — Final Report

**Audit Date:** 2026-04-10
**Tech Stack:** .NET 10 Web API (Azure App Service) · React 19 + Vite 7 (Vercel) · PostgreSQL (Supabase)
**Scope:** Section 6 of `.github/skills/verify-project-completion/checklist.md`
**Exclusion:** Express/Node backend (not in use)

For every item: `[x]` = fully implemented with evidence, `[~]` = partially implemented (gap noted), `[ ]` = not implemented (remedy noted).

---

## 6.1 Critical Rule

- [ ] **Every claimed security feature is clearly shown in the security video**
  - **Status:** Cannot verify — no video artifact exists yet.
  - **Remedy:** Record IS 414 security video demonstrating every item marked `[x]` below. Ensure browser DevTools are shown for CSP/HSTS headers.

- [ ] **Team is not relying on "implemented but not shown"**
  - **Status:** Cannot verify without video.
  - **Remedy:** Use this audit as a shot list for the video.

---

## 6.2 Confidentiality

- [x] **Public site uses HTTPS/TLS**
  - **Evidence (backend):** `Program.cs` line 161 calls `app.UseHttpsRedirection()`. Azure App Service provides the TLS certificate for `intex-gtgzecb5avarh7gg.centralus-01.azurewebsites.net`.
  - **Evidence (frontend):** Vercel serves `intex.trottdog.com` over HTTPS with an auto-managed TLS certificate.

- [x] **Certificate is valid**
  - **Evidence:** Both Azure App Service and Vercel provide valid, auto-renewed TLS certificates for their respective domains.

- [x] **HTTP redirects to HTTPS**
  - **Evidence (backend):** `Program.cs` line 161: `app.UseHttpsRedirection()` issues 307 redirects for plain-HTTP requests.
  - **Evidence (frontend):** Vercel enforces HTTPS by default for all custom domains. The CSP in `vercel.json` line 13 includes `upgrade-insecure-requests`.

- [ ] **HTTPS behavior is demonstrated in browser**
  - **Status:** No video or screenshot evidence yet.
  - **Remedy:** In the security video, navigate to the site and show the padlock icon, certificate details, and an HTTP→HTTPS redirect in the browser address bar.

---

## 6.3 Authentication

- [x] **Username/password authentication works**
  - **Evidence (backend):** `Controllers/AuthController.cs` lines 36-51 — `POST /auth/login` endpoint accepts username/password, delegates to `AuthService.LoginAsync()`.
  - **Evidence (backend):** `Services/Auth/AuthService.cs` lines 19-40 — looks up user, verifies password hash via `IPasswordService.Verify()`, returns JWT on success or `null` on failure.
  - **Evidence (frontend):** `pages/LoginPage.tsx` lines 35-68 — login form submits username/password, receives JWT, stores it in `sessionStorage` via `AuthContext`.

- [x] **Visitors can browse public pages unauthenticated**
  - **Evidence (backend):** `[AllowAnonymous]` is applied to: `HealthController.cs` (line 8), `PublicSafehousesController.cs` (line 8), `DashboardController.cs` line 13 (`GET /public-impact`), `ImpactSnapshotsController.cs` line 16 (`GET` published snapshots), `AuthController.cs` (login/register/me/logout), `DonationsController.cs` line 105 (`POST /donations/public` for anonymous giving).
  - **Evidence (frontend):** `App.tsx` — public routes (`/`, `/impact`, `/privacy`, `/login`, `/donate`) are not wrapped in `ProtectedRoute`.

- [x] **Authenticated users can access protected pages**
  - **Evidence (backend):** Default authorization policy in `ServiceCollectionExtensions.cs` lines 208-222 is `RequireAuthenticatedUser()`. All business controllers (residents, donors, safehouses, etc.) carry `[Authorize]` or `[Authorize(Policy = ...)]`.
  - **Evidence (frontend):** `ProtectedRoute.tsx` lines 14-46 — checks `isAuthenticated` and optionally `roles` before rendering children. `App.tsx` wraps `/admin/*`, `/superadmin/*`, `/donor/*` route trees in `ProtectedRoute`.

- [x] **Better-than-default password policy is configured**
  - **Evidence:** `Infrastructure/Auth/PasswordRules.cs` lines 5-33 enforces:
    - Minimum 12 characters (line 7)
    - At least one uppercase letter (line 12)
    - At least one lowercase letter (line 17)
    - At least one digit (line 22)
    - At least one special character (line 27)
  - **Applied at:** `AuthService.RegisterDonorAsync()` (line 132), `AuthService.ChangePasswordAsync()` (line 93), and `UserService.CreateUserAsync()`.

- [x] **Team can explain the exact password rules used**
  - **Evidence:** `LoginPage.tsx` line 207-209 displays: "Password requirements: 12+ characters with uppercase, lowercase, digit, and special character."

- [x] **/login and /auth/me style endpoints are accessible**
  - **Evidence:** `AuthController.cs` — `POST /auth/login` (line 37), `GET /auth/me` (line 93), both marked `[AllowAnonymous]`.

- [x] **Protected endpoints reject unauthorized users**
  - **Evidence (backend):** JWT bearer authentication in `ServiceCollectionExtensions.cs` lines 126-203. `OnTokenValidated` event (lines 141-152) checks that the user ID claim is valid and that the user exists and `IsActive == true`. Missing or invalid tokens result in 401. `OnChallenge` / `OnForbidden` events return structured JSON errors.
  - **Evidence (frontend):** `services/api.ts` lines 38-47 — dispatches `beacon:unauthorized` on 401, redirects to `/forbidden` on 403. `AuthContext.tsx` listens for `beacon:unauthorized` and calls `logout()`.

---

## 6.4 RBAC Authorization

- [x] **Admin role exists**
  - **Evidence:** `Infrastructure/Auth/BeaconRoles.cs` lines 3-18 defines `Admin = "admin"`.

- [x] **Donor role exists**
  - **Evidence:** `BeaconRoles.cs` defines `Donor = "donor"`.

- [x] **Public/non-authenticated access is restricted appropriately**
  - **Evidence:** Only 6 controller paths are `[AllowAnonymous]`: health check, public safehouses, public impact dashboard, published impact snapshots (read-only), auth endpoints, and anonymous public donations. All other endpoints require authentication and a role-matching policy.

- [x] **Only admin can create data where required**
  - **Evidence (examples):**
    - `SafehousesController.cs` line 33: `[Authorize(Policy = PolicyNames.AdminOrAbove)]` on `POST`.
    - `CampaignsController.cs` line 28: `[Authorize(Policy = PolicyNames.SuperAdminOnly)]` on `POST`.
    - `ImpactSnapshotsController.cs` line 26: `[Authorize(Policy = PolicyNames.AdminOrAbove)]` on `POST`.
    - Staff-level create is also restricted: `ResidentsController.cs` line 10 (`StaffOrAbove`), `DonationsController.cs` line 37 (`StaffOrAbove`).

- [x] **Only admin can update data where required**
  - **Evidence (examples):**
    - `SafehousesController.cs` line 42: `AdminOrAbove` on `PATCH`.
    - `ImpactSnapshotsController.cs` line 43: `AdminOrAbove` on `PATCH`.
    - `ResidentsController.cs` controller-level `StaffOrAbove` covers updates.

- [x] **Only admin can delete data where required**
  - **Evidence:** Delete endpoints uniformly require `AdminOrAbove`:
    - `ResidentsController.cs` line 70, `SupportersController.cs` line 150, `SafehousesController.cs` line 52, `DonationsController.cs` line 83, `ProgramUpdatesController.cs` line 146, `InKindDonationItemsController.cs` line 88, `PartnersController.cs` line 90, `PartnerAssignmentsController.cs` line 101, `SocialMediaPostsController.cs` line 114, `ImpactSnapshotsController.cs` line 60.

- [x] **Donor can view donor-specific history/impact**
  - **Evidence (backend):** `DonorController.cs` line 10 — entire controller is `[Authorize(Policy = PolicyNames.DonorOnly)]`. `DonationsController.cs` line 19 — `GET /donations/my-ledger` is `DonorOnly`.
  - **Evidence (frontend):** `DonorLayout.tsx` fetches donor summary only when `user?.role === "donor"`.

- [x] **Endpoint-level authorization matches UI restrictions**
  - **Evidence:** Frontend `ProtectedRoute.tsx` enforces role allow-lists (`["admin","staff"]`, `["super_admin"]`, `["donor"]`) on route trees. Backend controllers mirror this with `[Authorize(Policy = ...)]` on every endpoint — `StaffOrAbove` for admin pages, `DonorOnly` for donor pages, `SuperAdminOnly` for user management/audit logs. A donor hitting a staff endpoint gets 403 from the API regardless of UI.

---

## 6.5 Integrity

- [x] **Change/delete actions require authorization**
  - **Evidence:** Every `POST`, `PATCH`, `PUT`, `DELETE` endpoint (except anonymous login/register and public donation) is behind `[Authorize(Policy = ...)]`. See §6.4 above for comprehensive list.

- [x] **Delete confirmation is required**
  - **Evidence (frontend):** Shared `DeleteConfirmModal.tsx` component is used across: `DonationsPage.tsx`, `DonorsPage.tsx`, `DonationsOverviewPage.tsx`, `SafehousesPage.tsx`, `UsersPage.tsx`, `ProgramUpdatesManagementPage.tsx`, `CampaignsManagementPage.tsx`, `ResidentDetailPage.tsx`. Additional pages use inline confirmation state patterns (`IncidentsPage.tsx`, `CaseConferencesPage.tsx`, `InterventionPlansPage.tsx`, `HomeVisitationsPage.tsx`, `ImpactSnapshotsManagementPage.tsx`).
  - **Evidence (backend):** `UserService.cs` lines 125-130 prevents self-deletion (business rule guard).

- [x] **Unauthorized CUD attempts fail**
  - **Evidence:** Default policy is `RequireAuthenticatedUser()` (`ServiceCollectionExtensions.cs` line 211). Anonymous CUD returns 401. Insufficient role returns 403. `OnChallenge` and `OnForbidden` JWT events produce structured JSON error responses.

- [x] **Team can demonstrate those failures**
  - **Evidence:** Previous local verification session (`is414-proof/local-auth-and-route-verification-2026-04-09.md`) documented donor write denial and unauthorized API call rejection.

---

## 6.6 Credentials

- [ ] **No secrets are committed to the public repo**
  - **Status: FAIL.** A real Supabase database connection string (host, username, password `INtex20263-8`) is committed in `.tmp-build/intex-verify-3/appsettings.Development.json` line 3. The entire `.tmp-build/` directory (including compiled binaries) is tracked by git because `.gitignore` does not include `.tmp-build/`.
  - **Remedy:**
    1. **Immediately rotate** the exposed Supabase database password.
    2. Add `.tmp-build/` to `.gitignore`.
    3. Remove `.tmp-build/` from git history (`git filter-repo` or BFG Repo-Cleaner).
    4. Audit git history for any other leaked secrets.

- [x] **Secrets are stored in .env, env vars, or secrets manager**
  - **Evidence:**
    - `appsettings.json` contains only empty placeholders for `PostgreSql` and `Jwt.Secret`; the `Mfa` section now stores non-secret TOTP settings only.
    - `Infrastructure/Configuration/DotEnvLoader.cs` loads `.env` files at startup (called from `Program.cs` line 15).
    - `JwtSecretResolver.cs` lines 8-43 resolves JWT secret from config/env vars, and **throws** in production if no secret is configured.
    - Connection string resolution in `ServiceCollectionExtensions.cs` checks `DATABASE_URL` and Azure-style env vars.
    - `.env.example` contains only placeholder values.
    - Root `.gitignore` excludes `.env`, `.env.*`, and `appsettings.Local.json`.
    - GitHub Actions workflow (`.github/workflows/ml-nightly-retrain.yml` line 19) uses `${{ secrets.SUPABASE_DB_CONNECTION_STRING }}` — proper GitHub secrets usage.

- [~] **Deployment secrets are handled safely**
  - **Status: PARTIAL.** Azure App Service and Vercel both support environment variable injection (secrets not in code). However, the `.tmp-build/` leak indicates a process gap.
  - **Remedy:** After rotating the leaked password, verify all Azure App Service and Vercel environment variables are set correctly and that no deployment scripts echo secrets.

- [~] **Team can show where secrets are configured without exposing them**
  - **Status: PARTIAL.** Can show `appsettings.json` placeholders, `.env.example`, and `JwtSecretResolver.cs` logic. However, the `.tmp-build/` leak undermines the claim.
  - **Remedy:** Fix the leak (see above), then demonstrate the clean secret resolution chain in the video.

---

## 6.7 Privacy

- [x] **GDPR-style privacy policy is customized**
  - **Evidence:** `pages/PrivacyPage.tsx` — a full privacy policy page exists with customized content for the Beacon application.

- [x] **Privacy policy is linked from footer**
  - **Evidence:** Links to `/privacy` found in: `PublicLayout.tsx` (public footer), `DashboardLayout.tsx` (admin footer), `LoginPage.tsx` (line 279), `CookieConsent.tsx`, `ProfilePage.tsx`, `ForbiddenPage.tsx`, `not-found.tsx`.

- [x] **Cookie consent notification is implemented**
  - **Evidence:** `components/CookieConsent.tsx` is mounted in `App.tsx`. Shows a banner when `beacon_consent` cookie is missing. Offers "Accept All" and "Essential Only" buttons.

- [x] **Team can explain whether consent is functional or cosmetic**
  - **Evidence:** Consent is **functional**:
    - `lib/consent.ts` — `applyConsent()` (lines 20-30) sets `beacon_consent` to the chosen level. If "Accept All," it also sets `beacon_personalization` cookie. If "Essential Only," it deletes `beacon_personalization`.
    - `main.tsx` calls `reconcileConsentCookies()` on app load to align cookie state.
    - **Gap noted:** `hasOptionalConsent()` is exported but never consumed by any feature code — no actual feature gating occurs based on consent level. The consent mechanism is functional in setting/clearing cookies but does not gate any downstream behavior.

- [~] **Public/private data boundary is appropriate for sensitive minors/survivors**
  - **Status: PARTIAL.**
  - **Evidence of protection:** Public endpoints (`/public-impact`, `/public/safehouses`, `/impact-snapshots` GET) return aggregated/anonymized data. All resident data, process recordings, health records, education records, home visitations, incident reports, and case conferences are behind `StaffOrAbove` authorization.
  - **Gap:** No explicit audit was performed to verify that aggregated endpoints cannot leak individual identities through small-N aggregation. Donor endpoints return supporter profiles which may include PII (name, email); while these are behind `DonorOnly` or `StaffOrAbove`, the boundary should be reviewed for compliance with Philippine Data Privacy Act requirements given the survivor population.
  - **Remedy:** Conduct a data-minimization review on all public and donor-facing endpoints. Ensure no public aggregation can identify a minor with small group sizes. Document the data classification policy.

---

## 6.8 Attack Mitigations

- [x] **CSP is sent as an HTTP response header**
  - **Evidence (backend):** `Infrastructure/Middleware/SecurityHeadersMiddleware.cs` lines 13-16 — sets `Content-Security-Policy` header on every response: `default-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'self'`.
  - **Evidence (frontend):** `vercel.json` lines 12-13 — sets CSP header on all Vercel responses: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests`.

- [x] **CSP is not just a meta tag**
  - **Evidence:** No CSP `<meta>` tag exists in `index.html`. CSP is delivered exclusively via HTTP response headers from both the backend middleware and Vercel edge config.

- [x] **CSP is visible in browser devtools**
  - **Evidence:** The live site already returns the header in raw HTTP responses (`attached_assets/is414-proof/frontend-https-headers.txt`). In Chrome or Edge, the same response header is visible in `DevTools -> Network -> request -> Headers -> Response Headers`.
  - **Remedy:** In the security video, open DevTools → Network → select a request → Headers tab → show the `Content-Security-Policy` response header.

- [x] **CSP is restricted to only needed sources**
  - **Status:** PASS.
  - **Evidence:** The Vercel CSP is well-scoped: `script-src 'self'`, `connect-src 'self'` (API calls go through Vercel rewrite), `font-src` limited to Google Fonts, `img-src` allows `https:` broadly (for external images).
  - **Gap (frontend):** `connect-src 'self'` may be too restrictive if the frontend makes direct calls to the Azure API origin in some code paths (not through the Vercel `/api` rewrite). This could cause CSP violations in production. Conversely, `img-src 'self' data: blob: https:` is quite permissive — allows loading images from any HTTPS origin.
  - **Gap (backend):** Backend CSP (`default-src 'self'`) is very restrictive, which is appropriate for an API-only service.
  - **Remedy:** Test the deployed site with DevTools Console open to check for CSP violation reports. Tighten `img-src` if feasible. Verify `connect-src` doesn't block legitimate API calls.
  - **Updated note (2026-04-10):** The frontend policy was tightened in `Asset-Manager/vercel.json` to `img-src 'self' data:` and `font-src 'self' https://fonts.gstatic.com`. Production API calls remain same-origin because the frontend uses relative `/api/...` paths in production and Vercel rewrites those requests to the backend. See `attached_assets/is414-proof/csp-proof-notes.md`.

- [x] **Team can explain allowed sources**
  - **Status:** PASS.
  - **Remedy:** Prepare talking points: "We allow scripts only from our own origin, styles from self plus Google Fonts (with unsafe-inline for Tailwind), images from any HTTPS source, fonts from Google, connections only to self (API proxied through Vercel)."
  - **Updated note (2026-04-10):** Frontend CSP was tightened in `Asset-Manager/vercel.json` to `img-src 'self' data:` and `font-src 'self' https://fonts.gstatic.com`. The full plain-English rationale and the browser DevTools verification path are now documented in `attached_assets/is414-proof/csp-proof-notes.md`.

- [x] **Data sanitization or output encoding is used to reduce injection risk**
  - **Evidence (backend):**
    - **SQL injection prevention:** All database access uses Entity Framework Core LINQ queries (no `FromSqlRaw`/`ExecuteSqlRaw` found in the codebase). EF Core parameterizes all queries automatically.
    - **Input validation:** `Program.cs` lines 51-62 configures `InvalidModelStateResponseFactory` to reject malformed input. `PasswordRules.Validate()` validates password input. `AuthService.RegisterDonorAsync()` trims and normalizes input (lines 118-121).
    - **JSON error handling:** `JsonExceptionMiddleware.cs` catches malformed JSON payloads and returns 400 (lines 9-11).
  - **Evidence (frontend):**
    - React's JSX auto-escapes all interpolated values by default (XSS protection).
    - Only one `dangerouslySetInnerHTML` usage exists: `components/ui/chart.tsx` lines 77-97 — injects internally-generated CSS for chart theming (not user content).
    - **Additional headers:** Both backend (`SecurityHeadersMiddleware.cs`) and frontend (`vercel.json`) set `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Permissions-Policy: camera=(), microphone=(), geolocation=()`.

---

## 6.9 Availability

- [x] **Site is publicly accessible**
  - **Evidence:** `intex.trottdog.com` serves the React frontend via Vercel. Public pages (home, impact, privacy, login) load without authentication.

- [~] **Site is stable enough for TA access**
  - **Status: PARTIAL.** Public pages are stable. Authenticated flows depend on the Azure backend being online and the Vercel `/api` rewrite functioning correctly.
  - **Remedy:** Verify the Azure App Service is running and responsive. Test the full login→dashboard flow from an incognito browser before TA access.

- [~] **Identity/login works in deployed environment**
  - **Status: PARTIAL.** Login endpoint exists at `POST /api/auth/login`. Previous deployment had issues with Vercel rewriting `/api/*` to `index.html` and auth state not persisting across refresh. Patches exist in the repo (`vercel.json` rewrite fix, `AuthContext.tsx` sessionStorage persistence) but need live re-verification.
  - **Remedy:** Deploy latest frontend to Vercel, then verify login works end-to-end in the deployed environment from an incognito browser.

- [~] **Operational database works in deployed environment**
  - **Status: PARTIAL.** PostgreSQL is hosted on Supabase. Backend resolves connection string from environment variables. No fresh deployed CRUD evidence exists post-patch.
  - **Remedy:** After deploying latest code, create/read/update/delete a test record in the deployed app and verify persistence.

---

## 6.10 Additional Security Features

- [x] **Third-party authentication**
  - **Status: IMPLEMENTED (Google OAuth).** The .NET auth pipeline now registers Google via `AddGoogle()` and uses `/api/auth/oauth/google/start` plus `/api/auth/oauth/google/complete` to convert the Google identity into the existing JWT login response. The React frontend exposes a Google sign-in button on the login page and completes the redirect at `/auth/callback`, including MFA continuation when required.
  - **Deployment/config notes:** Set `Authentication__Google__ClientId`, `Authentication__Google__ClientSecret`, and `Authentication__Google__PublicOrigin` for the deployed API. Apply `add_google_oauth_columns.sql` before using the feature in production so provider-linked users can be stored safely.

- [x] **MFA / 2FA**
  - **Status: IMPLEMENTED (TOTP-based MFA).**
  - **Evidence (backend):**
    - `AuthService.cs` now verifies per-user TOTP secrets with `Otp.NET` instead of a shared static code.
    - `AuthController.cs` exposes authenticated MFA management endpoints: `GET /auth/mfa`, `POST /auth/mfa/setup`, `POST /auth/mfa/enable`, and `POST /auth/mfa/disable`.
    - `MfaChallengeService.cs` keeps time-limited login challenges in `IMemoryCache` and only consumes them after a successful TOTP verification.
    - `User.cs` and the shared SQL schemas now include a nullable `mfa_secret` column for per-user secret storage.
    - QR provisioning is generated server-side with `QRCoder` and returned as an otpauth-compatible enrollment payload.
    - Login flow now checks whether the user has a configured MFA secret before issuing an MFA challenge.
  - **Evidence (frontend):**
    - `LoginPage.tsx` prompts for the current authenticator-app code during MFA sign-in.
    - `MfaSettingsCard.tsx` provides QR enrollment, manual entry fallback, enable, and disable flows from authenticated account pages.
    - The MFA management UI is exposed in admin settings, donor profile, and super-admin system security settings.
  - **Deployment note:** The public site still needs the backend deploy plus the `mfa_secret` schema migration before this implementation is live there.

- [x] **HSTS**
  - **Evidence (backend):** `Program.cs` lines 153-156 — `app.UseHsts()` is called in non-development environments when `AzureHostingOptions.UseHsts` is `true` (default). `appsettings.json` line 7 confirms `UseHsts: true`. This sends `Strict-Transport-Security` header on all responses from the .NET API.
  - **Gap (frontend):** `vercel.json` does **NOT** include a `Strict-Transport-Security` header. Vercel does enforce HTTPS by default, but the HSTS header is not sent by the frontend.
  - **Remedy:** Add `{"key": "Strict-Transport-Security", "value": "max-age=31536000; includeSubDomains"}` to the `headers` array in `vercel.json`.

- [x] **Browser-accessible preference cookie used by React**
  - **Evidence:**
    - `beacon_theme` cookie — set in `DashboardLayout.tsx` (light/dark toggle), read in `main.tsx` on load.
    - `sidebar_state` cookie — set in `components/ui/sidebar.tsx` (sidebar open/closed preference).
    - `beacon_consent` cookie — set in `lib/consent.ts` (consent level).
    - `beacon_personalization` cookie — optional, set only when user accepts all cookies.
    - Cookie helper: `lib/cookies.ts` — `setCookie()` appends `Secure` flag when on HTTPS (line 13), uses `SameSite=Lax`, sets `path=/`.

- [x] **Additional sanitization/encoding protections**
  - **Evidence:**
    - `SecurityHeadersMiddleware.cs` — sets `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`.
    - `vercel.json` — mirrors the same headers on the frontend.
    - Rate limiting: `Program.cs` lines 87-100 — `FixedWindowRateLimiter` (500 requests/minute per user or IP) prevents brute-force/DDoS.
    - Forwarded headers: `Program.cs` lines 78-83 — properly configured for reverse proxy (Azure App Service).
    - JWT `ClockSkew = TimeSpan.Zero` (no tolerance for expired tokens).

---

## 6.11 Required Grading Credentials

- [x] **Admin account without MFA exists**
  - **Evidence:** User management (`UsersController.cs`, `UserService.cs`) allows super_admin to create users with any role. Previous verification confirmed admin credentials work.

- [x] **Admin account without MFA works**
  - **Evidence:** Local verification session (`is414-proof/local-auth-and-route-verification-2026-04-09.md`) confirmed admin login returns a JWT and role-gated pages are accessible.

- [x] **Donor account without MFA exists**
  - **Evidence:** Donor registration (`AuthController.cs` `POST /auth/register-donor`) creates donor accounts. Previous verification confirmed donor credentials work.

- [x] **Donor account without MFA works**
  - **Evidence:** Local verification confirmed donor login, ledger access, and denial of admin endpoints.

- [x] **Donor account is tied to historical donations**
  - **Evidence:** `AuthService.RegisterDonorAsync()` (lines 144-156) creates a `Supporter` record linked to the `User` via `SupporterId`. `DonationsController.cs` `GET /donations/my-ledger` (line 19-22) returns the donor's own donation history.

- [ ] **MFA-enabled account exists**
  - **Status:** No confirmed MFA-enabled user exists in the deployed database yet.
  - **Remedy:** Deploy the backend changes, run the `mfa_secret` schema migration, then enroll one account through the new account-settings UI and document those credentials for grading.

- [ ] **MFA-enabled account is configured correctly**
  - **Status:** The code path is now correct for TOTP-based MFA, but the deployed environment has not yet been re-verified with an enrolled account.
  - **Remedy:** After deployment, verify end-to-end login with an enrolled user and capture that evidence for submission.

- [x] **Credentials are accurate and tested**
  - **Evidence:** Previous local verification session confirmed admin and donor credentials are functional.

- [ ] **Credentials are included where required in final submission**
  - **Status:** No final submission artifact exists yet.
  - **Remedy:** Include admin (non-MFA), donor (non-MFA), and MFA-enabled account credentials in the submission form. Test each credential on the deployed site before submitting.

---

## Summary of Findings

### Fully Passing Items (25 of 37 actionable items)

| Section | Item |
|---------|------|
| 6.2 | HTTPS/TLS, valid certificate, HTTP→HTTPS redirect |
| 6.3 | All 7 authentication items |
| 6.4 | All 8 RBAC items |
| 6.5 | All 4 integrity items |
| 6.7 | Privacy policy, footer links, cookie consent, consent explanation |
| 6.8 | CSP as HTTP header, CSP not meta tag, sanitization/encoding |
| 6.10 | HSTS (backend), preference cookies, additional protections |
| 6.11 | Admin account (2), donor account (3), credentials tested |

### Items Requiring Remediation (12 items)

| Priority | Section | Item | Remedy |
|----------|---------|------|--------|
| **CRITICAL** | 6.6 | Secrets committed in `.tmp-build/` | Rotate Supabase password, remove `.tmp-build/` from git, add to `.gitignore` |
| **MEDIUM** | 6.11 | No MFA-enabled account exists in deployed environment yet | Deploy backend changes, enroll one account, and document credentials |
| **MEDIUM** | 6.10 | No HSTS header on Vercel frontend | Add `Strict-Transport-Security` to `vercel.json` headers |
| **MEDIUM** | 6.7 | Data boundary for minors not formally audited | Review public aggregation endpoints for small-N identification risk |
| **MEDIUM** | 6.8 | CSP `connect-src` may be too restrictive / `img-src` too permissive | Test for CSP violations in deployed site; tighten if needed |
| **MEDIUM** | 6.9 | Login/DB not verified in deployed env post-patch | Deploy latest code and re-verify |
| **LOW** | 6.1 | No security video yet | Record video covering all `[x]` items |
| **LOW** | 6.2 | HTTPS not demonstrated in browser | Show in video |
| **LOW** | 6.6 | Deployment secrets handling partial | Verify Azure/Vercel env vars post-rotation |
| **LOW** | 6.8 | CSP not shown in DevTools | Show in video |
| **LOW** | 6.10 | Third-party auth now implemented | Verify deployed Google OAuth client config and record the browser flow |
| **LOW** | 6.10 | No Docker deployment | Create Dockerfile or mark N/A |
| **LOW** | 6.11 | Credentials not in final submission | Include in submission form |

### Not Applicable / Not Claimed

| Item | Reason |
|------|--------|
| Dockerized deployment | Not implemented; mark N/A unless team intends to claim |
