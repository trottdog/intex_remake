# Final Compatibility Checklist

## JSON Shape

- PASS: Shared JSON serialization is configured for camelCase in MVC, HTTP JSON, and controller output.
- PASS: Shared error responses use `{ "error": "..." }` via the custom exception middleware, auth challenge/forbidden handlers, and explicit controller validation responses.
- PASS: ASP.NET client error mapping to `ProblemDetails` is suppressed with `SuppressMapClientErrors = true`.
- PASS: No controller actions were found returning `ProblemDetails`, `ValidationProblem`, or `Results.Problem`.
- PASS: Known compatibility aliases that the frontend still depends on are preserved with explicit JSON property mappings.

## Numeric Serialization

- PASS: Money, scores, rates, and percentage fields in persistence and response contracts remain `decimal` and will serialize as JSON numbers.
- PASS: No confirmed `double`/`float` response-contract drift was found in the API surface that would change numeric wire behavior.

## Date Field Fidelity

- PASS: SQL text-backed date fields in persistence remain mapped as `string` for fields such as `admissionDate`, `dischargeDate`, `donationDate`, `sessionDate`, `visitDate`, `scheduledDate`, `completedDate`, `incidentDate`, `recordDate`, `postDate`, and similar text-date columns.
- PASS: Timestamp-backed fields such as `createdAt`, `updatedAt`, `publishedAt`, `predictedAt`, `receivedAt`, and `lastLogin` remain timestamp types and serialize as ISO-8601 strings.
- PASS: No confirmed persistence drift was found where a PostgreSQL text date column was typed as `DateTime`/`DateTimeOffset`.

## Delete Behavior

- PASS: All implemented `DELETE` endpoints return `204 No Content`.
- PASS: No implemented `DELETE` endpoint was found returning a JSON body.

## Auth Outcomes

- PASS: Bearer-token auth remains token-only, with no cookie or refresh-token behavior.
- PASS: `401` responses are formatted as `{ "error": "..." }` from the JWT challenge handler.
- PASS: `403` responses are formatted as `{ "error": "Insufficient permissions" }` from the JWT forbidden handler.
- PASS: `/api/auth/me` remains optional-auth and can return `{ "user": null }` when unauthenticated.
- PASS: Live `isActive` validation remains enforced during authenticated JWT requests.
- PASS: The forbidden path now clears the response before writing JSON, reducing the risk of mixed/default framework output.

## Route Ordering

- PASS: `GET /api/social-media-posts/analytics` is declared before `GET /api/social-media-posts/{id}`.
- PASS: `GET /api/residents/stats` and `GET /api/residents/{id}/timeline` are declared before `GET /api/residents/{id}`.
- PASS: `GET /api/safehouses/{id}/metrics` is declared before `GET /api/safehouses/{id}`.
- PASS: `publish` and `unpublish` impact-snapshot routes are not blocked by the `:id` detail route because they use an additional path segment.
- PASS: Other potentially ambiguous routes use `:int` constraints, reducing accidental route capture risk.

## Result

- PASS: No confirmed frontend-breaking wire-contract drift remains from this anti-drift pass.
- PASS: The only changes made in this pass were compatibility hardening changes that reduce the chance of framework-generated output leaking into the API contract.
