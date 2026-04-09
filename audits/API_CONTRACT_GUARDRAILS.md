# API Contract Guardrails

## Core Rules

- All API routes must remain under `/api`.
- All JSON must serialize using camelCase keys.
- Do not return ASP.NET `ProblemDetails`.
- All API errors must use:
  - `{ "error": "<string>" }`
- DELETE endpoints must return `204 No Content` with no response body.

## Response Shapes

- Standard paginated list responses must be:

```json
{
  "data": [],
  "total": 0,
  "pagination": {
    "total": 0,
    "page": 1,
    "limit": 20,
    "totalPages": 0
  }
}
```

- Standard message responses should use:

```json
{ "message": "..." }
```

- Single-resource endpoints should generally return the resource directly unless a documented exception says otherwise.

## Validation And Errors

- Controllers must not rely on default ASP.NET model validation responses.
- Validation failures must return `400` with `{ error: "..." }`.
- Authorization failures must return `401` or `403` with the same `{ error: "..." }` shape.
- Unhandled errors should be formatted through the shared exception pipeline, not by leaking framework defaults.

## Pagination

- Shared pagination logic must support both `limit` and `pageSize` where the frontend expects that behavior.
- `pageSize` takes precedence over `limit` when both are provided.
- Invalid or missing page/limit values should fall back to route defaults rather than throwing framework-generated errors.
- Controller-specific exceptions still apply:
  - some routes use non-paginated envelopes
  - some routes intentionally accept only `pageSize`

## Persistence And Serialization Expectations

- PostgreSQL text-backed date fields must remain strings through the persistence and API layers unless a documented exception exists.
- PostgreSQL numeric values must reach the frontend as JSON numbers, not strings.
- Preserve compatibility field names exactly as documented by the frontend contract, even when awkward or duplicated.

## Reuse Guidance

- Controllers should reuse the shared response contracts and pagination helpers instead of hand-rolling envelopes.
- Application/service code should throw application-level exceptions when a controlled `{ error }` response is required.
- Keep domain-specific controller behavior on top of the shared API infrastructure rather than duplicating formatting logic in each endpoint.
