import { useState, useEffect, useCallback } from "react";
import { Shield, Trash2, RefreshCw, UserCog, Crown, Zap, Users2, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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

export default function Admin() {
  const { user: me, token } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

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

  useEffect(() => { void fetchUsers(); }, [fetchUsers]);

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
          <p className="text-muted-foreground">Manage all Creatools users and plans</p>
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
                          <SelectItem value="free" className="text-xs">Sandbox</SelectItem>
                          <SelectItem value="basic" className="text-xs">Basic+</SelectItem>
                          <SelectItem value="pro" className="text-xs">Pro</SelectItem>
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
    </div>
  );
}
