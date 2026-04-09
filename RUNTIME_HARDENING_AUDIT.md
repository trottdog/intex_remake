# Runtime Hardening Audit

## Summary

This pass focused on deployment correctness and runtime safety without changing any frontend-facing API shapes or route paths.

## Findings

- PASS: `UseHttpsRedirection()` was already present.
- PASS: HSTS was already enabled in production only.
- FIXED: Connection string resolution only used `ConnectionStrings:BeaconDb`. It now also supports environment-based deployment values through:
  - `ConnectionStrings__BeaconDb`
  - `BEACON_DB_CONNECTION`
  - `DATABASE_URL`
  - `SUPABASE_DB_CONNECTION`
- FIXED: JWT settings previously relied only on the `Jwt` config section. They now also support environment-based overrides:
  - `JWT_SECRET`
  - `JWT_ISSUER`
  - `JWT_AUDIENCE`
  - `JWT_EXPIRY_HOURS`
- FIXED: JWT production fail-fast existed, but did not enforce a minimum secret strength. Production now fails fast if the JWT secret is shorter than 32 characters.
- FIXED: No request logging middleware was configured. Added ASP.NET HTTP logging for request method/path/query, response status, duration, and selected proxy/request-id headers.
- PASS: Auth headers are not explicitly logged, and no body logging was enabled, reducing token leakage risk.
- PASS: Forwarded headers were already configured ahead of HTTPS redirection, which is the correct order for Azure/reverse-proxy deployments.
- FIXED: Added lightweight response headers appropriate for an API:
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `X-Request-Id`
- PASS: Middleware order remains safe:
  1. forwarded headers
  2. environment-only OpenAPI / HSTS
  3. global exception handling
  4. HTTPS redirection
  5. security/request-id response header middleware
  6. CORS
  7. HTTP request logging
  8. authentication
  9. authorization
  10. controllers

## CSP / Asset Proxying

- NOT APPLIED: A Content Security Policy was not added at the API layer.
- Reason: this backend serves JSON API responses and does not serve frontend HTML or proxy static assets. CSP is most effective on HTML document responses. Adding a CSP header here would not materially improve browser-side protection for the separately hosted frontend.

## Reverse Proxy / Azure Notes

- `UseForwardedHeaders()` runs before `UseHttpsRedirection()`, which helps avoid incorrect redirect behavior behind Azure/reverse proxies.
- Bearer auth continues to read the `Authorization` header directly and does not depend on cookies.
- Request logging includes proxy/request-id context without logging the bearer token itself.

## Result

- All confirmed runtime hardening issues found in this pass were fixed.
- No frontend-facing JSON shapes, routes, status codes, or auth semantics were changed.
