import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, Activity, Users, Settings, Diamond,
  Tag, LogOut, ChevronDown, UserCircle, Shield, Menu, X,
  Lock, Zap, Crown
} from "lucide-react";
import { SiTiktok } from "react-icons/si";
import { useState } from "react";
import { useAuth } from "@/context/auth-context";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type PlanLevel = "free" | "basic" | "pro";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  matchPrefix?: string;
  adminOnly?: boolean;
  requiresPlan?: PlanLevel;
}

const PLAN_ORDER: Record<PlanLevel, number> = { free: 0, basic: 1, pro: 2 };

function planMeets(userPlan: PlanLevel, required: PlanLevel): boolean {
  return PLAN_ORDER[userPlan] >= PLAN_ORDER[required];
}

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/monitor/example", label: "Monitor", icon: Activity, matchPrefix: "/monitor" },
  { href: "/bulk-check", label: "Bulk Check", icon: Users, requiresPlan: "basic" },
  { href: "/gift-gallery", label: "Gift Gallery", icon: Diamond },
  { href: "/pricing", label: "Planos", icon: Tag },
  { href: "/settings", label: "Configurações", icon: Settings },
  { href: "/admin", label: "Admin Panel", icon: Shield, adminOnly: true },
];

const PLAN_CONFIG: Record<PlanLevel, { label: string; color: string; bg: string }> = {
  free:  { label: "Free",  color: "text-muted-foreground", bg: "bg-muted/40" },
  basic: { label: "Basic", color: "text-cyan-400",         bg: "bg-cyan-400/10" },
  pro:   { label: "Pro",   color: "text-violet-400",       bg: "bg-violet-400/10" },
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const userPlan: PlanLevel = user?.plan ?? "free";
  const planCfg = PLAN_CONFIG[userPlan];

  const visibleNav = NAV_ITEMS.filter((item) => !item.adminOnly || user?.isAdmin);

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "??";

  function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
    return (
      <>
        {visibleNav.map((item) => {
          const isActive =
            location === item.href ||
            (item.matchPrefix && location.startsWith(item.matchPrefix));
          const locked = !!(item.requiresPlan && user && !planMeets(userPlan, item.requiresPlan));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={locked ? "/pricing" : item.href}
              onClick={onNavigate}
              className={`flex items-center px-3 py-2.5 rounded-md text-sm font-medium transition-colors group ${
                isActive
                  ? "bg-primary/10 text-primary"
                  : locked
                  ? "text-muted-foreground/50 hover:bg-accent/50 hover:text-muted-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
              title={locked ? `Requer plano ${item.requiresPlan === "basic" ? "Basic" : "Pro"}` : undefined}
            >
              <Icon className={`w-5 h-5 mr-3 shrink-0 ${isActive ? "text-primary" : ""}`} />
              <span className="flex-1">{item.label}</span>

              {item.adminOnly && (
                <Badge className="ml-auto text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-primary/20">
                  Admin
                </Badge>
              )}
              {locked && (
                <div className="flex items-center gap-1 ml-auto">
                  <Lock className="w-3 h-3 text-muted-foreground/50" />
                  <Badge variant="outline" className="text-[10px] px-1 py-0 text-muted-foreground/60 border-muted/50">
                    {item.requiresPlan === "basic" ? "Basic+" : "Pro"}
                  </Badge>
                </div>
              )}
            </Link>
          );
        })}
      </>
    );
  }

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden text-foreground selection:bg-primary selection:text-primary-foreground">
      {/* ── Desktop Sidebar ── */}
      <aside className="w-64 border-r border-border bg-card flex-col hidden md:flex shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-border shrink-0">
          <SiTiktok className="w-6 h-6 text-primary mr-3" />
          <span className="font-bold text-lg tracking-tight">Creatools</span>
        </div>

        <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
          <NavLinks />
        </nav>

        {/* Upgrade CTA for free users */}
        {user && userPlan === "free" && (
          <div className="px-3 pb-3">
            <Link href="/pricing">
              <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-md bg-primary/5 border border-primary/20 hover:bg-primary/10 transition-colors cursor-pointer">
                <Zap className="w-4 h-4 text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-primary">Fazer upgrade</p>
                  <p className="text-[10px] text-muted-foreground leading-tight">Desbloquear Bulk Check</p>
                </div>
                <Crown className="w-3.5 h-3.5 text-primary/50 ml-auto shrink-0" />
              </div>
            </Link>
          </div>
        )}

        {/* User dropdown */}
        <div className="p-3 border-t border-border shrink-0">
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-accent transition-colors text-left group">
                  <Avatar className="w-8 h-8 shrink-0">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{user.name}</p>
                    <p className={`text-xs font-medium ${planCfg.color}`}>{planCfg.label}</p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 group-data-[state=open]:rotate-180 transition-transform" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-56 mb-1">
                <div className="px-2 py-1.5 space-y-1">
                  <p className="text-xs text-muted-foreground">Conectado como</p>
                  <p className="text-sm font-medium truncate">{user.email}</p>
                  <div className="flex items-center gap-1.5 flex-wrap mt-1">
                    <Badge className={`text-xs border ${planCfg.bg} ${planCfg.color}`}>
                      {planCfg.label}
                    </Badge>
                    {user.isAdmin && (
                      <Badge className="text-xs bg-primary/10 text-primary border-primary/20">
                        <Shield className="w-2.5 h-2.5 mr-1" />Admin
                      </Badge>
                    )}
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="cursor-pointer">
                    <UserCircle className="w-4 h-4 mr-2" />Meu Perfil
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/pricing" className="cursor-pointer">
                    <Tag className="w-4 h-4 mr-2" />
                    {userPlan === "free" ? "Fazer upgrade" : "Gerenciar plano"}
                  </Link>
                </DropdownMenuItem>
                {user.isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/admin" className="cursor-pointer">
                        <Shield className="w-4 h-4 mr-2" />Admin Panel
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={logout}
                  className="text-destructive focus:text-destructive cursor-pointer"
                >
                  <LogOut className="w-4 h-4 mr-2" />Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </aside>

      {/* ── Mobile Sidebar overlay ── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-72 bg-card border-r border-border flex flex-col z-10">
            <div className="h-16 flex items-center justify-between px-6 border-b border-border shrink-0">
              <div className="flex items-center">
                <SiTiktok className="w-6 h-6 text-primary mr-3" />
                <span className="font-bold text-lg tracking-tight">Creatools</span>
              </div>
              <button onClick={() => setMobileOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
              <NavLinks onNavigate={() => setMobileOpen(false)} />
            </nav>

            {user && userPlan === "free" && (
              <div className="px-3 pb-3">
                <Link href="/pricing" onClick={() => setMobileOpen(false)}>
                  <Button size="sm" variant="outline" className="w-full text-primary border-primary/30 hover:bg-primary/10">
                    <Zap className="w-4 h-4 mr-2" />Fazer upgrade
                  </Button>
                </Link>
              </div>
            )}

            <div className="p-4 border-t border-border">
              {user && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{user.name}</p>
                      <p className={`text-xs ${planCfg.color}`}>{planCfg.label}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link href="/profile" onClick={() => setMobileOpen(false)} className="flex-1">
                      <Button size="sm" variant="outline" className="w-full text-xs">
                        <UserCircle className="w-3.5 h-3.5 mr-1" />Perfil
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => { logout(); setMobileOpen(false); }}
                      className="flex-1 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <LogOut className="w-3.5 h-3.5 mr-1" />Sair
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* ── Main Content ── */}
      <main className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        {/* Mobile Header */}
        <header className="h-16 flex items-center px-4 border-b border-border bg-card md:hidden justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <SiTiktok className="w-6 h-6 text-primary" />
            <span className="font-bold text-lg">Creatools</span>
          </div>
          {user && (
            <Avatar className="w-8 h-8 cursor-pointer" onClick={() => setMobileOpen(true)}>
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">{initials}</AvatarFallback>
            </Avatar>
          )}
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
