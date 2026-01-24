-- Fix: Postgres doesn't support `CREATE POLICY IF NOT EXISTS`.

-- 1) Profile audit history
create table if not exists public.profile_audit (
  id uuid primary key default gen_random_uuid(),
  target_user_id uuid not null,
  actor_user_id uuid,
  staff_number text,
  changes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.profile_audit enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profile_audit'
      and policyname = 'profile_audit_read_admin_or_in_charge'
  ) then
    execute 'create policy "profile_audit_read_admin_or_in_charge" on public.profile_audit for select using (public.is_admin_or_in_charge())';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profile_audit'
      and policyname = 'profile_audit_no_insert'
  ) then
    execute 'create policy "profile_audit_no_insert" on public.profile_audit for insert with check (false)';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profile_audit'
      and policyname = 'profile_audit_no_update'
  ) then
    execute 'create policy "profile_audit_no_update" on public.profile_audit for update using (false) with check (false)';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profile_audit'
      and policyname = 'profile_audit_no_delete'
  ) then
    execute 'create policy "profile_audit_no_delete" on public.profile_audit for delete using (false)';
  end if;
end
$$;

create or replace function public.log_profile_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  diff jsonb := '{}'::jsonb;
begin
  if (new.full_name is distinct from old.full_name) then
    diff := diff || jsonb_build_object('full_name', jsonb_build_object('from', old.full_name, 'to', new.full_name));
  end if;

  if (new.phone is distinct from old.phone) then
    diff := diff || jsonb_build_object('phone', jsonb_build_object('from', old.phone, 'to', new.phone));
  end if;

  if (new.avatar_url is distinct from old.avatar_url) then
    diff := diff || jsonb_build_object('avatar_url', jsonb_build_object('from', old.avatar_url, 'to', new.avatar_url));
  end if;

  if diff <> '{}'::jsonb then
    insert into public.profile_audit (target_user_id, actor_user_id, staff_number, changes)
    values (new.user_id, auth.uid(), new.staff_number, diff);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_profile_audit on public.profiles;
create trigger trg_profile_audit
before update on public.profiles
for each row
execute function public.log_profile_audit();

-- 2) Assisted password reset enforcement
alter table public.profiles
add column if not exists must_change_password boolean not null default false;

alter table public.profiles
add column if not exists temp_password_set_at timestamptz;

-- 3) Complaints: enforce admin-only final resolution + better officer update rules
create or replace function public.enforce_admin_only_resolution()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'resolved'::complaint_status and old.status is distinct from new.status then
    if not public.is_admin() then
      raise exception 'Only admin can resolve complaints.';
    end if;
    new.resolved_at := now();
  end if;

  return new;
end;
$$;

drop trigger if exists trg_complaints_admin_only_resolve on public.complaints;
create trigger trg_complaints_admin_only_resolve
before update on public.complaints
for each row
execute function public.enforce_admin_only_resolution();

-- Replace officer update policy to disallow editing after 24h and after resolved
-- (Drop old policy if present)
drop policy if exists complaints_update_admin_or_own_24h_or_resolve on public.complaints;

-- (Drop newer name too if rerun)
drop policy if exists complaints_update_admin_or_in_charge_or_own_24h on public.complaints;

create policy "complaints_update_admin_or_in_charge_or_own_24h"
on public.complaints
for update
using (
  public.is_admin_or_in_charge()
  or (
    reporter_user_id = auth.uid()
    and created_at > (now() - interval '24 hours')
    and status <> 'resolved'::complaint_status
  )
)
with check (
  public.is_admin_or_in_charge()
  or (
    reporter_user_id = auth.uid()
    and created_at > (now() - interval '24 hours')
    and status <> 'resolved'::complaint_status
  )
);

-- Indexes
create index if not exists idx_profile_audit_target_created_at on public.profile_audit (target_user_id, created_at desc);
create index if not exists idx_compliance_sync_complaint_attempt_at on public.compliance_sync (complaint_id, attempt_at desc);
create index if not exists idx_complaints_created_at on public.complaints (created_at desc);
create index if not exists idx_complaints_coach_status on public.complaints (coach_number, status);
