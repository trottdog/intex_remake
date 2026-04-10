## Local IS 414 Verification

Date: 2026-04-09

Environment:
- Frontend: `http://127.0.0.1:5173`
- Backend: `https://localhost:7194`

Browser verification:
- Anonymous visit to `/admin` redirected to `/login`.
- Admin login succeeded and landed on `/admin`.
- Admin logout cleared session storage and returned the app to `/login`.
- Logged-in admin visiting `/superadmin` redirected back to `/admin`.
- Donor login succeeded and landed on `/donor`.
- Logged-in donor visiting `/admin` redirected back to `/donor`.
- Public home page loaded without authentication.
- Public `/privacy` and `/impact` routes loaded without authentication.

Direct API verification:
- `POST /api/auth/login` with invalid password returned `401 Invalid credentials`.
- `POST /api/auth/login` with `admin` succeeded and returned role `admin`.
- `POST /api/auth/login` with `donor1` succeeded and returned role `donor`.
- `POST /api/auth/login` with `superadmin` succeeded and returned role `super_admin`.
- `GET /api/auth/me` without a token returned `200` with `user: null`.
- `GET /api/dashboard/admin-summary` with the admin token returned `200`.
- `GET /api/dashboard/donor-summary` without a token returned `401`.
- `GET /api/dashboard/donor-summary` with the donor token returned `200`.
- `GET /api/donations/my-ledger?page=1&pageSize=5` with the donor token returned `200` and `total: 5`.
- `DELETE /api/donations/1` with the donor token returned `403`.

Credential observations:
- `admin` exists and works locally without MFA.
- `donor1` exists and works locally without MFA.
- `donor1` is tied to historical donations locally.
- `superadmin` exists and works locally, but MFA is not enabled on the tested account.
