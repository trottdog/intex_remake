# Frontend Connectivity Checklist

## Automated Smoke Tests

Run:

```bash
dotnet test /Users/natemacbook/Desktop/intex/backend/intex/intex.Tests/intex.Tests.csproj
```

Automated coverage included:

- login returns `token` and `user`
- `/api/auth/me` returns `{ user: null }` when anonymous and a populated user when authenticated
- `GET /api/dashboard/public-impact` works anonymously
- donor smoke paths:
  - `GET /api/dashboard/donor-summary`
  - `GET /api/donations/my-ledger`
- admin smoke paths:
  - `GET /api/dashboard/admin-summary`
  - `GET /api/residents`
- paginated envelope verification on list endpoints
- `401` error shape verification
- `403` error shape verification
- `DELETE` returning `204` with no body
- CORS preflight for cross-origin SPA calls with `Authorization`

## Manual Frontend Reconnection Checks

Run these against the deployed or local frontend + API together:

- Confirm the login page succeeds and stores the returned JWT in frontend state.
- Confirm a page refresh loses auth state if that is still the intended stateless behavior.
- Confirm `/auth/me` on first load does not force a logout loop when no token is present.
- Confirm the landing/impact page loads public-impact metrics and published snapshots without auth.
- Confirm donor dashboard widgets load summary totals, giving trend, and ledger rows.
- Confirm donor profile page loads `/api/supporters/me` and profile patch still works.
- Confirm admin dashboard cards and charts load without JSON-shape errors.
- Confirm admin resident list pagination changes pages correctly using the returned `pagination` object.
- Confirm a donor user cannot open admin-only pages and gets the expected frontend forbidden behavior.
- Confirm a missing/expired token triggers the frontend unauthorized handler and logout flow.
- Confirm delete actions from admin pages do not expect a response body after `204`.
- Confirm the separately hosted frontend can call the API over HTTPS without browser CORS errors.

## Deployment Smoke Checks

- Verify `VITE_API_BASE_URL` points to the deployed API origin if frontend and API are separate origins.
- Verify the API environment includes the frontend origin in the CORS allowlist.
- Verify the browser network tab shows `Access-Control-Allow-Origin` on preflight/actual API responses for the frontend origin.
- Verify requests include `Authorization: Bearer <token>` and no cookies are required.

## Notes

- The integration tests use a seeded in-memory test host, so they validate wire behavior and middleware shape without requiring the live Supabase database.
- These tests are smoke coverage, not a full end-to-end replacement for real frontend page verification.
