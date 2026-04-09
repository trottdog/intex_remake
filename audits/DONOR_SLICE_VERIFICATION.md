Donor slice verification notes

- `GET /api/dashboard/donor-summary`
  - donor-only
  - if `supporterId` is null, returns zeroed fields and empty arrays
  - preserves `givingThisYear = lifetimeGiving * 0.35`
  - returns `allocationBreakdown`, `impactCards`, and `mlRecommendations: []`
  - includes `totalGiven` alias for handwritten frontend compatibility

- `GET /api/donations/my-ledger`
  - donor-only
  - scoped strictly to `supporterId`
  - if `supporterId` is null, returns empty paginated list
  - returns `{ data, total, pagination }`

- `GET /api/supporters/me`
  - donor-only
  - returns the linked supporter record
  - numeric supporter fields remain JSON numbers

- `PATCH /api/supporters/me`
  - donor-only
  - only updates `firstName`, `lastName`, `phone`, `organization`, `communicationPreference`
  - ignores unknown fields
  - returns `400 { error: "No fields to update" }` if none of the 5 allowed fields are present

- `GET /api/donation-allocations`
  - donor and staff+ access
  - donor results are filtered to only allocations whose donation belongs to the donor
  - returns `{ data, total }` with no `pagination`

- `GET /api/social-media-posts`
  - implemented for donor and staff+ access to satisfy the current donor portal frontend usage
  - returns `{ data, total, pagination }`
  - supports `page`, `limit`, `pageSize`, `platform`, `postType`
