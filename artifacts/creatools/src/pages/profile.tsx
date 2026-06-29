import { useState } from "react";
import { User, Lock, Shield, Save, Loader2, CheckCircle2, Tag } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAuth, authFetch } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

export default function Profile() {
  const { user, token, refreshUser } = useAuth();
  const { toast } = useToast();

  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [profileLoading, setProfileLoading] = useState(false);

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    setProfileLoading(true);
    try {
      await authFetch("/auth/profile", token, {
        method: "PATCH",
        body: JSON.stringify({ name, email }),
      });
      await refreshUser();
      toast({ title: "Profile updated", description: "Your changes have been saved." });
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to update profile", variant: "destructive" });
    } finally {
      setProfileLoading(false);
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    if (newPw !== confirmPw) {
      toast({ title: "Passwords don't match", variant: "destructive" }); return;
    }
    if (newPw.length < 6) {
      toast({ title: "Password too short", description: "At least 6 characters required.", variant: "destructive" }); return;
    }
    setPwLoading(true);
    try {
      await authFetch("/auth/password", token, {
        method: "PATCH",
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
      toast({ title: "Password changed", description: "Your new password is active." });
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to change password", variant: "destructive" });
    } finally {
      setPwLoading(false);
    }
  }

  const planLabel = user?.plan === "free" ? "Sandbox (Free)" : user?.plan === "basic" ? "Basic+" : "Pro";
  const memberSince = user?.createdAt ? new Date(user.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "";

  return (
    <div className="space-y-8 max-w-2xl animate-in fade-in duration-300">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
        <p className="text-muted-foreground mt-1">Manage your account information and password</p>
      </div>

      {/* Account summary */}
      <Card className="bg-card border-border">
        <CardContent className="p-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center text-xl font-bold text-primary">
              {user?.name?.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-lg truncate">{user?.name}</p>
              <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Member since {memberSince}</p>
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              <Badge variant="outline" className="capitalize">{planLabel}</Badge>
              {user?.isAdmin && (
                <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
                  <Shield className="w-3 h-3 mr-1" /> Admin
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit profile */}
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />
            <CardTitle className="text-base">Account Info</CardTitle>
          </div>
          <CardDescription>Update your name and email address</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileSave} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="p-name">Full name</Label>
              <Input
                id="p-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="bg-background border-border"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-email">Email address</Label>
              <Input
                id="p-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-background border-border font-mono text-sm"
              />
            </div>
            <Button type="submit" disabled={profileLoading}>
              {profileLoading
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</>
                : <><Save className="w-4 h-4 mr-2" />Save changes</>}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Change password */}
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-primary" />
            <CardTitle className="text-base">Change Password</CardTitle>
          </div>
          <CardDescription>Enter your current password to set a new one</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="curr-pw">Current password</Label>
              <Input
                id="curr-pw"
                type="password"
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                required
                autoComplete="current-password"
                className="bg-background border-border"
              />
            </div>
            <Separator />
            <div className="space-y-1.5">
              <Label htmlFor="new-pw">New password</Label>
              <Input
                id="new-pw"
                type="password"
                placeholder="At least 6 characters"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                required
                autoComplete="new-password"
                className="bg-background border-border"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-pw">Confirm new password</Label>
              <Input
                id="confirm-pw"
                type="password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                required
                autoComplete="new-password"
                className={`bg-background border-border ${confirmPw && confirmPw !== newPw ? "border-destructive" : ""}`}
              />
              {confirmPw && confirmPw !== newPw && (
                <p className="text-xs text-destructive">Passwords don't match</p>
              )}
            </div>
            <Button type="submit" disabled={pwLoading} variant="outline">
              {pwLoading
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Updating…</>
                : <><CheckCircle2 className="w-4 h-4 mr-2" />Update password</>}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Plan info */}
      <Card className="bg-card border-border border-dashed">
        <CardContent className="p-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Current plan: <span className="text-primary">{planLabel}</span></p>
            <p className="text-xs text-muted-foreground mt-0.5">Upgrade to unlock more API features from tik.tools</p>
          </div>
          <Link href="/pricing">
            <Button size="sm" variant="outline">
              <Tag className="w-3.5 h-3.5 mr-1.5" />
              View plans
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
