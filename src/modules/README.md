# Domain module conventions

Each directory in this folder owns one business domain from the design
documents. The normal internal flow is:

```text
route handler -> Zod schema -> service -> repository -> Mongoose model
```

Route handlers are in `src/app/api` so Next.js can discover them. Domain code
must not import from `src/app`. Modules can depend on shared utilities and
server adapters. Cross-domain workflows should be explicit service-level
dependencies, never implicit database joins or client-provided `weddingId`s.

Current implementation establishes the `auth`, `weddings`, and `members`
foundation. The remaining modules are intentionally empty boundaries, ready to
receive their documented schema, model, repository, and service as each product
phase is implemented.
