# IS 414 Evidence Checklist (Current State)

Use this file to separate what is now provable from what is still blocked.

## Current status

- Overall: `RISK`
- Reason: transport security and code-level denial evidence are now documented, but deployed auth/runtime proof is still blocked by a backend deployment mismatch.

## Evidence now captured

### Confidentiality / transport

- [x] Public site uses HTTPS/TLS
- [x] Certificate is valid
- [x] HTTP redirects to HTTPS
- [ ] HTTPS behavior is demonstrated in browser

Artifacts:
- `Asset-Manager/attached_assets/is414-proof/frontend-https-headers.txt`
- `Asset-Manager/attached_assets/is414-proof/frontend-http-to-https-redirect.txt`
- `Asset-Manager/attached_assets/is414-proof/frontend-tls-handshake.txt`

Notes:
- `curl.exe -I https://intex.trottdog.com/C` returned `200 OK` with `Strict-Transport-Security`.
- `curl.exe -I http://intex.trottdog.com/C` returned `308 Permanent Redirect` to `https://intex.trottdog.com/C`.
- TLS handshake completed successfully through Windows Schannel without `-k`; for grading, add one browser screenshot showing the lock icon/certificate pane.

### Integrity / unauthorized access

- [x] Protected endpoints reject unauthorized users
- [x] Unauthorized CUD attempts fail
- [ ] Team can demonstrate those failures in the security video

Artifacts:
- `Asset-Manager/attached_assets/is414-proof/backend-security-tests.txt`

Notes:
- Release test run passed 4 tests:
  - security headers on `/api/healthz`
  - unauthorized `GET /api/dashboard/donor-summary`
  - unauthorized `POST /api/supporters`
  - unauthorized `DELETE /api/donations/1`

### Privacy / consent

- [x] Privacy policy is linked from footer
- [x] Cookie consent notification is implemented
- [x] Team can explain whether consent is functional or cosmetic

Repo references:
- `Asset-Manager/artifacts/beacon/src/components/CookieConsent.tsx`
- `Asset-Manager/artifacts/beacon/src/main.tsx`

Notes:
- Consent is functional for preference/personalization cookies.
- Auth does not depend on cookies.

## Risks still open

### Deployed auth and runtime verification

- [ ] Authenticated users can access protected pages in deployed environment
- [ ] Identity/login works in deployed environment
- [ ] Operational database works in deployed environment
- [ ] Credential handoff has been verified end-to-end
- [ ] Deployed CUD denial demos have been recorded

Blocker artifact:
- `Asset-Manager/attached_assets/is414-proof/deployed-backend-route-mismatch.txt`

Why this remains blocked:
- The live frontend is reachable.
- The Azure host `https://beacon-api.azurewebsites.net` is up and serves Swagger.
- Its deployed OpenAPI surface does not match this repo's backend contract. It exposes `/api/Beacon` and `/Health`, while expected routes like `/api/healthz`, `/api/auth/login`, and `/api/dashboard/donor-summary` return `404`.

Implication:
- This is not just "missing evidence". It indicates the deployed backend is stale, misrouted, or pointed at the wrong service.

### CSP grading risk

- [x] CSP is sent as an HTTP response header
- [x] CSP is visible in browser devtools
- [x] CSP is restricted to only needed sources
- [x] Team can explain allowed sources cleanly

Repo reference:
- `Asset-Manager/vercel.json`

Evidence note:
- The deployed HTML requests Google Fonts from `fonts.googleapis.com` and `fonts.gstatic.com`, and `Asset-Manager/vercel.json` now allows those exact origins.
- Production API calls stay same-origin because the frontend uses relative `/api/...` paths in production and Vercel rewrites those requests to the backend, so `connect-src 'self'` is sufficient.
- `img-src` was tightened to `'self' data:` because the audited frontend uses bundled local images rather than arbitrary remote HTTPS image hosts.
- Plain-English source rationale and the DevTools verification path are documented in `Asset-Manager/attached_assets/is414-proof/csp-proof-notes.md`.

### Credentials / secrets

- [x] Secrets are stored in env files or environment variables locally
- [ ] Deployment secrets are handled safely
- [ ] Team can show where deployment secrets are configured without exposing them
- [ ] No secrets are committed to the public repo

Notes:
- `git ls-files .env .env.passwords` returned no tracked matches, which is a good sign for those two files specifically.
- Do not elevate the full "no secrets committed" claim without either a broader secret scan or repo review.

## Next actions to reach PASS

1. Fix the deployed backend target so the frontend points at the correct API contract.
2. Record browser evidence for:
   - HTTPS lock/certificate
   - anonymous `/admin` -> `/login`
   - donor blocked from admin
   - valid admin login
   - one unauthorized write denial
3. Capture deployment-secret screenshots from Vercel/Azure without revealing values.
4. Either self-host fonts or update CSP to include the exact Google Fonts origins in use.
