import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  plan: "free" | "basic" | "pro";
  isAdmin: boolean;
  createdAt: string;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = "creatools_token";
const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export async function authFetch(path: string, token: string | null, opts?: RequestInit) {
  const res = await fetch(`${BASE}/api${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts?.headers ?? {}),
    },
  });
  const json = await res.json();
  if (!res.ok) throw new Error((json as { error?: string }).error ?? "Request failed");
  return json;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, token: null, loading: true });

  const fetchMe = useCallback(async (token: string) => {
    try {
      const data = await authFetch("/auth/me", token) as { user: AuthUser };
      setState({ user: data.user, token, loading: false });
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      setState({ user: null, token: null, loading: false });
    }
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem(TOKEN_KEY);
    if (saved) void fetchMe(saved);
    else setState((s) => ({ ...s, loading: false }));
  }, [fetchMe]);

  const login = useCallback(async (email: string, password: string) => {
    const data = await authFetch("/auth/login", null, {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }) as { token: string; user: AuthUser };
    localStorage.setItem(TOKEN_KEY, data.token);
    setState({ user: data.user, token: data.token, loading: false });
  }, []);

  const register = useCallback(async (email: string, password: string, name: string) => {
    const data = await authFetch("/auth/register", null, {
      method: "POST",
      body: JSON.stringify({ email, password, name }),
    }) as { token: string; user: AuthUser };
    localStorage.setItem(TOKEN_KEY, data.token);
    setState({ user: data.user, token: data.token, loading: false });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setState({ user: null, token: null, loading: false });
  }, []);

  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) await fetchMe(token);
  }, [fetchMe]);

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
