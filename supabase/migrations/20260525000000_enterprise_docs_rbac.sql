-- Enterprise documentation platform foundation for Darion Docs.
-- This migration defines project-scoped internal documentation, assignments,
-- comments, activity, and RBAC helpers. Public VitePress docs remain static.

create extension if not exists pgcrypto;

create type public.darion_role as enum (
  'super_admin',
  'admin',
  'project_owner',
  'editor',
  'commenter',
  'viewer'
);

create type public.doc_status as enum (
  'draft',
  'review',
  'published',
  'archived'
);

create type public.doc_access_level as enum (
  'read',
  'comment',
  'edit',
  'owner'
);

create type public.assignment_target_type as enum (
  'user',
  'project',
  'role'
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  email text,
  disabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.roles (
  id public.darion_role primary key,
  label text not null,
  permissions text[] not null default '{}'
);

create table public.user_roles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.darion_role not null references public.roles(id),
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null,
  description text not null default '',
  status text not null default 'active',
  owner_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.darion_role not null default 'viewer',
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create table public.doc_categories (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null,
  sort_order integer not null default 1000,
  created_at timestamptz not null default now(),
  unique (project_id, slug)
);

create table public.internal_docs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  category_id uuid references public.doc_categories(id) on delete set null,
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null,
  summary text not null default '',
  body_markdown text not null,
  status public.doc_status not null default 'draft',
  owner_id uuid references public.profiles(id) on delete set null,
  tags text[] not null default '{}',
  sort_order integer not null default 1000,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (project_id, slug)
);

create table public.doc_assignments (
  id uuid primary key default gen_random_uuid(),
  doc_id uuid not null references public.internal_docs(id) on delete cascade,
  target_type public.assignment_target_type not null,
  target_user_id uuid references public.profiles(id) on delete cascade,
  target_project_id uuid references public.projects(id) on delete cascade,
  target_role public.darion_role references public.roles(id),
  access_level public.doc_access_level not null default 'read',
  assigned_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint doc_assignments_one_target check (
    (target_type = 'user' and target_user_id is not null and target_project_id is null and target_role is null)
    or (target_type = 'project' and target_project_id is not null and target_user_id is null and target_role is null)
    or (target_type = 'role' and target_role is not null and target_user_id is null and target_project_id is null)
  )
);

create table public.doc_comments (
  id uuid primary key default gen_random_uuid(),
  doc_id uuid not null references public.internal_docs(id) on delete cascade,
  parent_id uuid references public.doc_comments(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) <= 8000),
  resolved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.doc_versions (
  id uuid primary key default gen_random_uuid(),
  doc_id uuid not null references public.internal_docs(id) on delete cascade,
  title text not null,
  body_markdown text not null,
  saved_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.doc_activity (
  id uuid primary key default gen_random_uuid(),
  doc_id uuid references public.internal_docs(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

insert into public.roles (id, label, permissions) values
  ('super_admin', 'Super Admin', array['*']),
  ('admin', 'Admin', array['admin:*', 'docs:*', 'projects:*', 'users:*', 'settings:*']),
  ('project_owner', 'Project Owner', array['docs:read', 'docs:comment', 'docs:write', 'docs:assign', 'projects:manage_members']),
  ('editor', 'Editor', array['docs:read', 'docs:comment', 'docs:write']),
  ('commenter', 'Commenter', array['docs:read', 'docs:comment']),
  ('viewer', 'Viewer', array['docs:read'])
on conflict (id) do update
set label = excluded.label,
    permissions = excluded.permissions;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger projects_set_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

create trigger internal_docs_set_updated_at
before update on public.internal_docs
for each row execute function public.set_updated_at();

create trigger doc_comments_set_updated_at
before update on public.doc_comments
for each row execute function public.set_updated_at();

-- Security-definer helpers live in public for a compact v1. Keep their
-- search_path fixed so policies cannot be influenced by caller state.
create or replace function public.current_user_roles()
returns public.darion_role[]
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(array_agg(role), array[]::public.darion_role[])
  from public.user_roles
  where user_id = auth.uid();
$$;

create or replace function public.has_role(required_role public.darion_role)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select required_role = any(public.current_user_roles())
    or 'super_admin'::public.darion_role = any(public.current_user_roles())
    or 'admin'::public.darion_role = any(public.current_user_roles());
$$;

create or replace function public.is_project_member(target_project uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.project_members
    where project_id = target_project
      and user_id = auth.uid()
  );
$$;

create or replace function public.can_access_doc(target_doc uuid, minimum_access public.doc_access_level default 'read')
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  with levels(access_level, rank) as (
    values
      ('read'::public.doc_access_level, 1),
      ('comment'::public.doc_access_level, 2),
      ('edit'::public.doc_access_level, 3),
      ('owner'::public.doc_access_level, 4)
  ),
  required as (
    select rank from levels where access_level = minimum_access
  )
  select public.has_role('admin')
    or exists (
      select 1
      from public.internal_docs d
      join public.doc_assignments a on a.doc_id = d.id
      join levels granted on granted.access_level = a.access_level
      cross join required
      where d.id = target_doc
        and d.status <> 'archived'
        and granted.rank >= required.rank
        and (
          (a.target_type = 'user' and a.target_user_id = auth.uid())
          or (a.target_type = 'project' and public.is_project_member(a.target_project_id))
          or (a.target_type = 'role' and a.target_role = any(public.current_user_roles()))
        )
    );
$$;

alter table public.profiles enable row level security;
alter table public.roles enable row level security;
alter table public.user_roles enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.doc_categories enable row level security;
alter table public.internal_docs enable row level security;
alter table public.doc_assignments enable row level security;
alter table public.doc_comments enable row level security;
alter table public.doc_versions enable row level security;
alter table public.doc_activity enable row level security;

create policy "profiles read own or admin"
on public.profiles for select
to authenticated
using (id = auth.uid() or public.has_role('admin'));

create policy "profiles update own basic fields"
on public.profiles for update
to authenticated
using (id = auth.uid() and not disabled)
with check (id = auth.uid());

create policy "roles readable to authenticated users"
on public.roles for select
to authenticated
using (true);

create policy "user roles readable to self or admins"
on public.user_roles for select
to authenticated
using (user_id = auth.uid() or public.has_role('admin'));

create policy "admins manage user roles"
on public.user_roles for all
to authenticated
using (public.has_role('admin'))
with check (public.has_role('admin'));

create policy "projects readable to members and admins"
on public.projects for select
to authenticated
using (public.has_role('admin') or public.is_project_member(id));

create policy "admins create projects"
on public.projects for insert
to authenticated
with check (public.has_role('admin'));

create policy "admins and owners update projects"
on public.projects for update
to authenticated
using (public.has_role('admin') or owner_id = auth.uid())
with check (public.has_role('admin') or owner_id = auth.uid());

create policy "project members readable to project members"
on public.project_members for select
to authenticated
using (public.has_role('admin') or public.is_project_member(project_id));

create policy "admins and project owners manage members"
on public.project_members for all
to authenticated
using (
  public.has_role('admin')
  or exists (
    select 1
    from public.project_members pm
    where pm.project_id = project_members.project_id
      and pm.user_id = auth.uid()
      and pm.role in ('project_owner', 'admin', 'super_admin')
  )
)
with check (
  public.has_role('admin')
  or exists (
    select 1
    from public.project_members pm
    where pm.project_id = project_members.project_id
      and pm.user_id = auth.uid()
      and pm.role in ('project_owner', 'admin', 'super_admin')
  )
);

create policy "categories readable through project membership"
on public.doc_categories for select
to authenticated
using (project_id is null or public.has_role('admin') or public.is_project_member(project_id));

create policy "editors manage categories"
on public.doc_categories for all
to authenticated
using (public.has_role('admin') or public.has_role('project_owner') or public.has_role('editor'))
with check (public.has_role('admin') or public.has_role('project_owner') or public.has_role('editor'));

create policy "assigned docs are readable"
on public.internal_docs for select
to authenticated
using (public.can_access_doc(id, 'read'));

create policy "edit-capable users create docs"
on public.internal_docs for insert
to authenticated
with check (public.has_role('admin') or public.has_role('project_owner') or public.has_role('editor'));

create policy "assigned editors update docs"
on public.internal_docs for update
to authenticated
using (public.can_access_doc(id, 'edit') or public.has_role('admin'))
with check (public.can_access_doc(id, 'edit') or public.has_role('admin'));

create policy "admins and owners delete docs"
on public.internal_docs for delete
to authenticated
using (public.can_access_doc(id, 'owner') or public.has_role('admin'));

create policy "assignments readable for accessible docs"
on public.doc_assignments for select
to authenticated
using (public.can_access_doc(doc_id, 'read') or public.has_role('admin'));

create policy "owners manage assignments"
on public.doc_assignments for all
to authenticated
using (public.can_access_doc(doc_id, 'owner') or public.has_role('admin'))
with check (public.can_access_doc(doc_id, 'owner') or public.has_role('admin'));

create policy "comments readable for accessible docs"
on public.doc_comments for select
to authenticated
using (public.can_access_doc(doc_id, 'read'));

create policy "comment-capable users create comments"
on public.doc_comments for insert
to authenticated
with check (author_id = auth.uid() and public.can_access_doc(doc_id, 'comment'));

create policy "authors and editors update comments"
on public.doc_comments for update
to authenticated
using (author_id = auth.uid() or public.can_access_doc(doc_id, 'edit') or public.has_role('admin'))
with check (author_id = auth.uid() or public.can_access_doc(doc_id, 'edit') or public.has_role('admin'));

create policy "versions readable for editable docs"
on public.doc_versions for select
to authenticated
using (public.can_access_doc(doc_id, 'edit') or public.has_role('admin'));

create policy "editors create versions"
on public.doc_versions for insert
to authenticated
with check (public.can_access_doc(doc_id, 'edit') or public.has_role('admin'));

create policy "activity readable for accessible docs"
on public.doc_activity for select
to authenticated
using (doc_id is null or public.can_access_doc(doc_id, 'read') or public.has_role('admin'));

create policy "system actors create activity"
on public.doc_activity for insert
to authenticated
with check (actor_id = auth.uid() or public.has_role('admin'));

create index projects_slug_idx on public.projects (slug);
create index project_members_user_idx on public.project_members (user_id);
create index internal_docs_project_status_idx on public.internal_docs (project_id, status);
create index internal_docs_search_idx on public.internal_docs using gin (
  to_tsvector('english', coalesce(title, '') || ' ' || coalesce(summary, '') || ' ' || coalesce(body_markdown, ''))
);
create index doc_assignments_doc_idx on public.doc_assignments (doc_id);
create index doc_assignments_user_idx on public.doc_assignments (target_user_id);
create index doc_assignments_project_idx on public.doc_assignments (target_project_id);
create index doc_comments_doc_idx on public.doc_comments (doc_id, created_at);
