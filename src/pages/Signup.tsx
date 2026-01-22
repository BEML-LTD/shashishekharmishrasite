import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { staffNumberToEmail } from "@/lib/authEmail";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function Signup() {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [selectedStaff, setSelectedStaff] = useState<string>("");
  const [rosterLoading, setRosterLoading] = useState(true);
  const [roster, setRoster] = useState<Array<{ staff_number: string; full_name: string }>>([]);
  const [loading, setLoading] = useState(false);

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

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!selectedStaff) throw new Error("Please select your name from the roster.");
      const fullName = roster.find((r) => r.staff_number === selectedStaff)?.full_name;
      if (!fullName) throw new Error("Selected roster entry not found.");
      const staffNumber = selectedStaff;
      const email = staffNumberToEmail(staffNumber);
      const password = `${staffNumber.trim()}@1234`;

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            full_name: fullName,
            staff_number: staffNumber,
          },
        },
      });
      if (error) throw error;

      // Basic profile row (optional; if you already have triggers, this will still be fine)
      if (data.user) {
        await supabase.from("profiles").upsert({
          user_id: data.user.id,
          full_name: fullName,
          staff_number: staffNumber,
        });
      }

      toast({
        title: "Account created",
        description: "You can now sign in.",
      });
      navigate("/login", { replace: true });
    } catch (err: any) {
      toast({
        title: "Signup failed",
        description: err?.message || "Please verify your details and try again.",
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
            <CardTitle>Create account</CardTitle>
            <CardDescription>Select your name from the roster. Password is StaffNumber@1234.</CardDescription>
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
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Creating…" : "Create account"}
              </Button>
              <div className="text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link className="text-primary underline underline-offset-4" to="/login">
                  Sign in
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </main>
  );
}
