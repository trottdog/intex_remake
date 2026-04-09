# Startup Pipeline Audit

## Summary

The .NET API startup pipeline was close, but it was missing several deployment-readiness items needed for the planned Vercel frontend + Azure-hosted API topology. The confirmed gaps were fixed without changing any API route paths or JSON wire contracts.

## Items Audited

- JSON camelCase configuration
- global error handling
- HTTPS redirection
- authentication middleware
- authorization middleware
- CORS configuration
- forwarded headers / proxy awareness
- health endpoint availability
- route mapping order
- environment-based configuration

## Findings And Fixes

- PASS: JSON camelCase was already configured globally through `AddApiContractInfrastructure()`.
- PASS: Global error handling was already in place through `UseApiExceptionHandling()`.
- PASS: HTTPS redirection was already enabled.
- PASS: Authentication middleware was already registered and ordered before authorization.
- PASS: Authorization middleware was already registered and ordered correctly.
- FIXED: No CORS policy existed. Added a named frontend CORS policy in [Program.cs](/Users/natemacbook/Desktop/intex/backend/intex/intex/Program.cs) that:
  - allows configured cross-origin Vercel/frontend origins
  - supports `Authorization` and `Content-Type`
  - supports `GET`, `POST`, `PATCH`, `PUT`, `DELETE`, and `OPTIONS`
  - does not enable cookies/credentials
  - remains open in local development only when appropriate
- FIXED: No forwarded-header/proxy handling existed. Added forwarded header support for `X-Forwarded-For` and `X-Forwarded-Proto`, with trusted proxy/network lists cleared so Azure/App Service-style proxy headers are honored.
- FIXED: Production behavior was under-specified. Added production-only `UseHsts()` and created [appsettings.Production.json](/Users/natemacbook/Desktop/intex/backend/intex/intex/appsettings.Production.json) plus base CORS config in [appsettings.json](/Users/natemacbook/Desktop/intex/backend/intex/intex/appsettings.json).
- FIXED: Development CORS config was missing. Added localhost dev origins in [appsettings.Development.json](/Users/natemacbook/Desktop/intex/backend/intex/intex/appsettings.Development.json) to match the current Vite workflow.
- PASS: The health endpoint was already registered through the controller route `GET /api/healthz` in [HealthController.cs](/Users/natemacbook/Desktop/intex/backend/intex/intex/Controllers/HealthController.cs). No path changes were needed.
- PASS: Route mapping order remains safe. Controllers are mapped after exception handling, HTTPS redirection, CORS, authentication, and authorization.

## Final Pipeline Order

1. `UseForwardedHeaders()`
2. `MapOpenApi()` in Development only
3. `UseHsts()` in Production only
4. `UseApiExceptionHandling()`
5. `UseHttpsRedirection()`
6. `UseCors("FrontendCors")`
7. `UseAuthentication()`
8. `UseAuthorization()`
9. `MapControllers()`

## Configuration Notes

- Cross-origin deployments should set either:
  - `Cors:AllowedOrigins` in config, or
  - `CORS_ALLOWED_ORIGINS` as a comma-separated environment variable
- Same-origin deployments still work with no production CORS origins configured.
- The startup fixes preserve current route paths and response shapes.
