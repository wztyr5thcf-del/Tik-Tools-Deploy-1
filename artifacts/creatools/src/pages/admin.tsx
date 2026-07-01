import { useState, useEffect, useCallback, useRef } from "react";
import {
  Shield, Trash2, RefreshCw, UserCog, Crown, Zap, Users2, Search,
  Settings2, CreditCard, Radio, CheckCircle2, XCircle, Loader2, KeyRound, Eye, EyeOff,
  Plus, Edit2, Palette, Layout, ChevronUp, ChevronDown, ToggleLeft, ToggleRight,
  Star, Save, RotateCcw, Globe, Lock,
  Server, Activity, AlertTriangle, MessageSquare, Check, X, Clock,
  Cpu, HardDrive, Key, PlugZap, Megaphone, Pin, Info, Sparkles,
  BookOpen, Building2, Users, Bell, BarChart2, LayoutDashboard,
  AlertCircle, Wrench, ChevronRight, FileText, Image, ExternalLink, UserPlus, Pencil,
} from "lucide-react";
import { SiTiktok } from "react-icons/si";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useAuth, authFetch, type AuthUser } from "@/context/auth-context";
import { useUIConfig, type NavSectionConfig, type NavItemConfig } from "@/context/ui-config-context";
import { useToast } from "@/hooks/use-toast";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Role {
  id: string; name: string; description: string; color: string;
  permissions: string[]; createdAt: string;
}
interface Plan {
  id: string; order?: number; name: string; description: string; price: number;
  currency: string; billingPeriod: string; permissions: string[];
  tiktokUsernameChangesPerWeek: number; maxConcurrentWs: number; maxApiCallsPerWindow: number;
  maxLiveHoursPerMonth: number; maxLiveAnalyses: number; maxWebhooks: number;
  features: string[]; color: string; isActive: boolean;
}
interface PermissionDef { id: string; label: string; category: string; }
interface StripeConfig {
  secretKeySet: boolean; webhookSecretSet: boolean; publishableKey: string | null;
  priceIdBasic: string | null; priceIdPro: string | null; tiktoolsKeySet: boolean; paymentsEnabled: boolean;
}
interface Announcement {
  id: string; title: string; body: string;
  type: "info" | "warning" | "success" | "new" | "update";
  pinned: boolean; createdAt: number; emoji?: string;
}
interface Ticket {
  id: string; type: string; userId: string; userName: string; userEmail: string;
  status: "pending" | "approved" | "denied" | "cancelled";
  oldValue?: string; newValue?: string; reason: string; customReason?: string;
  adminNote?: string; createdAt: string; resolvedAt?: string;
}
interface SystemStatus {
  checks: Record<string, { ok: boolean; message: string; latencyMs?: number }>;
  server: { nodeVersion: string; platform: string; uptime: number; memoryMb: number; freeMemMb: number; cpus: number };
  config: { tiktoolsKeySet: boolean; tiktoolsKeyMasked: string | null; stripeKeySet: boolean; jwtSecretIsDefault: boolean };
  users: { total: number; admins: number; byPlan: Record<string, number> };
}

// ── Constants ─────────────────────────────────────────────────────────────────
const PLAN_COLORS: Record<string, string> = {
  free: "bg-muted/40 text-muted-foreground border-muted",
  basic: "bg-cyan-400/10 text-cyan-400 border-cyan-400/30",
  pro: "bg-violet-400/10 text-violet-400 border-violet-400/30",
};
const PLAN_LABEL: Record<string, string> = { free: "Gratuito", basic: "Basic", pro: "PRO" };
const PRESET_COLORS = [
  { label: "Cyan",   hsl: "180 100% 50%" }, { label: "Pink",   hsl: "333 99% 52%" },
  { label: "Violet", hsl: "270 80% 60%" }, { label: "Green",  hsl: "142 71% 45%" },
  { label: "Orange", hsl: "28 99% 54%" },  { label: "Blue",   hsl: "221 83% 53%" },
  { label: "Red",    hsl: "0 84% 60%" },   { label: "Yellow", hsl: "48 97% 52%" },
];
const ANN_TYPES: Array<{ value: Announcement["type"]; label: string; color: string }> = [
  { value: "info",    label: "Info",      color: "#60a5fa" },
  { value: "new",     label: "Novo",      color: "#a78bfa" },
  { value: "update",  label: "Update",    color: "#22d3ee" },
  { value: "success", label: "Sucesso",   color: "#22c55e" },
  { value: "warning", label: "Aviso",     color: "#f97316" },
];

function limitLabel(v: number, unit = ""): string {
  if (v === -1) return "Ilimitado";
  if (v === 0) return "Bloqueado";
  return `${v}${unit}`;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function groupBy<T>(arr: T[], key: (item: T) => string): Record<string, T[]> {
  return arr.reduce((acc, item) => { const k = key(item); (acc[k] = acc[k] || []).push(item); return acc; }, {} as Record<string, T[]>);
}

function fmtBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function ResultBadge({ r }: { r: { ok: boolean; message: string } }) {
  return (
    <div className={`flex items-center gap-2 text-sm p-2 rounded-md ${r.ok ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
      {r.ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
      {r.message}
    </div>
  );
}

function PermissionCheckboxGroup({ allPermissions, selected, onChange }: {
  allPermissions: PermissionDef[]; selected: string[]; onChange: (p: string[]) => void;
}) {
  const groups = groupBy(allPermissions, (p) => p.category);
  const toggle = (id: string) => selected.includes(id) ? onChange(selected.filter((x) => x !== id)) : onChange([...selected, id]);
  const toggleAll = (ids: string[], checked: boolean) => checked ? onChange([...new Set([...selected, ...ids])]) : onChange(selected.filter((x) => !ids.includes(x)));
  return (
    <div className="space-y-4">
      {Object.entries(groups).map(([cat, perms]) => {
        const allSel = perms.every((p) => selected.includes(p.id));
        return (
          <div key={cat}>
            <div className="flex items-center gap-2 mb-2">
              <Checkbox checked={allSel} onCheckedChange={(v) => toggleAll(perms.map((p) => p.id), !!v)} />
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{cat}</p>
            </div>
            <div className="grid grid-cols-2 gap-1.5 pl-6">
              {perms.map((p) => (
                <div key={p.id} className="flex items-center gap-2">
                  <Checkbox id={`perm-${p.id}`} checked={selected.includes(p.id)} onCheckedChange={() => toggle(p.id)} />
                  <label htmlFor={`perm-${p.id}`} className="text-sm cursor-pointer">{p.label}</label>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// SEÇÃO: VISÃO GERAL
// ════════════════════════════════════════════════════════════════════════════
function VisaoGeralSection() {
  const { token } = useAuth();
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authFetch("/admin/system-status", token!).then((d) => setStatus(d as SystemStatus)).finally(() => setLoading(false));
  }, [token]);

  const planOrder = ["free", "basic", "pro"];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Visão Geral</h2>
        <p className="text-sm text-muted-foreground">Estatísticas e status do sistema em tempo real.</p>
      </div>

      {loading ? (
        <div className="py-16 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-purple-400" /></div>
      ) : status ? (
        <>
          {/* User stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Total de Usuários", value: status.users.total, color: "#a78bfa", icon: Users2 },
              { label: "Admins",            value: status.users.admins, color: "#f97316", icon: Shield },
              { label: "Plano Gratuito",    value: status.users.byPlan["free"] ?? 0, color: "#9ca3af", icon: Users },
              { label: "Plano PRO",         value: status.users.byPlan["pro"] ?? 0,  color: "#ec4899", icon: Crown },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl border border-white/8 p-4" style={{ background: "rgba(255,255,255,0.03)" }}>
                <div className="flex items-center gap-2 mb-2">
                  <s.icon className="w-4 h-4" style={{ color: s.color }} />
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
                <p className="text-3xl font-bold text-white">{s.value}</p>
              </div>
            ))}
          </div>

          {/* Plan distribution */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Distribuição de Planos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {planOrder.map((planId) => {
                  const count = status.users.byPlan[planId] ?? 0;
                  const pct = status.users.total > 0 ? Math.round((count / status.users.total) * 100) : 0;
                  return (
                    <div key={planId} className="flex items-center gap-3">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${PLAN_COLORS[planId] ?? ""}`}>{PLAN_LABEL[planId] ?? planId}</span>
                      <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                        <div className="h-full rounded-full bg-purple-500/60 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground w-12 text-right">{count} ({pct}%)</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Server info */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { label: "Node.js",    value: status.server.nodeVersion },
              { label: "Plataforma", value: status.server.platform },
              { label: "Uptime",     value: (() => { const h = Math.floor(status.server.uptime / 3600); const m = Math.floor((status.server.uptime % 3600) / 60); return h > 0 ? `${h}h ${m}m` : `${m}m`; })() },
              { label: "RAM Total",  value: `${status.server.memoryMb} MB` },
              { label: "RAM Livre",  value: `${status.server.freeMemMb} MB` },
              { label: "CPUs",       value: String(status.server.cpus) },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-white/8 p-3" style={{ background: "rgba(255,255,255,0.03)" }}>
                <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
                <p className="font-semibold text-white font-mono text-sm">{s.value}</p>
              </div>
            ))}
          </div>

          {/* Service checks */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2"><Activity className="w-4 h-4 text-cyan-400" />Serviços</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {Object.entries(status.checks).map(([key, check]) => (
                <div key={key} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${check.ok ? "bg-green-400" : "bg-red-400"}`} />
                  <span className="text-sm font-medium flex-1">{{ tiktools: "tik.tools API", altApi: "API Alternativa", stripe: "Stripe" }[key] ?? key}</span>
                  <span className="text-xs text-muted-foreground">{check.message}</span>
                  {check.latencyMs !== undefined && (
                    <Badge variant="outline" className={`text-xs ${check.latencyMs < 500 ? "text-green-400 border-green-400/20" : "text-yellow-400 border-yellow-400/20"}`}>{check.latencyMs}ms</Badge>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      ) : <p className="text-muted-foreground text-sm">Não foi possível carregar o status.</p>}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// SEÇÃO: USUÁRIOS
// ════════════════════════════════════════════════════════════════════════════
function UsuariosSection({ roles }: { roles: Role[] }) {
  const { user: me, token } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterPlan, setFilterPlan] = useState("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchUsers = useCallback(() => {
    setLoading(true);
    authFetch("/auth/users", token!).then((d: { users: AuthUser[] }) => setUsers(d.users ?? [])).finally(() => setLoading(false));
  }, [token]);
  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const updateUser = (id: string, patch: Record<string, unknown>) => {
    setUpdatingId(id);
    authFetch(`/auth/users/${id}`, token!, { method: "PATCH", body: JSON.stringify(patch) })
      .then(() => { fetchUsers(); toast({ title: "Usuário atualizado!" }); })
      .catch(() => toast({ title: "Erro ao atualizar", variant: "destructive" }))
      .finally(() => setUpdatingId(null));
  };

  const assignRole = (userId: string, roleId: string | "") => {
    authFetch(`/admin/users/${userId}/role`, token!, { method: "PATCH", body: JSON.stringify({ roleId: roleId || null }) })
      .then(() => fetchUsers())
      .catch(() => toast({ title: "Erro ao atribuir função", variant: "destructive" }));
  };

  const deleteUser = (id: string) => {
    authFetch(`/auth/users/${id}`, token!, { method: "DELETE" })
      .then(() => { fetchUsers(); toast({ title: "Usuário removido" }); })
      .catch(() => toast({ title: "Erro ao deletar", variant: "destructive" }));
  };

  const filtered = users.filter((u) => {
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchPlan = filterPlan === "all" || u.plan === filterPlan;
    return matchSearch && matchPlan;
  });

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Usuários</h2>
        <p className="text-sm text-muted-foreground">Gerencie todas as contas da plataforma.</p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar nome ou email..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filterPlan} onValueChange={setFilterPlan}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Filtrar plano" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os planos</SelectItem>
            <SelectItem value="free">Gratuito</SelectItem>
            <SelectItem value="basic">Basic</SelectItem>
            <SelectItem value="pro">PRO</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={fetchUsers}><RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /></Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>TikTok</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Função</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-10"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground">Nenhum usuário encontrado</TableCell></TableRow>
              ) : filtered.map((u) => (
                <TableRow key={u.id} className={u.id === me?.id ? "bg-primary/5" : ""}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{u.name}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {u.tiktokUsername ? (
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-mono text-purple-300">@{u.tiktokUsername}</span>
                        {u.tiktokVerified && <CheckCircle2 className="w-3 h-3 text-green-400 shrink-0" />}
                      </div>
                    ) : <span className="text-xs text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>
                    <Select value={u.plan} onValueChange={(v) => updateUser(u.id, { plan: v })} disabled={updatingId === u.id || u.id === me?.id}>
                      <SelectTrigger className="h-7 text-xs w-24"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="free">Gratuito</SelectItem>
                        <SelectItem value="basic">Basic</SelectItem>
                        <SelectItem value="pro">PRO</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select value={(u as AuthUser & { roleId?: string }).roleId ?? "none"} onValueChange={(v) => assignRole(u.id, v === "none" ? "" : v)} disabled={u.id === me?.id}>
                      <SelectTrigger className="h-7 text-xs w-28"><SelectValue placeholder="Sem função" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— Sem função —</SelectItem>
                        {roles.map((r) => <SelectItem key={r.id} value={r.id}><span className="flex items-center gap-1.5"><span className="inline-block w-2 h-2 rounded-full" style={{ background: r.color }} />{r.name}</span></SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Switch checked={u.isAdmin} onCheckedChange={(v) => updateUser(u.id, { isAdmin: v })} disabled={u.id === me?.id} />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(u.createdAt).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell className="text-right">
                    {u.id !== me?.id && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10"><Trash2 className="w-3.5 h-3.5" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Deletar {u.name}?</AlertDialogTitle>
                            <AlertDialogDescription>Esta ação é irreversível. Todos os dados do usuário serão perdidos.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction className="bg-destructive hover:bg-destructive/80" onClick={() => deleteUser(u.id)}>Deletar</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// SEÇÃO: PLANOS
// ════════════════════════════════════════════════════════════════════════════
function PlanosSection({ plans, permissions, onRefresh }: { plans: Plan[]; permissions: PermissionDef[]; onRefresh: () => void }) {
  const { token } = useAuth();
  const { toast } = useToast();
  const [editPlan, setEditPlan] = useState<Plan | null>(null);
  const [saving, setSaving] = useState(false);
  const [newFeature, setNewFeature] = useState("");

  const savePlan = async () => {
    if (!editPlan) return;
    setSaving(true);
    try {
      await authFetch(`/admin/plans/${editPlan.id}`, token!, { method: "PATCH", body: JSON.stringify(editPlan) });
      toast({ title: "Plano salvo!" });
      onRefresh();
      setEditPlan(null);
    } catch { toast({ title: "Erro ao salvar plano", variant: "destructive" }); }
    setSaving(false);
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Planos</h2>
        <p className="text-sm text-muted-foreground">Configure preços, limites e permissões de cada plano. Use -1 para ilimitado, 0 para bloqueado.</p>
      </div>

      <div className="grid gap-4">
        {plans.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map((plan) => (
          <Card key={plan.id} className={`border ${plan.isActive ? "" : "opacity-50"}`}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${PLAN_COLORS[plan.id] ?? ""}`}>{plan.name}</span>
                    {!plan.isActive && <Badge variant="outline" className="text-xs text-muted-foreground">Inativo</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{plan.description}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    <div className="space-y-0.5">
                      <p className="text-muted-foreground">Preço</p>
                      <p className="font-bold text-white">{plan.price === 0 ? "Grátis" : fmtBRL(plan.price)}<span className="font-normal text-muted-foreground">/{plan.billingPeriod === "monthly" ? "mês" : plan.billingPeriod === "yearly" ? "ano" : plan.billingPeriod}</span></p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-muted-foreground">Live/mês</p>
                      <p className="font-semibold">{limitLabel(plan.maxLiveHoursPerMonth, "h")}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-muted-foreground">Análises/live</p>
                      <p className="font-semibold">{limitLabel(plan.maxLiveAnalyses)}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-muted-foreground">Webhooks</p>
                      <p className="font-semibold">{limitLabel(plan.maxWebhooks)}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-muted-foreground">WebSockets</p>
                      <p className="font-semibold">{limitLabel(plan.maxConcurrentWs)}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-muted-foreground">API calls/janela</p>
                      <p className="font-semibold">{limitLabel(plan.maxApiCallsPerWindow)}</p>
                    </div>
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => setEditPlan({ ...plan })}>
                  <Edit2 className="w-3.5 h-3.5 mr-1.5" />Editar
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editPlan} onOpenChange={(o) => !o && setEditPlan(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar plano — {editPlan?.name}</DialogTitle>
            <DialogDescription>Configure preços, limites e permissões. Use -1 para ilimitado, 0 para bloqueado.</DialogDescription>
          </DialogHeader>
          {editPlan && (
            <div className="space-y-5 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Nome</Label>
                  <Input value={editPlan.name} onChange={(e) => setEditPlan((p) => p ? { ...p, name: e.target.value } : p)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Preço (centavos BRL)</Label>
                  <Input type="number" value={editPlan.price} onChange={(e) => setEditPlan((p) => p ? { ...p, price: Number(e.target.value) } : p)} />
                  <p className="text-xs text-muted-foreground">{fmtBRL(editPlan.price)}</p>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Descrição</Label>
                <Input value={editPlan.description} onChange={(e) => setEditPlan((p) => p ? { ...p, description: e.target.value } : p)} />
              </div>

              <Separator />
              <p className="text-sm font-semibold">Limites do Plano</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { label: "Horas de live/mês (-1=ilimitado)", key: "maxLiveHoursPerMonth" as keyof Plan },
                  { label: "Análises de live (-1=ilimitado)",  key: "maxLiveAnalyses" as keyof Plan },
                  { label: "Webhooks (-1=ilimitado)",          key: "maxWebhooks" as keyof Plan },
                  { label: "WebSockets simultâneos",           key: "maxConcurrentWs" as keyof Plan },
                  { label: "API calls/janela",                 key: "maxApiCallsPerWindow" as keyof Plan },
                  { label: "Trocas de username/semana",        key: "tiktokUsernameChangesPerWeek" as keyof Plan },
                ].map(({ label, key }) => (
                  <div key={key} className="space-y-1.5">
                    <Label className="text-xs">{label}</Label>
                    <Input type="number" min={-1}
                      value={editPlan[key] as number}
                      onChange={(e) => setEditPlan((p) => p ? { ...p, [key]: Number(e.target.value) } : p)} />
                    <p className="text-xs text-muted-foreground">{limitLabel(editPlan[key] as number)}</p>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <Switch checked={editPlan.isActive} onCheckedChange={(v) => setEditPlan((p) => p ? { ...p, isActive: v } : p)} />
                <Label>Plano ativo (visível para usuários)</Label>
              </div>

              <Separator />
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Funcionalidades incluídas</Label>
                <div className="space-y-1.5">
                  {editPlan.features.map((f, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input value={f}
                        onChange={(e) => { const feats = [...editPlan.features]; feats[i] = e.target.value; setEditPlan((p) => p ? { ...p, features: feats } : p); }}
                        className="h-7 text-xs" />
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10 shrink-0"
                        onClick={() => setEditPlan((p) => p ? { ...p, features: p.features.filter((_, j) => j !== i) } : p)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex gap-2 mt-2">
                    <Input value={newFeature} onChange={(e) => setNewFeature(e.target.value)}
                      placeholder="Adicionar funcionalidade..." className="h-7 text-xs"
                      onKeyDown={(e) => { if (e.key === "Enter" && newFeature.trim()) { setEditPlan((p) => p ? { ...p, features: [...p.features, newFeature.trim()] } : p); setNewFeature(""); } }} />
                    <Button size="icon" variant="outline" className="h-7 w-7 shrink-0"
                      onClick={() => { if (newFeature.trim()) { setEditPlan((p) => p ? { ...p, features: [...p.features, newFeature.trim()] } : p); setNewFeature(""); } }}>
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>

              <Separator />
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Permissões</Label>
                <PermissionCheckboxGroup allPermissions={permissions} selected={editPlan.permissions}
                  onChange={(p) => setEditPlan((prev) => prev ? { ...prev, permissions: p } : prev)} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPlan(null)}>Cancelar</Button>
            <Button onClick={savePlan} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}Salvar plano
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// SEÇÃO: ANÚNCIOS
// ════════════════════════════════════════════════════════════════════════════
function AnunciosSection() {
  const { token } = useAuth();
  const { toast } = useToast();
  const [anns, setAnns] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: "", body: "", type: "info" as Announcement["type"], pinned: false, emoji: "" });
  const [editAnn, setEditAnn] = useState<Announcement | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    authFetch("/announcements", token!).then((d: { announcements: Announcement[] }) => setAnns(d.announcements ?? [])).finally(() => setLoading(false));
  }, [token]);
  useEffect(() => { load(); }, [load]);

  const createAnn = async () => {
    if (!form.title.trim() || !form.body.trim()) { toast({ title: "Título e texto são obrigatórios", variant: "destructive" }); return; }
    setSaving(true);
    try {
      await authFetch("/announcements", token!, { method: "POST", body: JSON.stringify(form) });
      toast({ title: "Anúncio publicado!" });
      setForm({ title: "", body: "", type: "info", pinned: false, emoji: "" });
      setCreating(false);
      load();
    } catch { toast({ title: "Erro ao publicar", variant: "destructive" }); }
    setSaving(false);
  };

  const updateAnn = async () => {
    if (!editAnn) return;
    setSaving(true);
    try {
      await authFetch(`/announcements/${editAnn.id}`, token!, { method: "PATCH", body: JSON.stringify(editAnn) });
      toast({ title: "Anúncio atualizado!" });
      setEditAnn(null);
      load();
    } catch { toast({ title: "Erro ao atualizar", variant: "destructive" }); }
    setSaving(false);
  };

  const togglePin = async (ann: Announcement) => {
    await authFetch(`/announcements/${ann.id}`, token!, { method: "PATCH", body: JSON.stringify({ pinned: !ann.pinned }) });
    load();
  };

  const deleteAnn = async (id: string) => {
    await authFetch(`/announcements/${id}`, token!, { method: "DELETE" });
    toast({ title: "Anúncio removido" });
    load();
  };

  const AnnForm = ({ value, onChange, onSubmit, onCancel, submitLabel }: {
    value: typeof form; onChange: (v: typeof form) => void;
    onSubmit: () => void; onCancel: () => void; submitLabel: string;
  }) => (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Título</Label>
          <Input placeholder="Título do anúncio" value={value.title} onChange={(e) => onChange({ ...value, title: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Tipo</Label>
          <Select value={value.type} onValueChange={(v) => onChange({ ...value, type: v as Announcement["type"] })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {ANN_TYPES.map((t) => <SelectItem key={t.value} value={t.value}><span style={{ color: t.color }}>● </span>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Texto</Label>
        <textarea className="w-full px-3 py-2 rounded-md text-sm resize-none outline-none"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "white", minHeight: "80px" }}
          placeholder="Conteúdo do anúncio..." value={value.body}
          onChange={(e) => onChange({ ...value, body: e.target.value })} />
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Switch checked={value.pinned} onCheckedChange={(v) => onChange({ ...value, pinned: v })} />
          <Label className="text-sm">Fixar no topo</Label>
        </div>
        <div className="flex items-center gap-2 flex-1">
          <Label className="text-sm shrink-0">Emoji</Label>
          <Input className="w-16 text-center" value={value.emoji} onChange={(e) => onChange({ ...value, emoji: e.target.value })} placeholder="🎉" />
        </div>
      </div>
      <div className="flex gap-2">
        <Button onClick={onSubmit} disabled={saving} size="sm">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Megaphone className="w-3.5 h-3.5 mr-1.5" />}{submitLabel}
        </Button>
        <Button variant="outline" size="sm" onClick={onCancel}>Cancelar</Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white mb-1">Anúncios / Novidades</h2>
          <p className="text-sm text-muted-foreground">Publique notificações que aparecem no sino de todos os usuários.</p>
        </div>
        {!creating && <Button size="sm" onClick={() => setCreating(true)}><Plus className="w-4 h-4 mr-2" />Novo anúncio</Button>}
      </div>

      {creating && (
        <Card className="border-purple-500/30">
          <CardHeader className="pb-3"><CardTitle className="text-sm">Criar anúncio</CardTitle></CardHeader>
          <CardContent>
            <AnnForm value={form} onChange={setForm} onSubmit={createAnn} onCancel={() => setCreating(false)} submitLabel="Publicar" />
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="py-10 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>
      ) : anns.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">Nenhum anúncio publicado.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {anns.map((ann) => {
            const tc = ANN_TYPES.find((t) => t.value === ann.type);
            const isEditing = editAnn?.id === ann.id;
            return (
              <Card key={ann.id} className={ann.pinned ? "border-yellow-400/30" : ""}>
                <CardContent className="p-4">
                  {isEditing ? (
                    <AnnForm
                      value={{ title: editAnn.title, body: editAnn.body, type: editAnn.type, pinned: editAnn.pinned, emoji: editAnn.emoji ?? "" }}
                      onChange={(v) => setEditAnn({ ...editAnn, ...v })}
                      onSubmit={updateAnn}
                      onCancel={() => setEditAnn(null)}
                      submitLabel="Salvar"
                    />
                  ) : (
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {ann.pinned && <Pin className="w-3 h-3 text-yellow-400 shrink-0" />}
                          {ann.emoji && <span>{ann.emoji}</span>}
                          <span className="text-sm font-semibold text-white">{ann.title}</span>
                          <Badge variant="outline" className="text-xs" style={{ color: tc?.color, borderColor: `${tc?.color}40` }}>{tc?.label ?? ann.type}</Badge>
                          <span className="text-xs text-muted-foreground ml-auto">{new Date(ann.createdAt).toLocaleDateString("pt-BR")}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{ann.body}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-7 w-7" title={ann.pinned ? "Desafixar" : "Fixar"} onClick={() => void togglePin(ann)}>
                          <Pin className={`w-3.5 h-3.5 ${ann.pinned ? "text-yellow-400" : ""}`} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditAnn({ ...ann })}>
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10"><Trash2 className="w-3.5 h-3.5" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remover anúncio?</AlertDialogTitle>
                              <AlertDialogDescription>"{ann.title}" será removido permanentemente.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction className="bg-destructive hover:bg-destructive/80" onClick={() => void deleteAnn(ann.id)}>Remover</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// SEÇÃO: CONTEÚDO (Blog + Agências + Landing page)
// ════════════════════════════════════════════════════════════════════════════
interface Agency { id: string; name: string; handle: string; verified: boolean; description: string; website?: string; }

function ConteudoSection() {
  const [agencies, setAgencies] = useState<Agency[]>([
    { id: "1", name: "Agência Parceira 1", handle: "@agencia1", verified: true, description: "Especialistas em TikTok LIVE", website: "" },
  ]);
  const [newAgency, setNewAgency] = useState<Omit<Agency, "id">>({ name: "", handle: "", verified: false, description: "", website: "" });
  const [addingAgency, setAddingAgency] = useState(false);
  const [tab, setTab] = useState<"blog" | "agencies" | "landing">("blog");

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Conteúdo</h2>
        <p className="text-sm text-muted-foreground">Gerencie blog, influenciadores parceiros e a landing page.</p>
      </div>

      <div className="flex gap-2">
        {([["blog", "Blog", BookOpen], ["agencies", "Influenciadores Parceiros", Users], ["landing", "Landing Page", Image]] as const).map(([id, label, Icon]) => (
          <button key={id} onClick={() => setTab(id as typeof tab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab === id ? "bg-purple-500/20 text-purple-300 border border-purple-500/30" : "text-muted-foreground hover:text-white"}`}>
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      {tab === "blog" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2"><BookOpen className="w-4 h-4" />Blog — Integração WordPress</CardTitle>
            <CardDescription>Configure a URL do seu WordPress para exibir posts automaticamente no dashboard dos usuários.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-xl"
              style={{ background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.2)" }}>
              <AlertCircle className="w-5 h-5 text-orange-400 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-orange-300">Integração em desenvolvimento</p>
                <p className="text-xs text-orange-300/70">A integração com WordPress será configurada em breve. Por enquanto, os posts são exibidos como placeholders no dashboard.</p>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>URL do WordPress (ex: https://seublog.com)</Label>
              <div className="flex gap-2">
                <Input placeholder="https://..." className="flex-1" />
                <Button variant="outline" disabled>Salvar</Button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>API Key do WordPress REST (se necessário)</Label>
              <Input placeholder="Application Password ou JWT..." type="password" />
            </div>
          </CardContent>
        </Card>
      )}

      {tab === "agencies" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Gerencie os influenciadores/agências parceiras exibidos no dashboard.</p>
            <Button size="sm" onClick={() => setAddingAgency(true)}><Plus className="w-4 h-4 mr-1.5" />Adicionar</Button>
          </div>

          {addingAgency && (
            <Card className="border-purple-500/30">
              <CardContent className="pt-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label>Nome</Label><Input value={newAgency.name} onChange={(e) => setNewAgency((p) => ({ ...p, name: e.target.value }))} placeholder="Nome do influenciador" /></div>
                  <div className="space-y-1.5"><Label>@ TikTok</Label><Input value={newAgency.handle} onChange={(e) => setNewAgency((p) => ({ ...p, handle: e.target.value }))} placeholder="@handle" /></div>
                </div>
                <div className="space-y-1.5"><Label>Descrição</Label><Input value={newAgency.description} onChange={(e) => setNewAgency((p) => ({ ...p, description: e.target.value }))} placeholder="Breve descrição..." /></div>
                <div className="flex items-center gap-2">
                  <Switch checked={newAgency.verified} onCheckedChange={(v) => setNewAgency((p) => ({ ...p, verified: v }))} />
                  <Label>Verificado</Label>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => {
                    if (newAgency.name && newAgency.handle) {
                      setAgencies((a) => [...a, { ...newAgency, id: Date.now().toString() }]);
                      setNewAgency({ name: "", handle: "", verified: false, description: "", website: "" });
                      setAddingAgency(false);
                    }
                  }}>Adicionar</Button>
                  <Button variant="outline" size="sm" onClick={() => setAddingAgency(false)}>Cancelar</Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-3">
            {agencies.map((ag) => (
              <Card key={ag.id}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                    style={{ background: "rgba(124,58,237,0.2)", color: "#a78bfa" }}>{ag.name.charAt(0)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm text-white">{ag.name}</p>
                      {ag.verified && <span className="text-xs text-green-400 font-bold">✓ Verificado</span>}
                    </div>
                    <p className="text-xs text-muted-foreground">{ag.handle}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{ag.description}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setAgencies((a) => a.filter((x) => x.id !== ag.id))}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {tab === "landing" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2"><Image className="w-4 h-4" />Landing Page — Slides e Header</CardTitle>
            <CardDescription>Edite os slides e o conteúdo exibido na página inicial pública.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-xl"
              style={{ background: "rgba(6,182,212,0.08)", border: "1px solid rgba(6,182,212,0.2)" }}>
              <Info className="w-5 h-5 text-cyan-400 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-cyan-300">Editor visual em desenvolvimento</p>
                <p className="text-xs text-cyan-300/70">O editor de slides e header da landing page será implementado na próxima versão. Você poderá editar título, subtítulo, CTAs e as features exibidas.</p>
              </div>
            </div>
            {[
              { label: "Título principal", value: "Engaje seus fãs em tempo real." },
              { label: "Subtítulo",        value: "Rankings, overlays e métricas para suas lives no TikTok." },
              { label: "CTA primário",     value: "Criar conta grátis" },
            ].map((f) => (
              <div key={f.label} className="space-y-1.5">
                <Label>{f.label}</Label>
                <Input defaultValue={f.value} disabled />
              </div>
            ))}
            <Button variant="outline" disabled>Salvar (em breve)</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// SEÇÃO: SISTEMA
// ════════════════════════════════════════════════════════════════════════════
function SistemaSection() {
  const { token } = useAuth();
  const { toast } = useToast();

  // tiktools
  const [tiktoolsKey, setTiktoolsKey] = useState("");
  const [tiktoolsMasked, setTiktoolsMasked] = useState<string | null>(null);
  const [showTiktoolsKey, setShowTiktoolsKey] = useState(false);
  const [savingTiktools, setSavingTiktools] = useState(false);
  const [testingTiktools, setTestingTiktools] = useState(false);
  const [tiktoolsResult, setTiktoolsResult] = useState<{ ok: boolean; message: string } | null>(null);

  // maintenance mode
  const [maintenance, setMaintenance] = useState(false);

  // stripe
  const [stripeConfig, setStripeConfig] = useState<StripeConfig | null>(null);
  const [stripePublishable, setStripePublishable] = useState("");
  const [stripeBasic, setStripeBasic] = useState("");
  const [stripePro, setStripePro] = useState("");
  const [paymentsEnabled, setPaymentsEnabled] = useState(true);
  const [savingStripe, setSavingStripe] = useState(false);
  const [stripeResult, setStripeResult] = useState<{ ok: boolean; message: string } | null>(null);

  interface AltApiConfig { enabled: boolean; baseUrl: string; apiKeyHeader: string; apiKey: string; testPath: string; notes: string; }
  const [altApi, setAltApi] = useState<AltApiConfig>({ enabled: false, baseUrl: "", apiKeyHeader: "x-api-key", apiKey: "", testPath: "/api/live/top-channels", notes: "" });
  const [savingAlt, setSavingAlt] = useState(false);
  const [altResult, setAltResult] = useState<{ ok: boolean; message: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const [sc, ac, tc] = await Promise.all([
        authFetch("/admin/stripe-config", token!) as Promise<StripeConfig>,
        authFetch("/admin/alt-api-config", token!) as Promise<AltApiConfig>,
        authFetch("/admin/tiktools-config", token!) as Promise<{ apiKeySet: boolean; apiKeyMasked: string | null }>,
      ]);
      setStripeConfig(sc); setStripePublishable(sc.publishableKey ?? "");
      setStripeBasic(sc.priceIdBasic ?? ""); setStripePro(sc.priceIdPro ?? "");
      setPaymentsEnabled(sc.paymentsEnabled); setAltApi(ac); setTiktoolsMasked(tc.apiKeyMasked);
    } catch { /* ignore */ }
  }, [token]);
  useEffect(() => { void load(); }, [load]);

  const saveTiktools = async () => {
    if (!tiktoolsKey.trim()) return;
    setSavingTiktools(true);
    try {
      const r = await authFetch("/admin/tiktools-config", token!, { method: "PATCH", body: JSON.stringify({ apiKey: tiktoolsKey }) }) as { ok: boolean; apiKeyMasked: string };
      setTiktoolsMasked(r.apiKeyMasked); setTiktoolsKey("");
      toast({ title: "Chave tik.tools atualizada e salva!" });
    } catch { toast({ title: "Erro ao salvar", variant: "destructive" }); }
    setSavingTiktools(false);
  };

  const testTiktools = async () => {
    setTestingTiktools(true); setTiktoolsResult(null);
    try { const r = await authFetch("/admin/test-tiktools", token!, { method: "POST" }) as { ok: boolean; message: string }; setTiktoolsResult(r); }
    catch { setTiktoolsResult({ ok: false, message: "Erro de conexão" }); }
    setTestingTiktools(false);
  };

  const saveStripe = async () => {
    setSavingStripe(true);
    try {
      await authFetch("/admin/stripe-config", token!, { method: "PATCH", body: JSON.stringify({ publishableKey: stripePublishable || null, priceIdBasic: stripeBasic || null, priceIdPro: stripePro || null, paymentsEnabled }) });
      toast({ title: "Stripe atualizado!" }); void load();
    } catch { toast({ title: "Erro ao salvar", variant: "destructive" }); }
    setSavingStripe(false);
  };

  const saveAlt = async () => {
    setSavingAlt(true);
    try { await authFetch("/admin/alt-api-config", token!, { method: "PATCH", body: JSON.stringify(altApi) }); toast({ title: "API alternativa salva!" }); }
    catch { toast({ title: "Erro ao salvar", variant: "destructive" }); }
    setSavingAlt(false);
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Sistema</h2>
        <p className="text-sm text-muted-foreground">Configurações de API, integrações externas e modo de manutenção.</p>
      </div>

      {/* Maintenance mode */}
      <Card className={maintenance ? "border-yellow-400/40" : ""}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${maintenance ? "bg-yellow-500/20" : "bg-muted/20"}`}>
                <Wrench className={`w-5 h-5 ${maintenance ? "text-yellow-400" : "text-muted-foreground"}`} />
              </div>
              <div>
                <p className="font-semibold text-sm text-white">Modo Manutenção</p>
                <p className="text-xs text-muted-foreground">{maintenance ? "Ativo — usuários verão aviso de manutenção" : "Inativo — plataforma funcionando normalmente"}</p>
              </div>
            </div>
            <Switch checked={maintenance} onCheckedChange={setMaintenance} />
          </div>
          {maintenance && (
            <div className="mt-3 flex items-center gap-2 p-2 rounded-lg" style={{ background: "rgba(249,115,22,0.1)" }}>
              <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0" />
              <p className="text-xs text-yellow-300">Modo manutenção ativo. Certifique-se de desativar após concluir as manutenções.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* tik.tools API Key */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-purple-400" />
            <CardTitle className="text-sm">tik.tools API Key</CardTitle>
            {tiktoolsMasked ? (
              <Badge className="text-xs bg-green-500/10 text-green-400 border-green-500/20">Configurada: {tiktoolsMasked}</Badge>
            ) : (
              <Badge className="text-xs bg-red-500/10 text-red-400 border-red-500/20">Não configurada</Badge>
            )}
          </div>
          <CardDescription>Chave necessária para acessar dados de lives do TikTok. Salva de forma persistente.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <Input type={showTiktoolsKey ? "text" : "password"} placeholder="tiktools_••••••••" value={tiktoolsKey}
              onChange={(e) => setTiktoolsKey(e.target.value)} className="pr-10 font-mono text-sm" />
            <button className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setShowTiktoolsKey((v) => !v)}>{showTiktoolsKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={saveTiktools} disabled={savingTiktools || !tiktoolsKey.trim()}>
              {savingTiktools ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}Salvar chave
            </Button>
            <Button variant="outline" size="sm" onClick={testTiktools} disabled={testingTiktools}>
              {testingTiktools ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />Testando…</> : <><Radio className="w-3.5 h-3.5 mr-1.5" />Testar conexão</>}
            </Button>
          </div>
          {tiktoolsResult && <ResultBadge r={tiktoolsResult} />}
        </CardContent>
      </Card>

      {/* Stripe */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-indigo-400" />
            <CardTitle className="text-sm">Stripe — Pagamentos</CardTitle>
            {stripeConfig && <Badge className={`text-xs ${stripeConfig.secretKeySet ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-muted/40 text-muted-foreground"}`}>{stripeConfig.secretKeySet ? "SK configurada" : "SK não configurada"}</Badge>}
            <div className="ml-auto flex items-center gap-2"><Label className="text-xs text-muted-foreground">Pagamentos</Label><Switch checked={paymentsEnabled} onCheckedChange={setPaymentsEnabled} /></div>
          </div>
          <CardDescription>Configure as chaves e Price IDs para cobrar assinaturas. Chaves secretas via variáveis de ambiente.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-md bg-muted/20 border border-border px-3 py-2 text-xs text-muted-foreground">
            <p className="font-medium">Configurar via env vars do Replit (recomendado):</p>
            <p className="font-mono mt-1">STRIPE_SECRET_KEY · STRIPE_WEBHOOK_SECRET</p>
          </div>
          <div className="space-y-2"><Label className="text-xs text-muted-foreground">Publishable Key (pk_...)</Label><Input value={stripePublishable} onChange={(e) => setStripePublishable(e.target.value)} placeholder="pk_live_••••••••" className="font-mono text-sm" /></div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1"><Label className="text-xs text-muted-foreground">Price ID — Basic</Label><Input value={stripeBasic} onChange={(e) => setStripeBasic(e.target.value)} placeholder="price_••••••••" className="font-mono text-sm" /></div>
            <div className="space-y-1"><Label className="text-xs text-muted-foreground">Price ID — PRO</Label><Input value={stripePro} onChange={(e) => setStripePro(e.target.value)} placeholder="price_••••••••" className="font-mono text-sm" /></div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={saveStripe} disabled={savingStripe}>{savingStripe ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}Salvar</Button>
          </div>
          {stripeResult && <ResultBadge r={stripeResult} />}
        </CardContent>
      </Card>

      {/* API Alternativa */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <PlugZap className="w-4 h-4 text-cyan-400" />
            <CardTitle className="text-sm">API Alternativa</CardTitle>
            <Switch checked={altApi.enabled} onCheckedChange={(v) => setAltApi((p) => ({ ...p, enabled: v }))} />
          </div>
          <CardDescription>Use uma API personalizada em vez da tik.tools padrão.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1"><Label className="text-xs text-muted-foreground">Base URL</Label><Input value={altApi.baseUrl} onChange={(e) => setAltApi((p) => ({ ...p, baseUrl: e.target.value }))} placeholder="https://api.exemplo.com" className="font-mono text-sm" disabled={!altApi.enabled} /></div>
            <div className="space-y-1"><Label className="text-xs text-muted-foreground">Header da API Key</Label><Input value={altApi.apiKeyHeader} onChange={(e) => setAltApi((p) => ({ ...p, apiKeyHeader: e.target.value }))} placeholder="x-api-key" disabled={!altApi.enabled} /></div>
          </div>
          <div className="space-y-1"><Label className="text-xs text-muted-foreground">API Key</Label><Input value={altApi.apiKey} onChange={(e) => setAltApi((p) => ({ ...p, apiKey: e.target.value }))} type="password" disabled={!altApi.enabled} /></div>
          <Button size="sm" onClick={saveAlt} disabled={savingAlt}>{savingAlt ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}Salvar</Button>
          {altResult && <ResultBadge r={altResult} />}
        </CardContent>
      </Card>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// SEÇÃO: FUNÇÕES (ROLES)
// ════════════════════════════════════════════════════════════════════════════
function FuncoesSection({ roles, permissions, onRefresh }: { roles: Role[]; permissions: PermissionDef[]; onRefresh: () => void }) {
  const { token } = useAuth();
  const { toast } = useToast();
  const [creating, setCreating] = useState(false);
  const [editRole, setEditRole] = useState<Role | null>(null);
  const [form, setForm] = useState({ name: "", description: "", color: "#7c3aed", permissions: [] as string[] });
  const [saving, setSaving] = useState(false);

  const saveRole = async (isNew: boolean) => {
    setSaving(true);
    try {
      if (isNew) {
        await authFetch("/admin/roles", token!, { method: "POST", body: JSON.stringify(form) });
        setForm({ name: "", description: "", color: "#7c3aed", permissions: [] });
        setCreating(false);
      } else if (editRole) {
        await authFetch(`/admin/roles/${editRole.id}`, token!, { method: "PATCH", body: JSON.stringify(editRole) });
        setEditRole(null);
      }
      toast({ title: "Função salva!" });
      onRefresh();
    } catch { toast({ title: "Erro ao salvar função", variant: "destructive" }); }
    setSaving(false);
  };

  const deleteRole = async (id: string) => {
    await authFetch(`/admin/roles/${id}`, token!, { method: "DELETE" });
    toast({ title: "Função removida" });
    onRefresh();
  };

  const RoleForm = ({ value, onChange, isNew }: { value: typeof form | Role; onChange: (v: typeof form | Role) => void; isNew: boolean }) => (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5"><Label>Nome</Label><Input value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value })} placeholder="Ex: Moderador" /></div>
        <div className="space-y-1.5">
          <Label>Cor</Label>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_COLORS.map((c) => (
              <button key={c.hsl} title={c.label}
                className={`w-6 h-6 rounded-full border-2 transition-all ${value.color === `hsl(${c.hsl})` || value.color === c.hsl ? "border-white scale-110" : "border-transparent"}`}
                style={{ background: `hsl(${c.hsl})` }}
                onClick={() => onChange({ ...value, color: `hsl(${c.hsl})` })} />
            ))}
          </div>
        </div>
      </div>
      <div className="space-y-1.5"><Label>Descrição</Label><Input value={value.description} onChange={(e) => onChange({ ...value, description: e.target.value })} /></div>
      <div className="space-y-2">
        <Label className="text-sm font-semibold">Permissões</Label>
        <PermissionCheckboxGroup allPermissions={permissions} selected={value.permissions}
          onChange={(p) => onChange({ ...value, permissions: p })} />
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={() => saveRole(isNew)} disabled={saving}>{saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}Salvar</Button>
        <Button variant="outline" size="sm" onClick={() => isNew ? setCreating(false) : setEditRole(null)}>Cancelar</Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h2 className="text-xl font-bold text-white mb-1">Funções</h2><p className="text-sm text-muted-foreground">Crie e gerencie funções com permissões específicas.</p></div>
        {!creating && <Button size="sm" onClick={() => setCreating(true)}><Plus className="w-4 h-4 mr-2" />Nova função</Button>}
      </div>

      {creating && (
        <Card className="border-purple-500/30">
          <CardHeader className="pb-3"><CardTitle className="text-sm">Nova função</CardTitle></CardHeader>
          <CardContent><RoleForm value={form} onChange={(v) => setForm(v as typeof form)} isNew={true} /></CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {roles.length === 0 && !creating && <Card><CardContent className="py-10 text-center text-muted-foreground">Nenhuma função criada.</CardContent></Card>}
        {roles.map((role) => (
          <Card key={role.id}>
            <CardContent className="p-4">
              {editRole?.id === role.id ? (
                <RoleForm value={editRole} onChange={(v) => setEditRole(v as Role)} isNew={false} />
              ) : (
                <div className="flex items-center gap-4">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ background: role.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-white">{role.name}</p>
                    <p className="text-xs text-muted-foreground">{role.description}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{role.permissions.length} permissão(ões)</p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditRole({ ...role })}><Edit2 className="w-3.5 h-3.5" /></Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10"><Trash2 className="w-3.5 h-3.5" /></Button></AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Deletar função "{role.name}"?</AlertDialogTitle><AlertDialogDescription>Usuários com esta função perderão as permissões associadas.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction className="bg-destructive hover:bg-destructive/80" onClick={() => void deleteRole(role.id)}>Deletar</AlertDialogAction></AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// SEÇÃO: CUSTOMIZAÇÃO UI
// ════════════════════════════════════════════════════════════════════════════
function CustomizacaoSection() {
  const { token } = useAuth();
  const { toast } = useToast();
  const { config: uiConfig, refresh: reloadUI } = useUIConfig();
  const [local, setLocal] = useState<typeof uiConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => { if (uiConfig) setLocal(JSON.parse(JSON.stringify(uiConfig))); }, [uiConfig]);

  const updateItemLabel = (secId: string, itemIdx: number, label: string) => {
    setLocal((prev) => { if (!prev) return prev; const s = [...prev.sidebarSections]; const sec = { ...s.find((x) => x.id === secId)! }; sec.items = sec.items.map((it, i) => i === itemIdx ? { ...it, label } : it); return { ...prev, sidebarSections: s.map((x) => x.id === secId ? sec : x) }; });
  };
  const toggleItemVisible = (secId: string, itemIdx: number) => {
    setLocal((prev) => { if (!prev) return prev; const s = [...prev.sidebarSections]; const sec = { ...s.find((x) => x.id === secId)! }; sec.items = sec.items.map((it, i) => i === itemIdx ? { ...it, visible: !it.visible } : it); return { ...prev, sidebarSections: s.map((x) => x.id === secId ? sec : x) }; });
  };
  const moveItem = (secId: string, itemIdx: number, dir: -1 | 1) => {
    setLocal((prev) => { if (!prev) return prev; const s = [...prev.sidebarSections]; const sec = { ...s.find((x) => x.id === secId)! }; const items = [...sec.items]; const newIdx = itemIdx + dir; if (newIdx < 0 || newIdx >= items.length) return prev; [items[itemIdx], items[newIdx]] = [items[newIdx], items[itemIdx]]; sec.items = items; return { ...prev, sidebarSections: s.map((x) => x.id === secId ? sec : x) }; });
  };

  const save = async () => {
    if (!local) return; setSaving(true);
    try { await authFetch("/admin/ui-config", token!, { method: "PATCH", body: JSON.stringify(local) }); reloadUI(); toast({ title: "Customização salva!" }); }
    catch { toast({ title: "Erro ao salvar", variant: "destructive" }); }
    setSaving(false);
  };

  const doReset = async () => {
    setResetting(true);
    try { await authFetch("/admin/ui-config/reset", token!, { method: "POST" }); reloadUI(); toast({ title: "Configuração resetada!" }); }
    catch { toast({ title: "Erro ao resetar", variant: "destructive" }); }
    setResetting(false);
  };

  if (!local) return <div className="py-10 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>;

  return (
    <div className="space-y-5">
      <div><h2 className="text-xl font-bold text-white mb-1">Customização</h2><p className="text-sm text-muted-foreground">Edite cores e itens do menu da plataforma.</p></div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Cores do Tema</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {[
            { label: "Cor Primária",    key: "primaryColor" as const },
            { label: "Cor Secundária",  key: "secondaryColor" as const },
          ].map(({ label, key }) => (
            <div key={key} className="space-y-2">
              <Label>{label}</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {PRESET_COLORS.map((c) => (
                  <button key={c.hsl} title={c.label}
                    className={`w-7 h-7 rounded-full border-2 transition-all ${local[key] === c.hsl ? "border-foreground scale-110" : "border-transparent"}`}
                    style={{ background: `hsl(${c.hsl})` }}
                    onClick={() => setLocal((p) => p ? { ...p, [key]: c.hsl } : p)} />
                ))}
              </div>
              <Input value={local[key]} onChange={(e) => setLocal((p) => p ? { ...p, [key]: e.target.value } : p)} placeholder="180 100% 50%" />
              <div className="h-5 rounded-md" style={{ background: `hsl(${local[key]})` }} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-sm">Itens do Menu Sidebar</CardTitle><CardDescription>Reordene e mostre/oculte itens do menu.</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          {local.sidebarSections.map((section) => (
            <div key={section.id} className="space-y-1.5">
              {section.label && <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 px-1">{section.label}</p>}
              <div className="space-y-1 border border-border rounded-lg overflow-hidden">
                {section.items.map((item, itemIdx) => (
                  <div key={item.id} className={`flex items-center gap-2 px-3 py-2 ${!item.visible ? "opacity-40" : ""} hover:bg-accent/30`}>
                    <div className="flex flex-col gap-0.5 shrink-0">
                      <button className="text-muted-foreground hover:text-foreground disabled:opacity-20" onClick={() => moveItem(section.id, itemIdx, -1)} disabled={itemIdx === 0}><ChevronUp className="w-3.5 h-3.5" /></button>
                      <button className="text-muted-foreground hover:text-foreground disabled:opacity-20" onClick={() => moveItem(section.id, itemIdx, 1)} disabled={itemIdx === section.items.length - 1}><ChevronDown className="w-3.5 h-3.5" /></button>
                    </div>
                    <div className="flex-1 min-w-0">
                      <Input value={item.label} onChange={(e) => updateItemLabel(section.id, itemIdx, e.target.value)} className="h-6 text-xs border-none bg-transparent focus-visible:ring-0 p-0" />
                      <p className="text-[10px] text-muted-foreground/50 font-mono truncate">{item.href}</p>
                    </div>
                    {item.adminOnly && <Badge className="text-[10px] px-1 py-0 bg-destructive/10 text-destructive">Admin</Badge>}
                    <button onClick={() => toggleItemVisible(section.id, itemIdx)} className={`shrink-0 transition-colors ${item.visible ? "text-primary" : "text-muted-foreground/30"}`}>
                      {item.visible ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={doReset} disabled={resetting}><RotateCcw className="w-4 h-4 mr-2" />Resetar padrão</Button>
        <Button onClick={save} disabled={saving}><Save className="w-4 h-4 mr-2" />Salvar</Button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// SEÇÃO: LANDING PAGE
// ════════════════════════════════════════════════════════════════════════════

interface LandingFeature {
  id: string;
  title: string;
  description: string;
  icon: string;
  imageUrl: string;
  demoUrl: string;
  order: number;
}

interface LandingContent {
  enabled: boolean;
  hero: { headline: string; subheadline: string; ctaLabel: string; backgroundGradient: string };
  features: LandingFeature[];
  plans: { visiblePlanIds: string[]; recommendedPlanId: string };
  cta: { text: string; subtext: string; buttonLabel: string };
}

const EMPTY_FEATURE: LandingFeature = { id: "", title: "", description: "", icon: "LayoutDashboard", imageUrl: "", demoUrl: "", order: 0 };
const LUCIDE_ICONS = ["LayoutDashboard","Activity","Users","Trophy","Monitor","Key","Star","Zap","Shield","Globe","BarChart2","Radio","Diamond","Search","Settings","Bell","Heart","Tv2","Gamepad2","Code2"];

// ── Partner types (for admin) ─────────────────────────────────────────────────
interface LandingPartner {
  id: string;
  tiktokHandle: string;
  displayName: string;
  avatarUrl: string;
  followers: number;
  addedAt: string;
  isLive?: boolean;
  viewerCount?: number;
}
function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// ── Partners admin section ─────────────────────────────────────────────────────
function EditPartnerDialog({ partner, token, toast, onSaved }: {
  partner: LandingPartner;
  token: string;
  toast: ReturnType<typeof useToast>["toast"];
  onSaved: (updated: LandingPartner) => void;
}) {
  const [open, setOpen] = useState(false);
  const [displayName, setDisplayName] = useState(partner.displayName);
  const [avatarUrl, setAvatarUrl] = useState(partner.avatarUrl);
  const [followers, setFollowers] = useState(String(partner.followers));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/landing/partners/${partner.id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, avatarUrl, followers: Number(followers) || 0 }),
      });
      if (!res.ok) { toast({ title: "Erro ao salvar", variant: "destructive" }); return; }
      const updated = await res.json() as LandingPartner;
      onSaved(updated);
      setOpen(false);
      toast({ title: "Parceiro atualizado!" });
    } catch { toast({ title: "Erro ao salvar", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  return (
    <>
      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-white/30 hover:text-white"
        title="Editar dados manualmente" onClick={() => { setDisplayName(partner.displayName); setAvatarUrl(partner.avatarUrl); setFollowers(String(partner.followers)); setOpen(true); }}>
        <Pencil className="w-3.5 h-3.5" />
      </Button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md rounded-2xl p-6 space-y-4" style={{ background: "#100c28", border: "1px solid rgba(255,255,255,0.1)" }} onClick={e => e.stopPropagation()}>
            <div>
              <h3 className="font-bold text-white text-base">Editar @{partner.tiktokHandle}</h3>
              <p className="text-xs text-white/35 mt-1">Insira os dados manualmente. A foto pode ser uma URL de imagem do perfil do TikTok.</p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-white/50 mb-1 block">Nome de exibição</label>
                <Input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Nome do streamer" />
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1 block">URL da foto de perfil</label>
                <Input value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)} placeholder="https://..." />
                {avatarUrl && <img src={avatarUrl} alt="" className="mt-2 w-12 h-12 rounded-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />}
              </div>
              <div>
                <label className="text-xs text-white/50 mb-1 block">Seguidores</label>
                <Input type="text" inputMode="numeric" value={followers} onChange={e => setFollowers(e.target.value)} placeholder="Ex: 2500000" />
                <p className="text-[10px] text-white/25 mt-1">Só dígitos — não use pontos nem vírgulas</p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)} className="text-white/50">Cancelar</Button>
              <Button onClick={() => void save()} disabled={saving} className="gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Salvar
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function PartnersAdminSection({ token, toast }: { token: string; toast: ReturnType<typeof useToast>["toast"] }) {
  const [partners, setPartners] = useState<LandingPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [handle, setHandle] = useState("");
  const [adding, setAdding] = useState(false);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);

  const loadPartners = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/landing/partners", { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json() as { partners: LandingPartner[] };
      setPartners(data.partners ?? []);
    } catch { toast({ title: "Erro ao carregar parceiros", variant: "destructive" }); }
    finally { setLoading(false); }
  }, [token, toast]);

  useEffect(() => { void loadPartners(); }, [loadPartners]);

  const addPartner = async () => {
    const h = handle.trim().replace(/^@/, "");
    if (!h) return;
    setAdding(true);
    try {
      const res = await fetch("/api/landing/partners", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ tiktokHandle: h }),
      });
      if (res.status === 409) { toast({ title: "Parceiro já adicionado", variant: "destructive" }); return; }
      if (!res.ok) { toast({ title: "Erro ao adicionar", variant: "destructive" }); return; }
      const partner = await res.json() as LandingPartner;
      setPartners(prev => [...prev, partner]);
      setHandle("");
      toast({ title: `@${partner.tiktokHandle} adicionado!` });
    } catch { toast({ title: "Erro ao adicionar parceiro", variant: "destructive" }); }
    finally { setAdding(false); }
  };

  const removePartner = async (id: string, h: string) => {
    try {
      await fetch(`/api/landing/partners/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      setPartners(prev => prev.filter(p => p.id !== id));
      toast({ title: `@${h} removido` });
    } catch { toast({ title: "Erro ao remover", variant: "destructive" }); }
  };

  const refreshPartner = async (id: string) => {
    setRefreshingId(id);
    try {
      const res = await fetch(`/api/landing/partners/${id}/refresh`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) { toast({ title: "Erro ao atualizar perfil", variant: "destructive" }); return; }
      const updated = await res.json() as LandingPartner;
      setPartners(prev => prev.map(p => p.id === id ? { ...p, ...updated } : p));
      toast({ title: "Perfil atualizado!" });
    } catch { toast({ title: "Erro ao atualizar", variant: "destructive" }); }
    finally { setRefreshingId(null); }
  };

  return (
    <div className="space-y-4">
      {/* Add partner */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-amber-400" /> Adicionar Parceiro
          </CardTitle>
          <CardDescription>
            Digite o @ do TikTok para buscar e adicionar o streamer como parceiro.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm">@</span>
              <Input
                className="pl-7"
                placeholder="nomeDoStreamer"
                value={handle}
                onChange={e => setHandle(e.target.value)}
                onKeyDown={e => e.key === "Enter" && void addPartner()}
                disabled={adding}
              />
            </div>
            <Button onClick={() => void addPartner()} disabled={adding || !handle.trim()} className="gap-2 shrink-0">
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {adding ? "Buscando…" : "Adicionar"}
            </Button>
          </div>
          <p className="text-xs text-white/30 mt-2">Após adicionar, clique no lápis (✏️) para inserir a foto e dados manualmente. Auto-busca requer plano Pro da tik.tools.</p>
        </CardContent>
      </Card>

      {/* Partners list */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Parceiros ({partners.length})</CardTitle>
            <Button size="sm" variant="ghost" className="h-7 gap-1 text-white/50" onClick={() => void loadPartners()} disabled={loading}>
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Recarregar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-white/30" /></div>
          ) : partners.length === 0 ? (
            <div className="py-10 text-center text-white/30 text-sm">
              <SiTiktok className="w-8 h-8 mx-auto mb-2 opacity-20" />
              Nenhum parceiro adicionado ainda.
            </div>
          ) : (
            <div className="space-y-2">
              {partners.map(p => (
                <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 flex items-center justify-center"
                    style={{ border: p.isLive ? "2px solid #f59e0b" : "2px solid rgba(255,255,255,0.1)", background: "rgba(124,58,237,0.2)" }}>
                    {p.avatarUrl ? (
                      <img src={p.avatarUrl} alt={p.displayName} className="w-full h-full object-cover"
                        onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    ) : (
                      <SiTiktok className="w-4 h-4 text-white/30" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-semibold text-white truncate">{p.displayName}</span>
                      {p.isLive && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                          <span className="w-1 h-1 rounded-full bg-red-400 animate-pulse" /> AO VIVO
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-white/40">@{p.tiktokHandle}</span>
                      {p.followers > 0 && (
                        <span className="text-xs font-semibold" style={{ color: "#f59e0b" }}>
                          {fmtNum(p.followers)} seguidores
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <EditPartnerDialog partner={p} token={token} toast={toast}
                      onSaved={updated => setPartners(prev => prev.map(x => x.id === updated.id ? { ...x, ...updated } : x))} />
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-white/30 hover:text-white"
                      title="Atualizar perfil via tik.tools (requer Pro)"
                      onClick={() => void refreshPartner(p.id)}
                      disabled={refreshingId === p.id}>
                      <RefreshCw className={`w-3.5 h-3.5 ${refreshingId === p.id ? "animate-spin" : ""}`} />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-400/50 hover:text-red-400"
                      title="Remover parceiro"
                      onClick={() => void removePartner(p.id, p.tiktokHandle)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function LandingPageTab({ allPlans }: { allPlans: Plan[] }) {
  const { token } = useAuth();
  const { toast } = useToast();
  const [landing, setLanding] = useState<LandingContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<"general" | "features" | "plans" | "cta" | "partners">("general");
  const [featureDialogOpen, setFeatureDialogOpen] = useState(false);
  const [editFeature, setEditFeature] = useState<LandingFeature>(EMPTY_FEATURE);
  const [editIsNew, setEditIsNew] = useState(true);

  const fetchLanding = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/landing", { headers: { Authorization: `Bearer ${token}` } });
      setLanding(await res.json() as LandingContent);
    } catch { toast({ title: "Erro ao carregar landing page", variant: "destructive" }); }
    finally { setLoading(false); }
  }, [token, toast]);

  useEffect(() => { void fetchLanding(); }, [fetchLanding]);

  const save = async (patch: Partial<LandingContent>) => {
    if (!landing) return;
    setSaving(true);
    try {
      const updated = { ...landing, ...patch };
      const res = await fetch("/api/landing", {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      const data = await res.json() as LandingContent;
      setLanding(data);
      toast({ title: "Salvo!" });
    } catch { toast({ title: "Erro ao salvar", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const openAddFeature = () => {
    const nextOrder = landing ? Math.max(0, ...landing.features.map(f => f.order)) + 1 : 0;
    setEditFeature({ ...EMPTY_FEATURE, id: crypto.randomUUID(), order: nextOrder });
    setEditIsNew(true);
    setFeatureDialogOpen(true);
  };

  const openEditFeature = (f: LandingFeature) => {
    setEditFeature({ ...f });
    setEditIsNew(false);
    setFeatureDialogOpen(true);
  };

  const saveFeature = () => {
    if (!landing || !editFeature.title.trim()) return;
    const features = editIsNew
      ? [...landing.features, editFeature]
      : landing.features.map(f => f.id === editFeature.id ? editFeature : f);
    void save({ features });
    setFeatureDialogOpen(false);
  };

  const deleteFeature = (id: string) => {
    if (!landing) return;
    void save({ features: landing.features.filter(f => f.id !== id) });
  };

  const moveFeature = (id: string, dir: -1 | 1) => {
    if (!landing) return;
    const sorted = [...landing.features].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex(f => f.id === id);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const newOrder = sorted[swapIdx]!.order;
    const swapOrder = sorted[idx]!.order;
    const features = landing.features.map(f => {
      if (f.id === id) return { ...f, order: newOrder };
      if (f.id === sorted[swapIdx]!.id) return { ...f, order: swapOrder };
      return f;
    });
    void save({ features });
  };

  const togglePlanVisibility = (planId: string, checked: boolean) => {
    if (!landing) return;
    const ids = checked
      ? [...landing.plans.visiblePlanIds, planId]
      : landing.plans.visiblePlanIds.filter(id => id !== planId);
    void save({ plans: { ...landing.plans, visiblePlanIds: ids } });
  };

  if (loading || !landing) {
    return <div className="py-10 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>;
  }

  const sorted = [...landing.features].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-4">
      {/* Sub-navigation */}
      <div className="flex items-center gap-1 flex-wrap">
        {(["general","features","plans","cta","partners"] as const).map(sec => (
          <Button
            key={sec}
            variant={activeSection === sec ? "secondary" : "ghost"}
            size="sm"
            className="capitalize h-7"
            onClick={() => setActiveSection(sec)}
          >
            {sec === "general" ? "Geral" : sec === "features" ? "Funcionalidades" : sec === "plans" ? "Planos" : sec === "cta" ? "CTA / Rodapé" : "⭐ Parceiros"}
          </Button>
        ))}
        <Button size="sm" variant="outline" className="h-7 ml-auto gap-1" onClick={() => window.open("/landing", "_blank")}>
          <ExternalLink className="w-3.5 h-3.5" /> Prévia
        </Button>
      </div>

      {/* GENERAL */}
      {activeSection === "general" && (
        <Card>
          <CardHeader><CardTitle className="text-base">Configurações Gerais</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Landing Page Ativa</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Quando desativada, visitantes são redirecionados ao login.</p>
              </div>
              <Switch checked={landing.enabled} onCheckedChange={(v) => void save({ enabled: v })} />
            </div>
            <Separator />
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Título Principal</Label>
                <Input value={landing.hero.headline} onChange={e => setLanding(l => l ? ({ ...l, hero: { ...l.hero, headline: e.target.value } }) : l)} />
              </div>
              <div className="space-y-1.5">
                <Label>Subtítulo</Label>
                <Textarea rows={2} value={landing.hero.subheadline} onChange={e => setLanding(l => l ? ({ ...l, hero: { ...l.hero, subheadline: e.target.value } }) : l)} />
              </div>
              <div className="space-y-1.5">
                <Label>Texto do Botão CTA</Label>
                <Input value={landing.hero.ctaLabel} onChange={e => setLanding(l => l ? ({ ...l, hero: { ...l.hero, ctaLabel: e.target.value } }) : l)} />
              </div>
            </div>
            <Button onClick={() => void save({ hero: landing.hero })} disabled={saving} size="sm">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Salvar Geral
            </Button>
          </CardContent>
        </Card>
      )}

      {/* FEATURES */}
      {activeSection === "features" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Gerencie os cards de funcionalidades exibidos na landing page.</p>
            <Button size="sm" onClick={openAddFeature}>
              <Plus className="w-4 h-4 mr-2" /> Adicionar
            </Button>
          </div>
          {sorted.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Globe className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Nenhuma funcionalidade adicionada.</p>
                <Button size="sm" variant="outline" className="mt-4" onClick={openAddFeature}><Plus className="w-4 h-4 mr-2" />Adicionar</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {sorted.map((feat, i) => (
                <Card key={feat.id}>
                  <CardContent className="pt-4 flex items-center gap-3">
                    <div className="flex flex-col gap-1">
                      <Button size="icon" variant="ghost" className="h-5 w-5" disabled={i === 0} onClick={() => moveFeature(feat.id, -1)}>
                        <ChevronUp className="w-3 h-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-5 w-5" disabled={i === sorted.length - 1} onClick={() => moveFeature(feat.id, 1)}>
                        <ChevronDown className="w-3 h-3" />
                      </Button>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{feat.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{feat.description}</p>
                    </div>
                    <Badge variant="secondary" className="text-xs">{feat.icon}</Badge>
                    <div className="flex gap-1">
                      <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => openEditFeature(feat)}>
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:bg-destructive/10">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remover funcionalidade?</AlertDialogTitle>
                            <AlertDialogDescription>O card <strong>{feat.title}</strong> será removido da landing page.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteFeature(feat.id)} className="bg-destructive text-white">Remover</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* PLANS */}
      {activeSection === "plans" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Exibição de Planos</CardTitle>
            <CardDescription>Escolha quais planos aparecem na landing page e qual é o recomendado.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {allPlans.filter(p => p.isActive).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map(plan => (
              <div key={plan.id} className="flex items-center gap-4">
                <Checkbox
                  id={`vis-${plan.id}`}
                  checked={landing.plans.visiblePlanIds.includes(plan.id)}
                  onCheckedChange={v => togglePlanVisibility(plan.id, !!v)}
                />
                <label htmlFor={`vis-${plan.id}`} className="flex-1 text-sm font-medium cursor-pointer">{plan.name}</label>
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="recommended"
                    id={`rec-${plan.id}`}
                    checked={landing.plans.recommendedPlanId === plan.id}
                    onChange={() => void save({ plans: { ...landing.plans, recommendedPlanId: plan.id } })}
                    className="cursor-pointer"
                  />
                  <label htmlFor={`rec-${plan.id}`} className="text-xs text-muted-foreground cursor-pointer">Recomendado</label>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* CTA */}
      {activeSection === "cta" && (
        <Card>
          <CardHeader><CardTitle className="text-base">Faixa CTA / Rodapé</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label>Título da Faixa CTA</Label>
              <Input value={landing.cta.text} onChange={e => setLanding(l => l ? ({ ...l, cta: { ...l.cta, text: e.target.value } }) : l)} />
            </div>
            <div className="space-y-1.5">
              <Label>Subtexto</Label>
              <Input value={landing.cta.subtext} onChange={e => setLanding(l => l ? ({ ...l, cta: { ...l.cta, subtext: e.target.value } }) : l)} />
            </div>
            <div className="space-y-1.5">
              <Label>Texto do Botão</Label>
              <Input value={landing.cta.buttonLabel} onChange={e => setLanding(l => l ? ({ ...l, cta: { ...l.cta, buttonLabel: e.target.value } }) : l)} />
            </div>
            <Button onClick={() => void save({ cta: landing.cta })} disabled={saving} size="sm">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Salvar CTA
            </Button>
          </CardContent>
        </Card>
      )}

      {/* PARTNERS */}
      {activeSection === "partners" && (
        <PartnersAdminSection token={token ?? ""} toast={toast} />
      )}

      {/* Feature Dialog */}
      <Dialog open={featureDialogOpen} onOpenChange={setFeatureDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editIsNew ? "Nova Funcionalidade" : "Editar Funcionalidade"}</DialogTitle>
            <DialogDescription>Preencha os detalhes do card de funcionalidade.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Título *</Label>
              <Input value={editFeature.title} onChange={e => setEditFeature(f => ({ ...f, title: e.target.value }))} placeholder="Ex: Monitor em Tempo Real" />
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Textarea rows={2} value={editFeature.description} onChange={e => setEditFeature(f => ({ ...f, description: e.target.value }))} placeholder="Descrição da funcionalidade..." />
            </div>
            <div className="space-y-1.5">
              <Label>Ícone (Lucide)</Label>
              <Select value={editFeature.icon} onValueChange={v => setEditFeature(f => ({ ...f, icon: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LUCIDE_ICONS.map(ic => <SelectItem key={ic} value={ic}>{ic}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>URL da Imagem (opcional)</Label>
              <Input value={editFeature.imageUrl} onChange={e => setEditFeature(f => ({ ...f, imageUrl: e.target.value }))} placeholder="https://..." />
            </div>
            <div className="space-y-1.5">
              <Label>URL do Demo Animado (GIF/MP4, opcional)</Label>
              <Input value={editFeature.demoUrl} onChange={e => setEditFeature(f => ({ ...f, demoUrl: e.target.value }))} placeholder="https://...demo.mp4" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFeatureDialogOpen(false)}>Cancelar</Button>
            <Button onClick={saveFeature} disabled={saving || !editFeature.title.trim()}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN ADMIN PAGE
// ════════════════════════════════════════════════════════════════════════════
type AdminSection = "overview" | "users" | "roles" | "plans" | "announcements" | "content" | "customization" | "landing" | "sistema";

const ADMIN_NAV: Array<{ id: AdminSection; label: string; icon: React.ComponentType<{ className?: string }>; badge?: string }> = [
  { id: "overview",      label: "Visão Geral",       icon: LayoutDashboard },
  { id: "users",         label: "Usuários",           icon: Users2 },
  { id: "roles",         label: "Funções",            icon: Star },
  { id: "plans",         label: "Planos",             icon: CreditCard },
  { id: "announcements", label: "Anúncios",           icon: Bell,           badge: "Novo" },
  { id: "content",       label: "Conteúdo",           icon: BookOpen },
  { id: "customization", label: "Customização",       icon: Palette },
  { id: "landing",       label: "Landing Page",       icon: Globe },
  { id: "sistema",       label: "Sistema",            icon: Server },
];

export default function Admin() {
  const { token } = useAuth();
  const [activeSection, setActiveSection] = useState<AdminSection>("overview");
  const [roles, setRoles] = useState<Role[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [permissions, setPermissions] = useState<PermissionDef[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const fetchRoles = useCallback(async () => {
    try {
      const data = await authFetch("/admin/roles", token!) as { roles: Role[]; permissions: PermissionDef[] };
      setRoles(data.roles ?? []); if (data.permissions?.length) setPermissions(data.permissions);
    } catch { /* ignore */ }
  }, [token]);

  const fetchPlans = useCallback(async () => {
    try {
      const data = await authFetch("/admin/plans", token!) as { plans: Plan[]; permissions: PermissionDef[] };
      setPlans(data.plans ?? []); if (data.permissions?.length) setPermissions(data.permissions);
    } catch { /* ignore */ }
  }, [token]);

  useEffect(() => { void fetchRoles(); void fetchPlans(); }, [fetchRoles, fetchPlans]);

  const active = ADMIN_NAV.find((n) => n.id === activeSection);

  return (
    <div className="flex gap-0 -mx-4 -mt-4 min-h-[calc(100vh-80px)]" style={{ marginLeft: "-1.5rem", marginRight: "-1.5rem", marginTop: "-1.5rem" }}>

      {/* Sidebar */}
      <aside className={`w-56 shrink-0 border-r border-white/8 flex flex-col py-4 px-2 hidden lg:flex`}
        style={{ background: "rgba(10,8,20,0.8)" }}>
        <div className="flex items-center gap-2 px-3 mb-6">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "rgba(239,68,68,0.15)" }}>
            <Shield className="w-4 h-4 text-red-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">Painel Admin</p>
            <p className="text-xs text-red-400 font-semibold">Master</p>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5">
          {ADMIN_NAV.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button key={item.id} onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all text-sm ${
                  isActive
                    ? "bg-purple-500/15 text-white font-semibold"
                    : "text-muted-foreground hover:text-white hover:bg-white/5"
                }`}>
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-purple-400" : ""}`} />
                <span className="flex-1">{item.label}</span>
                {item.badge && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full font-bold"
                    style={{ background: "rgba(124,58,237,0.3)", color: "#a78bfa" }}>{item.badge}</span>
                )}
                {isActive && <div className="w-1 h-1 rounded-full bg-purple-400" />}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Mobile top nav */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-white/8 flex overflow-x-auto"
        style={{ background: "rgba(10,8,20,0.95)" }}>
        {ADMIN_NAV.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button key={item.id} onClick={() => setActiveSection(item.id)}
              className={`flex flex-col items-center gap-1 px-3 py-2 text-xs shrink-0 ${isActive ? "text-purple-400" : "text-muted-foreground"}`}>
              <Icon className="w-4 h-4" />
              {item.label.split(" ")[0]}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 p-6 overflow-y-auto">
        {activeSection === "overview"      && <VisaoGeralSection />}
        {activeSection === "users"         && <UsuariosSection roles={roles} />}
        {activeSection === "roles"         && <FuncoesSection roles={roles} permissions={permissions} onRefresh={fetchRoles} />}
        {activeSection === "plans"         && <PlanosSection plans={plans} permissions={permissions} onRefresh={fetchPlans} />}
        {activeSection === "announcements" && <AnunciosSection />}
        {activeSection === "content"       && <ConteudoSection />}
        {activeSection === "customization" && <CustomizacaoSection />}
        {activeSection === "landing"       && <LandingPageTab allPlans={plans} />}
        {activeSection === "sistema"       && <SistemaSection />}
      </div>
    </div>
  );
}
