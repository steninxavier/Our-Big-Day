<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Our Big Day project rules

### Documentation and scope

- Before material work, read `docs/PROJECT_STATUS.md` together with the relevant source design document: `docs/PRD.md`, `docs/SYSTEM_DESIGN.md`, `docs/API_DESIGN.md`, or `docs/DATABASE_DESIGN.md`.
- Treat the source design documents as the product and architecture authority. The status document records the current implementation state; it does not replace those specifications.
- Update `docs/PROJECT_STATUS.md` after a material feature, validation result, architecture decision, or known limitation changes.
- Clearly distinguish verified behavior, placeholders, missing configuration, and untested paths in progress reports and documentation.

### Architecture and security

- Preserve the TypeScript Next.js modular-monolith boundaries: `src/app`, `src/modules`, `src/server`, and `src/shared`.
- Keep request parsing and validation at the API boundary with Zod. Keep route handlers thin and business logic in modules/services.
- Never import server-side authentication, database, session, or secret-bearing code into a Client Component.
- Derive `weddingId` and permissions on the server. Never trust a client-provided tenant identifier.
- Couple authentication is email/password with server-side sessions. TOTP MFA and recovery codes are planned later; guests use scoped invitation, RSVP, QR-upload, or gallery links instead of Couple accounts.
- Keep private storage private and preserve the `StorageProvider` boundary for an eventual R2-to-S3 migration.

### UI and accessibility

- Preserve the established professional Kerala-inspired visual system: coconut ivory `#F8F4EC`, midnight indigo `#17233A`, sparing kasavu gold `#B58A42`, Playfair Display headings, and Plus Jakarta Sans UI text.
- Avoid generic wedding motifs, excessive gold, hearts, rings, glitter, neon, and copied imagery. Use original assets or code-native artwork.
- Build genuine responsive behavior for desktop and mobile. Guest experiences are mobile-first.
- Form UI must provide semantic labels, keyboard access, visible focus states, client-side feedback, and matching server-side validation.

### Verification and Git

- Run proportionate checks after changes: `npm run typecheck`, `npm run lint`, and `npm run build` for material UI or application changes. State when a check cannot exercise configured dependencies such as MongoDB.
- `npm test` currently contains no test cases; do not represent a successful exit as functional test coverage.
- Preserve user-owned or unrelated work in a dirty tree. Review the exact staged diff before committing.
- The Stitch reference image in `docs/` is intentionally local and untracked. Do not add it to Git without explicit user approval.
