# Apply RBAC migration to Supabase

Project: `llflitxgfwrkutyeyirfa`  
Dashboard: https://supabase.com/dashboard/project/llflitxgfwrkutyeyirfa/sql/new

## Steps

1. Open the SQL editor in your Supabase project dashboard.
2. Run migrations in order:
   - `supabase/migrations/20260525000000_enterprise_docs_rbac.sql` (optional, for profiles/projects)
   - `supabase/migrations/20260526100000_granular_permission_rbac.sql` (required)
3. Copy your **service role** key from **Project Settings → API** into `.env`:

   ```env
   SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
   ```

4. Restart the dev server:

   ```sh
   npm run docs:dev
   ```

5. Verify RBAC API (after signing into `/__admin`):

   ```sh
   curl -H "Authorization: Bearer <token>" http://localhost:5173/__admin/api/rbac/permissions
   ```

## Notes

- The anon key is used by the browser client (`src/supabase/client.js`).
- Admin RBAC routes use the **service role** key server-side only.
- Re-copy the anon key from the dashboard if authentication returns `401`.
