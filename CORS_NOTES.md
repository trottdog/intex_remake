# CORS Notes

## Local Development Origins

The API allows these localhost frontend origins for local Vite/preview development:

- `http://localhost:5173`
- `http://127.0.0.1:5173`
- `http://localhost:4173`
- `http://127.0.0.1:4173`
- `http://localhost:3000`
- `http://127.0.0.1:3000`

These are supplied in development config and also act as the development fallback if no explicit origin list is provided.

## Staging Origins

Staging should be configured explicitly through either:

- `Cors:AllowedOrigins` in configuration, or
- `CORS_ALLOWED_ORIGINS` as a comma-separated environment variable

Example staging origin:

- `https://staging-beacon.vercel.app`

If the staging frontend and API are on different origins, the staging frontend origin must be present in the allowlist.

## Production Origins

Production must be configured explicitly through either:

- `Cors:AllowedOrigins` in configuration, or
- `CORS_ALLOWED_ORIGINS` as a comma-separated environment variable

Example production origin:

- `https://beacon.example.com`

The production CORS policy is allowlist-only. It does not use `AllowAnyOrigin`.

## Allowed SPA Behavior

The named CORS policy allows the SPA request shape the frontend needs:

- methods: `GET`, `POST`, `PATCH`, `PUT`, `DELETE`, `OPTIONS`
- headers: `Content-Type`, `Authorization`

Cookies and credentialed cross-origin requests are not enabled, which matches the current bearer-token-only frontend contract.

## Security Tradeoffs

- Using an explicit origin allowlist in staging/production reduces accidental cross-site API access.
- Not enabling credentials keeps the API aligned with the stateless bearer-token model and avoids cross-site cookie risks.
- If no production origins are configured, the API will not allow browser-based cross-origin frontend access. That is safer than falling back to a wildcard, but it means deployment config must be set correctly before the hosted frontend can connect.
