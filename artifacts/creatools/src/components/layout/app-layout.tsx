import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, Activity, Settings, Diamond,
  Tag, LogOut, ChevronDown, UserCircle, Shield, Menu, X,
  Lock, Zap, Crown, Search, Users, Star, Key, BarChart2,
  Globe, Gamepad2, Subtitles, Webhook, Radio, Bell, Code2,
  LucideProps,
} from "lucide-react";
import { SiTiktok } from "react-icons/si";
import { useState } from "react";
import { useAuth } from "@/context/auth-context";
import { useUIConfig } from "@/context/ui-config-context";
import { useWatchlist } from "@/context/watchlist-context";
import type { NavSectionConfig, NavItemConfig } from "@/context/ui-config-context";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type PlanLevel = "free" | "basic" | "pro";

const PLAN_ORDER: Record<PlanLevel, number> = { free: 0, basic: 1, pro: 2 };
function planMeets(userPlan: PlanLevel, required: string): boolean {
  return PLAN_ORDER[userPlan] >= (PLAN_ORDER[required as PlanLevel] ?? 0);
}

// Icon lookup by string name
const ICON_MAP: Record<string, React.ComponentType<LucideProps>> = {
  LayoutDashboard, Activity, Settings, Diamond, Tag, Shield,
  Search, Users, Star, Key, BarChart2, Crown, Zap, Lock,
  Globe, Gamepad2, Subtitles, Webhook, Radio, Bell, Code2,
};
function NavIcon({ name }: { name: string }) {
  const Icon = ICON_MAP[name] ?? LayoutDashboard;
  return <Icon className="w-4 h-4 mr-3 shrink-0" />;
}

const PLAN_CONFIG: Record<PlanLevel, { label: string; color: string; bg: string }> = {
  free:  { label: "Free",  color: "text-muted-foreground", bg: "bg-muted/40" },
  basic: { label: "Basic", color: "text-cyan-400",         bg: "bg-cyan-400/10" },
  pro:   { label: "Pro",   color: "text-violet-400",       bg: "bg-violet-400/10" },
};

// Default sections used as fallback when UI config not loaded yet
const DEFAULT_SECTIONS: NavSectionConfig[] = [
  {
    id: "main",
    items: [
      { id: "dashboard",     label: "Dashboard",    href: "/",                icon: "LayoutDashboard", visible: true },
      { id: "monitor",       label: "Monitor",      href: "/monitor/example", icon: "Activity",        matchPrefix: "/monitor", visible: true },
      { id: "notifications", label: "Notificações", href: "/notifications",   icon: "Bell",            matchPrefix: "/notifications", visible: true },
      { id: "gift-gallery",  label: "Gift Gallery", href: "/gift-gallery",    icon: "Diamond",         visible: true },
    ],
  },
  {
    id: "streamer",
    label: "Streamer Tools",
    items: [
      { id: "lookup",      label: "Lookup",          href: "/streamer/lookup",      icon: "Search",    matchPrefix: "/streamer/lookup",      visible: true },
      { id: "bulk-check",  label: "Bulk Check",      href: "/streamer/bulk-check",  icon: "Users",     matchPrefix: "/streamer/bulk-check",  requiresPlan: "basic", visible: true },
      { id: "watchlist",   label: "Watchlist",       href: "/streamer/watchlist",   icon: "Star",      matchPrefix: "/streamer/watchlist",   visible: true },
      { id: "jwt",         label: "JWT / WebSocket", href: "/streamer/jwt",         icon: "Key",       matchPrefix: "/streamer/jwt",         visible: true },
      { id: "rate-limits", label: "Rate Limits",     href: "/streamer/rate-limits", icon: "BarChart2", matchPrefix: "/streamer/rate-limits", visible: true },
      { id: "dev-tools",   label: "Dev Tools",       href: "/dev-tools",            icon: "Code2",     matchPrefix: "/dev-tools",           visible: true },
    ],
  },
  {
    id: "live-tools",
    label: "Live Tools",
    items: [
      { id: "live-captions",  label: "Live Captions",  href: "/live-captions",  icon: "Subtitles", matchPrefix: "/live-captions",  visible: true },
      { id: "live-analytics", label: "Live Analytics", href: "/live-analytics", icon: "BarChart2", matchPrefix: "/live-analytics", visible: true },
      { id: "live-counts",    label: "Live Counts",    href: "/live-counts",    icon: "Radio",     matchPrefix: "/live-counts",    visible: true },
      { id: "webhooks",       label: "Webhooks",       href: "/webhooks",       icon: "Webhook",   matchPrefix: "/webhooks",       visible: true },
    ],
  },
  {
    id: "analytics",
    label: "Leaderboards",
    items: [
      { id: "leaderboards",         label: "Leagues",         href: "/leaderboards",          icon: "Crown",    matchPrefix: "/leaderboards",          visible: true },
      { id: "leaderboards-country", label: "Country",         href: "/leaderboards/country",  icon: "Globe",    matchPrefix: "/leaderboards/country",  visible: true },
      { id: "leaderboards-gaming",  label: "Gaming",          href: "/leaderboards/gaming",   icon: "Gamepad2", matchPrefix: "/leaderboards/gaming",  visible: true },
      { id: "gifters",              label: "Gifters",         href: "/gifters",               icon: "Diamond",  matchPrefix: "/gifters",              visible: true },
    ],
  },
  {
    id: "account",
    items: [
      { id: "pricing",  label: "Planos",  href: "/pricing",  icon: "Tag",      visible: true },
      { id: "settings", label: "Ajustes", href: "/settings", icon: "Settings", visible: true },
    ],
  },
  {
    id: "admin",
    items: [
      { id: "admin", label: "Admin Panel", href: "/admin", icon: "Shield", adminOnly: true, visible: true },
    ],
  },
];

function NavLinks({
  sections,
  onNavigate,
  userPlan,
  isAdmin,
  location,
}: {
  sections: NavSectionConfig[];
  onNavigate?: () => void;
  userPlan: PlanLevel;
  isAdmin: boolean;
  location: string;
}) {
  const { liveCount } = useWatchlist();

  return (
    <div className="space-y-4">
      {sections.map((section) => {
        const visibleItems = section.items.filter((item) => {
          if (!item.visible) return false;
          if (item.adminOnly && !isAdmin) return false;
          return true;
        });
        if (!visibleItems.length) return null;

        return (
          <div key={section.id}>
            {section.label && (
              <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                {section.label}
              </p>
            )}
            <div className="space-y-0.5">
              {visibleItems.map((item) => {
                const isActive =
                  location === item.href ||
                  (item.matchPrefix && location.startsWith(item.matchPrefix));
                const locked = !!(item.requiresPlan && !planMeets(userPlan, item.requiresPlan));
                const showLiveBadge = item.id === "notifications" && liveCount > 0;

                return (
                  <Link
                    key={item.id}
                    href={locked ? "/pricing" : item.href}
                    onClick={onNavigate}
                    className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors group ${
                      isActive
                        ? "bg-primary/10 text-primary"
                        : item.adminOnly
                        ? "text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        : locked
                        ? "text-muted-foreground/50 hover:bg-accent/50 hover:text-muted-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    }`}
                  >
                    <NavIcon name={item.icon} />
                    <span className="flex-1">{item.label}</span>
                    {showLiveBadge && (
                      <Badge className="ml-auto text-[10px] px-1.5 py-0 bg-red-500/10 text-red-400 border-red-500/20 animate-pulse">
                        {liveCount}
                      </Badge>
                    )}
                    {item.adminOnly && (
                      <Badge className="ml-auto text-[10px] px-1.5 py-0 bg-destructive/10 text-destructive border-destructive/20">
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
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TopBar({
  sections,
  logoText,
  logoUrl,
  userPlan,
  isAdmin,
  location,
  user,
  initials,
  planCfg,
  logout,
}: {
  sections: NavSectionConfig[];
  logoText: string;
  logoUrl: string;
  userPlan: PlanLevel;
  isAdmin: boolean;
  location: string;
  user: ReturnType<typeof useAuth>["user"];
  initials: string;
  planCfg: (typeof PLAN_CONFIG)[PlanLevel];
  logout: () => void;
}) {
  return (
    <header className="h-14 border-b border-border bg-card flex items-center px-4 gap-4 shrink-0 overflow-x-auto">
      {/* Logo */}
      <div className="flex items-center gap-2 shrink-0">
        {logoUrl ? (
          <img src={logoUrl} alt={logoText} className="h-7 object-contain" />
        ) : (
          <SiTiktok className="w-5 h-5 text-primary" />
        )}
        <span className="font-bold text-base tracking-tight">{logoText}</span>
      </div>

      {/* Nav items */}
      <nav className="flex items-center gap-1 flex-1 overflow-x-auto">
        {sections.flatMap((s) => s.items).filter((item) => {
          if (!item.visible) return false;
          if (item.adminOnly && !isAdmin) return false;
          return true;
        }).map((item) => {
          const isActive = location === item.href || (item.matchPrefix && location.startsWith(item.matchPrefix));
          const locked = !!(item.requiresPlan && !planMeets(userPlan, item.requiresPlan));
          return (
            <Link
              key={item.id}
              href={locked ? "/pricing" : item.href}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors shrink-0 ${
                isActive ? "bg-primary/10 text-primary" :
                item.adminOnly ? "text-muted-foreground hover:text-destructive hover:bg-destructive/10" :
                "text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
            >
              <NavIcon name={item.icon} />
              <span>{item.label}</span>
              {locked && <Lock className="w-3 h-3 opacity-50" />}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      {user && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent transition-colors shrink-0">
              <Avatar className="w-7 h-7">
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">{initials}</AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium hidden sm:block">{user.name}</span>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild>
              <Link href="/profile" className="cursor-pointer"><UserCircle className="w-4 h-4 mr-2" />Meu Perfil</Link>
            </DropdownMenuItem>
            {isAdmin && (
              <DropdownMenuItem asChild>
                <Link href="/admin" className="cursor-pointer text-destructive focus:text-destructive"><Shield className="w-4 h-4 mr-2" />Admin</Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive cursor-pointer">
              <LogOut className="w-4 h-4 mr-2" />Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </header>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { config } = useUIConfig();
  const [mobileOpen, setMobileOpen] = useState(false);

  const userPlan: PlanLevel = user?.plan ?? "free";
  const planCfg = PLAN_CONFIG[userPlan];
  const isAdmin = user?.isAdmin ?? false;

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "??";

  const logoText = config?.logoText ?? "Creatools";
  const logoUrl = config?.logoUrl ?? "";
  const navType = config?.navType ?? "sidebar";
  const sections: NavSectionConfig[] = config?.sidebarSections?.length
    ? config.sidebarSections
    : DEFAULT_SECTIONS;

  const navProps = { sections, userPlan, isAdmin, location };

  // ── Topbar layout ──
  if (navType === "topbar") {
    return (
      <div className="flex flex-col h-screen w-full bg-background overflow-hidden text-foreground selection:bg-primary selection:text-primary-foreground">
        <TopBar
          logoText={logoText}
          logoUrl={logoUrl}
          user={user}
          initials={initials}
          planCfg={planCfg}
          logout={logout}
          {...navProps}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    );
  }

  // ── Sidebar layout (default) ──
  return (
    <div className="flex h-screen w-full bg-background overflow-hidden text-foreground selection:bg-primary selection:text-primary-foreground">
      {/* Desktop Sidebar */}
      <aside className="w-60 border-r border-border bg-card flex-col hidden md:flex shrink-0">
        <div className="h-16 flex items-center px-5 border-b border-border shrink-0">
          {logoUrl ? (
            <img src={logoUrl} alt={logoText} className="h-8 object-contain mr-3" />
          ) : (
            <SiTiktok className="w-6 h-6 text-primary mr-3" />
          )}
          <span className="font-bold text-lg tracking-tight">{logoText}</span>
        </div>

        <nav className="flex-1 py-5 px-3 overflow-y-auto">
          <NavLinks {...navProps} onNavigate={undefined} />
        </nav>

        {user && userPlan === "free" && (
          <div className="px-3 pb-3">
            <Link href="/pricing">
              <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-md bg-primary/5 border border-primary/20 hover:bg-primary/10 transition-colors cursor-pointer">
                <Zap className="w-4 h-4 text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-primary">Upgrade plan</p>
                  <p className="text-[10px] text-muted-foreground leading-tight">Desbloqueie mais ferramentas</p>
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
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">{initials}</AvatarFallback>
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
                    <Badge className={`text-xs border ${planCfg.bg} ${planCfg.color}`}>{planCfg.label}</Badge>
                    {isAdmin && (
                      <Badge className="text-xs bg-destructive/10 text-destructive border-destructive/20">
                        <Shield className="w-2.5 h-2.5 mr-1" />Admin
                      </Badge>
                    )}
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="cursor-pointer"><UserCircle className="w-4 h-4 mr-2" />Meu Perfil</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/pricing" className="cursor-pointer">
                    <Tag className="w-4 h-4 mr-2" />{userPlan === "free" ? "Fazer upgrade" : "Gerenciar plano"}
                  </Link>
                </DropdownMenuItem>
                {isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/admin" className="cursor-pointer text-destructive focus:text-destructive">
                        <Shield className="w-4 h-4 mr-2" />Admin Panel
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive cursor-pointer">
                  <LogOut className="w-4 h-4 mr-2" />Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-72 bg-card border-r border-border flex flex-col z-10">
            <div className="h-16 flex items-center justify-between px-6 border-b border-border shrink-0">
              <div className="flex items-center">
                {logoUrl ? (
                  <img src={logoUrl} alt={logoText} className="h-7 object-contain mr-3" />
                ) : (
                  <SiTiktok className="w-6 h-6 text-primary mr-3" />
                )}
                <span className="font-bold text-lg tracking-tight">{logoText}</span>
              </div>
              <button onClick={() => setMobileOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 py-5 px-3 overflow-y-auto">
              <NavLinks {...navProps} onNavigate={() => setMobileOpen(false)} />
            </nav>
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
                      <Button size="sm" variant="outline" className="w-full text-xs"><UserCircle className="w-3.5 h-3.5 mr-1" />Perfil</Button>
                    </Link>
                    <Button size="sm" variant="ghost"
                      onClick={() => { logout(); setMobileOpen(false); }}
                      className="flex-1 text-xs text-destructive hover:text-destructive hover:bg-destructive/10">
                      <LogOut className="w-3.5 h-3.5 mr-1" />Sair
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        <header className="h-16 flex items-center px-4 border-b border-border bg-card md:hidden justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="text-muted-foreground hover:text-foreground">
              <Menu className="w-5 h-5" />
            </button>
            {logoUrl ? (
              <img src={logoUrl} alt={logoText} className="h-7 object-contain" />
            ) : (
              <SiTiktok className="w-6 h-6 text-primary" />
            )}
            <span className="font-bold text-lg">{logoText}</span>
          </div>
          {user && (
            <Avatar className="w-8 h-8 cursor-pointer" onClick={() => setMobileOpen(true)}>
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">{initials}</AvatarFallback>
            </Avatar>
          )}
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </div>
      </main>
    </div>
  );
}
