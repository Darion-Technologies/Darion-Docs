-- Granular permission-based RBAC for Darion Developer Portal.
-- Lives in the rbac schema to avoid conflicting with enterprise_docs enum roles.

create schema if not exists rbac;

create table rbac.permissions (
  id uuid primary key default gen_random_uuid(),
  permission_key varchar(120) not null unique,
  permission_name varchar(200) not null,
  description text not null default '',
  created_at timestamptz not null default now()
);

create table rbac.roles (
  id uuid primary key default gen_random_uuid(),
  role_name varchar(120) not null unique,
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table rbac.role_permissions (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references rbac.roles(id) on delete cascade,
  permission_id uuid not null references rbac.permissions(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (role_id, permission_id)
);

create table rbac.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role_id uuid not null references rbac.roles(id) on delete cascade,
  assigned_by uuid references auth.users(id) on delete set null,
  assigned_at timestamptz not null default now(),
  unique (user_id, role_id)
);

create table rbac.documents (
  id uuid primary key default gen_random_uuid(),
  title varchar(500) not null,
  slug varchar(200) not null unique,
  content text not null default '',
  required_permission varchar(120) not null references rbac.permissions(permission_key),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table rbac.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  action varchar(120) not null,
  entity_type varchar(120) not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index rbac_user_roles_user_idx on rbac.user_roles (user_id);
create index rbac_role_permissions_role_idx on rbac.role_permissions (role_id);
create index rbac_documents_permission_idx on rbac.documents (required_permission);
create index rbac_audit_logs_user_idx on rbac.audit_logs (user_id, created_at desc);

create or replace function rbac.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger rbac_roles_set_updated_at
before update on rbac.roles
for each row execute function rbac.set_updated_at();

create trigger rbac_documents_set_updated_at
before update on rbac.documents
for each row execute function rbac.set_updated_at();

-- Permission helpers (security definer, fixed search_path)
create or replace function rbac.current_user_permission_keys()
returns text[]
language sql
security definer
set search_path = rbac, public, auth
stable
as $$
  select coalesce(array_agg(distinct p.permission_key), array[]::text[])
  from rbac.user_roles ur
  join rbac.role_permissions rp on rp.role_id = ur.role_id
  join rbac.permissions p on p.id = rp.permission_id
  where ur.user_id = auth.uid();
$$;

create or replace function rbac.has_permission(required_permission text)
returns boolean
language sql
security definer
set search_path = rbac, public, auth
stable
as $$
  select required_permission = any(rbac.current_user_permission_keys())
    or '*' = any(rbac.current_user_permission_keys());
$$;

create or replace function rbac.is_super_admin()
returns boolean
language sql
security definer
set search_path = rbac, public, auth
stable
as $$
  select exists (
    select 1
    from rbac.user_roles ur
    join rbac.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid()
      and r.role_name = 'Super Admin'
  );
$$;

create or replace function rbac.is_admin()
returns boolean
language sql
security definer
set search_path = rbac, public, auth
stable
as $$
  select rbac.is_super_admin()
    or exists (
      select 1
      from rbac.user_roles ur
      join rbac.roles r on r.id = ur.role_id
      where ur.user_id = auth.uid()
        and r.role_name in ('Super Admin', 'Admin')
    );
$$;

-- Bootstrap profile row when auth user is created (when public.profiles exists)
do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'profiles'
  ) then
    execute $fn$
      create or replace function public.handle_new_auth_user()
      returns trigger
      language plpgsql
      security definer
      set search_path = public, auth
      as $body$
      begin
        insert into public.profiles (id, display_name, email)
        values (
          new.id,
          coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1), 'User'),
          new.email
        )
        on conflict (id) do nothing;
        return new;
      end;
      $body$;

      drop trigger if exists on_auth_user_created on auth.users;
      create trigger on_auth_user_created
      after insert on auth.users
      for each row execute function public.handle_new_auth_user();
    $fn$;
  end if;
end $$;

-- Seed permissions
insert into rbac.permissions (permission_key, permission_name, description) values
  ('view_documents', 'View Documents', 'Read general documentation'),
  ('upload_documents', 'Upload Documents', 'Upload new documents'),
  ('edit_documents', 'Edit Documents', 'Edit existing documents'),
  ('delete_documents', 'Delete Documents', 'Delete documents'),
  ('download_documents', 'Download Documents', 'Download document files'),
  ('manage_users', 'Manage Users', 'Create and manage user accounts'),
  ('manage_roles', 'Manage Roles', 'Create and manage roles and permissions'),
  ('view_api_docs', 'View API Docs', 'Access API documentation'),
  ('view_sdk_docs', 'View SDK Docs', 'Access SDK documentation'),
  ('view_internal_docs', 'View Internal Docs', 'Access internal documentation'),
  ('approve_documents', 'Approve Documents', 'Approve document publishing')
on conflict (permission_key) do update
set permission_name = excluded.permission_name,
    description = excluded.description;

-- Seed roles
insert into rbac.roles (role_name, description) values
  ('Super Admin', 'Full platform control including roles and permissions'),
  ('Admin', 'User and role assignment, document administration'),
  ('Manager', 'Approve and manage team documents'),
  ('Developer', 'API and SDK documentation access'),
  ('QA', 'Quality review and document read access'),
  ('Support', 'Read and download support documentation'),
  ('Viewer', 'Read-only access to authorized documents'),
  ('Client', 'Limited client-facing documentation access')
on conflict (role_name) do update
set description = excluded.description,
    updated_at = now();

-- Super Admin: all permissions
insert into rbac.role_permissions (role_id, permission_id)
select r.id, p.id
from rbac.roles r
cross join rbac.permissions p
where r.role_name = 'Super Admin'
on conflict do nothing;

-- Admin
insert into rbac.role_permissions (role_id, permission_id)
select r.id, p.id
from rbac.roles r
join rbac.permissions p on p.permission_key in (
  'view_documents', 'upload_documents', 'edit_documents', 'delete_documents',
  'download_documents', 'manage_users', 'view_api_docs', 'view_sdk_docs',
  'view_internal_docs', 'approve_documents'
)
where r.role_name = 'Admin'
on conflict do nothing;

-- Manager
insert into rbac.role_permissions (role_id, permission_id)
select r.id, p.id
from rbac.roles r
join rbac.permissions p on p.permission_key in (
  'view_documents', 'edit_documents', 'download_documents', 'approve_documents',
  'view_api_docs', 'view_sdk_docs', 'view_internal_docs'
)
where r.role_name = 'Manager'
on conflict do nothing;

-- Developer
insert into rbac.role_permissions (role_id, permission_id)
select r.id, p.id
from rbac.roles r
join rbac.permissions p on p.permission_key in (
  'view_documents', 'view_api_docs', 'view_sdk_docs', 'download_documents'
)
where r.role_name = 'Developer'
on conflict do nothing;

-- QA
insert into rbac.role_permissions (role_id, permission_id)
select r.id, p.id
from rbac.roles r
join rbac.permissions p on p.permission_key in (
  'view_documents', 'view_api_docs', 'view_sdk_docs', 'view_internal_docs'
)
where r.role_name = 'QA'
on conflict do nothing;

-- Support
insert into rbac.role_permissions (role_id, permission_id)
select r.id, p.id
from rbac.roles r
join rbac.permissions p on p.permission_key in (
  'view_documents', 'download_documents', 'view_internal_docs'
)
where r.role_name = 'Support'
on conflict do nothing;

-- Viewer
insert into rbac.role_permissions (role_id, permission_id)
select r.id, p.id
from rbac.roles r
join rbac.permissions p on p.permission_key in ('view_documents')
where r.role_name = 'Viewer'
on conflict do nothing;

-- Client
insert into rbac.role_permissions (role_id, permission_id)
select r.id, p.id
from rbac.roles r
join rbac.permissions p on p.permission_key in ('view_documents', 'view_api_docs')
where r.role_name = 'Client'
on conflict do nothing;

-- Seed sample documents
insert into rbac.documents (title, slug, content, required_permission) values
  ('API Documentation', 'api-documentation', 'Darion API reference overview.', 'view_api_docs'),
  ('SDK Documentation', 'sdk-documentation', 'Darion SDK integration guide.', 'view_sdk_docs'),
  ('Internal Engineering Handbook', 'internal-engineering-handbook', 'Internal engineering standards.', 'view_internal_docs'),
  ('Platform Overview', 'platform-overview', 'General platform documentation.', 'view_documents')
on conflict (slug) do update
set title = excluded.title,
    content = excluded.content,
    required_permission = excluded.required_permission,
    updated_at = now();

-- RLS
alter table rbac.permissions enable row level security;
alter table rbac.roles enable row level security;
alter table rbac.role_permissions enable row level security;
alter table rbac.user_roles enable row level security;
alter table rbac.documents enable row level security;
alter table rbac.audit_logs enable row level security;

-- Permissions catalog: readable by authenticated users; writable by super admin only
create policy "rbac permissions read"
on rbac.permissions for select
to authenticated
using (true);

create policy "rbac permissions manage super admin"
on rbac.permissions for all
to authenticated
using (rbac.is_super_admin())
with check (rbac.is_super_admin());

-- Roles: readable by authenticated; CRUD by super admin
create policy "rbac roles read"
on rbac.roles for select
to authenticated
using (true);

create policy "rbac roles manage super admin"
on rbac.roles for all
to authenticated
using (rbac.is_super_admin())
with check (rbac.is_super_admin());

-- Role permissions: readable by authenticated; managed by super admin
create policy "rbac role permissions read"
on rbac.role_permissions for select
to authenticated
using (true);

create policy "rbac role permissions manage super admin"
on rbac.role_permissions for all
to authenticated
using (rbac.is_super_admin())
with check (rbac.is_super_admin());

-- User roles: users see own; admins assign
create policy "rbac user roles read self or admin"
on rbac.user_roles for select
to authenticated
using (user_id = auth.uid() or rbac.is_admin());

create policy "rbac user roles assign admin"
on rbac.user_roles for insert
to authenticated
with check (rbac.is_admin());

create policy "rbac user roles update admin"
on rbac.user_roles for update
to authenticated
using (rbac.is_admin())
with check (rbac.is_admin());

create policy "rbac user roles delete admin"
on rbac.user_roles for delete
to authenticated
using (rbac.is_admin());

-- Documents: permission-filtered reads; admins edit
create policy "rbac documents read authorized"
on rbac.documents for select
to authenticated
using (rbac.has_permission(required_permission) or rbac.is_admin());

create policy "rbac documents write admin"
on rbac.documents for insert
to authenticated
with check (rbac.is_admin());

create policy "rbac documents update admin"
on rbac.documents for update
to authenticated
using (rbac.is_admin())
with check (rbac.is_admin());

create policy "rbac documents delete admin"
on rbac.documents for delete
to authenticated
using (rbac.is_admin());

-- Audit logs: admins read all; authenticated insert own
create policy "rbac audit logs read admin"
on rbac.audit_logs for select
to authenticated
using (rbac.is_admin() or user_id = auth.uid());

create policy "rbac audit logs insert authenticated"
on rbac.audit_logs for insert
to authenticated
with check (user_id = auth.uid() or rbac.is_admin());

grant usage on schema rbac to authenticated, service_role;
grant select, insert, update, delete on all tables in schema rbac to authenticated, service_role;
grant usage, select on all sequences in schema rbac to authenticated, service_role;
