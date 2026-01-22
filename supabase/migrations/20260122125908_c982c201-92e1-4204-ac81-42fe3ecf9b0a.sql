-- 1) Allow unauthenticated users (anon) to read the roster for login/signup
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'officer_roster'
      AND policyname = 'roster_read_for_login_anon'
  ) THEN
    CREATE POLICY roster_read_for_login_anon
    ON public.officer_roster
    FOR SELECT
    TO anon
    USING ((active = true) AND (show_in_login = true));
  END IF;
END $$;

-- 2) Auto-assign default roles when a profile is created
DROP TRIGGER IF EXISTS trg_assign_default_role ON public.profiles;
CREATE TRIGGER trg_assign_default_role
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.assign_default_role();

-- 3) Keep profiles.updated_at correct
DROP TRIGGER IF EXISTS trg_profiles_set_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_set_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();