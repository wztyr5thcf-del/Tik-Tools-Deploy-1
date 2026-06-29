import { useState } from "react";
import { User, Lock, Shield, Save, Loader2, CheckCircle2, CreditCard, ExternalLink, Crown, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAuth, authFetch } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

const PLAN_CONFIG = {
  free:  { label: "Free",  color: "text-muted-foreground", icon: Zap,   bg: "bg-muted/40 border-muted" },
  basic: { label: "Basic", color: "text-cyan-400",         icon: Shield, bg: "bg-cyan-400/10 border-cyan-400/30" },
  pro:   { label: "Pro",   color: "text-violet-400",       icon: Crown,  bg: "bg-violet-400/10 border-violet-400/30" },
};

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

  const [portalLoading, setPortalLoading] = useState(false);

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    setProfileLoading(true);
    try {
      await authFetch("/auth/profile", token, {
        method: "PATCH",
        body: JSON.stringify({ name, email }),
      });
      await refreshUser();
      toast({ title: "Perfil atualizado", description: "Suas alterações foram salvas." });
    } catch (err) {
      toast({ title: "Erro", description: err instanceof Error ? err.message : "Falha ao atualizar perfil", variant: "destructive" });
    } finally {
      setProfileLoading(false);
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    if (newPw !== confirmPw) {
      toast({ title: "Senhas não coincidem", variant: "destructive" }); return;
    }
    if (newPw.length < 6) {
      toast({ title: "Senha muito curta", description: "Mínimo de 6 caracteres.", variant: "destructive" }); return;
    }
    setPwLoading(true);
    try {
      await authFetch("/auth/password", token, {
        method: "PATCH",
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
      toast({ title: "Senha alterada", description: "Sua nova senha já está ativa." });
    } catch (err) {
      toast({ title: "Erro", description: err instanceof Error ? err.message : "Falha ao alterar senha", variant: "destructive" });
    } finally {
      setPwLoading(false);
    }
  }

  async function handleBillingPortal() {
    setPortalLoading(true);
    try {
      const data = await authFetch("/stripe/portal", token, { method: "POST" }) as { url: string };
      window.location.href = data.url;
    } catch (err) {
      toast({ title: "Erro", description: err instanceof Error ? err.message : "Não foi possível abrir o portal de assinatura", variant: "destructive" });
      setPortalLoading(false);
    }
  }

  const plan = user?.plan ?? "free";
  const planCfg = PLAN_CONFIG[plan];
  const PlanIcon = planCfg.icon;
  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString("pt-BR", { year: "numeric", month: "long", day: "numeric" })
    : "";

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "??";

  return (
    <div className="space-y-8 max-w-2xl animate-in fade-in duration-300">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Meu Perfil</h1>
        <p className="text-muted-foreground mt-1">Gerencie suas informações de conta e assinatura</p>
      </div>

      {/* Account summary */}
      <Card className="bg-card border-border">
        <CardContent className="p-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center text-xl font-bold text-primary shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-lg truncate">{user?.name}</p>
              <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Membro desde {memberSince}</p>
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              <Badge className={`text-xs font-medium border ${planCfg.bg} ${planCfg.color}`}>
                <PlanIcon className="w-3 h-3 mr-1" />
                {planCfg.label}
              </Badge>
              {user?.isAdmin && (
                <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
                  <Shield className="w-3 h-3 mr-1" />Admin
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subscription / billing */}
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-primary" />
            <CardTitle className="text-base">Assinatura</CardTitle>
          </div>
          <CardDescription>Gerencie seu plano e informações de pagamento</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-background border border-border">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg border flex items-center justify-center ${planCfg.bg}`}>
                <PlanIcon className={`w-5 h-5 ${planCfg.color}`} />
              </div>
              <div>
                <p className="font-medium text-sm">Plano {planCfg.label}</p>
                <p className="text-xs text-muted-foreground">
                  {plan === "free"
                    ? "Acesso básico ao monitoramento"
                    : plan === "basic"
                    ? "Bulk check + viewer counts incluídos"
                    : "Acesso total + WebSockets ilimitados"}
                </p>
              </div>
            </div>
            {plan === "free" ? (
              <Link href="/pricing">
                <Button size="sm" variant="default" className="shrink-0">
                  Fazer upgrade
                </Button>
              </Link>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={handleBillingPortal}
                disabled={portalLoading}
                className="shrink-0"
              >
                {portalLoading
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <><ExternalLink className="w-3.5 h-3.5 mr-1.5" />Gerenciar</>}
              </Button>
            )}
          </div>

          {plan !== "free" && (
            <p className="text-xs text-muted-foreground text-center">
              Para cancelar, alterar o plano ou ver faturas, clique em "Gerenciar" acima.
            </p>
          )}

          {plan === "free" && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
              <Crown className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">
                Faça upgrade para o plano <strong className="text-foreground">Basic</strong> e desbloqueie bulk check de múltiplos criadores com viewer counts em tempo real.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit profile */}
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />
            <CardTitle className="text-base">Informações da conta</CardTitle>
          </div>
          <CardDescription>Atualize seu nome e endereço de e-mail</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileSave} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="p-name">Nome completo</Label>
              <Input
                id="p-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="bg-background border-border"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-email">E-mail</Label>
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
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando…</>
                : <><Save className="w-4 h-4 mr-2" />Salvar alterações</>}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Change password */}
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-primary" />
            <CardTitle className="text-base">Alterar senha</CardTitle>
          </div>
          <CardDescription>Digite sua senha atual para definir uma nova</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="curr-pw">Senha atual</Label>
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
              <Label htmlFor="new-pw">Nova senha</Label>
              <Input
                id="new-pw"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                required
                autoComplete="new-password"
                className="bg-background border-border"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-pw">Confirmar nova senha</Label>
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
                <p className="text-xs text-destructive">Senhas não coincidem</p>
              )}
            </div>
            <Button type="submit" disabled={pwLoading} variant="outline">
              {pwLoading
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Atualizando…</>
                : <><CheckCircle2 className="w-4 h-4 mr-2" />Atualizar senha</>}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
