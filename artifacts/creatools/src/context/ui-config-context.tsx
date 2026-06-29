import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";

export interface NavItemConfig {
  id: string;
  label: string;
  href: string;
  icon: string;
  matchPrefix?: string;
  adminOnly?: boolean;
  requiresPlan?: string;
  visible: boolean;
}

export interface NavSectionConfig {
  id: string;
  label?: string;
  items: NavItemConfig[];
}

export interface UIConfig {
  navType: "sidebar" | "topbar";
  primaryColor: string;
  secondaryColor: string;
  logoText: string;
  logoUrl: string;
  sidebarSections: NavSectionConfig[];
  updatedAt: string;
}

interface UIConfigContextValue {
  config: UIConfig | null;
  loading: boolean;
  refresh: () => void;
  update: (patch: Partial<UIConfig>, token: string) => Promise<UIConfig>;
  reset: (token: string) => Promise<UIConfig>;
}

const DEFAULT: UIConfig = {
  navType: "sidebar",
  primaryColor: "180 100% 50%",
  secondaryColor: "333 99% 52%",
  logoText: "Creatools",
  logoUrl: "",
  sidebarSections: [],
  updatedAt: "",
};

const UIConfigContext = createContext<UIConfigContextValue>({
  config: null,
  loading: true,
  refresh: () => {},
  update: async () => DEFAULT,
  reset: async () => DEFAULT,
});

function applyColors(cfg: UIConfig) {
  const root = document.documentElement;
  root.style.setProperty("--primary", cfg.primaryColor);
  root.style.setProperty("--secondary", cfg.secondaryColor);
  root.style.setProperty("--ring", cfg.primaryColor);
  root.style.setProperty("--sidebar-primary", cfg.primaryColor);
}

export function UIConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<UIConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch_ = useCallback(async () => {
    try {
      const res = await fetch("/api/ui-config");
      if (res.ok) {
        const cfg = await res.json() as UIConfig;
        setConfig(cfg);
        applyColors(cfg);
      }
    } catch { /* use defaults */ }
    setLoading(false);
  }, []);

  useEffect(() => { void fetch_(); }, [fetch_]);

  const update = useCallback(async (patch: Partial<UIConfig>, token: string): Promise<UIConfig> => {
    const res = await fetch("/api/admin/ui-config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(patch),
    });
    if (!res.ok) throw new Error(await res.text());
    const cfg = await res.json() as UIConfig;
    setConfig(cfg);
    applyColors(cfg);
    return cfg;
  }, []);

  const reset = useCallback(async (token: string): Promise<UIConfig> => {
    const res = await fetch("/api/admin/ui-config/reset", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(await res.text());
    const cfg = await res.json() as UIConfig;
    setConfig(cfg);
    applyColors(cfg);
    return cfg;
  }, []);

  return (
    <UIConfigContext.Provider value={{ config, loading, refresh: fetch_, update, reset }}>
      {children}
    </UIConfigContext.Provider>
  );
}

export function useUIConfig() {
  return useContext(UIConfigContext);
}
