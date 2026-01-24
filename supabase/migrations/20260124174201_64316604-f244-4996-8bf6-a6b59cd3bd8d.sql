-- Create private bucket for complaint evidence
insert into storage.buckets (id, name, public)
values ('evidence', 'evidence', false)
on conflict (id) do nothing;

-- RLS policies for evidence objects
-- Users can manage (CRUD) only files inside their own folder: <user_id>/...
-- Admin/In-charge can read all evidence.

-- Read own
create policy "evidence_read_own"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'evidence'
  and auth.uid()::text = (storage.foldername(name))[1]
);

-- Read all for admin/in-charge
create policy "evidence_read_admin_or_in_charge"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'evidence'
  and is_admin_or_in_charge()
);

-- Insert own
create policy "evidence_insert_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'evidence'
  and auth.uid()::text = (storage.foldername(name))[1]
);

-- Update own
create policy "evidence_update_own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'evidence'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'evidence'
  and auth.uid()::text = (storage.foldername(name))[1]
);

-- Delete own
create policy "evidence_delete_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'evidence'
  and auth.uid()::text = (storage.foldername(name))[1]
);
