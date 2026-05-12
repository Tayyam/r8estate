-- R8 Estate: Postgres schema for Supabase (self-hosted compatible)
-- Uses quoted "camelCase" column names to match existing TypeScript models.

-- Extensions
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Categories
-- ---------------------------------------------------------------------------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  "nameAr" text,
  description text,
  "descriptionAr" text,
  "iconUrl" text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Companies
-- ---------------------------------------------------------------------------
create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  "categoryId" uuid not null references public.categories (id) on delete restrict,
  location text not null,
  "logoUrl" text,
  description text,
  phone text,
  website text,
  "establishmentDate" text,
  claimed boolean not null default false,
  "claimedByName" text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create index companies_category_idx on public.companies ("categoryId");
create index companies_claimed_idx on public.companies (claimed);

-- ---------------------------------------------------------------------------
-- Claim requests (FK to companies only; user ids are auth user UUIDs)
-- ---------------------------------------------------------------------------
create table public."claimRequests" (
  id uuid primary key default gen_random_uuid(),
  "companyId" uuid not null references public.companies (id) on delete cascade,
  "companyName" text not null,
  "trackingNumber" text,
  "requesterId" uuid,
  "requesterName" text,
  "contactPhone" text not null default '',
  "businessEmail" text not null,
  password text,
  "userId" uuid,
  "supervisorEmail" text not null,
  "supervisorPassword" text,
  "supervisorId" uuid,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  "domainVerified" boolean default false,
  notes text,
  "businessEmailVerified" boolean default false,
  "supervisorEmailVerified" boolean default false,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Profiles (app user row; id = auth.users.id)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  "displayName" text not null default '',
  role text not null default 'user' check (role in ('user', 'company', 'admin')),
  "companyId" uuid references public.companies (id) on delete set null,
  "photoUrl" text,
  "isEmailVerified" boolean not null default false,
  status text not null default 'not-active' check (status in ('active', 'suspended', 'not-active')),
  "claimRequestId" uuid references public."claimRequests" (id) on delete set null,
  "isSupervisor" boolean default false,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create index profiles_email_idx on public.profiles (email);
create index profiles_role_idx on public.profiles (role);
create index profiles_company_idx on public.profiles ("companyId");

-- claimRequests.userId / supervisorId reference auth users (no FK — creation order varies)

-- ---------------------------------------------------------------------------
-- Reviews
-- ---------------------------------------------------------------------------
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  "companyId" uuid not null references public.companies (id) on delete cascade,
  "userId" uuid not null references public.profiles (id) on delete cascade,
  "userName" text not null,
  "userEmail" text not null,
  rating int not null check (rating >= 1 and rating <= 5),
  "ratingDetails" jsonb,
  title text not null,
  content text not null,
  "isAnonymous" boolean default false,
  attachments jsonb,
  "companyReply" jsonb,
  verified boolean not null default false,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create index reviews_company_idx on public.reviews ("companyId");
create index reviews_user_idx on public.reviews ("userId");
create index reviews_created_idx on public.reviews ("createdAt" desc);

-- ---------------------------------------------------------------------------
-- Review votes
-- ---------------------------------------------------------------------------
create table public."reviewVotes" (
  id uuid primary key default gen_random_uuid(),
  "userId" uuid not null references public.profiles (id) on delete cascade,
  "reviewId" uuid not null references public.reviews (id) on delete cascade,
  helpful boolean not null,
  "createdAt" timestamptz not null default now(),
  unique ("userId", "reviewId")
);

-- ---------------------------------------------------------------------------
-- Reports
-- ---------------------------------------------------------------------------
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  "contentId" text not null,
  "contentType" text not null check ("contentType" in ('review', 'reply')),
  "reporterId" uuid not null references public.profiles (id) on delete cascade,
  "reporterName" text not null,
  "reporterEmail" text not null,
  reason text not null,
  details text,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  "resolvedBy" uuid references public.profiles (id) on delete set null,
  "resolvedAt" timestamptz,
  notes text
);

-- ---------------------------------------------------------------------------
-- Projects (nested units stored as jsonb)
-- ---------------------------------------------------------------------------
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  "companyId" uuid not null references public.companies (id) on delete cascade,
  name text not null,
  about text not null,
  area double precision not null,
  location text not null,
  "startDate" timestamptz,
  "deliveryDate" timestamptz,
  "deliveryDateUpdated" timestamptz,
  "brochureUrl" text,
  images jsonb not null default '[]'::jsonb,
  units jsonb not null default '[]'::jsonb,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create index projects_company_idx on public.projects ("companyId");

-- ---------------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  "userId" uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  message text not null,
  type text not null,
  "isRead" boolean not null default false,
  "relatedId" text,
  link text,
  "createdAt" timestamptz not null default now()
);

create index notifications_user_idx on public.notifications ("userId", "createdAt" desc);

-- ---------------------------------------------------------------------------
-- Magic tokens (email verification & password reset; consumed server-side)
-- ---------------------------------------------------------------------------
create table public.auth_magic_tokens (
  id uuid primary key default gen_random_uuid(),
  "tokenHash" text not null,
  "userId" uuid not null references auth.users (id) on delete cascade,
  purpose text not null check (purpose in ('email_verify', 'password_reset')),
  "expiresAt" timestamptz not null,
  "createdAt" timestamptz not null default now(),
  consumed boolean not null default false
);

create index auth_magic_tokens_hash_idx on public.auth_magic_tokens ("tokenHash") where not consumed;

alter table public.auth_magic_tokens enable row level security;

-- ---------------------------------------------------------------------------
-- Helper: admin check
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

-- ---------------------------------------------------------------------------
-- New auth user → profile row
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, "displayName", role, "isEmailVerified", status, "createdAt", "updatedAt")
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'displayName', ''),
    coalesce(new.raw_user_meta_data->>'role', 'user'),
    new.email_confirmed_at is not null,
    case when new.email_confirmed_at is not null then 'active' else 'not-active' end,
    now(),
    now()
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.categories enable row level security;
alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.reviews enable row level security;
alter table public."reviewVotes" enable row level security;
alter table public.reports enable row level security;
alter table public."claimRequests" enable row level security;
alter table public.projects enable row level security;
alter table public.notifications enable row level security;

-- Categories: public read; admin write
create policy categories_read on public.categories for select using (true);
create policy categories_write on public.categories for all using (public.is_admin()) with check (public.is_admin());

-- Companies: public read; admin insert; update by admin or company owner
create policy companies_read on public.companies for select using (true);
create policy companies_insert on public.companies for insert with check (public.is_admin());
create policy companies_update on public.companies for update using (
  public.is_admin()
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'company' and p."companyId" = companies.id
  )
);
create policy companies_delete on public.companies for delete using (public.is_admin());

-- Profiles: each user own row; admin all
create policy profiles_select on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy profiles_update_own on public.profiles for update using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());

-- Reviews: public read; insert authenticated; update own or admin or company on that company
create policy reviews_read on public.reviews for select using (true);
create policy reviews_insert on public.reviews for insert with check ("userId" = auth.uid());
create policy reviews_update on public.reviews for update using (
  "userId" = auth.uid()
  or public.is_admin()
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'company' and p."companyId" = reviews."companyId"
  )
);
create policy reviews_delete on public.reviews for delete using ("userId" = auth.uid() or public.is_admin());

-- Review votes
create policy reviewvotes_read on public."reviewVotes" for select using (true);
create policy reviewvotes_write on public."reviewVotes" for all using ("userId" = auth.uid()) with check ("userId" = auth.uid());

-- Reports
create policy reports_read on public.reports for select using (public.is_admin());
create policy reports_insert on public.reports for insert with check ("reporterId" = auth.uid());
create policy reports_update on public.reports for update using (public.is_admin()) with check (public.is_admin());

-- Claim requests: insert authenticated; read own involvement or admin
create policy claim_read on public."claimRequests" for select using (
  public.is_admin()
  or "requesterId" = auth.uid()
  or "userId" = auth.uid()
  or "supervisorId" = auth.uid()
);
create policy claim_insert on public."claimRequests" for insert with check (true);
create policy claim_update on public."claimRequests" for update using (public.is_admin());

-- Projects: public read; company owners write
create policy projects_read on public.projects for select using (true);
create policy projects_write on public.projects for all using (
  public.is_admin()
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'company' and p."companyId" = projects."companyId"
  )
);

-- Notifications: own rows only
create policy notifications_rw on public.notifications for all using ("userId" = auth.uid()) with check ("userId" = auth.uid());
create policy notifications_admin on public.notifications for all using (public.is_admin()) with check (public.is_admin());

-- Service role bypasses RLS — Node uses service role for claim flows / admin

-- ---------------------------------------------------------------------------
-- Realtime (notifications)
-- ---------------------------------------------------------------------------
do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception
  when undefined_object then null;
end $$;

-- Public lookup by 6-digit tracking (no auth); excludes stored passwords
create or replace function public.get_claim_by_tracking(trk text)
returns table (
  id uuid,
  "companyId" uuid,
  "companyName" text,
  "trackingNumber" text,
  "requesterId" uuid,
  "requesterName" text,
  "contactPhone" text,
  "businessEmail" text,
  "userId" uuid,
  "supervisorEmail" text,
  "supervisorId" uuid,
  status text,
  "domainVerified" boolean,
  notes text,
  "businessEmailVerified" boolean,
  "supervisorEmailVerified" boolean,
  "createdAt" timestamptz,
  "updatedAt" timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    c.id,
    c."companyId",
    c."companyName",
    c."trackingNumber",
    c."requesterId",
    c."requesterName",
    c."contactPhone",
    c."businessEmail",
    c."userId",
    c."supervisorEmail",
    c."supervisorId",
    c.status,
    c."domainVerified",
    c.notes,
    c."businessEmailVerified",
    c."supervisorEmailVerified",
    c."createdAt",
    c."updatedAt"
  from public."claimRequests" c
  where c."trackingNumber" = trk
  limit 1;
$$;

grant execute on function public.get_claim_by_tracking(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Storage bucket (public read)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

create policy media_public_read on storage.objects for select using (bucket_id = 'media');
create policy media_auth_upload on storage.objects for insert with check (
  bucket_id = 'media' and auth.role() = 'authenticated'
);
create policy media_auth_update on storage.objects for update using (
  bucket_id = 'media' and auth.role() = 'authenticated'
);
create policy media_auth_delete on storage.objects for delete using (
  bucket_id = 'media' and auth.role() = 'authenticated'
);
