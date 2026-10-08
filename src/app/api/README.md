# API route handlers

Routes follow the REST contract in `docs/API_DESIGN.md`. They contain only
transport concerns: parsing, authentication, Zod validation, service calls, and
HTTP response mapping. Business rules live in `src/modules`.

Implemented foundation routes:

- `GET /api/health`
- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

The other documented route families should be added as their corresponding
domain service is implemented; no placeholder handler claims an unimplemented
feature is available.
