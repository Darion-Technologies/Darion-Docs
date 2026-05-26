# Darion Docs

Self-hosted VitePress documentation for Darion Technologies.

The public documentation is static and production-safe. Private documentation
operations live behind development/private routes:

- `/__admin` manages public docs, internal docs, projects, assignments, users,
  access metadata, quality checks, and publishing.
- `/__internal` opens **My Internals**, a private reader that shows only the
  internal project docs assigned to the signed-in profile.

## Development

```sh
npm install
npm run docs:dev
```

Open the local URL printed by VitePress. The documentation homepage is defined
in `index.md`.

Use a local secret for private routes:

```sh
DARION_ADMIN_SECRET="change-this-local-dev-secret" npm run docs:dev
```

## Supabase Foundation

Granular permission-based RBAC is defined in:

```text
supabase/migrations/20260526100000_granular_permission_rbac.sql
```

Enterprise project-scoped docs (optional) live in:

```text
supabase/migrations/20260525000000_enterprise_docs_rbac.sql
```

RBAC service layer:

```text
src/supabase/services/rbac.mjs
src/supabase/middleware/requirePermission.mjs
src/supabase/types/rbac.ts
```

Admin API routes (development):

```text
/__admin/api/rbac/roles
/__admin/api/rbac/permissions
/__admin/api/rbac/user-roles
/__admin/api/rbac/documents
/__admin/api/rbac/audit-logs
```

It creates project-scoped internal docs, assignments, comments, versions,
activity logs, and Row Level Security policies. Public VitePress docs remain in
`docs/`; private internal documentation moves toward Supabase-backed records.

Local development can still use JSON metadata until Supabase is connected:

```text
metadata/projects.json
metadata/project-members.json
metadata/doc-assignments.json
metadata/doc-comments.json
```

Recommended Supabase workflow:

```sh
cp .env.example .env
npm run supabase:start
npm run supabase:db:reset
npm run supabase:types
```

The browser client helper lives at `src/supabase/client.js`. Keep
`SUPABASE_SERVICE_ROLE_KEY` server-only; never import it into public VitePress
pages or theme code.
