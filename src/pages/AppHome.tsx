import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

export default function AppHome() {
  const { toast } = useToast();
  const navigate = useNavigate();

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({ title: "Logout failed", description: error.message, variant: "destructive" });
      return;
    }
    navigate("/login", { replace: true });
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-3xl px-4 py-10">
        <Card>
          <CardHeader>
            <CardTitle>Authenticated area</CardTitle>
            <CardDescription>You’re signed in. Next we’ll build the PRD screens here.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-4">
            <div className="text-sm text-muted-foreground">Route: /app</div>
            <Button onClick={logout}>Logout</Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
