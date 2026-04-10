The page can be found here: https://intex.trottdog.com/C

Frontend changes which are pushed to the repository will be visible on the site instantly.

Backend changes will need to be deployed to the server before they are visible on the site.

Frontend app: React 19 + Vite 7 + TypeScript + Tailwind CSS 4, with TanStack Query, Radix UI, React Hook Form, Zod, Wouter, and Framer Motion (Deployed in Vercel)

JS/TS workspace tooling: pnpm monorepo + TypeScript

Node API service (also present): Express 5 + TypeScript + Drizzle ORM + pg + JWT + bcrypt + pino

.NET backend service: ASP.NET Core Web API on .NET 10, JWT auth, EF Core, PostgreSQL via Npgsql, OpenAPI

Database: PostgreSQL (used by both Node and .NET backend paths. Deployed in Supabase)

ML pipeline: Python with pandas, numpy, scikit-learn, matplotlib, psycopg, pytest

Frontend hosting/deploy behavior: frontend appears Vercel/static, backend deploy is separate

## Run Locally (Windows)

1. Backend (.NET API):
	- `cd backend/intex/intex`
	- `dotnet run --launch-profile https`

2. Frontend (Vite):
	- `cd Asset-Manager`
	- `corepack pnpm install`
	- `corepack pnpm --filter @workspace/beacon dev`

3. Open:
	- Frontend: http://127.0.0.1:5173
	- Backend: https://localhost:7194