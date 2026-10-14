# Our Big Day — Project Status

> Last updated: 2026-10-14
> Purpose: an honest implementation snapshot. This document distinguishes working code from planned product scope and should be updated after each material milestone.

## Current phase

The project is in **foundation, Couple authentication, and first-wedding onboarding** work. The marketing homepage, Couple sign-in and sign-up interfaces, session routing, and first-wedding onboarding are implemented. The database-backed onboarding transaction still needs a successful live Atlas verification.

## Source of truth

- [Product requirements](./PRD.md) define product behavior and release phases.
- [System design](./SYSTEM_DESIGN.md) defines the modular-monolith, tenancy, authentication, storage, and security decisions.
- [API design](./API_DESIGN.md) defines HTTP contracts and error responses.
- [Database design](./DATABASE_DESIGN.md) defines collections, indexes, ownership, and tenant isolation.

When implementation and these documents disagree, pause and resolve the difference before extending the feature.

## Implemented

### Application foundation

- Next.js 16.4 App Router application with TypeScript.
- Modular boundaries under `src/app`, `src/modules`, `src/server`, and `src/shared`.
- Mongoose models and server-side session-cookie foundation.
- Zod request validation and consistent JSON error responses.
- Health endpoint at `GET /api/health`.

### Homepage and brand

- Premium Kerala-inspired marketing homepage at `/`.
- Shared visual system: coconut ivory, midnight indigo, restrained kasavu gold, Playfair Display, and Plus Jakarta Sans.
- Professional OB monogram and matching SVG favicon.
- The homepage header “Start planning” CTA retains white text on hover and keyboard focus.
- Homepage source was committed and pushed as `7a5e8df` (`feat: implement wedding planning homepage`).

### Authentication API foundation

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- Server-side sessions and HTTP-only session-cookie handling.

### First-wedding onboarding

- Protected `/onboarding` page for authenticated Couples who do not yet have a Wedding membership.
- Required, accessible onboarding fields follow the PRD: bride name, groom name, wedding date, location/city, and an explicit wedding time zone. Wedding title and description are optional.
- `POST /api/wedding` parses the request with Zod, derives the current user from the server-side session, and never accepts a client-provided `weddingId`.
- Wedding creation uses a MongoDB transaction to create the Wedding and its initial `ADMIN` membership together.
- The server generates the stable website slug and hashes the opaque gallery token before storage; raw gallery credentials are never returned.
- New Couples are sent directly to onboarding after sign-up or sign-in. Direct dashboard requests from Couples without a Wedding redirect to onboarding; Couples who already have a Wedding are redirected from onboarding to the dashboard.
- Cover-image upload is intentionally deferred until the private storage/upload feature exists; the form states this explicitly rather than collecting an unusable file.

### Couple authentication interfaces

- Stitch-inspired sign-in page at `/login`.
- Client-side email and password validation, plus matching server-side Zod validation. Passwords over bcrypt's 72 UTF-8-byte limit are rejected before hashing.
- Password visibility control, pending state, accessible field errors, and API error feedback.
- Valid sign-in submissions call `POST /api/auth/login`, then direct Couples with a Wedding to `/dashboard` and new Couples to `/onboarding`.
- Responsive design: the focused sign-in card is retained on mobile and the editorial panel is displayed on larger screens.
- Dedicated sign-up page at `/signup`, with name, email, password, and password-confirmation validation.
- Valid sign-up submissions call `POST /api/auth/signup`, which creates the account and its server-side session before routing the new Couple to `/onboarding`.
- Server-rendered route protection checks the database-backed session on every relevant page: unauthenticated requests to `/dashboard` redirect to `/login`, while signed-in Couples requesting `/login` or `/signup` redirect to `/dashboard`.
- The dashboard now displays the signed-in Couple's first name and has a sign-out control. Logout clears browser cookies even when a session is missing or stale.

## Verified

The following checks have passed against the current local implementation:

| Check | Result | Notes |
| --- | --- | --- |
| `npm run typecheck` | Pass | TypeScript has no reported errors. |
| `npm run lint` | Pass | ESLint has no reported errors. |
| `npm run build` | Pass | Production build passed when run with the Windows permission Next.js requires to spawn its verification subprocess. `/login`, `/signup`, `/onboarding`, and `/dashboard` are dynamically rendered because they check the session cookie. |
| Homepage and public routes | Pass | `/`, `/login`, `/signup`, `/api/health`, and `/icon.svg` returned successful local responses. |
| Homepage header CTA hover/focus state | Pass | The header “Start planning” CTA keeps white text while its indigo background changes on hover or keyboard focus. |
| Invalid login payload | Pass | The API rejects malformed credentials with `400`. |
| Sign-in validation UI | Pass | Empty and malformed-email submissions show inline errors in the browser. |
| Sign-up validation UI | Pass | Empty submission and mismatched passwords show inline errors in the browser. |
| Sign-up, sign-in, logout, and route protection | Pass | Previously verified in a controlled QA run: a temporary Couple signed up, reached `/dashboard`, was redirected away from `/login` and `/signup`, signed out, was denied dashboard access, signed in again, and signed out again. The QA user and associated sessions were deleted afterwards. This does not verify the current first-wedding transaction, which is blocked by Atlas connectivity. |
| Stale/missing-session logout | Pass | A missing session returns `401` and clears the cookie; a stale token succeeds idempotently and also clears the cookie. |
| Onboarding access guards | Pass | An unauthenticated `/onboarding` request redirects to `/login`, and an unauthenticated `POST /api/wedding` returns `401`. |
| Onboarding typecheck, lint, and production build | Pass | The new `/onboarding` page and `/api/wedding` route compile successfully. |
| Atlas failure handling and retry recovery | Pass | A read-only valid-but-nonexistent login probe returned generic `503 SERVICE_UNAVAILABLE` after the 10-second Atlas selection timeout. A second probe made a fresh 10-second connection attempt, proving a failed connection is not retained in cache. Atlas itself remains unreachable from this network. |

`npm test` currently exits successfully but runs **zero tests**. It is not evidence of functional coverage.

## Known limits and work not yet implemented

### Authentication and onboarding

- Local development now targets the `our_big_day_clients` database. Existing records in the previous default `test` database are not copied automatically; keep them there unless a deliberate migration is requested.
- The successful end-to-end QA check requires a working `.env.local` `MONGODB_URI`. If Atlas networking changes, re-run the controlled test before relying on the flow.
- **Live onboarding transaction verification is pending:** on 2026-10-14, the controlled QA flow stopped when MongoDB Atlas could not connect from this computer. No successful sign-up or Wedding transaction was observed, and the cleanup connection could not be verified until Atlas access is restored. Re-run the controlled QA flow after confirming Atlas Network Access and local network availability.
- Atlas failures now return a generic `503 SERVICE_UNAVAILABLE` response after a 10-second selection timeout. A failed connection is no longer cached, so the running application retries normally once Atlas network access is restored; the actual Atlas allowlist still needs updating before live QA can succeed.
- TOTP MFA, recovery codes, password reset UI, and email verification flows are not implemented.
- The dashboard now displays the current Couple's wedding identity, but its planning summaries remain placeholders until events, tasks, guests, expenses, and vendors are implemented.

### Product domains

- Wedding membership, events, tasks, guests, RSVP, expenses, vendors, public wedding sites, gallery, QR uploads, email jobs, and storage-provider integration remain planned architecture rather than completed features.
- Guest-facing flows must remain scoped capability links. Guests do not create Couple accounts.

### Production readiness

- Add real automated unit, integration, authorization, and end-to-end tests.
- Add authentication rate limiting and Origin/Host checks.
- Use a dummy hash for unknown-user login attempts to reduce timing differences.
- Resolve the documented raw-versus-hashed gallery-token rule before implementing gallery access.
- Confirm whether the pilot's 4 GB storage quota is platform-wide, per wedding, or per event.
- Do not treat the project as production ready until the security and operational requirements in the design documents are implemented and tested.

## Immediate next milestone

After live Atlas verification succeeds, build **Wedding Member invitations** for the initial ADMIN:

1. Let the ADMIN invite a partner or family member by email with a scoped `MANAGER` role.
2. Store a hashed, expiring invitation token and send it through the planned email boundary.
3. Preserve the V1 one-wedding-per-user constraint when an invitation is accepted.
4. Add the first dashboard shell summaries after the Wedding context has been live-verified.

This follows wedding creation in the PRD primary journey and Phase 1 foundation scope.

## Repository hygiene

- Commit only requested, reviewed work; verify the exact staged diff before pushing.
- Keep the Stitch design reference image local and untracked. It is not a production asset and should not be added to Git unless the user explicitly changes this decision.
- Preserve the generated Next.js instruction block in `AGENTS.md`.
- Update this status document after material implementation, validation, or architecture changes.
