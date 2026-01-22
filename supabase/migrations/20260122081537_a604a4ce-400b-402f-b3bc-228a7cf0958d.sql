-- VENDE BHARAT (Vande Bharat Smart-Guardian) core schema v1

-- 1) Utility: updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 2) Roles enum
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin','in_charge','officer');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 3) user_roles table
create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

-- Helper functions (security definer to avoid RLS recursion)
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  )
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role(auth.uid(), 'admin')
$$;

create or replace function public.is_in_charge()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_role(auth.uid(), 'in_charge')
$$;

create or replace function public.is_admin_or_in_charge()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin() or public.is_in_charge()
$$;

-- 4) Officer roster
create table if not exists public.officer_roster (
  id uuid primary key default gen_random_uuid(),
  staff_number text not null unique,
  full_name text not null,
  dept text,
  base_location text,
  show_in_login boolean not null default true,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_officer_roster_updated_at on public.officer_roster;
create trigger set_officer_roster_updated_at
before update on public.officer_roster
for each row execute function public.set_updated_at();

alter table public.officer_roster enable row level security;

-- 5) Profiles
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  staff_number text not null,
  full_name text not null,
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

-- 6) Trains + coach formation
create table if not exists public.trains (
  id uuid primary key default gen_random_uuid(),
  train_number text not null unique,
  created_at timestamptz not null default now()
);

alter table public.trains enable row level security;

create table if not exists public.coach_formations (
  id uuid primary key default gen_random_uuid(),
  train_id uuid not null references public.trains(id) on delete cascade,
  coach_number text not null,
  position int not null,
  unit text not null,
  configuration text not null,
  class text not null,
  capacity int not null,
  created_at timestamptz not null default now(),
  unique (train_id, coach_number),
  unique (train_id, position)
);

alter table public.coach_formations enable row level security;

-- 7) Complaints
DO $$ BEGIN
  CREATE TYPE public.complaint_status AS ENUM ('open','in_progress','resolved');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

create table if not exists public.complaints (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  reporter_user_id uuid not null,
  reporter_name text not null,
  reporter_staff_number text not null,

  train_number text not null,
  coach_number text not null,
  position int not null,
  unit text not null,
  configuration text not null,
  class text not null,
  capacity int not null,

  pnr_number text not null,
  customer_name text not null,
  berth_number text not null,
  contact_number text,

  issue_description text not null,
  action_plan text not null,
  action_during_service text,
  action_required_in_yard text,

  evidence_paths text[] not null default '{}',

  status public.complaint_status not null default 'open',
  resolved_at timestamptz,

  ai_diagnosis text
);

drop trigger if exists set_complaints_updated_at on public.complaints;
create trigger set_complaints_updated_at
before update on public.complaints
for each row execute function public.set_updated_at();

alter table public.complaints enable row level security;

-- 8) Compliance sync log
create table if not exists public.compliance_sync (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid not null references public.complaints(id) on delete cascade,
  attempt_at timestamptz not null default now(),
  status text not null,
  message text,
  created_at timestamptz not null default now()
);

alter table public.compliance_sync enable row level security;

-- 9) Role assignment trigger (on profile creation)
create or replace function public.assign_default_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_roles (user_id, role)
  values (new.user_id, 'officer')
  on conflict do nothing;

  if new.staff_number = '25668' then
    insert into public.user_roles (user_id, role)
    values (new.user_id, 'in_charge')
    on conflict do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists assign_default_role_on_profile on public.profiles;
create trigger assign_default_role_on_profile
after insert on public.profiles
for each row execute function public.assign_default_role();

-- =====================
-- RLS POLICIES (drop + create)
-- =====================

-- officer_roster
DROP POLICY IF EXISTS roster_read_for_login ON public.officer_roster;
CREATE POLICY roster_read_for_login
ON public.officer_roster
FOR SELECT
TO authenticated
USING (active = true and show_in_login = true);

DROP POLICY IF EXISTS roster_admin_manage ON public.officer_roster;
CREATE POLICY roster_admin_manage
ON public.officer_roster
FOR ALL
TO authenticated
USING (public.is_admin_or_in_charge())
WITH CHECK (public.is_admin_or_in_charge());

-- profiles
DROP POLICY IF EXISTS profiles_read_own_or_admin ON public.profiles;
CREATE POLICY profiles_read_own_or_admin
ON public.profiles
FOR SELECT
TO authenticated
USING (public.is_admin_or_in_charge() or user_id = auth.uid());

DROP POLICY IF EXISTS profiles_insert_self_from_roster ON public.profiles;
CREATE POLICY profiles_insert_self_from_roster
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND exists (
    select 1
    from public.officer_roster r
    where r.staff_number = profiles.staff_number
      and r.active = true
  )
);

DROP POLICY IF EXISTS profiles_update_own_or_admin ON public.profiles;
CREATE POLICY profiles_update_own_or_admin
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.is_admin_or_in_charge() or user_id = auth.uid())
WITH CHECK (public.is_admin_or_in_charge() or user_id = auth.uid());

DROP POLICY IF EXISTS profiles_delete_admin_only ON public.profiles;
CREATE POLICY profiles_delete_admin_only
ON public.profiles
FOR DELETE
TO authenticated
USING (public.is_admin());

-- user_roles
DROP POLICY IF EXISTS roles_admin_manage ON public.user_roles;
CREATE POLICY roles_admin_manage
ON public.user_roles
FOR ALL
TO authenticated
USING (public.is_admin_or_in_charge())
WITH CHECK (public.is_admin_or_in_charge());

-- trains/coach_formations read
DROP POLICY IF EXISTS trains_read ON public.trains;
CREATE POLICY trains_read
ON public.trains
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS coach_formations_read ON public.coach_formations;
CREATE POLICY coach_formations_read
ON public.coach_formations
FOR SELECT
TO authenticated
USING (true);

-- complaints
DROP POLICY IF EXISTS complaints_read_admin_or_own ON public.complaints;
CREATE POLICY complaints_read_admin_or_own
ON public.complaints
FOR SELECT
TO authenticated
USING (public.is_admin_or_in_charge() or reporter_user_id = auth.uid());

DROP POLICY IF EXISTS complaints_insert_own ON public.complaints;
CREATE POLICY complaints_insert_own
ON public.complaints
FOR INSERT
TO authenticated
WITH CHECK (reporter_user_id = auth.uid());

DROP POLICY IF EXISTS complaints_update_admin_or_own_24h_or_resolve ON public.complaints;
CREATE POLICY complaints_update_admin_or_own_24h_or_resolve
ON public.complaints
FOR UPDATE
TO authenticated
USING (
  public.is_admin_or_in_charge()
  OR (
    reporter_user_id = auth.uid()
    AND (created_at > now() - interval '24 hours' OR status = 'resolved')
  )
)
WITH CHECK (
  public.is_admin_or_in_charge()
  OR (
    reporter_user_id = auth.uid()
    AND (created_at > now() - interval '24 hours' OR status = 'resolved')
  )
);

DROP POLICY IF EXISTS complaints_delete_admin_or_in_charge ON public.complaints;
CREATE POLICY complaints_delete_admin_or_in_charge
ON public.complaints
FOR DELETE
TO authenticated
USING (public.is_admin_or_in_charge());

-- compliance_sync
DROP POLICY IF EXISTS compliance_sync_admin_read ON public.compliance_sync;
CREATE POLICY compliance_sync_admin_read
ON public.compliance_sync
FOR SELECT
TO authenticated
USING (public.is_admin_or_in_charge());

DROP POLICY IF EXISTS compliance_sync_admin_insert ON public.compliance_sync;
CREATE POLICY compliance_sync_admin_insert
ON public.compliance_sync
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin_or_in_charge());

-- =====================
-- SEED DATA
-- =====================

insert into public.trains (train_number)
values ('22301'), ('22302')
on conflict do nothing;

with t as (
  select id, train_number from public.trains where train_number in ('22301','22302')
), formation as (
  select * from (values
    ('B1',1,'Unit 1','DTC','3AC',28),
    ('B2',2,'Unit 1','MC1','3AC',67),
    ('B3',3,'Unit 1','TC','3AC',55),
    ('B4',4,'Unit 1','MC1','3AC',67),
    ('A1',5,'Unit 2','MC2','2AC',48),
    ('B5',6,'Unit 2','TC','3AC',55),
    ('A2',7,'Unit 2','MC2','2AC',48),
    ('H1',8,'Unit 2','TC','1AC',24),
    ('A3',9,'Unit 3','MC2','2AC',44),
    ('A4',10,'Unit 3','MC2','2AC',48),
    ('B6',11,'Unit 3','TC','3AC',55),
    ('B7',12,'Unit 3','MC1','3AC',67),
    ('B8',13,'Unit 4','MC1','3AC',67),
    ('B9',14,'Unit 4','TC','3AC',55),
    ('B10',15,'Unit 4','MC1','3AC',67),
    ('B11',16,'Unit 4','DTC','3AC',28)
  ) as v(coach_number, position, unit, configuration, class, capacity)
)
insert into public.coach_formations (train_id, coach_number, position, unit, configuration, class, capacity)
select t.id, f.coach_number, f.position, f.unit, f.configuration, f.class, f.capacity
from t
cross join formation f
on conflict do nothing;

insert into public.officer_roster (staff_number, full_name, dept, base_location, show_in_login)
values
  ('25668','Murali Mohan G','R715','Kamakhya', true),
  ('28888','Harminder Singh','R715','Kamakhya', true),
  ('29035','Harisha H. M.','R778','Kamakhya', true),
  ('30627','Bhiogade Nitin Liladhar','R715','Kamakhya', true),
  ('29579','Harisha','R778','Kamakhya', true),
  ('29582','Balachandran','R778','Kamakhya', true),
  ('29825','Vinodh Kumar','R775','Kamakhya', true),
  ('29118','Raghavendra','R775','Kamakhya', true),
  ('29461','Anand Kumar','R776','Kamakhya', true),
  ('28584','Sunil Rajan','R715','Howrah', true),
  ('28504','Shirshendu Majumder','R715','Howrah', true),
  ('70153','Chandan Kumar','R715','Howrah', true),
  ('29557','Harish Kumar','R778','Howrah', true),
  ('29641','Kumaresan','R778','Howrah', true),
  ('29254','Kishore','R778','Howrah', true),
  ('29904','Vinaya','R776','Howrah', true),
  ('29522','Jayashankar','R776','Howrah', true),
  ('30090','Rakesh Premchander','R701','Howrah', true)
on conflict do nothing;

-- =====================
-- STORAGE BUCKETS + POLICIES
-- =====================

insert into storage.buckets (id, name, public)
values ('avatars','avatars', true)
on conflict do nothing;

insert into storage.buckets (id, name, public)
values ('complaint_evidence','complaint_evidence', false)
on conflict do nothing;

-- Avatars policies
DROP POLICY IF EXISTS avatars_public_read ON storage.objects;
CREATE POLICY avatars_public_read
ON storage.objects
FOR SELECT
USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS avatars_user_write ON storage.objects;
CREATE POLICY avatars_user_write
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS avatars_user_update ON storage.objects;
CREATE POLICY avatars_user_update
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS avatars_user_delete ON storage.objects;
CREATE POLICY avatars_user_delete
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Evidence policies (complaint_evidence/<complaint_id>/<user_id>/...)
DROP POLICY IF EXISTS evidence_read ON storage.objects;
CREATE POLICY evidence_read
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'complaint_evidence'
  AND (
    public.is_admin_or_in_charge()
    OR auth.uid()::text = (storage.foldername(name))[2]
  )
);

DROP POLICY IF EXISTS evidence_insert ON storage.objects;
CREATE POLICY evidence_insert
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'complaint_evidence'
  AND (
    public.is_admin_or_in_charge()
    OR auth.uid()::text = (storage.foldername(name))[2]
  )
);

DROP POLICY IF EXISTS evidence_update ON storage.objects;
CREATE POLICY evidence_update
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'complaint_evidence'
  AND (
    public.is_admin_or_in_charge()
    OR auth.uid()::text = (storage.foldername(name))[2]
  )
);

DROP POLICY IF EXISTS evidence_delete ON storage.objects;
CREATE POLICY evidence_delete
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'complaint_evidence'
  AND (
    public.is_admin_or_in_charge()
    OR auth.uid()::text = (storage.foldername(name))[2]
  )
);
