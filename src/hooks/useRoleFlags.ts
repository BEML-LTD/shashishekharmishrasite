import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

export type RoleFlags = {
  isAdmin: boolean;
  isInCharge: boolean;
  isAdminOrInCharge: boolean;
};

const DEFAULT_FLAGS: RoleFlags = {
  isAdmin: false,
  isInCharge: false,
  isAdminOrInCharge: false,
};

export function useRoleFlags() {
  const [loading, setLoading] = useState(true);
  const [flags, setFlags] = useState<RoleFlags>(DEFAULT_FLAGS);

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      setLoading(true);

      const [{ data: admin, error: adminErr }, { data: inCharge, error: inChargeErr }, { data: adminOr, error: adminOrErr }]
        = await Promise.all([
          supabase.rpc("is_admin"),
          supabase.rpc("is_in_charge"),
          supabase.rpc("is_admin_or_in_charge"),
        ]);

      if (!mounted) return;

      // If RPC fails (should be rare), fail closed (no privilege).
      if (adminErr || inChargeErr || adminOrErr) {
        setFlags(DEFAULT_FLAGS);
        setLoading(false);
        return;
      }

      setFlags({
        isAdmin: Boolean(admin),
        isInCharge: Boolean(inCharge),
        isAdminOrInCharge: Boolean(adminOr),
      });
      setLoading(false);
    };

    run();

    return () => {
      mounted = false;
    };
  }, []);

  return { loading, flags };
}
