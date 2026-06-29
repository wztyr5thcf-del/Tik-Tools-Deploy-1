import { useState, useEffect, useCallback } from "react";
import {
  Shield, Trash2, RefreshCw, UserCog, Crown, Zap, Users2, Search,
  Settings2, CreditCard, Radio, CheckCircle2, XCircle, Loader2, KeyRound, Eye, EyeOff,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth, authFetch, type AuthUser } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";

const PLAN_COLORS: Record<string, string> = {
  free: "bg-muted/40 text-muted-foreground border-muted",
  basic: "bg-cyan-400/10 text-cyan-400 border-cyan-400/30",
  pro: "bg-violet-400/10 text-violet-400 border-violet-400/30",
};

const PLAN_LABEL: Record<string, string> = {
  free: "Sandbox",
  basic: "Basic+",
  pro: "Pro",
};

interface StripeConfig {
  secretKeySet: boolean;
  webhookSecretSet: boolean;
  publishableKey: string | null;
  priceIdBasic: string | null;
  priceIdPro: string | null;
  tiktoolsKeySet: boolean;
  paymentsEnabled: boolean;
}

interface TestResult {
  ok: boolean;
  message: string;
}

export default function Admin() {
  const { user: me, token } = useAuth();
  const { toast } = useToast();

  // ── Users state ──────────────────────────────────────────────
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // ── Stripe config state ───────────────────────────────────────
  const [stripeConfig, setStripeConfig] = useState<StripeConfig | null>(null);
  const [stripeLoading, setStripeLoading] = useState(true);
  const [stripeSaving, setStripeSaving] = useState(false);
  const [paymentsEnabled, setPaymentsEnabled] = useState(true);
  const [publishableKey, setPublishableKey] = useState("");
  const [priceIdBasic, setPriceIdBasic] = useState("");
  const [priceIdPro, setPriceIdPro] = useState("");
  const [showPubKey, setShowPubKey] = useState(false);

  // ── Test states ───────────────────────────────────────────────
  const [testingStripe, setTestingStripe] = useState(false);
  const [testingTiktools, setTestingTiktools] = useState(false);
  const [stripeTestResult, setStripeTestResult] = useState<TestResult | null>(null);
  const [tiktoolsTestResult, setTiktoolsTestResult] = useState<TestResult | null>(null);

  // ── Fetch users ───────────────────────────────────────────────
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await authFetch("/auth/users", token) as { users: AuthUser[] };
      setUsers(data.users);
    } catch (err) {
      toast({ title: "Failed to load users", description: err instanceof Error ? err.message : "Error", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [token, toast]);

  // ── Fetch stripe config ───────────────────────────────────────
  const fetchStripeConfig = useCallback(async () => {
    setStripeLoading(true);
    try {
      const data = await authFetch("/admin/stripe-config", token) as StripeConfig;
      setStripeConfig(data);
      setPublishableKey(data.publishableKey ?? "");
      setPriceIdBasic(data.priceIdBasic ?? "");
      setPriceIdPro(data.priceIdPro ?? "");
      setPaymentsEnabled(data.paymentsEnabled ?? true);
    } catch {
      // silently fail
    } finally {
      setStripeLoading(false);
    }
  }, [token]);

  useEffect(() => { void fetchUsers(); }, [fetchUsers]);
  useEffect(() => { void fetchStripeConfig(); }, [fetchStripeConfig]);

  // ── User management ───────────────────────────────────────────
  async function updateUser(id: string, patch: Partial<{ plan: string; isAdmin: boolean }>) {
    setUpdatingId(id);
    try {
      await authFetch(`/auth/users/${id}`, token, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      await fetchUsers();
      toast({ title: "User updated" });
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed", variant: "destructive" });
    } finally {
      setUpdatingId(null);
    }
  }

  async function deleteUser(id: string) {
    try {
      await authFetch(`/auth/users/${id}`, token, { method: "DELETE" });
      setUsers((u) => u.filter((x) => x.id !== id));
      toast({ title: "User deleted" });
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed", variant: "destructive" });
    }
  }

  // ── Stripe config save ────────────────────────────────────────
  async function saveStripeConfig(overrideEnabled?: boolean) {
    setStripeSaving(true);
    const enabled = overrideEnabled ?? paymentsEnabled;
    try {
      await authFetch("/admin/stripe-config", token, {
        method: "PATCH",
        body: JSON.stringify({
          publishableKey: publishableKey.trim() || null,
          priceIdBasic: priceIdBasic.trim() || null,
          priceIdPro: priceIdPro.trim() || null,
          paymentsEnabled: enabled,
        }),
      });
      await fetchStripeConfig();
      toast({ title: "Stripe configuration saved" });
    } catch (err) {
      toast({ title: "Save failed", description: err instanceof Error ? err.message : "Error", variant: "destructive" });
    } finally {
      setStripeSaving(false);
    }
  }

  // ── Connection tests ──────────────────────────────────────────
  async function testStripe() {
    setTestingStripe(true);
    setStripeTestResult(null);
    try {
      const result = await authFetch("/admin/test-stripe", token, { method: "POST" }) as TestResult;
      setStripeTestResult(result);
    } catch (err) {
      setStripeTestResult({ ok: false, message: err instanceof Error ? err.message : "Connection error" });
    } finally {
      setTestingStripe(false);
    }
  }

  async function testTiktools() {
    setTestingTiktools(true);
    setTiktoolsTestResult(null);
    try {
      const result = await authFetch("/admin/test-tiktools", token, { method: "POST" }) as TestResult;
      setTiktoolsTestResult(result);
    } catch (err) {
      setTiktoolsTestResult({ ok: false, message: err instanceof Error ? err.message : "Connection error" });
    } finally {
      setTestingTiktools(false);
    }
  }

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  const totalAdmin = users.filter((u) => u.isAdmin).length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-5 h-5 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">Admin Panel</h1>
          </div>
          <p className="text-muted-foreground">Manage users, plans, and system configuration</p>
        </div>
        <Button size="sm" variant="outline" onClick={fetchUsers} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Users", value: users.length, icon: Users2, color: "text-primary" },
          { label: "Admins", value: totalAdmin, icon: Shield, color: "text-violet-400" },
          { label: "Basic+", value: users.filter((u) => u.plan === "basic").length, icon: Zap, color: "text-cyan-400" },
          { label: "Pro", value: users.filter((u) => u.plan === "pro").length, icon: Crown, color: "text-yellow-400" },
        ].map((s) => (
          <Card key={s.label} className="bg-card border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <s.icon className={`w-5 h-5 shrink-0 ${s.color}`} />
              <div>
                <p className={`text-2xl font-bold font-mono ${s.color}`}>{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Users table */}
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <UserCog className="w-4 h-4 text-primary" /> Users
              </CardTitle>
              <CardDescription>{users.length} registered accounts</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Search by name or email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 text-sm bg-background border-border h-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Loading users…
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">No users found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-xs">User</TableHead>
                  <TableHead className="text-xs">Plan</TableHead>
                  <TableHead className="text-xs">Role</TableHead>
                  <TableHead className="text-xs">Joined</TableHead>
                  <TableHead className="text-xs text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((u) => (
                  <TableRow key={u.id} className="border-border">
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                          {u.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate max-w-[140px]">{u.name}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[140px] font-mono">{u.email}</p>
                        </div>
                        {u.id === me?.id && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">you</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={u.plan}
                        onValueChange={(v) => updateUser(u.id, { plan: v })}
                        disabled={updatingId === u.id}
                      >
                        <SelectTrigger className={`h-7 w-28 text-xs border font-medium ${PLAN_COLORS[u.plan]}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="free" className="text-xs">{PLAN_LABEL.free}</SelectItem>
                          <SelectItem value="basic" className="text-xs">{PLAN_LABEL.basic}</SelectItem>
                          <SelectItem value="pro" className="text-xs">{PLAN_LABEL.pro}</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant={u.isAdmin ? "default" : "outline"}
                        className={`h-7 text-xs px-2 ${u.isAdmin ? "bg-primary/10 text-primary border-primary/30 hover:bg-primary/20" : ""}`}
                        onClick={() => updateUser(u.id, { isAdmin: !u.isAdmin })}
                        disabled={updatingId === u.id || (u.id === me?.id)}
                        title={u.id === me?.id ? "Cannot remove your own admin" : undefined}
                      >
                        <Shield className="w-3 h-3 mr-1" />
                        {u.isAdmin ? "Admin" : "User"}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground font-mono">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {u.id !== me?.id && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive">
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete user?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete <strong>{u.name}</strong> ({u.email}). This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteUser(u.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ── System Configuration ───────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Stripe Configuration */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-primary" /> Stripe Configuration
            </CardTitle>
            <CardDescription>
              Publishable key and price IDs are stored in <code className="text-xs text-primary">data/stripe-config.json</code>.
              Secret key and webhook secret must be set as environment variables.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {stripeLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading…
              </div>
            ) : (
              <>
                {/* Env var status */}
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { label: "STRIPE_SECRET_KEY", set: stripeConfig?.secretKeySet },
                    { label: "STRIPE_WEBHOOK_SECRET", set: stripeConfig?.webhookSecretSet },
                    { label: "TIKTOOLS_API_KEY", set: stripeConfig?.tiktoolsKeySet },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-2 text-xs">
                      {item.set ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-chart-3 shrink-0" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-destructive shrink-0" />
                      )}
                      <code className="text-muted-foreground">{item.label}</code>
                      <span className={item.set ? "text-chart-3" : "text-destructive"}>
                        {item.set ? "set" : "not set"}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-border pt-4 space-y-3">
                  {/* Publishable key */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      <KeyRound className="w-3 h-3" /> Publishable Key
                    </Label>
                    <div className="relative">
                      <Input
                        type={showPubKey ? "text" : "password"}
                        value={publishableKey}
                        onChange={(e) => setPublishableKey(e.target.value)}
                        placeholder="pk_live_… or pk_test_…"
                        className="text-xs font-mono bg-background border-border pr-9"
                      />
                      <button
                        type="button"
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowPubKey((v) => !v)}
                      >
                        {showPubKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Price ID Basic */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Price ID — Basic+</Label>
                    <Input
                      value={priceIdBasic}
                      onChange={(e) => setPriceIdBasic(e.target.value)}
                      placeholder="price_…"
                      className="text-xs font-mono bg-background border-border"
                    />
                  </div>

                  {/* Price ID Pro */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Price ID — Pro</Label>
                    <Input
                      value={priceIdPro}
                      onChange={(e) => setPriceIdPro(e.target.value)}
                      placeholder="price_…"
                      className="text-xs font-mono bg-background border-border"
                    />
                  </div>

                  {/* Payments enabled toggle */}
                  <div className="flex items-center justify-between rounded-md border border-border px-3 py-2.5 bg-background">
                    <div>
                      <p className="text-sm font-medium">Payments enabled</p>
                      <p className="text-xs text-muted-foreground">
                        Disable to test UI without Stripe configured
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={paymentsEnabled}
                      onClick={async () => {
                        const next = !paymentsEnabled;
                        setPaymentsEnabled(next);
                        await saveStripeConfig(next);
                      }}
                      disabled={stripeSaving}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none disabled:opacity-50 ${
                        paymentsEnabled ? "bg-chart-3" : "bg-muted"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform ${
                          paymentsEnabled ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => saveStripeConfig()}
                    disabled={stripeSaving}
                    className="w-full"
                  >
                    {stripeSaving ? (
                      <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />Saving…</>
                    ) : (
                      <><Settings2 className="w-3.5 h-3.5 mr-2" />Save Configuration</>
                    )}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Connection Tests */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Radio className="w-4 h-4 text-primary" /> Connection Tests
            </CardTitle>
            <CardDescription>
              Verify that external services are reachable and credentials are valid.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">

            {/* Stripe test */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Stripe</p>
                  <p className="text-xs text-muted-foreground">Requires STRIPE_SECRET_KEY</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={testStripe}
                  disabled={testingStripe}
                  className="shrink-0"
                >
                  {testingStripe ? (
                    <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Testing…</>
                  ) : (
                    "Test"
                  )}
                </Button>
              </div>
              {stripeTestResult && (
                <div className={`flex items-start gap-2 text-xs rounded-md px-3 py-2 border ${
                  stripeTestResult.ok
                    ? "bg-chart-3/5 border-chart-3/20 text-chart-3"
                    : "bg-destructive/5 border-destructive/20 text-destructive"
                }`}>
                  {stripeTestResult.ok
                    ? <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    : <XCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />}
                  <span>{stripeTestResult.message}</span>
                </div>
              )}
            </div>

            <div className="border-t border-border" />

            {/* TikTools test */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">tik.tools API</p>
                  <p className="text-xs text-muted-foreground">Requires TIKTOOLS_API_KEY</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={testTiktools}
                  disabled={testingTiktools}
                  className="shrink-0"
                >
                  {testingTiktools ? (
                    <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Testing…</>
                  ) : (
                    "Test"
                  )}
                </Button>
              </div>
              {tiktoolsTestResult && (
                <div className={`flex items-start gap-2 text-xs rounded-md px-3 py-2 border ${
                  tiktoolsTestResult.ok
                    ? "bg-chart-3/5 border-chart-3/20 text-chart-3"
                    : "bg-destructive/5 border-destructive/20 text-destructive"
                }`}>
                  {tiktoolsTestResult.ok
                    ? <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    : <XCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />}
                  <span>{tiktoolsTestResult.message}</span>
                </div>
              )}
            </div>

            {/* Info note */}
            <div className="border-t border-border pt-3">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Secret keys and webhook secrets can only be set as environment variables (<code className="text-primary">STRIPE_SECRET_KEY</code>, <code className="text-primary">STRIPE_WEBHOOK_SECRET</code>, <code className="text-primary">TIKTOOLS_API_KEY</code>). They are never stored in config files.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
