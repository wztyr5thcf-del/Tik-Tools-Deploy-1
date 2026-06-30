import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { SiTiktok } from "react-icons/si";
import {
  Eye, EyeOff, LogIn, UserPlus, Zap, Search, CheckCircle2,
  XCircle, Loader2, AlertCircle, Users, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/auth-context";

type Mode = "login" | "register";
type RegStep = "account" | "tiktok";

interface TikProfile {
  exists: boolean | null;
  uniqueId: string;
  nickname?: string | null;
  profilePictureUrl?: string | null;
  followerCount?: number;
  verified?: boolean;
  error?: string;
}

export default function Login() {
  const [mode, setMode] = useState<Mode>("login");
  const [regStep, setRegStep] = useState<RegStep>("account");

  // Account fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPw, setShowPw] = useState(false);

  // TikTok username step
  const [tiktokHandle, setTiktokHandle] = useState("");
  const [tikProfile, setTikProfile] = useState<TikProfile | null>(null);
  const [tikLooking, setTikLooking] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [, setLocation] = useLocation();
  const { login, register } = useAuth();

  // TikTok OAuth error from redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthError = params.get("error");
    if (oauthError === "tiktok_denied") setError("Você cancelou o login com TikTok.");
    else if (oauthError) setError("Erro ao fazer login com TikTok. Tente novamente.");
    if (oauthError) window.history.replaceState({}, "", window.location.pathname);
  }, []);

  // Debounced TikTok username lookup
  useEffect(() => {
    const handle = tiktokHandle.trim().replace(/^@/, "");
    if (!handle || handle.length < 2) {
      setTikProfile(null);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setTikLooking(true);
      try {
        const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
        const r = await fetch(`${BASE}/api/tiktok/verify-username?uniqueId=${encodeURIComponent(handle)}`);
        const data = await r.json() as TikProfile;
        setTikProfile({ ...data, uniqueId: handle });
      } catch {
        setTikProfile({ exists: null, uniqueId: handle, error: "lookup_failed" });
      } finally {
        setTikLooking(false);
      }
    }, 700);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [tiktokHandle]);

  async function handleLoginSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      setLocation("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Algo deu errado");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegisterAccount(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) { setError("A senha deve ter pelo menos 6 caracteres"); return; }
    // Proceed to TikTok step
    setRegStep("tiktok");
  }

  async function handleRegisterFinish(skipTiktok = false) {
    setError(null);
    setLoading(true);
    try {
      const tiktok =
        !skipTiktok && tikProfile?.exists && tikProfile.uniqueId
          ? {
              username: tikProfile.uniqueId,
              profilePicture: tikProfile.profilePictureUrl ?? undefined,
              displayName: tikProfile.nickname ?? undefined,
              followerCount: tikProfile.followerCount,
            }
          : undefined;
      await register(email, password, name, tiktok);
      setLocation("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Algo deu errado");
    } finally {
      setLoading(false);
    }
  }

  async function handleTiktokOAuth() {
    try {
      const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
      const r = await fetch(`${BASE}/api/auth/tiktok/url`);
      if (!r.ok) {
        const d = await r.json() as { error?: string };
        setError(d.error ?? "Login com TikTok não disponível");
        return;
      }
      const { url } = await r.json() as { url: string };
      window.location.href = url;
    } catch {
      setError("Erro ao iniciar login com TikTok");
    }
  }

  function switchMode(m: Mode) {
    setMode(m);
    setRegStep("account");
    setError(null);
    setTiktokHandle("");
    setTikProfile(null);
  }

  const isHandleValid = tikProfile?.exists === true;
  const isHandleNotFound = tikProfile?.exists === false;

  return (
    <div className="min-h-screen w-full bg-background flex flex-col items-center justify-center px-4">
      {/* Background glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <SiTiktok className="w-5 h-5 text-primary" />
          </div>
          <span className="text-2xl font-bold tracking-tight">Creatools</span>
        </div>

        <Card className="bg-card border-border shadow-2xl shadow-black/40">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl">
              {mode === "login"
                ? "Bem-vindo de volta"
                : regStep === "account"
                ? "Criar conta"
                : "Vincular TikTok"}
            </CardTitle>
            <CardDescription>
              {mode === "login"
                ? "Entre na sua conta Creatools"
                : regStep === "account"
                ? "Comece a monitorar lives do TikTok"
                : "Informe seu @ do TikTok para vincular à conta"}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">

            {/* ── LOGIN MODE ─────────────────────────────────────────── */}
            {mode === "login" && (
              <>
                {/* TikTok OAuth button */}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2 border-[#ff004f]/30 hover:border-[#ff004f]/60 hover:bg-[#ff004f]/5"
                  onClick={handleTiktokOAuth}
                >
                  <SiTiktok className="w-4 h-4 text-[#ff004f]" />
                  Entrar com TikTok
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs text-muted-foreground">
                    <span className="bg-card px-2">ou entre com e-mail</span>
                  </div>
                </div>

                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-sm">E-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="voce@exemplo.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="bg-background border-border font-mono text-sm"
                      autoComplete="username"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="password" className="text-sm">Senha</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPw ? "text" : "password"}
                        placeholder="Sua senha"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="bg-background border-border pr-10"
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      {error}
                    </div>
                  )}

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading
                      ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />Entrando…</span>
                      : <span className="flex items-center gap-2"><LogIn className="w-4 h-4" />Entrar</span>}
                  </Button>
                </form>
              </>
            )}

            {/* ── REGISTER: STEP 1 — ACCOUNT ─────────────────────────── */}
            {mode === "register" && regStep === "account" && (
              <>
                {/* TikTok OAuth */}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2 border-[#ff004f]/30 hover:border-[#ff004f]/60 hover:bg-[#ff004f]/5"
                  onClick={handleTiktokOAuth}
                >
                  <SiTiktok className="w-4 h-4 text-[#ff004f]" />
                  Registrar com TikTok
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs text-muted-foreground">
                    <span className="bg-card px-2">ou crie com e-mail</span>
                  </div>
                </div>

                <form onSubmit={handleRegisterAccount} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="name" className="text-sm">Nome completo</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="Seu nome"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="bg-background border-border"
                      autoComplete="name"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="reg-email" className="text-sm">E-mail</Label>
                    <Input
                      id="reg-email"
                      type="email"
                      placeholder="voce@exemplo.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="bg-background border-border font-mono text-sm"
                      autoComplete="email"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="reg-password" className="text-sm">Senha</Label>
                    <div className="relative">
                      <Input
                        id="reg-password"
                        type={showPw ? "text" : "password"}
                        placeholder="Mínimo 6 caracteres"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="bg-background border-border pr-10"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      {error}
                    </div>
                  )}

                  <Button type="submit" className="w-full gap-2">
                    Continuar
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </form>
              </>
            )}

            {/* ── REGISTER: STEP 2 — TIKTOK USERNAME ─────────────────── */}
            {mode === "register" && regStep === "tiktok" && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="tiktok-handle" className="text-sm">Usuário do TikTok</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
                    <Input
                      id="tiktok-handle"
                      type="text"
                      placeholder="seuusuario"
                      value={tiktokHandle}
                      onChange={(e) => setTiktokHandle(e.target.value.replace(/^@/, ""))}
                      className="bg-background border-border pl-7 pr-10"
                      autoComplete="off"
                      autoFocus
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {tikLooking && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                      {!tikLooking && isHandleValid && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                      {!tikLooking && isHandleNotFound && <XCircle className="w-4 h-4 text-destructive" />}
                      {!tikLooking && !tikProfile && <Search className="w-4 h-4 text-muted-foreground" />}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Vincule sua conta TikTok para personalizar sua experiência e acessar ferramentas de stream.
                  </p>
                </div>

                {/* Profile preview card */}
                {isHandleValid && tikProfile && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                    {tikProfile.profilePictureUrl ? (
                      <img
                        src={tikProfile.profilePictureUrl}
                        alt={tikProfile.nickname ?? ""}
                        className="w-12 h-12 rounded-full object-cover border border-border shrink-0"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                        <SiTiktok className="w-5 h-5 text-primary" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">
                        {tikProfile.nickname ?? tikProfile.uniqueId}
                        {tikProfile.verified && (
                          <span className="ml-1 text-xs text-blue-400">✓</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">@{tikProfile.uniqueId}</p>
                      {tikProfile.followerCount !== undefined && tikProfile.followerCount > 0 && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Users className="w-3 h-3" />
                          {tikProfile.followerCount.toLocaleString("pt-BR")} seguidores
                        </p>
                      )}
                    </div>
                    <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                  </div>
                )}

                {isHandleNotFound && tiktokHandle.length > 1 && (
                  <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
                    <XCircle className="w-4 h-4 shrink-0" />
                    Usuário @{tiktokHandle} não encontrado no TikTok
                  </div>
                )}

                {tikProfile?.error === "lookup_failed" && (
                  <div className="flex items-center gap-2 text-sm text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-md px-3 py-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    Não foi possível verificar. Você pode continuar e vincular depois no perfil.
                  </div>
                )}

                {error && (
                  <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    onClick={() => void handleRegisterFinish(true)}
                    disabled={loading}
                    className="text-muted-foreground"
                  >
                    Pular por agora
                  </Button>
                  <Button
                    onClick={() => void handleRegisterFinish(false)}
                    disabled={loading || (!isHandleValid && tiktokHandle.trim().length > 0 && tikProfile?.exists !== null)}
                  >
                    {loading
                      ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Criando…</>
                      : <><UserPlus className="w-4 h-4 mr-1.5" />Criar conta</>}
                  </Button>
                </div>

                <p className="text-center text-xs text-muted-foreground">
                  Você poderá vincular ou alterar seu TikTok depois, no seu perfil.
                </p>
              </div>
            )}

            {/* ── Toggle login/register ───────────────────────────────── */}
            <div className="mt-2 pt-4 border-t border-border text-center text-sm text-muted-foreground">
              {mode === "login" ? (
                <>
                  Não tem conta?{" "}
                  <button onClick={() => switchMode("register")} className="text-primary hover:underline font-medium">
                    Criar conta grátis
                  </button>
                </>
              ) : (
                <>
                  Já tem conta?{" "}
                  <button onClick={() => switchMode("login")} className="text-primary hover:underline font-medium">
                    Entrar
                  </button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Feature chips */}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {["Monitoramento em tempo real", "Gift analytics", "Bulk status check", "WebSocket events"].map((f) => (
            <span
              key={f}
              className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-card border border-border text-muted-foreground"
            >
              <Zap className="w-3 h-3 text-primary" />
              {f}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
