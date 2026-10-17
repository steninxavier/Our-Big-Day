# Our Big Day — Project Status

> Last updated: 2026-10-17
> Purpose: an honest implementation snapshot. This document distinguishes working code from planned product scope and should be updated after each material milestone.

## Current phase

The project is in **foundation, Couple authentication, and first-wedding onboarding** work. The marketing homepage, Couple sign-in and sign-up interfaces, session routing, and first-wedding onboarding are implemented. The database-backed onboarding transaction and session lifecycle have now passed a controlled live Atlas verification.

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
- The homepage header checks the server-side session: signed-in Couples with a Wedding see “Go to wedding”; those without one see “Complete wedding setup”. Signed-out visitors retain the sign-in and sign-up links. If session lookup is temporarily unavailable, the header offers a neutral “Your account” link.
- Homepage source was committed and pushed as `7a5e8df` (`feat: implement wedding planning homepage`).

### Authentication API foundation

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- Server-side sessions and HTTP-only session-cookie handling.

### First-wedding onboarding

- The desktop and mobile Create Wedding Space references in the private Stitch project have been translated into the onboarding presentation while preserving the working form contract and accessibility behavior.
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

### Wedding Member invitations

- Role selection now supports Admin, Manager, and Event Coordinator invitations. The selected role is stored with the invitation and used when it is accepted; only an Admin can invite. Admins and Managers can view the member directory; coordinators cannot view it or pending invitations.
- Event Coordinators currently have no access to events: events, tasks, and explicit coordinator assignment are not implemented. Future event/task endpoints must enforce assigned-event-only access server-side, including cross-wedding isolation. Role changes remain unimplemented.

- Wedding ADMINs can invite a partner or other trusted person with a selected role from the Wedding members page. A pending invitation uses a random token stored as an HMAC hash and expires after seven days; only one pending invitation per wedding and email is allowed by a partial unique index.
- Invitations use the Resend email boundary. On a delivery error, the app attempts to revoke the pending invitation so it can be retried; if the database is unavailable, cleanup may require attention. Expired invitations are revoked when an admin sends a replacement.
- A recipient can open the member invitation, sign in or sign up with the invited email, and return to accept it. Acceptance checks the email and one-wedding-per-user rule, then creates membership and marks the invitation accepted in one MongoDB transaction.
- Mutation endpoints require the configured application origin. Invitation responses and pages use no-store/no-referrer headers; development request logging excludes invitation URLs and auth return URLs. Deployment infrastructure and email-provider tracking must also avoid logging or exposing bearer links.
- `APP_URL`, `RESEND_API_KEY`, `EMAIL_FROM`, and a stable random `MEMBER_INVITATION_SECRET` of at least 32 bytes are required. `APP_URL` must be a recipient-accessible HTTPS origin outside local development. Never commit secrets or expose them to the browser.
- The authenticated dashboard header links to Wedding members. The directory shows actual wedding members and their roles, with the current user first. ADMINs can also see unexpired pending invitations; MANAGERs cannot access that list. Both directory endpoints resolve the wedding from the authenticated user's server-side membership.
- The shared dashboard header and Wedding members screen follow the existing brand logo, ivory and indigo palette, Playfair headings, rounded primary button, and onboarding-inspired form and card styling. This presentation update does not change membership or invitation permissions.
- The sign-out, send-invitation, and accept-invitation actions share the rounded indigo button treatment, hover and focus states, and pointer cursor. The header button uses a compact size, while invitation actions have a comfortable 46px minimum height; pending actions retain a wait cursor.
- Admins can remove a membership or revoke a pending invitation from the member page after confirmation. Removal keeps the user's login account and session but removes wedding membership; the last Admin cannot be removed. Revocation retains the invitation as REVOKED and releases its pending-email constraint. Both operations enforce the server-derived wedding scope and Admin role in a MongoDB transaction. A wedding revision write serializes these management operations, protecting the last-Admin check. Invitation revocation and acceptance both update the same invitation, so their transactions conflict rather than both committing. Existing-member role changes remain future work. This is a member-management invitation, not a guest RSVP invitation.

## Verified

The checks below describe earlier verification. After implementing member removal and invitation revocation on 2026-10-17, `npm run typecheck`, `npm run build`, and `npx eslint src tests` passed. The full automated suite passed 111 tests in 19 suites, and the four focused member-management suites passed 21 tests. A later full-workspace `npm run lint -- tests/components/invitation-auth-return.test.tsx` passed after the temporary invitation QA script was removed. MongoDB transaction races, live removal, and live revocation have not yet been verified against Atlas; automated tests use mocked persistence.

| Check | Result | Notes |
| --- | --- | --- |
| `npm run typecheck` | Pass | TypeScript has no reported errors across application and test sources. |
| `npm run lint` | Pass | Full-workspace ESLint completed with no errors or warnings. |
| `npm run build` | Pass | Production build passed on 2026-10-17. The homepage, `/login`, `/signup`, `/onboarding`, and `/dashboard` are dynamically rendered because they check the session cookie. |
| `npm test -- --maxWorkers=1` | Pass | On 2026-10-17, 88 tests passed in 16 suites, including mocked member-directory, authorization, invitation, and UI cases. An earlier run encountered a worker-start timeout; the isolated retry passed. |
| `npm test` and `npm run test:coverage` (2026-10-15) | Pass | At that time, Vitest ran 57 tests in 11 suites, with 100% coverage across 35 application files. This historical measurement predates the homepage header change. The suite uses mocked persistence; it does not replace live Atlas transaction verification. |
| Homepage and public routes | Pass | `/`, `/login`, `/signup`, `/api/health`, and `/icon.svg` returned successful local responses. |
| Homepage header CTA hover/focus state | Pass | The header “Start planning” CTA keeps white text while its indigo background changes on hover or keyboard focus. |
| Signed-out homepage header | Pass | Browser inspection on 2026-10-17 showed the sign-in and start-planning links. The updated signed-in header has not yet been manually verified with a live account. |
| Invalid member invitation | Pass | On 2026-10-17 malformed and expired synthetic invitation API requests returned 404. |
| Local member invitation configuration | Partial | A private invitation secret is configured and Atlas is reachable. The local sender uses a placeholder domain and the application URL is localhost; real email delivery remains unverified. The sending-restricted Resend key cannot list domains. |
| Invitation authentication and acceptance | Partial / issue found | On 2026-10-17, live API tests used disposable accounts, a wedding, and directly seeded invitations; no email was sent. A new recipient accepted as MANAGER, signed out, and signed back in. An existing recipient's EVENT_COORDINATOR invitation was accepted as MANAGER by the running server. Wrong-email, already-member, replay, malformed and expiry checks were rejected. All test records were deleted and verified absent. A separate current-source service test using live Atlas and mocked email passed all three roles, so the running server version must be checked before resolving the mismatch. Full browser-based signup, acceptance, and real email delivery remain unverified. |
| Invitation page presentation | Fix implemented; live visual check pending | The Sign in link now uses the shared indigo primary-button style, including white text and hover and focus states, addressing the previously observed invisible label. A focused mocked component test passed and checks both invitation return links. Typecheck, lint, and production build passed. A live browser check with a valid invitation remains to be repeated. |
| Invitation auth return regression tests | Pass | Two client-component tests verify that successful signup and login route back to the invitation instead of onboarding; the network and router are mocked. |
| Member directory and pending invitations | Mocked pass | Automated service, route, and component tests cover wedding scoping, admin-only pending invitations, the current member's role and ordering, and the empty state. The new directory has not yet been checked with a live signed-in browser and Atlas. |
| Invalid login payload | Pass | The API rejects malformed credentials with `400`. |
| Sign-in validation UI | Pass | Empty and malformed-email submissions show inline errors in the browser. |
| Sign-up validation UI | Pass | Empty submission and mismatched passwords show inline errors in the browser. |
| Live sign-up, onboarding, sign-in, logout, and route protection | Pass | Controlled Atlas QA on 2026-10-15 created a disposable Couple, confirmed the HTTP-only session and pre-wedding state, created exactly one Wedding plus its `ADMIN` membership, rejected a second Wedding with `409 ALREADY_HAS_WEDDING`, verified dashboard/onboarding guards, logged out, signed in again with `hasWedding: true`, then logged out. The exact temporary user, membership, Wedding, and sessions were deleted and verified absent. |
| Stale/missing-session logout | Pass | A missing session returns `401` and clears the cookie; a stale token succeeds idempotently and also clears the cookie. |
| Onboarding access guards | Pass | An unauthenticated `/onboarding` request redirects to `/login`, and an unauthenticated `POST /api/wedding` returns `401`. |
| Onboarding typecheck, lint, and production build | Pass | The new `/onboarding` page and `/api/wedding` route compile successfully. |
| Stitch Create Wedding Space presentation | Pass | The private Stitch desktop/mobile composition has been applied to the protected onboarding UI. It retains the existing field validation, error focus behavior, API payload, and server-side route guards. |
| Current onboarding route smoke check | Pass | While the local dev server was running on 2026-10-15, an unauthenticated `GET /onboarding` returned `307` to `/login`; `GET /api/health` returned `200`. |
| Current unauthenticated-session smoke check | Pass | `GET /api/auth/me` without a session returned the expected `401 UNAUTHENTICATED`. |
| Atlas availability and retry recovery | Pass | Earlier unavailable-Atlas probes returned generic `503 SERVICE_UNAVAILABLE` after the 10-second selection timeout, and a second probe made a fresh connection attempt. On 2026-10-15, a valid nonexistent-login probe returned `401`, proving Atlas was reachable from this network before the live controlled QA run. |

Manual browser inspection confirms the homepage and sign-in page render their headings, navigation, labels, visible controls, and public content. The browser connector did not permit form-click commands against the local dev tab, so browser form interaction is evidenced by the automated client-component suite rather than treated as a manual pass.

## Known limits and work not yet implemented

### Authentication and onboarding

- A subsequent sign-in diagnostic reproduced `500 INTERNAL_ERROR` using a synthetic nonexistent account. The running server logged `MongoServerSelectionError` with a TLS internal-error alert, and a separate read-only Atlas connection attempt failed both inside and outside the sandbox. The underlying Atlas/network cause remains unconfirmed; do not treat this as a bad-password diagnosis or a successful live sign-in check.
- Local development now targets the `our_big_day_clients` database. Existing records in the previous default `test` database are not copied automatically; keep them there unless a deliberate migration is requested.
- The successful end-to-end QA check requires a working `.env.local` `MONGODB_URI`. If Atlas networking changes, re-run the controlled test before relying on the flow.
- **Live onboarding transaction verification passed:** on 2026-10-15, the controlled QA flow successfully created a disposable user, server-side session, Wedding, and initial `ADMIN` membership through Atlas. It also verified the one-Wedding rule, protected-page redirects, logout, and repeat login. Exact cleanup removed the temporary user, membership, Wedding, and sessions, with zero matching records remaining.
- Atlas failures return a generic `503 SERVICE_UNAVAILABLE` response after a 10-second selection timeout. A failed connection is not cached, so the running application retries normally after Atlas network recovery. Atlas was reachable from this computer during the 2026-10-15 QA run; re-run the controlled test after a network or Network Access change.
- TOTP MFA, recovery codes, password reset UI, and email verification flows are not implemented.
- Member invitation code requires a stable `MEMBER_INVITATION_SECRET` in `.env.local`; one has been configured locally. The local sender uses a placeholder domain and the application URL is localhost. Real Resend delivery and a complete interactive-browser invitation journey remain unverified. On 2026-10-17 the running server assigned MANAGER when accepting a synthetic EVENT_COORDINATOR invitation, despite current-source live-Atlas service tests passing all roles with email mocked; verify the running server version and repeat before relying on coordinator permissions. Invitation URLs are bearer secrets and must be redacted by hosting infrastructure.
- The dashboard now displays the current Couple's wedding identity, but its planning summaries remain placeholders until events, tasks, guests, expenses, and vendors are implemented.

### Product domains

- Full wedding member management, events, tasks, guests, RSVP, expenses, vendors, public wedding sites, gallery, QR uploads, bulk email jobs, and storage-provider integration remain planned rather than completed features.
- Guest-facing flows must remain scoped capability links. Guests do not create Couple accounts.

### Production readiness

- Re-run controlled live sign-up, sign-in, wedding creation, and cleanup verification after an Atlas network/configuration change and before release. The live run verifies HTTP cookie behavior and database transactions; it does not replace a future interactive-browser release check.
- Add authentication rate limiting and Origin/Host checks.
- Use a dummy hash for unknown-user login attempts to reduce timing differences.
- Resolve the documented raw-versus-hashed gallery-token rule before implementing gallery access.
- Confirm whether the pilot's 4 GB storage quota is platform-wide, per wedding, or per event.
- Do not treat the project as production ready until the security and operational requirements in the design documents are implemented and tested.

## Immediate next milestone

Verify invitation delivery, acceptance, revocation, and removal with controlled accounts on Atlas, including transaction races. Implement events and event assignment with server-enforced coordinator scoping before treating assigned-event access as complete. Existing-member role changes remain to be implemented; any future role-change operation must use the same wedding revision lock to preserve the last-Admin invariant.

## Repository hygiene

- Commit only requested, reviewed work; verify the exact staged diff before pushing.
- Keep the Stitch design reference image local and untracked. It is not a production asset and should not be added to Git unless the user explicitly changes this decision.
- Preserve the generated Next.js instruction block in `AGENTS.md`.
- Update this status document after material implementation, validation, or architecture changes.
