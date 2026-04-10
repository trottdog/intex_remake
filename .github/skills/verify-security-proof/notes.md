HTTPS/TLS
Status: RISK
Repo/runtime evidence: HTTPS middleware is configured in Program.cs:80.
Video proof evidence: None provided in this request scope.
Missing proof: Browser-level proof on deployed site (valid cert, lock icon, HTTPS URL).
Exact blocker: Implemented in code, but not demonstrated in runtime/video.

HTTP -> HTTPS redirect
Status: RISK
Repo/runtime evidence: Redirect middleware exists in Program.cs:80, with forwarded headers enabled in Program.cs:58.
Video proof evidence: None provided.
Missing proof: Demonstration that HTTP requests are redirected to HTTPS in deployment.
Exact blocker: No runtime/video demonstration of redirect behavior.

Login/authentication
Status: RISK
Repo/runtime evidence: Login endpoint in AuthController.cs:15, JWT auth pipeline in ServiceCollectionExtensions.cs:102.
Video proof evidence: None provided.
Missing proof: Security video showing successful/failed login paths and unauthorized behavior.
Exact blocker: Implementation exists, but grading proof is missing.

Password policy
Status: RISK
Repo/runtime evidence: Complexity rules in PasswordRules.cs:7, enforced during change-password in AuthService.cs:73.
Video proof evidence: None provided.
Missing proof: Demo of weak password rejection and compliant password acceptance.
Exact blocker: No video/runtime proof of policy enforcement.

RBAC
Status: RISK
Repo/runtime evidence: Policy definitions in ServiceCollectionExtensions.cs:183, protected examples in UsersController.cs:11 and DonationsController.cs:19.
Video proof evidence: None provided.
Missing proof: Demo that role-restricted routes return 403 for wrong role and 200 for correct role.
Exact blocker: No runtime/video authorization proof.

Protected APIs
Status: RISK
Repo/runtime evidence: Multiple [Authorize] usages in DonationsController.cs:13 and UsersController.cs:11.
Video proof evidence: None provided.
Missing proof: API test evidence (e.g., unauthorized request blocked).
Exact blocker: Not demonstrated for grading.

Delete confirmation
Status: FAIL
Repo/runtime evidence: Server has delete endpoints (example: UsersController.cs:75, DonationsController.cs:61), but no confirmation UX is evidenced in requested files.
Video proof evidence: None provided.
Missing proof: Frontend confirmation dialog/workflow before destructive actions.
Exact blocker: No implementation evidence in provided scope for confirmation behavior.

Secrets handling
Status: RISK
Repo/runtime evidence: JWT secret is expected from config/env and required in production via JwtSecretResolver.cs:10; however repo includes plaintext DB passwords in appsettings.json:3 and appsettings.Development.json:3.
Video proof evidence: None provided.
Missing proof: Clear demonstration that production secrets are only in secure environment storage and not in repo.
Exact blocker: Mixed posture; production JWT handling is good, but committed plaintext connection-string passwords create grading risk.

Privacy policy
Status: RISK
Repo/runtime evidence: Implemented in frontend with public route and links: PrivacyPage.tsx (Asset-Manager/artifacts/beacon/src/pages/PrivacyPage.tsx), route registration in App.tsx:90 (Asset-Manager/artifacts/beacon/src/App.tsx), footer links in PublicLayout.tsx:213 and DashboardLayout.tsx:281, plus cookie-banner link in CookieConsent.tsx:39.
Video proof evidence: None provided.
Missing proof: Public privacy policy page and footer link demonstration.
Exact blocker: Implementation exists, but deployed runtime/video proof is missing in this request scope.

Cookie consent
Status: RISK
Repo/runtime evidence: Implemented in frontend: consent banner with essential/all choices (Asset-Manager/artifacts/beacon/src/components/CookieConsent.tsx), centralized consent enforcement with optional-cookie cleanup/enablement (Asset-Manager/artifacts/beacon/src/lib/consent.ts), startup reconciliation (Asset-Manager/artifacts/beacon/src/main.tsx), and profile consent controls (Asset-Manager/artifacts/beacon/src/pages/donor/ProfilePage.tsx).
Video proof evidence: None provided.
Missing proof: Runtime demonstration that beacon_personalization is created only after Accept All and removed when Essential Only is selected.
Exact blocker: Code implementation exists, but deployed runtime/video proof is still missing. Use .github/skills/verify-security-proof/COOKIE_CONSENT_PROOF_SCRIPT.md for the recording sequence.

CSP response header
Status: FAIL
Repo/runtime evidence: No CSP response-header middleware found in Program.cs or auth wiring; only HSTS/HTTPS/auth middleware is present.
Video proof evidence: None provided.
Missing proof: Actual HTTP response header Content-Security-Policy visible in dev tools/network response headers.
Exact blocker: CSP response header implementation is missing from audited backend pipeline.

Availability on deployed site
Status: FAIL
Repo/runtime evidence: No deployed runtime evidence supplied in this request.
Video proof evidence: None provided.
Missing proof: Public live URL and successful access/demo.
Exact blocker: Deployment availability not demonstrated.

MFA account if claimed
Status: FAIL
Repo/runtime evidence: Token carries mfaEnabled claim in JwtTokenService.cs:28, but no MFA challenge/enforcement appears in AuthController.cs:15 or auth pipeline.
Video proof evidence: None provided.
Missing proof: MFA-enabled account and enforced MFA login flow.
Exact blocker: Claimed/represented MFA flag without enforcement-level evidence.

HSTS if claimed
Status: RISK
Repo/runtime evidence: HSTS middleware enabled outside development in Program.cs:75.
Video proof evidence: None provided.
Missing proof: Response header Strict-Transport-Security shown on deployed HTTPS response.
Exact blocker: Code exists but runtime/video proof missing.

Extra security features if claimed
Status: RISK
Repo/runtime evidence: No extra-feature claim package was provided in this request context.
Video proof evidence: None provided.
Missing proof: Claimed feature list mapped to implementation and demo clips.
Exact blocker: Claims/proofs not supplied.

Overall verdict for this scoped audit: FAIL for IS 414 proof readiness (multiple hard blockers: CSP header, MFA proof/enforcement, privacy/cookie proof, deployed/video evidence).

Natural next steps:

Build a security-proof checklist script for your video that maps each item above to one exact screen/API call.
If you want, I can run a second pass on frontend files to confirm privacy policy, cookie consent, and delete confirmation implementation status directly.
I can also give you a minimal patch set for CSP response headers and an MFA-enforcement path so the current FAIL items move to RISK/PASS.
GPT-5.3-Codex • 1x