import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function Signup() {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [staffNumber, setStaffNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
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
            <CardDescription>Sign up with your details and set a password.</CardDescription>
          </CardHeader>
          <form onSubmit={onSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full name</Label>
                <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="staff">Staff number</Label>
                <Input id="staff" value={staffNumber} onChange={(e) => setStaffNumber(e.target.value)} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                />
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
