import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

type ProfileRow = {
  user_id: string;
  full_name: string;
  staff_number: string;
  phone: string | null;
  avatar_url: string | null;
};

function sanitizePhone(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  // keep digits only
  return trimmed.replace(/\D/g, "");
}

export default function Profile() {
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      setLoading(true);
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (!mounted) return;

      if (userErr || !userData.user) {
        setProfile(null);
        setLoading(false);
        toast({
          title: "Session not found",
          description: "Please sign in again.",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, staff_number, phone, avatar_url")
        .eq("user_id", userData.user.id)
        .maybeSingle();

      if (!mounted) return;

      if (error) {
        setProfile(null);
        toast({ title: "Failed to load profile", description: error.message, variant: "destructive" });
      } else if (!data) {
        setProfile(null);
        toast({
          title: "Profile not found",
          description: "Your profile record is missing. Please contact admin.",
          variant: "destructive",
        });
      } else {
        const p = data as ProfileRow;
        setProfile(p);
        setFullName(p.full_name ?? "");
        setPhone(p.phone ?? "");
      }
      setLoading(false);
    };
    run();
    return () => {
      mounted = false;
    };
  }, [toast]);

  const avatarSrc = useMemo(() => {
    if (!profile?.avatar_url) return null;
    return profile.avatar_url;
  }, [profile?.avatar_url]);

  const onPickAvatar = () => fileInputRef.current?.click();

  const onAvatarSelected = async (file: File | null) => {
    if (!file || !profile?.user_id) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please choose an image file.", variant: "destructive" });
      return;
    }

    // 5MB limit (keeps uploads snappy and avoids user frustration)
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Please upload an image under 5MB.", variant: "destructive" });
      return;
    }

    setUploadingAvatar(true);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const safeExt = ext.match(/^(png|jpg|jpeg|webp)$/) ? ext : "jpg";
      const path = `${profile.user_id}/${Date.now()}.${safeExt}`;

      const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, {
        upsert: true,
        contentType: file.type,
      });
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from("avatars").getPublicUrl(path);
      const publicUrl = publicUrlData.publicUrl;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("user_id", profile.user_id);
      if (updateError) throw updateError;

      setProfile((prev) => (prev ? { ...prev, avatar_url: publicUrl } : prev));
      toast({ title: "Profile photo updated" });
    } catch (err: any) {
      toast({ title: "Avatar upload failed", description: err?.message || "Please try again.", variant: "destructive" });
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const saveProfile = async () => {
    if (!profile?.user_id) return;
    const cleanName = fullName.trim();
    const cleanPhone = sanitizePhone(phone);

    if (!cleanName) {
      toast({ title: "Name required", description: "Please enter your full name.", variant: "destructive" });
      return;
    }

    if (cleanPhone && (cleanPhone.length < 10 || cleanPhone.length > 15)) {
      toast({
        title: "Invalid phone",
        description: "Phone number should be 10–15 digits.",
        variant: "destructive",
      });
      return;
    }

    setSavingProfile(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: cleanName, phone: cleanPhone ? cleanPhone : null })
        .eq("user_id", profile.user_id);
      if (error) throw error;

      setProfile((prev) =>
        prev
          ? {
              ...prev,
              full_name: cleanName,
              phone: cleanPhone ? cleanPhone : null,
            }
          : prev
      );
      toast({ title: "Profile saved" });
    } catch (err: any) {
      toast({ title: "Save failed", description: err?.message || "Please try again.", variant: "destructive" });
    } finally {
      setSavingProfile(false);
    }
  };

  const changePassword = async () => {
    const p1 = newPassword;
    const p2 = confirmPassword;

    if (!p1 || !p2) {
      toast({ title: "Password required", description: "Enter and confirm the new password.", variant: "destructive" });
      return;
    }
    if (p1.length < 8) {
      toast({ title: "Weak password", description: "Minimum 8 characters.", variant: "destructive" });
      return;
    }
    if (p1 !== p2) {
      toast({ title: "Passwords do not match", description: "Please retype the same password.", variant: "destructive" });
      return;
    }

    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: p1 });
      if (error) throw error;

      setNewPassword("");
      setConfirmPassword("");
      toast({ title: "Password updated" });
    } catch (err: any) {
      toast({ title: "Password update failed", description: err?.message || "Please try again.", variant: "destructive" });
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-3xl px-4 py-10">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Profile</h1>
            <p className="text-sm text-muted-foreground">Update your details, photo, and password.</p>
          </div>
          <Button asChild variant="outline">
            <Link to="/app">Back</Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic details</CardTitle>
              <CardDescription>Your staff number is managed by the system.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {loading ? (
                <div className="text-sm text-muted-foreground">Loading…</div>
              ) : !profile ? (
                <div className="text-sm text-muted-foreground">No profile loaded.</div>
              ) : (
                <>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-16 w-16 overflow-hidden rounded-full border bg-muted">
                        {avatarSrc ? (
                          <img
                            src={avatarSrc}
                            alt="Profile photo"
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                            No photo
                          </div>
                        )}
                      </div>

                      <div>
                        <div className="text-sm font-medium text-foreground">{profile.full_name}</div>
                        <div className="text-xs text-muted-foreground">Staff: {profile.staff_number}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => onAvatarSelected(e.target.files?.[0] ?? null)}
                      />
                      <Button type="button" variant="outline" onClick={onPickAvatar} disabled={uploadingAvatar}>
                        {uploadingAvatar ? "Uploading…" : "Change photo"}
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="full_name">Full name</Label>
                      <Input
                        id="full_name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        autoComplete="name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        inputMode="numeric"
                        placeholder="10-digit mobile"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        autoComplete="tel"
                      />
                      <p className="text-xs text-muted-foreground">Digits only (10–15). Example: 9876543210</p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
            <CardFooter className="flex items-center justify-end">
              <Button type="button" onClick={saveProfile} disabled={loading || !profile || savingProfile}>
                {savingProfile ? "Saving…" : "Save changes"}
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Change password</CardTitle>
              <CardDescription>Set a new password (minimum 8 characters).</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="new_password">New password</Label>
                <Input
                  id="new_password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm_password">Confirm password</Label>
                <Input
                  id="confirm_password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
            </CardContent>
            <CardFooter className="flex items-center justify-end">
              <Button type="button" onClick={changePassword} disabled={savingPassword}>
                {savingPassword ? "Updating…" : "Update password"}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </main>
  );
}
