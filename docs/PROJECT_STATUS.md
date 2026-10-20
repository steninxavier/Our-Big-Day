# Our Big Day — Project Status

> Last updated: 2026-10-20
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
- The sign-in and sign-up pages use the same original AI-generated kasavu still-life image as a full-bleed desktop cover, stored locally in `public/login-kasavu-editorial.png`. The cover remains hidden on smaller screens; authentication behavior is unchanged.
- On 2026-10-18, the shared cover layout passed type checking, lint, a production build, and 11 focused page tests with mocked authentication. The covers' visual appearance has not yet been checked in a live browser.
- Client-side email and password validation, plus matching server-side Zod validation. Passwords over bcrypt's 72 UTF-8-byte limit are rejected before hashing.
- Password visibility control, pending state, accessible field errors, and API error feedback.
- Valid sign-in submissions call `POST /api/auth/login`, then direct Couples with a Wedding to `/dashboard` and new Couples to `/onboarding`.
- Responsive design: the focused sign-in card is retained on mobile and the editorial panel is displayed on larger screens.
- Sign-in and sign-up use a shared homepage-style header with the Our Big Day logo and account navigation. The logo links home, and switching between account pages retains a valid member-invitation return path.
- The authentication header change passed type checking, lint, a production build, and 11 focused page tests on 2026-10-18. The tests passed with a thread worker after the fork worker timed out twice; they use mocked authentication. Live browser appearance has not been verified; a local login request timed out while the machine was under load.
- Dedicated sign-up page at `/signup`, with name, email, password, and password-confirmation validation.
- Valid sign-up submissions call `POST /api/auth/signup`, which creates the account and its server-side session before routing the new Couple to `/onboarding`.
- Server-rendered route protection checks the database-backed session on every relevant page: unauthenticated requests to `/dashboard` redirect to `/login`, while signed-in Couples requesting `/login` or `/signup` redirect to `/dashboard`.
- The dashboard now displays the signed-in Couple's first name and has a sign-out control. Logout clears browser cookies even when a session is missing or stale.

### Wedding Member invitations

- Role selection now supports Admin, Manager, and Event Coordinator invitations. The selected role is stored with the invitation and used when it is accepted; only an Admin can invite. Admins and Managers can view the member directory; coordinators cannot view it or pending invitations.
- Event Coordinators can access events explicitly assigned to their membership and have read-only access to tasks for those active events. Role changes remain unimplemented.

- Wedding ADMINs can invite a partner or other trusted person with a selected role from the Wedding members page. A pending invitation uses a random token stored as an HMAC hash and expires after seven days; only one pending invitation per wedding and email is allowed by a partial unique index.
- Invitations use the Resend email boundary. On a delivery error, the app attempts to revoke the pending invitation so it can be retried; if the database is unavailable, cleanup may require attention. Expired invitations are revoked when an admin sends a replacement.
- A recipient can open the member invitation, sign in or sign up with the invited email, and return to accept it. Acceptance checks the email and one-wedding-per-user rule, then creates membership and marks the invitation accepted in one MongoDB transaction.
- Sign-in and sign-up prefill the email from a validated, pending member invitation when following its return link; the field remains editable, and acceptance still checks the signed-in account against the invited address. Invalid, expired, or revoked invitations do not supply a prefill. The address is not added to the URL, and existing no-store/no-referrer protection remains in place.
- On 2026-10-18, typecheck and lint passed, and 18 focused invitation and authentication-page tests passed with mocked persistence and network. A production build was started; live invitation and browser prefill have not yet been verified.
- Mutation endpoints require the configured application origin. Invitation responses and pages use no-store/no-referrer headers; development request logging excludes invitation URLs and auth return URLs. Deployment infrastructure and email-provider tracking must also avoid logging or exposing bearer links.
- `APP_URL`, `RESEND_API_KEY`, `EMAIL_FROM`, and a stable random `MEMBER_INVITATION_SECRET` of at least 32 bytes are required. `APP_URL` must be a recipient-accessible HTTPS origin outside local development. Never commit secrets or expose them to the browser.
- The authenticated dashboard header links to Wedding members. The directory shows actual wedding members and their roles, with the current user first. ADMINs can also see unexpired pending invitations; MANAGERs cannot access that list. Both directory endpoints resolve the wedding from the authenticated user's server-side membership.
- The shared dashboard header and Wedding members screen follow the existing brand logo, ivory and indigo palette, Playfair headings, rounded primary button, and onboarding-inspired form and card styling. This presentation update does not change membership or invitation permissions.
- The sign-out, send-invitation, and accept-invitation actions share the rounded indigo button treatment, hover and focus states, and pointer cursor. The header button uses a compact size, while invitation actions have a comfortable 46px minimum height; pending actions retain a wait cursor.
- Admins can remove a membership or revoke a pending invitation from the member page after confirmation. Removal keeps the user's login account and session but removes wedding membership; the last Admin cannot be removed. Revocation retains the invitation as REVOKED and releases its pending-email constraint. Both operations enforce the server-derived wedding scope and Admin role in a MongoDB transaction. A wedding revision write serializes these management operations, protecting the last-Admin check. Invitation revocation and acceptance both update the same invitation, so their transactions conflict rather than both committing. Existing-member role changes remain future work. This is a member-management invitation, not a guest RSVP invitation.

### Wedding dashboard presentation

- A shared dashboard shell places Dashboard, Wedding events, Tasks, and (for Admins and Managers) Wedding members in a left sidebar on desktop. On mobile, the same navigation and sign-out action are available through an expandable menu. Each section retains its own protected URL, existing server-side role checks, and current-page indicator; this is a presentation change, not an authorization mechanism.
- On 2026-10-19, typecheck, lint, and production build passed. Fifteen focused navigation and existing page tests passed with mocked data, including coordinator menu visibility, current-page indication, and mobile menu state. An initial test run timed out starting workers; the retry passed after the build finished. Browser inspection timed out, so signed-in desktop/mobile visual and interactive navigation checks remain unverified. The local health endpoint responded but took over five seconds during concurrent checks; the reported loading issue is not yet diagnosed.
- The dashboard layout is based on the private Stitch collaborative dashboard, with a responsive welcome panel, overview cards, planning sections, and a wedding-team summary. It displays the authenticated user's name and role and the wedding's actual names and date.
- Admins and Managers see the actual member summary; only Admins see a count of unexpired pending invitations. Coordinators do not query or see either and instead see their assigned events. All member information is obtained through existing server-side authorization checks.
- The dashboard displays actual upcoming events and assigned coordinator events and links to the tasks page. Admins and Managers also see actual guest-party counts, capacity, saved RSVP attendance and recorded expense totals; task counts and upcoming-task summaries and the countdown remain placeholders. Wedding data requires a working database connection.
- The dashboard footer uses the existing brand mark and a responsive navigation section. Wedding member navigation is shown only to Admins and Managers, matching the header; the footer does not change access controls.
- The footer update passed typecheck, lint, production build, and 11 mocked dashboard/page tests on 2026-10-18. Signed-in desktop and mobile visual checks remain outstanding.
- On 2026-10-18, `npm run typecheck`, `npm run lint`, and `npm run build` passed; the focused page suite passed 10 tests with mocked membership data, including Admin, Manager, and Event Coordinator views. The first build and test attempts encountered Windows sandbox `spawn EPERM` and passed on retry outside the sandbox. Later live server-rendered checks verified role-specific event names against Atlas; desktop/mobile browser appearance remains unverified.

### Wedding events

- Admins and Managers can create, edit and archive events at `/dashboard/events`, including assigning existing Event Coordinator memberships. Coordinators see only events assigned to them. Event operations derive the wedding from the signed-in user's current membership; coordinator IDs are checked against that wedding and role.
- The event form supports event type, name, start/end, venue, address, description and dress code. Entry uses the device's local time zone; lists display times in the wedding's configured time zone. Cover images are deferred pending private storage. Archive hides events instead of permanently deleting them.
- Event operations require Atlas. The current implementation has no event pagination or restoration interface. Permission changes and event mutations have not been tested under concurrent membership removal; coordinator-assignment and mutation races need further hardening before production. Full interactive desktop and mobile browser flows remain unverified.
- On 2026-10-18, a controlled live Atlas and local-server run passed 33 checks, using directly seeded disposable users, memberships, weddings and sessions. It covered Admin and Manager create/list/archive, Manager edit and coordinator reassignment, direct-event authorization, cross-wedding isolation, coordinator mutation denial, assignment and date validation, server-rendered dashboard visibility, and retained-but-hidden archived events. The synthetic records and their events were deleted and verified absent. This did not exercise account creation, member invitation, or interactive browser flows.
- On 2026-10-18, the focused event and page suites passed 23 tests in four files with mocked persistence and network, including five new interface tests covering event details and time zone, coordinator controls, required date validation, form submission and assignment, edit error handling, and archive confirmation. Typecheck also passed after adding those tests. The new test file's lint check did not finish; lint and the production build passed on the earlier implementation run. Windows blocked test workers with `spawn EPERM` or startup timeouts in some attempts; the focused suites passed outside the sandbox using a single worker.

### Wedding tasks

- The Stitch-inspired `/dashboard/tasks` page and task APIs implement creation, editing, deletion, filtering, pagination, and All / My / Completed views. Task assignments and event links are validated against the server-derived wedding. Admins and Managers can manage tasks; Event Coordinators are read-only and see only tasks for their assigned active events. The UI does not expose a member directory to coordinators.
- Due dates are entered as calendar dates in the wedding time zone and stored as UTC instants. Existing archived-event and removed-member references are retained on edit, or can be cleared. The design's sample role simulator and fabricated statistics are not production features. Dashboard summary cards remain placeholders.
- Task edits include the revision loaded by the editor; the server atomically rejects stale writes with 409 while keeping the unsaved draft, and existing tasks without a revision are treated as version zero. An out-of-range task list page returns to the last available page with filters preserved. Typecheck, lint, and the production build passed, and 13 focused schema, service and UI tests passed across two runs with mocked persistence and network. An initial combined run's UI worker timed out while the build was running; the focused retry passed. Live Atlas concurrent edits and interactive browser pagination have not been verified. Restart a running dev server after the schema change so its cached Mongoose model picks up the revision field; refresh any open task editor.
- On 2026-10-19, typecheck, lint, and the final production build passed, and eight focused task schema, service-authorization and component tests passed using mocked persistence and network. The first sandbox test run encountered `spawn EPERM`; an elevated thread-worker retry passed. A sandbox build compiled but its TypeScript worker hit `spawn EPERM`; the final elevated build passed. The local health endpoint returned 200, the signed-out task page redirected to login, and the signed-out task API returned 401.
- Full interactive browser checks, live Atlas task flows, and concurrent permission or association changes have not been verified; the existing event-authorization race limitation also applies to coordinator task reads. Do not treat this feature as production-ready.

### Wedding expenses

- A Stitch-inspired expense tracker provides Admins and Managers with `/dashboard/expenses`, expense creation, editing, deletion, category and event filtering, date-range filtering, recorded totals, and category totals. Amounts are stored as integer INR paise. The server derives the wedding and authorizes each operation; Event Coordinators cannot access expense pages or APIs. Edits use a revision to reject stale changes. The responsive table shows aligned columns on desktop and labelled records on mobile.
- The PRD remains unchanged: budget limits, variance, installment tracking and payment-status calculations are not implemented. Vendor linking and vendor filtering are deferred until the vendor feature exists. Live Atlas CRUD, interactive browser behavior and desktop/mobile visual fidelity have not yet been verified.
- On 2026-10-20, expense editors were changed to fetch the latest record on opening and refresh the list after a conflict while preserving the unsaved draft. Archived events retain their names and remain available in expense filters; they may be retained on existing expenses but cannot be newly linked. Typecheck, lint and production build passed, and eleven focused expense validation, authorization, conflict-recovery and interface tests passed with mocked persistence and network. The sandboxed build compiled but its TypeScript worker was blocked by `spawn EPERM`; the outside-sandbox retry passed. Live Atlas and interactive browser verification remain outstanding.
- Earlier verification of the expense increment was incomplete: a type-name collision was corrected, a concurrent build interruption left generated types missing, and several checks stalled or encountered sandbox `spawn EPERM`. See the later verification note above for current results.

### My Vendors

- Admins and Managers can use the Stitch-inspired `/dashboard/vendors` directory to create, view, edit, search, filter, and archive private vendor records. Event Coordinators are blocked from the page and its APIs, and the dashboard navigation and summary use the same role boundary.
- Each Vendor belongs to the server-derived Wedding and supports the PRD fields: name, category, contact person, phone, email, address, website, optional agreed INR cost, related events, and notes. Values are validated with Zod at the API boundary; money is stored as integer paise. Related events must be active and belong to the same Wedding, although an archived event may be retained on an existing vendor for historical clarity.
- Deleting a vendor archives it rather than removing it, preserving the historical relationship for expenses. Vendor edits use revisions and return `409 CONFLICT` for stale drafts. The editor fetches the current record before opening and retains an unsaved draft if a conflict occurs.
- Expense records now optionally link to an active same-Wedding vendor. The expense screen supports vendor filtering, displays the linked vendor, and preserves an existing archived vendor link while preventing a newly archived vendor from being selected.
- The dashboard shows actual active-vendor and category counts to Admins and Managers. Vendor discovery, Google Places configuration, discovery-to-vendor conversion, marketplace activity, payment schedules, and payment processing remain unimplemented.
- On 2026-10-20, typecheck passed; ESLint completed for `src` and `tests`; five focused vendor service/schema tests, two vendor interface tests, and eleven expense regression tests passed with mocked persistence and network. The production build compiled and generated current route artifacts, but the terminal runner did not return a final exit status, so it remains formally unverified. Live Atlas CRUD, signed-in browser interaction, and visual comparison against Stitch remain outstanding.

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
- The dashboard displays the current Couple's wedding identity, upcoming events, guest-party totals, saved RSVP attendance, recorded expense totals, and active vendor/category counts for permitted roles. Task counts and upcoming-task summaries remain placeholders.

### Guest management

- Guest list management is implemented for Admins and Managers; Event Coordinators cannot access the page or guest APIs. The dashboard sidebar and guest summary observe the same role boundary. Each party has a name, optional email and phone, maximum attendees, selected events, and notes. Search, event and read-only RSVP filters, pagination, and add/edit/delete are available. Wedding ownership and event associations are checked on the server, and edits use a revision to reject stale drafts.
- The guest management screen follows the Stitch layout and uses actual data rather than sample figures. New guest parties start with a pending RSVP. Guest counts are party counts and total allowed capacity, not a count of invitations sent.
- Guest rows separate aligned party details from compact, consistently styled actions; email and sharing feedback wraps beneath the action controls. The layout adapts to the guest list's available width. This is a presentation change only. Typecheck and lint passed; the production build compiled but its TypeScript subprocess was blocked by `spawn EPERM`. The guest test run was stopped after taking several minutes without completing. The local browser timed out, so desktop and mobile appearance still needs verification.
- Admins and Managers can generate a stable, party-specific invitation link from the guest list, copy it, share via the device's share sheet when available, or open WhatsApp. Guests can view only active events invited to and submit or change their RSVP without an account. Saving a party or copying a link sends no email and does not mark delivery. Guest imports are not implemented.
- Admins and Managers can individually send and resend a guest invitation email, or send a manual reminder while that party's RSVP is pending. The action confirms the saved address, uses the stable private RSVP link, and records provider acceptance time rather than claiming delivery. An email address, Resend configuration and an externally reachable HTTPS APP_URL are required. A short guest-scoped lock prevents concurrent sends; address changes and deletion are blocked during the lock, and changing the address clears the previous email status. Bulk sending, scheduled reminders, delivery tracking, and real provider delivery verification remain outstanding.
- Email delivery remains subject to provider/network uncertainty: if acceptance cannot be recorded, or the browser loses the response, the UI advises checking with the guest before retrying. The guest list displays “no email acceptance recorded” rather than asserting that no email was sent. The two-minute lock expires after crashes and does not eliminate every race; an RSVP or membership may change while a provider request is in flight. No real emails were sent during automated verification. Signed-in browser behavior and real Resend/Atlas delivery remain unverified.
- On 2026-10-19, the guest suite passed 40 mocked tests with one opt-in live test skipped using Vitest's native config loader; typecheck and lint passed. The production build compiled but its TypeScript subprocess was blocked by sandbox `spawn EPERM`; a build passed before the latest UI error-message change. The local health endpoint timed out under load. APP_URL was configured to localhost, so the app intentionally refuses guest email sending until a recipient-accessible HTTPS address is configured.
- Valid guest invitation pages include a shared, AI-generated decorative wedding image. It is not a couple-specific upload and is not used as a link-preview image. Typecheck, lint, production build and two focused RSVP form tests passed; desktop and mobile appearance have not yet been verified in a browser.
- Guest links use a random 32-byte bearer secret stored with `select: false` and a unique partial index, consistent with the accepted stable-link exception in the source designs. Existing guests receive a token atomically on first sharing. Anyone holding a link can view and edit that party's RSVP; no standalone rotation/revocation is implemented, although deleting the guest invalidates it. Guest data and RSVP edits use the same revision and attendance capacity guards. RSVP submission is limited using MongoDB counters keyed with an HMAC derived from the existing `MEMBER_INVITATION_SECRET`; its random value must be at least 32 bytes.
- `APP_URL` must be a publicly reachable HTTPS origin for WhatsApp recipients; localhost links work only on this computer. Sensitive paths use no-store, no-referrer and noindex headers and are excluded from Next development request logs. Hosting and proxy logs must also redact guest bearer URLs. Guest-facing access does not use an account or a secondary challenge, and link-preview services may view the invitation.
- On 2026-10-19, typecheck, lint and the production build passed. Twenty-four focused mocked guest validation/authorization, dashboard, navigation and guest form tests passed. The unauthenticated guest page redirected to login and the guest API returned 401. These checks do not establish live Atlas guest CRUD, interactive signed-in browser behavior, or mobile visual fidelity; those remain unverified. A sandboxed Vitest attempt encountered `spawn EPERM` and the test retry passed outside the sandbox.
- On 2026-10-19, the invitation/RSVP increment passed typecheck, lint and production build. Fifteen focused RSVP validation, token boundary, rate-limit, request-size and UI tests passed using mocked persistence and network; the wider guest/dashboard suite passed 37 tests with the opt-in live test skipped. A separate live Atlas service test created disposable wedding, member, guest and event records, checked stable links, event isolation, capacity, RSVP persistence and stale-edit rejection, and verified that its exact records were removed. The rate limiter was mocked in that live test. Invalid public invitation and signed-out link-generation API requests returned 404 and 401 respectively. Actual WhatsApp/device sharing, signed-in browser interaction, public HTTPS deployment, and real rate-limit behavior against Atlas remain unverified.

### Product domains

- Existing-member role changes, bulk guest invitation delivery and scheduled reminders, vendor discovery, public wedding sites, gallery, QR uploads, bulk email jobs, and storage-provider integration remain planned rather than completed features.
- Guest-facing flows must remain scoped capability links. Guests do not create Couple accounts.

### Production readiness

- Re-run controlled live sign-up, sign-in, wedding creation, and cleanup verification after an Atlas network/configuration change and before release. The live run verifies HTTP cookie behavior and database transactions; it does not replace a future interactive-browser release check.
- Add authentication rate limiting and Origin/Host checks.
- Use a dummy hash for unknown-user login attempts to reduce timing differences.
- Resolve the documented raw-versus-hashed gallery-token rule before implementing gallery access.
- Confirm whether the pilot's 4 GB storage quota is platform-wide, per wedding, or per event.
- Do not treat the project as production ready until the security and operational requirements in the design documents are implemented and tested.

## Immediate next milestone

Verify task, invitation and event flows with controlled accounts on Atlas and in interactive browsers, including coordinator isolation, assignment changes, membership removal, and transaction races. Harden concurrent event and task authorization before production. Existing-member role changes remain to be implemented; any future role-change operation must use the same wedding revision lock to preserve the last-Admin invariant.

## Repository hygiene

- Commit only requested, reviewed work; verify the exact staged diff before pushing.
- Keep the Stitch design reference image local and untracked. It is not a production asset and should not be added to Git unless the user explicitly changes this decision.
- Preserve the generated Next.js instruction block in `AGENTS.md`.
- Update this status document after material implementation, validation, or architecture changes.
