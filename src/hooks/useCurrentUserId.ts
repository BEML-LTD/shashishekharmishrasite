import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

export function useCurrentUserId() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      setLoading(true);
      const { data, error } = await supabase.auth.getUser();
      if (!mounted) return;
      if (error || !data.user) {
        setUserId(null);
        setLoading(false);
        return;
      }
      setUserId(data.user.id);
      setLoading(false);
    };

    run();

    return () => {
      mounted = false;
    };
  }, []);

  return { userId, loading };
}
