# IS 413 Evidence Checklist (Deployed Proof)

Use this checklist to collect grading artifacts that prove deployed behavior.

## 1) Protected route proof (role gating)

- [ ] Anonymous user opens /admin and is redirected to /login.
- [ ] Donor user attempts /admin and is redirected to donor portal.
- [ ] Admin user can open /admin pages.
- [ ] Super admin user can open /superadmin pages.

Suggested capture:
- short video clip per scenario, or screenshot pair (before route, after redirect/page load)

## 2) DB persistence proof (deployed)

Pick one record type that supports CRUD (example: process recordings).

- [ ] Create a new record in deployed app.
- [ ] Refresh page and verify record still exists.
- [ ] Edit the same record and save.
- [ ] Refresh page and verify updated values persist.
- [ ] Delete the record and confirm it no longer appears after refresh.

Suggested capture:
- one continuous video sequence showing create -> refresh -> edit -> refresh -> delete -> refresh

## 3) Lighthouse accessibility proof

Run Lighthouse on required pages in deployed environment and save report files.

Required artifact format:
- [ ] HTML report per page
- [ ] JSON report per page

Recommended storage path in repo:
- Asset-Manager/attached_assets/lighthouse-reports/

Suggested page set:
- / (public landing)
- /login
- /admin (while authenticated as admin)
- /superadmin (while authenticated as super admin)
- /donor (while authenticated as donor)

## 4) Test run proof

- [ ] Execute backend tests with dotnet test.
- [ ] Save or screenshot test summary showing pass count.

Command:

```powershell
dotnet test backend/intex/intex.sln
```

## 5) Submission-ready bundle

- [ ] Place videos/screenshots in attached_assets/is413-proof/
- [ ] Place Lighthouse reports in attached_assets/lighthouse-reports/
- [ ] Keep one short index note mapping each rubric item to artifact file names
