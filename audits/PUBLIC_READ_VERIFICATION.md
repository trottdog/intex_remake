Public read-only endpoint verification notes

- `GET /api/dashboard/public-impact`
  - Public route at `/api/dashboard/public-impact`
  - Returns documented numeric fields as JSON numbers: `residentsServedTotal`, `totalDonationsRaised`, `reintegrationCount`, `safehouseCount`, `programAreasActive`
  - Includes `recentSnapshots` from the last 3 published snapshots only
  - Includes 3 hardcoded `milestones`
  - Also includes compatibility aliases currently tolerated by the handwritten frontend: `totalResidentsServed`, `totalFundsRaised`, `activeResidents`, `donorsCount`

- `GET /api/impact-snapshots`
  - Public route at `/api/impact-snapshots`
  - Filters to `isPublished = true` regardless of any `published` query param
  - Returns the shared list envelope: `{ data, total, pagination }`
  - Supports `page`, `limit`, and `pageSize`
  - Includes both `safehousesCovered` and the compatibility alias `safehousetsCovered`

- `GET /api/impact-snapshots/:id`
  - Public route at `/api/impact-snapshots/:id`
  - Returns `404` with `{ error: "Impact snapshot not found" }` when the row is missing or unpublished

- Build verification
  - Run `dotnet build` in `/Users/natemacbook/Desktop/intex/backend/intex/intex`
