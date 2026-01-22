import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function AdminUnlock() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [passcode, setPasscode] = useState("");

  // NOTE: This passcode is NOT an authorization mechanism.
  // It only reveals the admin login screen. Admin privileges are enforced by backend roles.
  const expected = useMemo(() => "9799494321", []);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode.trim() !== expected) {
      toast({ title: "Invalid passcode", description: "Please try again.", variant: "destructive" });
      return;
    }
    navigate("/admin-login", { replace: true });
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen w-full max-w-lg items-center px-4">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Admin unlock</CardTitle>
            <CardDescription>Enter the admin passcode to continue to the admin login.</CardDescription>
          </CardHeader>
          <form onSubmit={onSubmit}>
            <CardContent className="space-y-2">
              <Label htmlFor="passcode">Passcode</Label>
              <Input
                id="passcode"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                required
              />
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full">
                Continue
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </main>
  );
}
