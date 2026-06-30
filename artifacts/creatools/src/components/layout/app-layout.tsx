import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, Activity, Settings, Diamond,
  Tag, LogOut, ChevronDown, ChevronRight, UserCircle, Shield, Menu, X,
  Lock, Zap, Crown, Search, Users, Star, Key, BarChart2,
  Globe, Gamepad2, Subtitles, Webhook, Radio, Bell, Code2, Tv2, Trophy,
  Monitor, Target, Layers, ChevronLeft,
  LucideProps,
} from "lucide-react";
import { SiTiktok } from "react-icons/si";
import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/context/auth-context";
import { useUIConfig } from "@/context/ui-config-context";
import { useWatchlist } from "@/context/watchlist-context";
import type { NavSectionConfig } from "@/context/ui-config-context";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type PlanLevel = "free" | "basic" | "pro";

const PLAN_ORDER: Record<PlanLevel, number> = { free: 0, basic: 1, pro: 2 };
function planMeets(userPlan: PlanLevel, required: string): boolean {
  return PLAN_ORDER[userPlan] >= (PLAN_ORDER[required as PlanLevel] ?? 0);
}

const ICON_MAP: Record<string, React.ComponentType<LucideProps>> = {
  LayoutDashboard, Activity, Settings, Diamond, Tag, Shield,
  Search, Users, Star, Key, BarChart2, Crown, Zap, Lock,
  Globe, Gamepad2, Subtitles, Webhook, Radio, Bell, Code2, Tv2, Trophy,
  Monitor, Target, Layers,
};
function NavIcon({ name, className = "w-4 h-4" }: { name: string; className?: string }) {
  const Icon = ICON_MAP[name] ?? LayoutDashboard;
  return <Icon className={className} />;
}

const PLAN_CONFIG: Record<PlanLevel, { label: string; color: string; bg: string; badgeBg: string }> = {
  free:  { label: "Free",  color: "#9ca3af", bg: "rgba(156,163,175,0.1)", badgeBg: "rgba(156,163,175,0.15)" },
  basic: { label: "Basic", color: "#22d3ee", bg: "rgba(34,211,238,0.1)",  badgeBg: "rgba(34,211,238,0.15)" },
  pro:   { label: "PRO",   color: "#f97316", bg: "rgba(249,115,22,0.1)",  badgeBg: "rgba(249,115,22,0.2)" },
};

const DEFAULT_SECTIONS: NavSectionConfig[] = [
  {
    id: "main",
    label: "PAINEL",
    items: [
      { id: "dashboard",     label: "Dashboard",    href: "/",                icon: "LayoutDashboard", visible: true },
      { id: "monitor",       label: "Conexão",      href: "/monitor/example", icon: "Activity",        matchPrefix: "/monitor",       visible: true },
      { id: "overlays",      label: "Sobreposições", href: "/overlays",       icon: "Monitor",         matchPrefix: "/overlays",      visible: true },
      { id: "stream-tools",  label: "Stream Tools",  href: "/stream-tools",   icon: "Tv2",             matchPrefix: "/stream-tools",  visible: true },
      { id: "scoreboards",   label: "Scoreboards",   href: "/scoreboards",    icon: "Trophy",          matchPrefix: "/scoreboards",   visible: true },
      { id: "minigames",     label: "Jogos",         href: "/minigames",      icon: "Gamepad2",        matchPrefix: "/minigames",     visible: true },
      { id: "notifications", label: "Notificações",  href: "/notifications",  icon: "Bell",            matchPrefix: "/notifications", visible: true },
      { id: "gift-gallery",  label: "Gift Gallery",  href: "/gift-gallery",   icon: "Diamond",         visible: true },
    ],
  },
  {
    id: "live-tools",
    label: "LIVE",
    items: [
      { id: "live-counts",    label: "Live Counts",    href: "/live-counts",    icon: "Radio",     matchPrefix: "/live-counts",    requiresPlan: "basic", visible: true },
      { id: "live-captions",  label: "Live Captions",  href: "/live-captions",  icon: "Subtitles", matchPrefix: "/live-captions",  requiresPlan: "pro",   visible: true },
      { id: "live-analytics", label: "Live Analytics", href: "/live-analytics", icon: "BarChart2", matchPrefix: "/live-analytics", requiresPlan: "pro",   visible: true },
      { id: "webhooks",       label: "Webhooks",       href: "/webhooks",       icon: "Webhook",   matchPrefix: "/webhooks",       requiresPlan: "pro",   visible: true },
    ],
  },
  {
    id: "streamer",
    label: "FERRAMENTAS",
    items: [
      { id: "lookup",       label: "Lookup",       href: "/streamer/lookup",      icon: "Search",    matchPrefix: "/streamer/lookup",      visible: true },
      { id: "bulk-check",   label: "Bulk Check",   href: "/streamer/bulk-check",  icon: "Users",     matchPrefix: "/streamer/bulk-check",   requiresPlan: "basic", visible: true },
      { id: "watchlist",    label: "Watchlist",    href: "/streamer/watchlist",   icon: "Star",      matchPrefix: "/streamer/watchlist",    visible: true },
      { id: "jwt",          label: "JWT / WebSocket", href: "/streamer/jwt",      icon: "Key",       matchPrefix: "/streamer/jwt",          requiresPlan: "basic", visible: true },
      { id: "dev-tools",    label: "Dev Tools",    href: "/dev-tools",            icon: "Code2",     matchPrefix: "/dev-tools",            requiresPlan: "pro",   visible: true },
    ],
  },
  {
    id: "leaderboards",
    label: "RANKINGS",
    items: [
      { id: "leaderboards",         label: "Leagues", href: "/leaderboards",         icon: "Crown",    matchPrefix: "/leaderboards",         visible: true },
      { id: "leaderboards-country", label: "Country", href: "/leaderboards/country", icon: "Globe",    matchPrefix: "/leaderboards/country", visible: true },
      { id: "leaderboards-gaming",  label: "Gaming",  href: "/leaderboards/gaming",  icon: "Gamepad2", matchPrefix: "/leaderboards/gaming",  visible: true },
      { id: "gifters",              label: "Gifters", href: "/gifters",               icon: "Diamond",  matchPrefix: "/gifters",              visible: true },
    ],
  },
  {
    id: "integracoes",
    label: "INTEGRAÇÕES",
    items: [
      { id: "pricing",  label: "Planos & Preços", href: "/pricing",  icon: "Tag",      visible: true },
      { id: "settings", label: "Configurações",   href: "/settings", icon: "Settings", visible: true },
    ],
  },
  {
    id: "admin",
    items: [
      { id: "admin", label: "Admin Panel", href: "/admin", icon: "Shield", adminOnly: true, visible: true },
    ],
  },
];

// Live clock component
function LiveClock() {
  const [time, setTime] = useState(() => new Date().toLocaleTimeString("pt-BR", { hour12: false }));
  useEffect(() => {
    const t = setInterval(() => {
      setTime(new Date().toLocaleTimeString("pt-BR", { hour12: false }));
    }, 1000);
    return () => clearInterval(t);
  }, []);
  return <span className="font-mono text-sm font-semibold" style={{ color: "rgba(255,255,255,0.7)" }}>{time}</span>;
}

function NavLinks({
  sections,
  onNavigate,
  userPlan,
  isAdmin,
  location,
  collapsed: sidebarCollapsed,
}: {
  sections: NavSectionConfig[];
  onNavigate?: () => void;
  userPlan: PlanLevel;
  isAdmin: boolean;
  location: string;
  collapsed?: boolean;
}) {
  const { liveCount } = useWatchlist();

  const [sectionCollapsed, setSectionCollapsed] = useState<Record<string, boolean>>(() => {
    try {
      const stored = localStorage.getItem("nav_collapsed");
      return stored ? (JSON.parse(stored) as Record<string, boolean>) : {};
    } catch { return {}; }
  });

  const toggleSection = useCallback((id: string) => {
    setSectionCollapsed((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try { localStorage.setItem("nav_collapsed", JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  return (
    <div className="space-y-0.5">
      {sections.map((section) => {
        const visibleItems = section.items.filter((item) => {
          if (!item.visible) return false;
          if (item.adminOnly && !isAdmin) return false;
          return true;
        });
        if (!visibleItems.length) return null;

        const isCollapsed = section.label ? !!sectionCollapsed[section.id] : false;

        return (
          <div key={section.id} className="mb-1">
            {section.label && !sidebarCollapsed && (
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center px-3 py-1.5 rounded-lg mb-0.5 group transition-all hover:bg-white/5"
              >
                <span className="flex-1 text-left text-[9px] font-bold uppercase tracking-[0.15em]"
                  style={{ color: "rgba(255,255,255,0.25)" }}>
                  {section.label}
                </span>
                {isCollapsed
                  ? <ChevronRight className="w-3 h-3 opacity-30" />
                  : <ChevronDown className="w-3 h-3 opacity-30" />}
              </button>
            )}

            {!isCollapsed && (
              <div className="space-y-0.5">
                {visibleItems.map((item) => {
                  const isActive =
                    location === item.href ||
                    (item.matchPrefix && location.startsWith(item.matchPrefix));
                  const locked = !!(item.requiresPlan && !planMeets(userPlan, item.requiresPlan));
                  const showLiveBadge = item.id === "notifications" && liveCount > 0;
                  const isAdminItem = item.adminOnly;

                  return (
                    <Link
                      key={item.id}
                      href={locked ? "/pricing" : item.href}
                      onClick={onNavigate}
                      title={sidebarCollapsed ? item.label : undefined}
                      className={`flex items-center rounded-lg text-sm font-medium transition-all group relative ${
                        sidebarCollapsed ? "px-2 py-2.5 justify-center" : "px-3 py-2"
                      }`}
                      style={{
                        background: isActive ? "rgba(124,58,237,0.15)" : "transparent",
                        color: isActive ? "#a78bfa" : isAdminItem ? "#f87171" : locked ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.55)",
                        borderLeft: isActive ? "2px solid #7c3aed" : "2px solid transparent",
                      }}
                    >
                      <NavIcon name={item.icon} className={`shrink-0 ${sidebarCollapsed ? "w-4.5 h-4.5" : "w-4 h-4 mr-3"}`} />
                      {!sidebarCollapsed && (
                        <>
                          <span className="flex-1">{item.label}</span>
                          {showLiveBadge && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full animate-pulse"
                              style={{ background: "#ef4444", color: "white" }}>
                              {liveCount}
                            </span>
                          )}
                          {isAdminItem && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                              style={{ background: "rgba(239,68,68,0.15)", color: "#f87171" }}>
                              Admin
                            </span>
                          )}
                          {locked && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full ml-auto"
                              style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.25)", border: "1px solid rgba(255,255,255,0.08)" }}>
                              {item.requiresPlan === "basic" ? "Basic" : "Pro"}
                            </span>
                          )}
                        </>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { config } = useUIConfig();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try { return localStorage.getItem("sidebar_collapsed") === "true"; } catch { return false; }
  });
  const { liveCount } = useWatchlist();

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

  const toggleSidebar = () => {
    setSidebarCollapsed((v) => {
      const next = !v;
      try { localStorage.setItem("sidebar_collapsed", String(next)); } catch { /* ignore */ }
      return next;
    });
  };

  // ── Topbar layout ──
  if (navType === "topbar") {
    return (
      <div className="flex flex-col h-screen w-full overflow-hidden" style={{ background: "#0a0814" }}>
        <header className="h-14 flex items-center px-4 gap-4 shrink-0" style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #06b6d4, #7c3aed)" }}>
              {logoUrl ? <img src={logoUrl} alt={logoText} className="h-6 object-contain" /> : <SiTiktok className="w-4 h-4 text-white" />}
            </div>
            <span className="font-bold text-base tracking-tight text-white">{logoText}</span>
          </div>
          <nav className="flex items-center gap-1 flex-1 overflow-x-auto">
            {sections.flatMap((s) => s.items).filter((item) => item.visible && (!item.adminOnly || isAdmin)).map((item) => {
              const isActive = location === item.href || (item.matchPrefix && location.startsWith(item.matchPrefix));
              const locked = !!(item.requiresPlan && !planMeets(userPlan, item.requiresPlan));
              return (
                <Link key={item.id} href={locked ? "/pricing" : item.href}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors shrink-0"
                  style={{ color: isActive ? "#a78bfa" : "rgba(255,255,255,0.5)", background: isActive ? "rgba(124,58,237,0.12)" : "transparent" }}>
                  <NavIcon name={item.icon} className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors shrink-0">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: "linear-gradient(135deg, #7c3aed, #ec4899)", color: "white" }}>{initials}</div>
                  <span className="text-sm font-medium text-white/70 hidden sm:block">{user.name}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-white/30" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild><Link href="/profile" className="cursor-pointer"><UserCircle className="w-4 h-4 mr-2" />Perfil</Link></DropdownMenuItem>
                {isAdmin && <DropdownMenuItem asChild><Link href="/admin" className="cursor-pointer text-red-400"><Shield className="w-4 h-4 mr-2" />Admin</Link></DropdownMenuItem>}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-red-400 cursor-pointer"><LogOut className="w-4 h-4 mr-2" />Sair</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    );
  }

  // ── Sidebar layout (default) ──
  const sidebarW = sidebarCollapsed ? "w-14" : "w-60";

  const SidebarContent = ({ onNavigate }: { onNavigate?: () => void }) => (
    <>
      {/* Logo header */}
      <div className={`h-14 flex items-center shrink-0 ${sidebarCollapsed ? "justify-center px-2" : "px-4"}`}
        style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        {sidebarCollapsed ? (
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #06b6d4, #7c3aed)" }}>
            {logoUrl ? <img src={logoUrl} alt={logoText} className="h-6 object-contain" /> : <SiTiktok className="w-4 h-4 text-white" />}
          </div>
        ) : (
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #06b6d4, #7c3aed)" }}>
              {logoUrl ? <img src={logoUrl} alt={logoText} className="h-6 object-contain" /> : <SiTiktok className="w-4 h-4 text-white" />}
            </div>
            <div className="min-w-0">
              <div className="font-bold text-sm tracking-tight text-white leading-none truncate">{logoText}</div>
              <div className="text-[9px] tracking-widest uppercase mt-0.5" style={{ color: "rgba(167,139,250,0.5)" }}>TikTok Live Studio</div>
            </div>
          </div>
        )}
      </div>

      {/* User info at top */}
      {user && !sidebarCollapsed && (
        <div className="px-4 py-3 shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
              style={{ background: "linear-gradient(135deg, #7c3aed, #ec4899)", color: "white" }}>{initials}</div>
            <span className="text-xs truncate" style={{ color: "rgba(255,255,255,0.5)" }}>{user.email}</span>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 overflow-y-auto">
        <NavLinks
          sections={sections}
          onNavigate={onNavigate}
          userPlan={userPlan}
          isAdmin={isAdmin}
          location={location}
          collapsed={sidebarCollapsed}
        />
      </nav>

      {/* Upgrade banner */}
      {user && userPlan === "free" && !sidebarCollapsed && (
        <div className="px-3 pb-2 shrink-0">
          <Link href="/pricing">
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all hover:opacity-90"
              style={{ background: "linear-gradient(90deg, rgba(124,58,237,0.2), rgba(236,72,153,0.2))", border: "1px solid rgba(124,58,237,0.3)" }}>
              <Zap className="w-4 h-4 shrink-0" style={{ color: "#a78bfa" }} />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold" style={{ color: "#a78bfa" }}>Upgrade agora</p>
                <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>Desbloqueie mais ferramentas</p>
              </div>
              <Crown className="w-3.5 h-3.5 shrink-0" style={{ color: "#f97316" }} />
            </div>
          </Link>
        </div>
      )}

      {/* Bottom: user dropdown + collapse */}
      <div className="shrink-0 px-2 pb-3" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        {user && !sidebarCollapsed && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors text-left group mt-3">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                  style={{ background: "linear-gradient(135deg, #7c3aed, #ec4899)", color: "white" }}>{initials}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate text-white/70">{user.email?.split("@")[0]}</p>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: planCfg.badgeBg, color: planCfg.color }}>{planCfg.label}</span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-white/20 shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-56 mb-1">
              <div className="px-2 py-1.5">
                <p className="text-xs text-muted-foreground">Conectado como</p>
                <p className="text-sm font-medium truncate">{user.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild><Link href="/profile" className="cursor-pointer"><UserCircle className="w-4 h-4 mr-2" />Meu Perfil</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link href="/pricing" className="cursor-pointer"><Tag className="w-4 h-4 mr-2" />{userPlan === "free" ? "Fazer upgrade" : "Gerenciar plano"}</Link></DropdownMenuItem>
              {isAdmin && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/admin" className="cursor-pointer text-red-400 focus:text-red-400">
                      <Shield className="w-4 h-4 mr-2" />Admin Panel
                    </Link>
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="text-red-400 focus:text-red-400 cursor-pointer">
                <LogOut className="w-4 h-4 mr-2" />Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Collapse button */}
        <button
          onClick={toggleSidebar}
          className="mt-2 w-full flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all hover:bg-white/5"
          style={{ color: "rgba(255,255,255,0.2)" }}
        >
          <ChevronLeft className={`w-4 h-4 transition-transform ${sidebarCollapsed ? "rotate-180" : ""}`} />
          {!sidebarCollapsed && <span className="text-[10px] uppercase tracking-widest font-semibold">Recolher</span>}
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen w-full overflow-hidden" style={{ background: "#0a0814" }}>
      {/* Desktop Sidebar */}
      <aside className={`${sidebarW} hidden md:flex flex-col shrink-0 transition-all duration-200`}
        style={{ background: "rgba(255,255,255,0.02)", borderRight: "1px solid rgba(255,255,255,0.05)" }}>
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 flex flex-col z-10"
            style={{ background: "#0f0b1f", borderRight: "1px solid rgba(255,255,255,0.06)" }}>
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="h-14 flex items-center px-4 gap-3 shrink-0"
          style={{ background: "rgba(255,255,255,0.02)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>

          {/* Mobile menu button */}
          <button className="md:hidden text-white/40 hover:text-white/70 mr-1 transition-colors" onClick={() => setMobileOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>

          {/* Clock */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg shrink-0"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <LiveClock />
          </div>

          {/* Plan badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer shrink-0"
            style={{ background: planCfg.badgeBg, border: `1px solid ${planCfg.color}40` }}>
            <Crown className="w-3.5 h-3.5" style={{ color: planCfg.color }} />
            <span className="text-xs font-bold" style={{ color: planCfg.color }}>{planCfg.label}</span>
          </div>

          <div className="flex-1" />

          {/* Notifications */}
          <Link href="/notifications" className="relative p-2 rounded-lg transition-colors hover:bg-white/5 shrink-0"
            style={{ color: "rgba(255,255,255,0.4)" }}>
            <Bell className="w-4.5 h-4.5 w-[18px] h-[18px]" />
            {liveCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full"
                style={{ background: "#ef4444", color: "white" }}>{liveCount > 9 ? "9+" : liveCount}</span>
            )}
          </Link>

          {/* Profile */}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors shrink-0">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: "linear-gradient(135deg, #7c3aed, #ec4899)", color: "white" }}>{initials}</div>
                  <span className="text-sm font-medium hidden sm:block" style={{ color: "rgba(255,255,255,0.6)" }}>{user.name}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-white/20 hidden sm:block" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <div className="px-2 py-1.5">
                  <p className="text-xs text-muted-foreground">Conectado como</p>
                  <p className="text-sm font-medium truncate">{user.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild><Link href="/profile" className="cursor-pointer"><UserCircle className="w-4 h-4 mr-2" />Meu Perfil</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link href="/pricing" className="cursor-pointer"><Tag className="w-4 h-4 mr-2" />Planos</Link></DropdownMenuItem>
                {isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/admin" className="cursor-pointer text-red-400 focus:text-red-400">
                        <Shield className="w-4 h-4 mr-2" />Admin Panel
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-red-400 focus:text-red-400 cursor-pointer">
                  <LogOut className="w-4 h-4 mr-2" />Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Logout shortcut */}
          <button onClick={logout} className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors hover:bg-red-500/10 shrink-0"
            style={{ color: "rgba(255,255,255,0.3)" }}>
            <LogOut className="w-3.5 h-3.5" />
            <span>Sair</span>
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
