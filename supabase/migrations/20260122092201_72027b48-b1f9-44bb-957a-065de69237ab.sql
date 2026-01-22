-- Ensure updated_at is maintained automatically
DO $$ BEGIN
  -- profiles
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_profiles_set_updated_at') THEN
    EXECUTE 'DROP TRIGGER trg_profiles_set_updated_at ON public.profiles';
  END IF;
  EXECUTE 'CREATE TRIGGER trg_profiles_set_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()';

  -- officer_roster
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_officer_roster_set_updated_at') THEN
    EXECUTE 'DROP TRIGGER trg_officer_roster_set_updated_at ON public.officer_roster';
  END IF;
  EXECUTE 'CREATE TRIGGER trg_officer_roster_set_updated_at BEFORE UPDATE ON public.officer_roster FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()';

  -- complaints
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_complaints_set_updated_at') THEN
    EXECUTE 'DROP TRIGGER trg_complaints_set_updated_at ON public.complaints';
  END IF;
  EXECUTE 'CREATE TRIGGER trg_complaints_set_updated_at BEFORE UPDATE ON public.complaints FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()';

  -- assign default role when a profile is created
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_profiles_assign_default_role') THEN
    EXECUTE 'DROP TRIGGER trg_profiles_assign_default_role ON public.profiles';
  END IF;
  EXECUTE 'CREATE TRIGGER trg_profiles_assign_default_role AFTER INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.assign_default_role()';
END $$;