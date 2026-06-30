import { useState, useEffect, useCallback } from "react";
import {
  Shield, Trash2, RefreshCw, UserCog, Crown, Zap, Users2, Search,
  Settings2, CreditCard, Radio, CheckCircle2, XCircle, Loader2, KeyRound, Eye, EyeOff,
  Plus, Edit2, Palette, Layout, ChevronUp, ChevronDown, ToggleLeft, ToggleRight,
  Star, Save, RotateCcw, PanelLeft, PanelTop, Globe, Lock,
  Server, Activity, AlertTriangle, MessageSquare, Check, X, Clock,
  Cpu, HardDrive, Key, ExternalLink, PlugZap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

// ── Types ──────────────────────────────────────────────────────────────────────
interface Role {
  id: string;
  name: string;
  description: string;
  color: string;
  permissions: string[];
  createdAt: string;
}

interface Plan {
  id: string;
  order?: number;
  name: string;
  description: string;
  price: number;
  currency: string;
  billingPeriod: string;
  permissions: string[];
  tiktokUsernameChangesPerWeek: number;
  maxConcurrentWs: number;
  maxApiCallsPerWindow: number;
  features: string[];
  color: string;
  isActive: boolean;
}

interface PermissionDef {
  id: string;
  label: string;
  category: string;
}

interface StripeConfig {
  secretKeySet: boolean;
  webhookSecretSet: boolean;
  publishableKey: string | null;
  priceIdBasic: string | null;
  priceIdPro: string | null;
  tiktoolsKeySet: boolean;
  paymentsEnabled: boolean;
}

// ── Constants ──────────────────────────────────────────────────────────────────
const PLAN_COLORS: Record<string, string> = {
  free: "bg-muted/40 text-muted-foreground border-muted",
  basic: "bg-cyan-400/10 text-cyan-400 border-cyan-400/30",
  pro: "bg-violet-400/10 text-violet-400 border-violet-400/30",
};
const PLAN_LABEL: Record<string, string> = { free: "Sandbox", basic: "Basic+", pro: "Pro" };

const PRESET_COLORS = [
  { label: "Cyan",   hsl: "180 100% 50%" },
  { label: "Pink",   hsl: "333 99% 52%" },
  { label: "Violet", hsl: "270 80% 60%" },
  { label: "Green",  hsl: "142 71% 45%" },
  { label: "Orange", hsl: "28 99% 54%" },
  { label: "Blue",   hsl: "221 83% 53%" },
  { label: "Red",    hsl: "0 84% 60%" },
  { label: "Yellow", hsl: "48 97% 52%" },
];

// ── Helpers ────────────────────────────────────────────────────────────────────
function groupBy<T>(arr: T[], key: (item: T) => string): Record<string, T[]> {
  return arr.reduce((acc, item) => {
    const k = key(item);
    (acc[k] = acc[k] || []).push(item);
    return acc;
  }, {} as Record<string, T[]>);
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function PermissionCheckboxGroup({
  allPermissions,
  selected,
  onChange,
}: {
  allPermissions: PermissionDef[];
  selected: string[];
  onChange: (p: string[]) => void;
}) {
  const groups = groupBy(allPermissions, (p) => p.category);
  const toggle = (id: string) => {
    if (selected.includes(id)) onChange(selected.filter((x) => x !== id));
    else onChange([...selected, id]);
  };
  const toggleAll = (ids: string[], checked: boolean) => {
    if (checked) onChange([...new Set([...selected, ...ids])]);
    else onChange(selected.filter((x) => !ids.includes(x)));
  };
  return (
    <div className="space-y-4">
      {Object.entries(groups).map(([cat, perms]) => {
        const allSelected = perms.every((p) => selected.includes(p.id));
        return (
          <div key={cat}>
            <div className="flex items-center gap-2 mb-2">
              <Checkbox
                checked={allSelected}
                onCheckedChange={(v) => toggleAll(perms.map((p) => p.id), !!v)}
              />
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{cat}</p>
            </div>
            <div className="grid grid-cols-2 gap-1.5 pl-6">
              {perms.map((p) => (
                <div key={p.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`perm-${p.id}`}
                    checked={selected.includes(p.id)}
                    onCheckedChange={() => toggle(p.id)}
                  />
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

// ════════════════════════════════════════════════════════════════════════════════
// TAB: USUÁRIOS
// ════════════════════════════════════════════════════════════════════════════════
function UsersTab({ roles }: { roles: Role[] }) {
  const { user: me, token } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchUsers = useCallback(() => {
    setLoading(true);
    authFetch("/auth/users", token!)
      .then((d: { users: AuthUser[] }) => setUsers(d.users ?? []))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const updateUser = (id: string, patch: Record<string, unknown>) => {
    setUpdatingId(id);
    authFetch(`/auth/users/${id}`, token!, { method: "PATCH", body: JSON.stringify(patch) })
      .then(() => fetchUsers())
      .catch(() => toast({ title: "Erro ao atualizar", variant: "destructive" }))
      .finally(() => setUpdatingId(null));
  };

  const assignRole = (userId: string, roleId: string | "") => {
    authFetch(`/admin/users/${userId}/role`, token!, {
      method: "PATCH",
      body: JSON.stringify({ roleId: roleId || null }),
    })
      .then(() => fetchUsers())
      .catch(() => toast({ title: "Erro ao atribuir função", variant: "destructive" }));
  };

  const deleteUser = (id: string) => {
    authFetch(`/auth/users/${id}`, token!, { method: "DELETE" })
      .then(() => fetchUsers())
      .catch(() => toast({ title: "Erro ao deletar", variant: "destructive" }));
  };

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar usuários..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Button variant="outline" size="icon" onClick={fetchUsers}>
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Função</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>TikTok</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum usuário encontrado</TableCell></TableRow>
              ) : filtered.map((u) => (
                <TableRow key={u.id} className={u.id === me?.id ? "bg-primary/5" : ""}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{u.name}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={u.plan}
                      onValueChange={(v) => updateUser(u.id, { plan: v })}
                      disabled={updatingId === u.id || u.id === me?.id}
                    >
                      <SelectTrigger className="h-7 text-xs w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="free">Sandbox</SelectItem>
                        <SelectItem value="basic">Basic+</SelectItem>
                        <SelectItem value="pro">Pro</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={(u as AuthUser & { roleId?: string }).roleId ?? "none"}
                      onValueChange={(v) => assignRole(u.id, v === "none" ? "" : v)}
                      disabled={u.id === me?.id}
                    >
                      <SelectTrigger className="h-7 text-xs w-28">
                        <SelectValue placeholder="Sem função" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— Sem função —</SelectItem>
                        {roles.map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            <span className="flex items-center gap-1.5">
                              <span className="inline-block w-2 h-2 rounded-full" style={{ background: r.color }} />
                              {r.name}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={u.isAdmin}
                      onCheckedChange={(v) => updateUser(u.id, { isAdmin: v })}
                      disabled={updatingId === u.id || u.id === me?.id}
                    />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {(u as AuthUser & { tiktokUsername?: string }).tiktokUsername
                      ? `@${(u as AuthUser & { tiktokUsername?: string }).tiktokUsername}`
                      : <span className="text-muted-foreground/40">—</span>}
                  </TableCell>
                  <TableCell className="text-right">
                    {u.id !== me?.id && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Deletar usuário?</AlertDialogTitle>
                            <AlertDialogDescription>Esta ação não pode ser desfeita. O usuário <strong>{u.name}</strong> será removido permanentemente.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteUser(u.id)} className="bg-destructive text-white">Deletar</AlertDialogAction>
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

// ════════════════════════════════════════════════════════════════════════════════
// TAB: FUNÇÕES (ROLES)
// ════════════════════════════════════════════════════════════════════════════════
function RolesTab({
  roles, permissions, onRefresh,
}: {
  roles: Role[];
  permissions: PermissionDef[];
  onRefresh: () => void;
}) {
  const { token } = useAuth();
  const { toast } = useToast();
  const [editRole, setEditRole] = useState<Partial<Role> | null>(null);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const openCreate = () => {
    setEditRole({ name: "", description: "", color: "#6366f1", permissions: [] });
    setDialogOpen(true);
  };
  const openEdit = (r: Role) => { setEditRole({ ...r }); setDialogOpen(true); };

  const save = async () => {
    if (!editRole?.name?.trim()) return;
    setSaving(true);
    try {
      const isNew = !editRole.id;
      const url = isNew ? "/admin/roles" : `/admin/roles/${editRole.id}`;
      await authFetch(url, token!, { method: isNew ? "POST" : "PATCH", body: JSON.stringify(editRole) });
      toast({ title: isNew ? "Função criada!" : "Função atualizada!" });
      setDialogOpen(false);
      onRefresh();
    } catch { toast({ title: "Erro ao salvar", variant: "destructive" }); }
    setSaving(false);
  };

  const del = async (id: string) => {
    try {
      await authFetch(`/admin/roles/${id}`, token!, { method: "DELETE" });
      toast({ title: "Função removida" });
      onRefresh();
    } catch { toast({ title: "Erro ao remover", variant: "destructive" }); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Crie funções personalizadas e atribua permissões específicas a cada uma.</p>
        <Button onClick={openCreate} size="sm">
          <Plus className="w-4 h-4 mr-2" />Nova Função
        </Button>
      </div>

      {roles.length === 0 ? (
        <Card>
          <CardContent className="py-14 text-center">
            <Shield className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Nenhuma função criada ainda</p>
            <Button size="sm" variant="outline" className="mt-4" onClick={openCreate}>
              <Plus className="w-4 h-4 mr-2" />Criar primeira função
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {roles.map((r) => (
            <Card key={r.id}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full shrink-0 mt-0.5" style={{ background: r.color }} />
                    <div>
                      <p className="font-medium text-sm">{r.name}</p>
                      {r.description && <p className="text-xs text-muted-foreground mt-0.5">{r.description}</p>}
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {r.permissions.slice(0, 6).map((p) => {
                          const def = permissions.find((x) => x.id === p);
                          return (
                            <Badge key={p} variant="secondary" className="text-[10px] px-1.5 py-0">
                              {def?.label ?? p}
                            </Badge>
                          );
                        })}
                        {r.permissions.length > 6 && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">+{r.permissions.length - 6}</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => openEdit(r)}>
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remover função?</AlertDialogTitle>
                          <AlertDialogDescription>A função <strong>{r.name}</strong> será removida e desatribuída de todos os usuários.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => del(r.id)} className="bg-destructive text-white">Remover</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{editRole?.id ? "Editar Função" : "Nova Função"}</DialogTitle>
            <DialogDescription>Configure nome, descrição, cor e permissões desta função.</DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 pr-2">
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>Nome *</Label>
                <Input value={editRole?.name ?? ""} onChange={(e) => setEditRole((p) => ({ ...p, name: e.target.value }))} placeholder="Ex: Moderador" />
              </div>
              <div className="space-y-1.5">
                <Label>Descrição</Label>
                <Input value={editRole?.description ?? ""} onChange={(e) => setEditRole((p) => ({ ...p, description: e.target.value }))} placeholder="Descrição opcional" />
              </div>
              <div className="space-y-1.5">
                <Label>Cor</Label>
                <div className="flex items-center gap-3">
                  <div className="flex gap-2 flex-wrap">
                    {["#6366f1", "#ec4899", "#22d3ee", "#a855f7", "#10b981", "#f97316", "#ef4444", "#eab308"].map((c) => (
                      <button
                        key={c}
                        className={`w-6 h-6 rounded-full border-2 transition-all ${editRole?.color === c ? "border-foreground scale-110" : "border-transparent"}`}
                        style={{ background: c }}
                        onClick={() => setEditRole((p) => ({ ...p, color: c }))}
                      />
                    ))}
                  </div>
                  <input
                    type="color"
                    value={editRole?.color ?? "#6366f1"}
                    onChange={(e) => setEditRole((p) => ({ ...p, color: e.target.value }))}
                    className="w-8 h-8 rounded cursor-pointer border border-border"
                  />
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label>Permissões</Label>
                <PermissionCheckboxGroup
                  allPermissions={permissions}
                  selected={editRole?.permissions ?? []}
                  onChange={(p) => setEditRole((prev) => ({ ...prev, permissions: p }))}
                />
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving || !editRole?.name?.trim()}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// TAB: PLANOS
// ════════════════════════════════════════════════════════════════════════════════
function PlansTab({ plans, permissions, onRefresh }: { plans: Plan[]; permissions: PermissionDef[]; onRefresh: () => void }) {
  const { token } = useAuth();
  const { toast } = useToast();
  const [editPlan, setEditPlan] = useState<Plan | null>(null);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newFeature, setNewFeature] = useState("");

  const openEdit = (p: Plan) => { setEditPlan({ ...p }); setDialogOpen(true); };

  const save = async () => {
    if (!editPlan) return;
    setSaving(true);
    try {
      await authFetch(`/admin/plans/${editPlan.id}`, token!, {
        method: "PATCH",
        body: JSON.stringify(editPlan),
      });
      toast({ title: "Plano atualizado!" });
      setDialogOpen(false);
      onRefresh();
    } catch { toast({ title: "Erro ao salvar", variant: "destructive" }); }
    setSaving(false);
  };

  const planColorMap: Record<string, string> = {
    gray: "bg-muted/40 text-muted-foreground",
    cyan: "bg-cyan-400/10 text-cyan-400",
    violet: "bg-violet-400/10 text-violet-400",
    green: "bg-green-400/10 text-green-400",
    orange: "bg-orange-400/10 text-orange-400",
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Edite permissões, preços e limites de cada plano item por item.</p>
      <div className="grid gap-4">
        {[...plans].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map((plan) => (
          <Card key={plan.id} className={plan.isActive ? "" : "opacity-60"}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge className={`text-xs ${planColorMap[plan.color] ?? "bg-muted/40"}`}>
                    {plan.name}
                  </Badge>
                  {!plan.isActive && <Badge variant="outline" className="text-xs text-muted-foreground">Inativo</Badge>}
                  <span className="text-sm text-muted-foreground">
                    {plan.price === 0 ? "Gratuito" : `$${(plan.price / 100).toFixed(2)} / ${plan.billingPeriod === "monthly" ? "mês" : plan.billingPeriod}`}
                  </span>
                </div>
                <Button variant="outline" size="sm" onClick={() => openEdit(plan)}>
                  <Edit2 className="w-3.5 h-3.5 mr-1.5" />Editar
                </Button>
              </div>
              <CardDescription className="mt-1">{plan.description}</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div className="text-center p-2 bg-muted/20 rounded-md">
                  <p className="text-xs text-muted-foreground">TikTok Username/sem</p>
                  <p className="font-mono font-bold text-sm">
                    {plan.tiktokUsernameChangesPerWeek === -1 ? "∞" : plan.tiktokUsernameChangesPerWeek === 0 ? "🔒" : plan.tiktokUsernameChangesPerWeek}
                  </p>
                </div>
                <div className="text-center p-2 bg-muted/20 rounded-md">
                  <p className="text-xs text-muted-foreground">WebSockets</p>
                  <p className="font-mono font-bold text-sm">{plan.maxConcurrentWs}</p>
                </div>
                <div className="text-center p-2 bg-muted/20 rounded-md">
                  <p className="text-xs text-muted-foreground">Calls/janela</p>
                  <p className="font-mono font-bold text-sm">{plan.maxApiCallsPerWindow}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {plan.permissions.map((p) => {
                  const def = permissions.find((x) => x.id === p);
                  return <Badge key={p} variant="secondary" className="text-[10px] px-1.5 py-0">{def?.label ?? p}</Badge>;
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Editar Plano — {editPlan?.name}</DialogTitle>
            <DialogDescription>Configure preço, permissões e limites deste plano.</DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 pr-2">
            {editPlan && (
              <div className="space-y-5 py-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Nome</Label>
                    <Input value={editPlan.name} onChange={(e) => setEditPlan((p) => p ? { ...p, name: e.target.value } : p)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Preço (centavos USD)</Label>
                    <Input type="number" value={editPlan.price} onChange={(e) => setEditPlan((p) => p ? { ...p, price: Number(e.target.value) } : p)} />
                    <p className="text-xs text-muted-foreground">${(editPlan.price / 100).toFixed(2)}</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Descrição</Label>
                  <Input value={editPlan.description} onChange={(e) => setEditPlan((p) => p ? { ...p, description: e.target.value } : p)} />
                </div>

                <Separator />
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">Anti-compartilhamento — TikTok Username</Label>
                  <p className="text-xs text-muted-foreground">Limita quantas vezes o usuário pode trocar o username por semana. Use -1 para ilimitado, 0 para bloquear.</p>
                  <div className="flex items-center gap-3">
                    <Input
                      type="number"
                      min={-1}
                      value={editPlan.tiktokUsernameChangesPerWeek}
                      onChange={(e) => setEditPlan((p) => p ? { ...p, tiktokUsernameChangesPerWeek: Number(e.target.value) } : p)}
                      className="w-24"
                    />
                    <p className="text-sm text-muted-foreground">
                      {editPlan.tiktokUsernameChangesPerWeek === -1 ? "✅ Ilimitado" :
                       editPlan.tiktokUsernameChangesPerWeek === 0 ? "🔒 Bloqueado" :
                       `${editPlan.tiktokUsernameChangesPerWeek}x por semana`}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Max WebSockets</Label>
                    <Input type="number" value={editPlan.maxConcurrentWs} onChange={(e) => setEditPlan((p) => p ? { ...p, maxConcurrentWs: Number(e.target.value) } : p)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Max API calls/janela</Label>
                    <Input type="number" value={editPlan.maxApiCallsPerWindow} onChange={(e) => setEditPlan((p) => p ? { ...p, maxApiCallsPerWindow: Number(e.target.value) } : p)} />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={editPlan.isActive}
                    onCheckedChange={(v) => setEditPlan((p) => p ? { ...p, isActive: v } : p)}
                  />
                  <Label>Plano ativo (visível para usuários)</Label>
                </div>

                <Separator />
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Funcionalidades incluídas</Label>
                  <div className="space-y-1.5">
                    {editPlan.features.map((f, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Input
                          value={f}
                          onChange={(e) => {
                            const feats = [...editPlan.features];
                            feats[i] = e.target.value;
                            setEditPlan((p) => p ? { ...p, features: feats } : p);
                          }}
                          className="h-7 text-xs"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:bg-destructive/10 shrink-0"
                          onClick={() => setEditPlan((p) => p ? { ...p, features: p.features.filter((_, j) => j !== i) } : p)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                    <div className="flex gap-2 mt-2">
                      <Input
                        value={newFeature}
                        onChange={(e) => setNewFeature(e.target.value)}
                        placeholder="Adicionar funcionalidade..."
                        className="h-7 text-xs"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && newFeature.trim()) {
                            setEditPlan((p) => p ? { ...p, features: [...p.features, newFeature.trim()] } : p);
                            setNewFeature("");
                          }
                        }}
                      />
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-7 w-7 shrink-0"
                        onClick={() => {
                          if (newFeature.trim()) {
                            setEditPlan((p) => p ? { ...p, features: [...p.features, newFeature.trim()] } : p);
                            setNewFeature("");
                          }
                        }}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>

                <Separator />
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Permissões deste plano</Label>
                  <PermissionCheckboxGroup
                    allPermissions={permissions}
                    selected={editPlan.permissions}
                    onChange={(p) => setEditPlan((prev) => prev ? { ...prev, permissions: p } : prev)}
                  />
                </div>
              </div>
            )}
          </ScrollArea>
          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// TAB: CUSTOMIZAÇÃO
// ════════════════════════════════════════════════════════════════════════════════
function CustomizationTab() {
  const { token } = useAuth();
  const { config, update, reset, refresh } = useUIConfig();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [local, setLocal] = useState(config);

  useEffect(() => { setLocal(config); }, [config]);

  const save = async () => {
    if (!local) return;
    setSaving(true);
    try {
      await update(local, token!);
      toast({ title: "Customização salva!" });
    } catch { toast({ title: "Erro ao salvar", variant: "destructive" }); }
    setSaving(false);
  };

  const doReset = async () => {
    setResetting(true);
    try {
      await reset(token!);
      toast({ title: "Configurações resetadas!" });
    } catch { toast({ title: "Erro ao resetar", variant: "destructive" }); }
    setResetting(false);
  };

  if (!local) return <div className="py-10 text-center text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />Carregando...</div>;

  const moveItem = (secId: string, itemIdx: number, dir: -1 | 1) => {
    setLocal((prev) => {
      if (!prev) return prev;
      const sections = prev.sidebarSections.map((s) => {
        if (s.id !== secId) return s;
        const items = [...s.items];
        const target = itemIdx + dir;
        if (target < 0 || target >= items.length) return s;
        [items[itemIdx], items[target]] = [items[target], items[itemIdx]];
        return { ...s, items };
      });
      return { ...prev, sidebarSections: sections };
    });
  };

  const toggleItemVisible = (secId: string, itemIdx: number) => {
    setLocal((prev) => {
      if (!prev) return prev;
      const sections = prev.sidebarSections.map((s) => {
        if (s.id !== secId) return s;
        const items = s.items.map((item, i) =>
          i === itemIdx ? { ...item, visible: !item.visible } : item
        );
        return { ...s, items };
      });
      return { ...prev, sidebarSections: sections };
    });
  };

  const updateItemLabel = (secId: string, itemIdx: number, label: string) => {
    setLocal((prev) => {
      if (!prev) return prev;
      const sections = prev.sidebarSections.map((s) => {
        if (s.id !== secId) return s;
        const items = s.items.map((item, i) => i === itemIdx ? { ...item, label } : item);
        return { ...s, items };
      });
      return { ...prev, sidebarSections: sections };
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Personalize aparência, navegação e identidade visual do painel.</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={doReset} disabled={resetting}>
            <RotateCcw className={`w-4 h-4 mr-2 ${resetting ? "animate-spin" : ""}`} />Reset
          </Button>
          <Button size="sm" onClick={save} disabled={saving}>
            <Save className={`w-4 h-4 mr-2 ${saving ? "animate-spin" : ""}`} />Salvar
          </Button>
        </div>
      </div>

      {/* Nav type */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Tipo de Navegação</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            {[
              { value: "sidebar", label: "Sidebar", icon: PanelLeft },
              { value: "topbar", label: "Top Bar", icon: PanelTop },
            ].map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setLocal((p) => p ? { ...p, navType: value as "sidebar" | "topbar" } : p)}
                className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-lg border transition-colors ${
                  local.navType === value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:bg-accent"
                }`}
              >
                <Icon className="w-6 h-6" />
                <span className="text-sm font-medium">{label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Logo */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Identidade Visual</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label>Nome do sistema (logo text)</Label>
            <Input
              value={local.logoText}
              onChange={(e) => setLocal((p) => p ? { ...p, logoText: e.target.value } : p)}
              placeholder="Creatools"
            />
          </div>
          <div className="space-y-1.5">
            <Label>URL do Logo (imagem — opcional)</Label>
            <Input
              value={local.logoUrl}
              onChange={(e) => setLocal((p) => p ? { ...p, logoUrl: e.target.value } : p)}
              placeholder="https://..."
            />
            {local.logoUrl && (
              <img src={local.logoUrl} alt="logo preview" className="h-10 mt-1 rounded object-contain bg-muted p-1" />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Colors */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Cores</CardTitle>
          <CardDescription>Cores principais do sistema (HSL — ex: "180 100% 50%")</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Cor Primária</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c.hsl}
                  title={c.label}
                  className={`w-7 h-7 rounded-full border-2 transition-all ${local.primaryColor === c.hsl ? "border-foreground scale-110" : "border-transparent"}`}
                  style={{ background: `hsl(${c.hsl})` }}
                  onClick={() => setLocal((p) => p ? { ...p, primaryColor: c.hsl } : p)}
                />
              ))}
            </div>
            <Input
              value={local.primaryColor}
              onChange={(e) => setLocal((p) => p ? { ...p, primaryColor: e.target.value } : p)}
              placeholder="180 100% 50%"
            />
            <div className="h-6 rounded-md" style={{ background: `hsl(${local.primaryColor})` }} />
          </div>
          <div className="space-y-2">
            <Label>Cor Secundária</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c.hsl}
                  title={c.label}
                  className={`w-7 h-7 rounded-full border-2 transition-all ${local.secondaryColor === c.hsl ? "border-foreground scale-110" : "border-transparent"}`}
                  style={{ background: `hsl(${c.hsl})` }}
                  onClick={() => setLocal((p) => p ? { ...p, secondaryColor: c.hsl } : p)}
                />
              ))}
            </div>
            <Input
              value={local.secondaryColor}
              onChange={(e) => setLocal((p) => p ? { ...p, secondaryColor: e.target.value } : p)}
              placeholder="333 99% 52%"
            />
            <div className="h-6 rounded-md" style={{ background: `hsl(${local.secondaryColor})` }} />
          </div>
        </CardContent>
      </Card>

      {/* Sidebar sections editor */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Itens do Menu Sidebar</CardTitle>
          <CardDescription>Reordene e mostre/oculte itens do menu. Edite os rótulos diretamente.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {local.sidebarSections.map((section) => (
            <div key={section.id} className="space-y-1.5">
              {section.label && (
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 px-1">{section.label}</p>
              )}
              <div className="space-y-1 border border-border rounded-lg overflow-hidden">
                {section.items.map((item, itemIdx) => (
                  <div key={item.id} className={`flex items-center gap-2 px-3 py-2 ${!item.visible ? "opacity-40" : ""} hover:bg-accent/30 transition-colors`}>
                    <div className="flex flex-col gap-0.5 shrink-0">
                      <button
                        className="text-muted-foreground hover:text-foreground disabled:opacity-20"
                        onClick={() => moveItem(section.id, itemIdx, -1)}
                        disabled={itemIdx === 0}
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        className="text-muted-foreground hover:text-foreground disabled:opacity-20"
                        onClick={() => moveItem(section.id, itemIdx, 1)}
                        disabled={itemIdx === section.items.length - 1}
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex-1 min-w-0">
                      <Input
                        value={item.label}
                        onChange={(e) => updateItemLabel(section.id, itemIdx, e.target.value)}
                        className="h-6 text-xs border-none bg-transparent focus-visible:ring-0 p-0 text-foreground"
                      />
                      <p className="text-[10px] text-muted-foreground/50 font-mono truncate">{item.href}</p>
                    </div>
                    {item.adminOnly && <Badge className="text-[10px] px-1 py-0 bg-destructive/10 text-destructive">Admin</Badge>}
                    {item.requiresPlan && <Badge variant="outline" className="text-[10px] px-1 py-0">{item.requiresPlan}</Badge>}
                    <button
                      onClick={() => toggleItemVisible(section.id, itemIdx)}
                      className={`shrink-0 transition-colors ${item.visible ? "text-primary" : "text-muted-foreground/30"}`}
                      title={item.visible ? "Ocultar item" : "Mostrar item"}
                    >
                      {item.visible ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={doReset} disabled={resetting}>
          <RotateCcw className="w-4 h-4 mr-2" />Resetar para padrão
        </Button>
        <Button onClick={save} disabled={saving}>
          <Save className="w-4 h-4 mr-2" />Salvar customização
        </Button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// TAB: INTEGRAÇÕES
// ════════════════════════════════════════════════════════════════════════════════
function IntegracoesTab() {
  const { token } = useAuth();
  const { toast } = useToast();
  const [tiktoolsKey, setTiktoolsKey] = useState("");
  const [tiktoolsMasked, setTiktoolsMasked] = useState<string | null>(null);
  const [showTiktoolsKey, setShowTiktoolsKey] = useState(false);
  const [savingTiktools, setSavingTiktools] = useState(false);
  const [testingTiktools, setTestingTiktools] = useState(false);
  const [tiktoolsResult, setTiktoolsResult] = useState<{ ok: boolean; message: string } | null>(null);

  const [stripeConfig, setStripeConfig] = useState<StripeConfig | null>(null);
  const [stripePublishable, setStripePublishable] = useState("");
  const [stripeBasic, setStripeBasic] = useState("");
  const [stripePro, setStripePro] = useState("");
  const [paymentsEnabled, setPaymentsEnabled] = useState(true);
  const [savingStripe, setSavingStripe] = useState(false);
  const [testingStripe, setTestingStripe] = useState(false);
  const [stripeResult, setStripeResult] = useState<{ ok: boolean; message: string } | null>(null);

  interface AltApiConfig {
    enabled: boolean;
    baseUrl: string;
    apiKeyHeader: string;
    apiKey: string;
    testPath: string;
    notes: string;
  }
  const [altApi, setAltApi] = useState<AltApiConfig>({ enabled: false, baseUrl: "", apiKeyHeader: "x-api-key", apiKey: "", testPath: "/api/live/top-channels", notes: "" });
  const [savingAlt, setSavingAlt] = useState(false);
  const [testingAlt, setTestingAlt] = useState(false);
  const [altResult, setAltResult] = useState<{ ok: boolean; message: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const [sc, ac, tc] = await Promise.all([
        authFetch("/admin/stripe-config", token!) as Promise<StripeConfig>,
        authFetch("/admin/alt-api-config", token!) as Promise<AltApiConfig>,
        authFetch("/admin/tiktools-config", token!) as Promise<{ apiKeySet: boolean; apiKeyMasked: string | null }>,
      ]);
      setStripeConfig(sc);
      setStripePublishable(sc.publishableKey ?? "");
      setStripeBasic(sc.priceIdBasic ?? "");
      setStripePro(sc.priceIdPro ?? "");
      setPaymentsEnabled(sc.paymentsEnabled);
      setAltApi(ac);
      setTiktoolsMasked(tc.apiKeyMasked);
    } catch { /* ignore */ }
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  async function saveTiktools() {
    if (!tiktoolsKey.trim()) return;
    setSavingTiktools(true);
    try {
      const r = await authFetch("/admin/tiktools-config", token!, { method: "PATCH", body: JSON.stringify({ apiKey: tiktoolsKey }) }) as { ok: boolean; apiKeyMasked: string };
      setTiktoolsMasked(r.apiKeyMasked);
      setTiktoolsKey("");
      toast({ title: "Chave tik.tools atualizada!" });
    } catch { toast({ title: "Erro ao salvar", variant: "destructive" }); }
    setSavingTiktools(false);
  }

  async function testTiktools() {
    setTestingTiktools(true);
    setTiktoolsResult(null);
    try {
      const r = await authFetch("/admin/test-tiktools", token!, { method: "POST" }) as { ok: boolean; message: string };
      setTiktoolsResult(r);
    } catch { setTiktoolsResult({ ok: false, message: "Erro de conexão" }); }
    setTestingTiktools(false);
  }

  async function saveStripe() {
    setSavingStripe(true);
    try {
      await authFetch("/admin/stripe-config", token!, {
        method: "PATCH",
        body: JSON.stringify({ publishableKey: stripePublishable || null, priceIdBasic: stripeBasic || null, priceIdPro: stripePro || null, paymentsEnabled }),
      });
      toast({ title: "Stripe atualizado!" });
      void load();
    } catch { toast({ title: "Erro ao salvar", variant: "destructive" }); }
    setSavingStripe(false);
  }

  async function testStripe() {
    setTestingStripe(true);
    setStripeResult(null);
    try {
      const r = await authFetch("/admin/test-stripe", token!, { method: "POST" }) as { ok: boolean; message: string };
      setStripeResult(r);
    } catch { setStripeResult({ ok: false, message: "Erro de conexão" }); }
    setTestingStripe(false);
  }

  async function saveAlt() {
    setSavingAlt(true);
    try {
      await authFetch("/admin/alt-api-config", token!, { method: "PATCH", body: JSON.stringify(altApi) });
      toast({ title: "API alternativa atualizada!" });
    } catch { toast({ title: "Erro ao salvar", variant: "destructive" }); }
    setSavingAlt(false);
  }

  async function testAlt() {
    setTestingAlt(true);
    setAltResult(null);
    try {
      const r = await authFetch("/admin/test-alt-api", token!, { method: "POST", body: JSON.stringify({ baseUrl: altApi.baseUrl, apiKey: altApi.apiKey, apiKeyHeader: altApi.apiKeyHeader, testPath: altApi.testPath }) }) as { ok: boolean; message: string };
      setAltResult(r);
    } catch { setAltResult({ ok: false, message: "Erro de conexão" }); }
    setTestingAlt(false);
  }

  const ResultBadge = ({ r }: { r: { ok: boolean; message: string } }) => (
    <div className={`flex items-start gap-2 text-sm rounded-md px-3 py-2 mt-2 ${r.ok ? "bg-green-500/10 border border-green-500/20 text-green-400" : "bg-destructive/10 border border-destructive/20 text-destructive"}`}>
      {r.ok ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" /> : <XCircle className="w-4 h-4 shrink-0 mt-0.5" />}
      {r.message}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* ── tik.tools ── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-cyan-400" />
            <CardTitle className="text-sm">API tik.tools</CardTitle>
            {tiktoolsMasked && <Badge variant="secondary" className="text-xs font-mono">{tiktoolsMasked}</Badge>}
          </div>
          <CardDescription>Chave principal para dados de lives do TikTok em tempo real.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                type={showTiktoolsKey ? "text" : "password"}
                placeholder="Nova chave (tk_live_...)"
                value={tiktoolsKey}
                onChange={(e) => setTiktoolsKey(e.target.value)}
                className="pr-10 font-mono text-sm"
              />
              <button type="button" onClick={() => setShowTiktoolsKey((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showTiktoolsKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <Button onClick={saveTiktools} disabled={!tiktoolsKey.trim() || savingTiktools} size="sm">
              {savingTiktools ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={testTiktools} disabled={testingTiktools}>
              {testingTiktools ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />Testando…</> : <><Radio className="w-3.5 h-3.5 mr-1.5" />Testar conexão</>}
            </Button>
            <a href="https://tik.tools/dashboard" target="_blank" rel="noopener noreferrer">
              <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
                <ExternalLink className="w-3.5 h-3.5" />Dashboard tik.tools
              </Button>
            </a>
          </div>
          {tiktoolsResult && <ResultBadge r={tiktoolsResult} />}
        </CardContent>
      </Card>

      {/* ── API Alternativa ── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-violet-400" />
            <CardTitle className="text-sm">API Alternativa</CardTitle>
            <Badge variant="outline" className="text-xs">Backup</Badge>
            <div className="ml-auto">
              <Switch checked={altApi.enabled} onCheckedChange={(v) => setAltApi((p) => ({ ...p, enabled: v }))} />
            </div>
          </div>
          <CardDescription>API de backup compatível com tik.tools (qualquer endpoint HTTP). Usada quando a API principal falhar.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">URL Base</Label>
            <Input value={altApi.baseUrl} onChange={(e) => setAltApi((p) => ({ ...p, baseUrl: e.target.value }))}
              placeholder="https://minha-api.com" className="font-mono text-sm" disabled={!altApi.enabled} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Header da chave</Label>
              <Input value={altApi.apiKeyHeader} onChange={(e) => setAltApi((p) => ({ ...p, apiKeyHeader: e.target.value }))}
                placeholder="x-api-key" className="font-mono text-sm" disabled={!altApi.enabled} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Chave da API</Label>
              <Input type="password" value={altApi.apiKey} onChange={(e) => setAltApi((p) => ({ ...p, apiKey: e.target.value }))}
                placeholder="Opcional" className="font-mono text-sm" disabled={!altApi.enabled} />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Endpoint de teste</Label>
            <Input value={altApi.testPath} onChange={(e) => setAltApi((p) => ({ ...p, testPath: e.target.value }))}
              placeholder="/api/live/top-channels" className="font-mono text-sm" disabled={!altApi.enabled} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Notas (interno)</Label>
            <Input value={altApi.notes} onChange={(e) => setAltApi((p) => ({ ...p, notes: e.target.value }))}
              placeholder="Ex: Self-hosted TikTok Live Connector" disabled={!altApi.enabled} />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={saveAlt} disabled={savingAlt}>
              {savingAlt ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}Salvar
            </Button>
            <Button variant="outline" size="sm" onClick={testAlt} disabled={testingAlt || !altApi.baseUrl}>
              {testingAlt ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />Testando…</> : <><Radio className="w-3.5 h-3.5 mr-1.5" />Testar</>}
            </Button>
          </div>
          {altResult && <ResultBadge r={altResult} />}
        </CardContent>
      </Card>

      {/* ── Stripe ── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-indigo-400" />
            <CardTitle className="text-sm">Stripe — Pagamentos</CardTitle>
            {stripeConfig && (
              <Badge className={`text-xs ${stripeConfig.secretKeySet ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-muted/40 text-muted-foreground"}`}>
                {stripeConfig.secretKeySet ? "SK configurada" : "SK não configurada"}
              </Badge>
            )}
            <div className="ml-auto flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Pagamentos</Label>
              <Switch checked={paymentsEnabled} onCheckedChange={setPaymentsEnabled} />
            </div>
          </div>
          <CardDescription>Configure chaves e Price IDs do Stripe para cobrar assinaturas.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-md bg-muted/20 border border-border px-3 py-2 text-xs text-muted-foreground space-y-1">
            <p className="font-medium">Configurar via variáveis de ambiente (recomendado):</p>
            <p className="font-mono">STRIPE_SECRET_KEY · STRIPE_WEBHOOK_SECRET</p>
            <p>As chaves secretas não podem ser salvas pelo painel por segurança. Use as env vars do Replit.</p>
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Publishable Key (pk_...)</Label>
            <Input value={stripePublishable} onChange={(e) => setStripePublishable(e.target.value)}
              placeholder="pk_live_••••••••" className="font-mono text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Price ID — Basic+</Label>
              <Input value={stripeBasic} onChange={(e) => setStripeBasic(e.target.value)}
                placeholder="price_••••••••" className="font-mono text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Price ID — Pro</Label>
              <Input value={stripePro} onChange={(e) => setStripePro(e.target.value)}
                placeholder="price_••••••••" className="font-mono text-sm" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={saveStripe} disabled={savingStripe}>
              {savingStripe ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}Salvar
            </Button>
            <Button variant="outline" size="sm" onClick={testStripe} disabled={testingStripe}>
              {testingStripe ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />Testando…</> : <><Radio className="w-3.5 h-3.5 mr-1.5" />Testar Stripe</>}
            </Button>
          </div>
          {stripeResult && <ResultBadge r={stripeResult} />}
        </CardContent>
      </Card>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// TAB: SUPORTE
// ════════════════════════════════════════════════════════════════════════════════
interface Ticket {
  id: string;
  type: string;
  userId: string;
  userName: string;
  userEmail: string;
  status: "pending" | "approved" | "denied" | "cancelled";
  oldValue?: string;
  newValue?: string;
  reason: string;
  customReason?: string;
  adminNote?: string;
  createdAt: string;
  resolvedAt?: string;
}

function SuporteTab() {
  const { token } = useAuth();
  const { toast } = useToast();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "resolved">("pending");
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [noteMap, setNoteMap] = useState<Record<string, string>>({});

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const d = await authFetch("/admin/support/tickets", token!) as { tickets: Ticket[] };
      setTickets(d.tickets ?? []);
    } finally { setLoading(false); }
  }, [token]);

  useEffect(() => { void fetch_(); }, [fetch_]);

  async function resolve(id: string, action: "approve" | "deny") {
    setResolvingId(id);
    try {
      await authFetch(`/admin/support/tickets/${id}`, token!, {
        method: "PATCH",
        body: JSON.stringify({ action, adminNote: noteMap[id] ?? "" }),
      });
      toast({ title: action === "approve" ? "✅ Ticket aprovado!" : "❌ Ticket negado" });
      void fetch_();
    } catch { toast({ title: "Erro ao resolver ticket", variant: "destructive" }); }
    setResolvingId(null);
  }

  const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
    pending:   { label: "Pendente",  color: "bg-yellow-400/10 text-yellow-400 border-yellow-400/20" },
    approved:  { label: "Aprovado",  color: "bg-green-400/10 text-green-400 border-green-400/20" },
    denied:    { label: "Negado",    color: "bg-red-400/10 text-red-400 border-red-400/20" },
    cancelled: { label: "Cancelado", color: "bg-muted/40 text-muted-foreground border-muted" },
  };

  const filtered = tickets.filter((t) => {
    if (filter === "pending") return t.status === "pending";
    if (filter === "resolved") return t.status !== "pending";
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {(["pending", "all", "resolved"] as const).map((f) => (
            <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)} className="text-xs h-7">
              {f === "pending" ? `Pendentes (${tickets.filter((t) => t.status === "pending").length})` : f === "all" ? "Todos" : "Resolvidos"}
            </Button>
          ))}
        </div>
        <Button variant="outline" size="icon" className="h-7 w-7" onClick={fetch_}>
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {loading ? (
        <div className="py-10 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-14 text-center">
            <MessageSquare className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Nenhum ticket {filter === "pending" ? "pendente" : ""} encontrado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((t) => {
            const cfg = STATUS_CONFIG[t.status] ?? STATUS_CONFIG.pending;
            return (
              <Card key={t.id} className={t.status === "pending" ? "border-yellow-400/20" : ""}>
                <CardContent className="pt-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={`text-xs ${cfg.color}`}>{cfg.label}</Badge>
                        <Badge variant="outline" className="text-xs">
                          {t.type === "tiktok_username_change" ? "🔄 Troca de @TikTok" : t.type}
                        </Badge>
                        <span className="text-xs text-muted-foreground ml-auto flex items-center gap-1">
                          <Clock className="w-3 h-3" />{new Date(t.createdAt).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">{t.userName}</p>
                        <p className="text-xs text-muted-foreground">{t.userEmail}</p>
                      </div>
                      {t.type === "tiktok_username_change" && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-mono text-muted-foreground">{t.oldValue ? `@${t.oldValue}` : "(sem @)"}</span>
                          <span className="text-muted-foreground/50">→</span>
                          <span className="font-mono text-primary font-medium">@{t.newValue}</span>
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">Motivo: {t.reason}{t.customReason ? ` — ${t.customReason}` : ""}</p>
                      {t.adminNote && (
                        <div className="text-xs bg-muted/20 rounded-md px-2 py-1.5 text-muted-foreground italic">
                          Nota: {t.adminNote}
                        </div>
                      )}
                    </div>
                  </div>

                  {t.status === "pending" && (
                    <div className="mt-3 space-y-2">
                      <Input
                        placeholder="Nota para o usuário (opcional)"
                        value={noteMap[t.id] ?? ""}
                        onChange={(e) => setNoteMap((p) => ({ ...p, [t.id]: e.target.value }))}
                        className="h-7 text-xs"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" className="gap-1.5 bg-green-500 hover:bg-green-600 text-white flex-1"
                          disabled={resolvingId === t.id} onClick={() => void resolve(t.id, "approve")}>
                          {resolvingId === t.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                          Aprovar
                        </Button>
                        <Button size="sm" variant="outline" className="gap-1.5 text-destructive hover:bg-destructive/10 flex-1"
                          disabled={resolvingId === t.id} onClick={() => void resolve(t.id, "deny")}>
                          {resolvingId === t.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                          Negar
                        </Button>
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

// ════════════════════════════════════════════════════════════════════════════════
// TAB: SISTEMA
// ════════════════════════════════════════════════════════════════════════════════
interface SystemStatus {
  checks: Record<string, { ok: boolean; message: string; latencyMs?: number }>;
  server: { nodeVersion: string; platform: string; uptime: number; memoryMb: number; freeMemMb: number; cpus: number };
  config: { tiktoolsKeySet: boolean; tiktoolsKeyMasked: string | null; stripeKeySet: boolean; jwtSecretIsDefault: boolean };
  users: { total: number; admins: number; byPlan: Record<string, number> };
}

function SistemaTab() {
  const { token } = useAuth();
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await authFetch("/admin/system-status", token!) as SystemStatus;
      setStatus(d);
    } finally { setLoading(false); }
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  function formatUptime(s: number): string {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }

  const SERVICE_LABELS: Record<string, string> = { tiktools: "tik.tools API", altApi: "API Alternativa", stripe: "Stripe" };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Status em tempo real do servidor e integrações.</p>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />Atualizar
        </Button>
      </div>

      {loading && !status ? (
        <div className="py-10 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>
      ) : status ? (
        <>
          {/* Service checks */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2"><Activity className="w-4 h-4 text-cyan-400" />Serviços</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(status.checks).map(([key, check]) => (
                  <div key={key} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${check.ok ? "bg-green-400" : "bg-red-400"}`} />
                    <span className="text-sm font-medium flex-1">{SERVICE_LABELS[key] ?? key}</span>
                    <span className="text-xs text-muted-foreground">{check.message}</span>
                    {check.latencyMs !== undefined && (
                      <Badge variant="outline" className={`text-xs ${check.latencyMs < 500 ? "text-green-400 border-green-400/20" : "text-yellow-400 border-yellow-400/20"}`}>
                        {check.latencyMs}ms
                      </Badge>
                    )}
                    {check.ok ? <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" /> : <XCircle className="w-4 h-4 text-red-400 shrink-0" />}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Security alerts */}
          {(status.config.jwtSecretIsDefault || !status.config.tiktoolsKeySet) && (
            <Card className="border-yellow-400/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-yellow-400" />Alertas de Segurança</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {status.config.jwtSecretIsDefault && (
                  <div className="flex items-start gap-2 text-sm text-yellow-400 bg-yellow-400/5 rounded-md px-3 py-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">JWT_SECRET padrão em uso</p>
                      <p className="text-xs text-yellow-400/60 mt-0.5">Configure a variável de ambiente JWT_SECRET com um valor aleatório seguro para produção.</p>
                    </div>
                  </div>
                )}
                {!status.config.tiktoolsKeySet && (
                  <div className="flex items-start gap-2 text-sm text-red-400 bg-red-400/5 rounded-md px-3 py-2">
                    <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Chave tik.tools não configurada</p>
                      <p className="text-xs text-red-400/60 mt-0.5">Configure em Admin → Integrações ou rode o wizard de instalação (/setup).</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Server info */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2"><Cpu className="w-4 h-4 text-violet-400" />Servidor</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {[
                  ["Node.js", status.server.nodeVersion],
                  ["Plataforma", status.server.platform],
                  ["Uptime", formatUptime(status.server.uptime)],
                  ["CPUs", String(status.server.cpus)],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-muted-foreground text-xs">{label}</span>
                    <span className="font-mono text-xs">{value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2"><HardDrive className="w-4 h-4 text-cyan-400" />Memória & Usuários</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {[
                  ["Heap usada", `${status.server.memoryMb} MB`],
                  ["RAM livre", `${status.server.freeMemMb} MB`],
                  ["Usuários", String(status.users.total)],
                  ["Admins", String(status.users.admins)],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-muted-foreground text-xs">{label}</span>
                    <span className="font-mono text-xs">{value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Users by plan */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2"><Users2 className="w-4 h-4 text-amber-400" />Usuários por Plano</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                {Object.entries(status.users.byPlan).map(([plan, count]) => (
                  <div key={plan} className="text-center p-3 bg-muted/20 rounded-md">
                    <p className="text-xs text-muted-foreground capitalize">{plan === "free" ? "Sandbox" : plan === "basic" ? "Basic+" : "Pro"}</p>
                    <p className="text-2xl font-bold">{count}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Config */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2"><PlugZap className="w-4 h-4 text-green-400" />Configuração</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { label: "tik.tools API Key", ok: status.config.tiktoolsKeySet, extra: status.config.tiktoolsKeyMasked },
                { label: "Stripe Secret Key", ok: status.config.stripeKeySet },
                { label: "JWT Secret seguro", ok: !status.config.jwtSecretIsDefault },
              ].map(({ label, ok, extra }) => (
                <div key={label} className="flex items-center gap-2">
                  {ok ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" /> : <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />}
                  <span className="text-sm flex-1">{label}</span>
                  {extra && <Badge variant="secondary" className="text-xs font-mono">{extra}</Badge>}
                  {!ok && <Badge className="text-xs bg-red-500/10 text-red-400 border-red-500/20">Pendente</Badge>}
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// MAIN ADMIN PAGE
// ════════════════════════════════════════════════════════════════════════════════
export default function Admin() {
  const { token } = useAuth();
  const [roles, setRoles] = useState<Role[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [permissions, setPermissions] = useState<PermissionDef[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [loadingPlans, setLoadingPlans] = useState(true);

  const fetchRoles = useCallback(async () => {
    setLoadingRoles(true);
    try {
      const data = await authFetch("/admin/roles", token!) as { roles: Role[]; permissions: PermissionDef[] };
      setRoles(data.roles ?? []);
      if (data.permissions?.length) setPermissions(data.permissions);
    } finally { setLoadingRoles(false); }
  }, [token]);

  const fetchPlans = useCallback(async () => {
    setLoadingPlans(true);
    try {
      const res = await fetch("/api/admin/plans", { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json() as { plans: Plan[]; permissions: PermissionDef[] };
      setPlans(data.plans ?? []);
      if (data.permissions?.length) setPermissions(data.permissions);
    } finally { setLoadingPlans(false); }
  }, [token]);

  useEffect(() => {
    void fetchRoles();
    void fetchPlans();
  }, [fetchRoles, fetchPlans]);

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-2">
        <Shield className="w-5 h-5 text-destructive" />
        <h1 className="text-2xl font-bold">Painel Admin</h1>
        <Badge className="bg-destructive/10 text-destructive border-destructive/20 text-xs">Master</Badge>
      </div>

      <Tabs defaultValue="users">
        <TabsList className="mb-6 flex-wrap h-auto gap-1">
          <TabsTrigger value="users" className="gap-1.5">
            <Users2 className="w-4 h-4" />Usuários
          </TabsTrigger>
          <TabsTrigger value="roles" className="gap-1.5">
            <Star className="w-4 h-4" />Funções
          </TabsTrigger>
          <TabsTrigger value="plans" className="gap-1.5">
            <CreditCard className="w-4 h-4" />Planos
          </TabsTrigger>
          <TabsTrigger value="ui" className="gap-1.5">
            <Palette className="w-4 h-4" />Customização
          </TabsTrigger>
          <TabsTrigger value="integracoes" className="gap-1.5">
            <PlugZap className="w-4 h-4" />Integrações
          </TabsTrigger>
          <TabsTrigger value="suporte" className="gap-1.5">
            <MessageSquare className="w-4 h-4" />Suporte
          </TabsTrigger>
          <TabsTrigger value="sistema" className="gap-1.5">
            <Activity className="w-4 h-4" />Sistema
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <UsersTab roles={roles} />
        </TabsContent>

        <TabsContent value="roles">
          {loadingRoles ? (
            <div className="py-10 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>
          ) : (
            <RolesTab roles={roles} permissions={permissions} onRefresh={fetchRoles} />
          )}
        </TabsContent>

        <TabsContent value="plans">
          {loadingPlans ? (
            <div className="py-10 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>
          ) : (
            <PlansTab plans={plans} permissions={permissions} onRefresh={fetchPlans} />
          )}
        </TabsContent>

        <TabsContent value="ui">
          <CustomizationTab />
        </TabsContent>

        <TabsContent value="integracoes">
          <IntegracoesTab />
        </TabsContent>

        <TabsContent value="suporte">
          <SuporteTab />
        </TabsContent>

        <TabsContent value="sistema">
          <SistemaTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
