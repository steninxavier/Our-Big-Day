# Our Big Day

Our Big Day is a TypeScript modular monolith for collaborative wedding planning.
It serves three deliberately separate surfaces from a single Next.js application:

- an authenticated wedding-member dashboard;
- public wedding websites addressed by a stable slug; and
- token-protected guest invitations and galleries, with no guest account.

## Architecture

The structure follows the system, database, and API design documents in `docs/`.
`src/app` is limited to UI routes and thin HTTP route handlers. `src/modules`
owns domain-specific schemas, models, repositories, and services. `src/server`
contains cross-cutting adapters such as MongoDB, authentication, email, storage,
and vendor discovery.

```text
src/
  app/                 Next.js pages, layouts, and REST route handlers
  modules/             Domain modules; no module reaches into another's model
  server/              Infrastructure and cross-cutting server-only utilities
  shared/              Transport, error, and general-purpose utilities
```

The initial working vertical slice is authentication: signup, login, logout,
current-user lookup, and persistent server-side sessions. Wedding creation is
represented by its module boundary and request schema, ready for its atomic
wedding-plus-membership transaction.

## Local setup

1. Copy `.env.example` to `.env.local` and provide `MONGODB_URI`.
2. Install packages with `npm install`.
3. Start the development server with `npm run dev`.

Before enabling email, R2 uploads, Google Places, or cron jobs, provide the
corresponding values in `.env.local`. No secrets are exposed to the browser.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Run the Next.js development server. |
| `npm run typecheck` | Check TypeScript without producing output. |
| `npm run lint` | Run the Next.js ESLint rules. |
| `npm run build` | Create a production build. |

## Domain boundaries

`auth`, `weddings`, `members`, `events`, `tasks`, `guests`, `expenses`,
`vendors`, `website`, `photos`, and `email` map directly to the documented
modules. Each module should keep external request validation in `schemas.ts`,
database representation in `model.ts`, persistence queries in `repository.ts`,
and workflows/business rules in `service.ts`.
