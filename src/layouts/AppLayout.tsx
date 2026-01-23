import AppSidebar from "@/components/app/AppSidebar";
import { Button } from "@/components/ui/button";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useRoleFlags } from "@/hooks/useRoleFlags";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";

export default function AppLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { loading, flags } = useRoleFlags();

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({ title: "Logout failed", description: error.message, variant: "destructive" });
      return;
    }
    navigate("/login", { replace: true });
  };

  // Keep layout stable; sidebar items will resolve once role flags load.
  return (
    <SidebarProvider>
      <div className="min-h-svh w-full">
        <div className="flex min-h-svh w-full">
          <AppSidebar flags={flags} />

          <SidebarInset>
            <header className="sticky top-0 z-20 flex h-12 items-center gap-2 border-b bg-background/70 px-3 backdrop-blur">
              {/* CRITICAL: only one trigger, in the global header */}
              <SidebarTrigger />
              <div className="flex-1" />
              {loading ? null : (
                <div className="text-xs text-muted-foreground">{flags.isAdminOrInCharge ? "In-charge/Admin" : "Officer"}</div>
              )}
              <Button variant="outline" size="sm" onClick={() => navigate("/app/profile")}>
                Profile
              </Button>
              <Button size="sm" onClick={logout}>
                Logout
              </Button>
            </header>

            <div className="flex-1 p-4 md:p-6">{children}</div>
          </SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  );
}
