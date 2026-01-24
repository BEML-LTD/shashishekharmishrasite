-- 1) Allow all authenticated users to view all complaints
-- Replace the current admin-or-own SELECT policy.
DROP POLICY IF EXISTS complaints_read_admin_or_own ON public.complaints;

CREATE POLICY complaints_read_authenticated_all
ON public.complaints
FOR SELECT
TO authenticated
USING (true);

-- 2) Allow in_charge users to resolve/close (status = resolved)
CREATE OR REPLACE FUNCTION public.enforce_admin_only_resolution()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
begin
  if new.status = 'resolved'::complaint_status and old.status is distinct from new.status then
    if not public.is_admin_or_in_charge() then
      raise exception 'Only admin or in-charge can resolve complaints.';
    end if;
    new.resolved_at := now();
  end if;

  return new;
end;
$$;