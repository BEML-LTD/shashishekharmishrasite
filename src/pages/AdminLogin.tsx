import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function AdminLogin() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Gate this screen behind the passcode unlock, per PRD.
  useEffect(() => {
    const unlocked = sessionStorage.getItem("admin_unlocked") === "true";
    if (!unlocked) navigate("/admin-unlock", { replace: true });
  }, [navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      navigate("/app", { replace: true });
    } catch (err: any) {
      toast({ title: "Admin login failed", description: err?.message || "Try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen w-full max-w-lg items-center px-4">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Admin sign in</CardTitle>
            <CardDescription>Admin accounts are validated by backend roles.</CardDescription>
          </CardHeader>
          <form onSubmit={onSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </CardContent>
            <CardFooter>
              <div className="flex w-full flex-col gap-3">
                <Button className="w-full" type="submit" disabled={loading}>
                  {loading ? "Signing in…" : "Sign in"}
                </Button>
                <div className="text-sm text-muted-foreground">
                  Officer login?{" "}
                  <Link className="text-primary underline underline-offset-4" to="/login">
                    Go to roster sign in
                  </Link>
                </div>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </main>
  );
}
