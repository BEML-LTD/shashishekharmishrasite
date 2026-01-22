import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { staffNumberToEmail } from "@/lib/authEmail";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

export default function Login() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;

  const [selectedStaff, setSelectedStaff] = useState<string>("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [rosterLoading, setRosterLoading] = useState(true);
  const [roster, setRoster] = useState<Array<{ staff_number: string; full_name: string }>>([]);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      setRosterLoading(true);
      const { data, error } = await supabase
        .from("officer_roster")
        .select("staff_number, full_name")
        .order("full_name", { ascending: true });
      if (!mounted) return;
      if (error) {
        setRoster([]);
        toast({ title: "Failed to load roster", description: error.message, variant: "destructive" });
      } else {
        setRoster(data ?? []);
      }
      setRosterLoading(false);
    };
    run();
    return () => {
      mounted = false;
    };
  }, [toast]);

  const selectedName = useMemo(
    () => roster.find((r) => r.staff_number === selectedStaff)?.full_name,
    [roster, selectedStaff]
  );

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!selectedStaff) throw new Error("Please select your name from the roster.");
      const email = staffNumberToEmail(selectedStaff);

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      navigate(from || "/app", { replace: true });
    } catch (err: any) {
      toast({
        title: "Login failed",
        description: err?.message || "Please check your credentials and try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen w-full max-w-lg items-center px-4">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>Select your name and enter your password.</CardDescription>
          </CardHeader>
          <form onSubmit={onSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Your name</Label>
                <Select value={selectedStaff} onValueChange={setSelectedStaff} disabled={rosterLoading}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={rosterLoading ? "Loading roster…" : "Select your name"} />
                  </SelectTrigger>
                  <SelectContent className="z-50 bg-popover">
                    {roster.map((r) => (
                      <SelectItem key={r.staff_number} value={r.staff_number}>
                        {r.full_name} ({r.staff_number})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedName ? (
                  <p className="text-xs text-muted-foreground">Selected: {selectedName}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in…" : "Sign in"}
              </Button>
              <div className="text-sm text-muted-foreground">
                <div>
                  New here?{" "}
                  <Link className="text-primary underline underline-offset-4" to="/signup">
                    Create account
                  </Link>
                </div>
                <div>
                  Admin?{" "}
                  <Link className="text-primary underline underline-offset-4" to="/admin-unlock">
                    Unlock admin login
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
