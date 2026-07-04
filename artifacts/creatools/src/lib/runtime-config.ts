export interface CreatoolsRuntimeConfig {
  apiBaseUrl?: string;
}

declare global {
  interface Window {
    __CREATOOLS_CONFIG__?: CreatoolsRuntimeConfig;
  }
}

export function getRuntimeConfig(): CreatoolsRuntimeConfig {
  if (typeof window === "undefined") return {};
  return window.__CREATOOLS_CONFIG__ ?? {};
}

export function resolveApiUrl(path: string): string {
  const configuredBase = getRuntimeConfig().apiBaseUrl?.trim();
  const base = configuredBase ? configuredBase.replace(/\/+$/, "") : "";
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}
