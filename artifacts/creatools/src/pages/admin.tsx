import { useState, useEffect, useCallback } from "react";
import {
  Shield, Trash2, RefreshCw, UserCog, Crown, Zap, Users2, Search,
  Settings2, CreditCard, Radio, CheckCircle2, XCircle, Loader2, KeyRound, Eye, EyeOff,
  Plus, Edit2, Palette, Layout, ChevronUp, ChevronDown, ToggleLeft, ToggleRight,
  Star, Save, RotateCcw, PanelLeft, PanelTop, Globe, Lock,
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
      </Tabs>
    </div>
  );
}
