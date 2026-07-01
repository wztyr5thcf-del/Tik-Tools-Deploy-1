import { useState, useRef, useCallback, useEffect } from "react";
import {
  Monitor, Plus, Layers, Eye, EyeOff, Trash2, Copy, CheckCircle2,
  ExternalLink, RotateCcw, Save, FolderOpen, X, ChevronDown, ChevronUp,
  Maximize2, Move, Settings2, Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const STORAGE_KEY = "creatools_layout_presets_v1";

interface OverlayLayer {
  id: string;
  catalogId: string;
  label: string;
  icon: string;
  path: string;
  direct: boolean; // true = /overlay/... (no auth), false = /overlays/... (config page)
  x: number;  // % of canvas width (left edge)
  y: number;  // % of canvas height (top edge)
  w: number;  // % of canvas width
  h: number;  // % of canvas height
  opacity: number; // 0–100
  visible: boolean;
  params: Record<string, string>;
}

interface Preset { id: string; name: string; layers: OverlayLayer[] }

// ─── Catalog ──────────────────────────────────────────────────────────────────
const CATALOG = [
  // Direct browser-source overlays (no auth)
  { id: "main",         label: "Overlay Principal", icon: "🎬", path: "/overlay",            defaultW: 100, defaultH: 100, direct: true  },
  { id: "chat",         label: "Chat ao vivo",      icon: "💬", path: "/overlay/chat",       defaultW: 22,  defaultH: 55,  direct: true  },
  { id: "alerts",       label: "Alertas",           icon: "🔔", path: "/overlay/alerts",     defaultW: 35,  defaultH: 18,  direct: true  },
  { id: "top-gifters",  label: "Top Gifters",       icon: "🏆", path: "/overlay/top-gifters",defaultW: 24,  defaultH: 42,  direct: true  },
  { id: "stats",        label: "Estatísticas",      icon: "📊", path: "/overlay/stats",      defaultW: 32,  defaultH: 10,  direct: true  },
  { id: "goal",         label: "Meta/Goal",         icon: "🎯", path: "/overlay/goal",       defaultW: 35,  defaultH: 9,   direct: true  },
  { id: "combo",        label: "Combo de Gifts",    icon: "🔥", path: "/overlay/combo",      defaultW: 24,  defaultH: 28,  direct: true  },
  { id: "subscribe",    label: "Subscribers",       icon: "⭐", path: "/overlay/subscribe",  defaultW: 30,  defaultH: 18,  direct: true  },
  { id: "ticker",       label: "Ticker/Rodapé",     icon: "📰", path: "/overlay/ticker",     defaultW: 100, defaultH: 7,   direct: true  },
  // Config-page overlays (user gets specific URL from config page)
  { id: "likes",        label: "Ranking Likes",     icon: "❤️", path: "/overlays/likes",     defaultW: 24,  defaultH: 42,  direct: false },
  { id: "battle",       label: "Battle",            icon: "⚔️", path: "/overlays/battle",    defaultW: 30,  defaultH: 14,  direct: false },
  { id: "coins",        label: "Coins",             icon: "🪙", path: "/overlays/coins",     defaultW: 24,  defaultH: 18,  direct: false },
  { id: "mvp",          label: "MVP",               icon: "👑", path: "/overlays/mvp",       defaultW: 30,  defaultH: 18,  direct: false },
  { id: "pote",         label: "Pote",              icon: "🫙", path: "/overlays/pote",      defaultW: 24,  defaultH: 22,  direct: false },
  { id: "gifts",        label: "Feed de Gifts",     icon: "🎁", path: "/overlays/gifts",     defaultW: 24,  defaultH: 38,  direct: false },
  { id: "share",        label: "Top Shares",        icon: "🔗", path: "/overlays/share",     defaultW: 24,  defaultH: 35,  direct: false },
  { id: "whatsapp",     label: "WhatsApp CTA",      icon: "💬", path: "/overlays/whatsapp",  defaultW: 24,  defaultH: 12,  direct: false },
  { id: "notificacoes", label: "Notificações",      icon: "📱", path: "/overlays/notificacoes",defaultW:30, defaultH: 22,  direct: false },
  { id: "gamer",        label: "Gamer HUD",         icon: "🎮", path: "/overlays/gamer",     defaultW: 30,  defaultH: 18,  direct: false },
  { id: "level-up",     label: "Level Up",          icon: "⬆️", path: "/overlays/level-up",  defaultW: 30,  defaultH: 18,  direct: false },
];

// ─── URL helpers ──────────────────────────────────────────────────────────────
function buildUrl(layer: OverlayLayer, username: string): string {
  const u = username || "USERNAME";
  const params = new URLSearchParams(layer.params);
  const qs = params.toString() ? `?${params.toString()}` : "";
  const origin = window.location.origin;
  if (layer.direct) return `${origin}${BASE}${layer.path}/${u}${qs}`;
  return `${origin}${BASE}${layer.path}`;
}

function obsCss(l: OverlayLayer): string {
  return `position: absolute; left: ${l.x.toFixed(1)}%; top: ${l.y.toFixed(1)}%; width: ${l.w.toFixed(1)}%; height: ${l.h.toFixed(1)}%; opacity: ${(l.opacity / 100).toFixed(2)};`;
}

// ─── Small copy button ────────────────────────────────────────────────────────
function CopyBtn({ value, label = "Copiar" }: { value: string; label?: string }) {
  const [ok, setOk] = useState(false);
  const { toast } = useToast();
  return (
    <button onClick={() => { void navigator.clipboard.writeText(value); setOk(true); toast({ title: "Copiado!" }); setTimeout(() => setOk(false), 1800); }}
      className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors"
      style={{ background: ok ? "rgba(34,197,94,0.15)" : "rgba(124,58,237,0.15)", color: ok ? "#4ade80" : "#a78bfa" }}>
      {ok ? <CheckCircle2 className="w-3 h-3" /> : <Copy className="w-3 h-3" />}{ok ? "Copiado!" : label}
    </button>
  );
}

// ─── Canvas layer item ────────────────────────────────────────────────────────
interface CanvasItemProps {
  layer: OverlayLayer;
  selected: boolean;
  onSelect: () => void;
  onDragStart: (e: React.MouseEvent) => void;
  onResizeStart: (e: React.MouseEvent) => void;
}
function CanvasItem({ layer, selected, onSelect, onDragStart, onResizeStart }: CanvasItemProps) {
  if (!layer.visible) return null;
  return (
    <div
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      onMouseDown={(e) => { e.stopPropagation(); onSelect(); onDragStart(e); }}
      style={{
        position: "absolute",
        left: `${layer.x}%`, top: `${layer.y}%`,
        width: `${layer.w}%`, height: `${layer.h}%`,
        opacity: layer.opacity / 100,
        border: selected ? "2px solid #a78bfa" : "1.5px dashed rgba(167,139,250,0.35)",
        borderRadius: 6,
        background: selected ? "rgba(124,58,237,0.18)" : "rgba(124,58,237,0.08)",
        cursor: "move",
        userSelect: "none",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        gap: 2,
        boxSizing: "border-box",
        transition: selected ? "none" : "border-color 0.15s",
        zIndex: selected ? 10 : 1,
      }}>
      <span style={{ fontSize: "clamp(10px, 2vw, 18px)", lineHeight: 1 }}>{layer.icon}</span>
      <span style={{ fontSize: "clamp(7px, 1.1vw, 12px)", fontWeight: 600, color: "#c4b5fd", textAlign: "center", lineHeight: 1.2, padding: "0 4px" }}>
        {layer.label}
      </span>
      {/* Resize handle */}
      {selected && (
        <div
          onMouseDown={(e) => { e.stopPropagation(); onResizeStart(e); }}
          style={{
            position: "absolute", bottom: 2, right: 2,
            width: 10, height: 10,
            background: "#a78bfa", borderRadius: 2,
            cursor: "se-resize",
          }}
        />
      )}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function LayoutEditor() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [username, setUsername] = useState(user?.tiktokUsername ?? "");
  const [usernameInput, setUsernameInput] = useState(user?.tiktokUsername ?? "");
  const [layers, setLayers] = useState<OverlayLayer[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCatalog, setShowCatalog] = useState(true);
  const [presets, setPresets] = useState<Preset[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]"); } catch { return []; }
  });
  const [presetName, setPresetName] = useState("");
  const [showPresetInput, setShowPresetInput] = useState(false);
  const [showUrlPanel, setShowUrlPanel] = useState(true);

  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ id: string; sx: number; sy: number; ox: number; oy: number } | null>(null);
  const resizeRef = useRef<{ id: string; sx: number; sy: number; ow: number; oh: number } | null>(null);

  const selectedLayer = layers.find(l => l.id === selectedId) ?? null;

  // ── Mouse drag/resize on window ───────────────────────────────────────────
  const handleMouseMove = useCallback((e: MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    if (dragRef.current) {
      const { id, sx, sy, ox, oy } = dragRef.current;
      const dx = ((e.clientX - sx) / rect.width) * 100;
      const dy = ((e.clientY - sy) / rect.height) * 100;
      setLayers(prev => prev.map(l => l.id === id
        ? { ...l, x: Math.max(0, Math.min(100 - l.w, ox + dx)), y: Math.max(0, Math.min(100 - l.h, oy + dy)) }
        : l));
    }
    if (resizeRef.current) {
      const { id, sx, sy, ow, oh } = resizeRef.current;
      const dw = ((e.clientX - sx) / rect.width) * 100;
      const dh = ((e.clientY - sy) / rect.height) * 100;
      setLayers(prev => prev.map(l => l.id === id
        ? { ...l, w: Math.max(5, Math.min(100, ow + dw)), h: Math.max(3, Math.min(100, oh + dh)) }
        : l));
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    dragRef.current = null;
    resizeRef.current = null;
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => { window.removeEventListener("mousemove", handleMouseMove); window.removeEventListener("mouseup", handleMouseUp); };
  }, [handleMouseMove, handleMouseUp]);

  // ── Layer actions ──────────────────────────────────────────────────────────
  function addLayer(cat: typeof CATALOG[0]) {
    if (layers.length >= 10) { toast({ title: "Limite de 10 camadas atingido" }); return; }
    const layer: OverlayLayer = {
      id: crypto.randomUUID(),
      catalogId: cat.id, label: cat.label, icon: cat.icon,
      path: cat.path, direct: cat.direct,
      x: Math.random() * 20 + 5, y: Math.random() * 20 + 5,
      w: cat.defaultW, h: cat.defaultH,
      opacity: 100, visible: true, params: {},
    };
    setLayers(prev => [...prev, layer]);
    setSelectedId(layer.id);
  }

  function removeLayer(id: string) {
    setLayers(prev => prev.filter(l => l.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  function updateLayer(id: string, patch: Partial<OverlayLayer>) {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, ...patch } : l));
  }

  function resetCanvas() { setLayers([]); setSelectedId(null); }

  // ── Presets ────────────────────────────────────────────────────────────────
  function savePreset() {
    if (!presetName.trim()) return;
    const p: Preset = { id: crypto.randomUUID(), name: presetName.trim(), layers };
    const updated = [...presets, p];
    setPresets(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setPresetName(""); setShowPresetInput(false);
    toast({ title: `Preset "${p.name}" salvo!` });
  }

  function loadPreset(p: Preset) {
    setLayers(p.layers); setSelectedId(null);
    toast({ title: `Preset "${p.name}" carregado!` });
  }

  function deletePreset(id: string) {
    const updated = presets.filter(p => p.id !== id);
    setPresets(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  const visibleDirectLayers = layers.filter(l => l.visible && l.direct);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 max-w-7xl">
      {/* Header */}
      <div className="flex flex-wrap items-start gap-4 justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg, #3b82f6, #7c3aed)" }}>
            <Monitor className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                style={{ background: "rgba(167,139,250,0.15)", color: "#a78bfa" }}>OVERLAY STUDIO</span>
            </div>
            <h1 className="text-xl font-bold text-white">Layout Editor</h1>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
              Posicione múltiplos overlays no canvas e copie as URLs para o OBS.
            </p>
          </div>
        </div>

        {/* Username */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>@</span>
            <Input value={usernameInput} onChange={e => setUsernameInput(e.target.value.replace(/^@/, ""))}
              placeholder="seu_tiktok"
              className="pl-6 w-36 text-sm h-8 font-mono"
              onKeyDown={e => e.key === "Enter" && setUsername(usernameInput.trim())} />
          </div>
          <Button size="sm" className="h-8 text-xs" onClick={() => setUsername(usernameInput.trim())}>Aplicar</Button>
        </div>
      </div>

      {/* Presets bar */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.35)" }}>Presets:</span>
        {presets.map(p => (
          <div key={p.id} className="flex items-center gap-1">
            <button onClick={() => loadPreset(p)}
              className="text-xs px-2 py-1 rounded-md font-medium transition-colors"
              style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.7)" }}>
              {p.name}
            </button>
            <button onClick={() => deletePreset(p.id)} className="p-0.5 rounded hover:text-red-400 transition-colors"
              style={{ color: "rgba(255,255,255,0.2)" }}><X className="w-3 h-3" /></button>
          </div>
        ))}
        {showPresetInput ? (
          <div className="flex items-center gap-1">
            <Input value={presetName} onChange={e => setPresetName(e.target.value)} placeholder="Nome do preset"
              className="h-7 text-xs w-36" onKeyDown={e => e.key === "Enter" && savePreset()} autoFocus />
            <Button size="sm" className="h-7 text-xs px-2" onClick={savePreset}>Salvar</Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={() => setShowPresetInput(false)}>✕</Button>
          </div>
        ) : (
          <button onClick={() => setShowPresetInput(true)}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-colors"
            style={{ border: "1px dashed rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.35)" }}>
            <Save className="w-3 h-3" /> Salvar layout
          </button>
        )}
        {layers.length > 0 && (
          <button onClick={resetCanvas}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-colors ml-auto"
            style={{ color: "rgba(239,68,68,0.6)" }}>
            <RotateCcw className="w-3 h-3" /> Limpar
          </button>
        )}
      </div>

      {/* Three-column layout */}
      <div className="grid gap-3" style={{ gridTemplateColumns: showCatalog ? "200px 1fr 240px" : "32px 1fr 240px" }}>

        {/* ── Overlay Catalog ───────────────────────────────────────────────── */}
        <div className="space-y-2">
          <button onClick={() => setShowCatalog(v => !v)}
            className="w-full flex items-center gap-1.5 text-xs font-semibold px-2 py-1.5 rounded-lg transition-colors"
            style={{ color: "rgba(255,255,255,0.5)", background: "rgba(255,255,255,0.04)" }}>
            <Layers className="w-3.5 h-3.5 shrink-0" />
            {showCatalog && <span className="flex-1 text-left">Overlays</span>}
          </button>

          {showCatalog && (
            <div className="space-y-0.5 max-h-[520px] overflow-y-auto pr-1" style={{ scrollbarWidth: "thin" }}>
              <p className="text-[10px] px-1 mb-1 font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.2)" }}>Browser Sources</p>
              {CATALOG.filter(c => c.direct).map(cat => (
                <button key={cat.id} onClick={() => addLayer(cat)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-xs transition-all group"
                  style={{ color: "rgba(255,255,255,0.65)" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(124,58,237,0.15)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <span className="text-sm">{cat.icon}</span>
                  <span className="flex-1 truncate">{cat.label}</span>
                  <Plus className="w-3 h-3 opacity-0 group-hover:opacity-60 shrink-0" />
                </button>
              ))}
              <p className="text-[10px] px-1 mt-3 mb-1 font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.2)" }}>Configuráveis</p>
              {CATALOG.filter(c => !c.direct).map(cat => (
                <button key={cat.id} onClick={() => addLayer(cat)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-xs transition-all group"
                  style={{ color: "rgba(255,255,255,0.45)" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <span className="text-sm">{cat.icon}</span>
                  <span className="flex-1 truncate">{cat.label}</span>
                  <Plus className="w-3 h-3 opacity-0 group-hover:opacity-60 shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Canvas 16:9 ──────────────────────────────────────────────────── */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.35)" }}>Canvas 1920×1080</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "rgba(34,197,94,0.1)", color: "#4ade80" }}>
              {layers.filter(l => l.visible).length}/{layers.length} visíveis
            </span>
          </div>
          <div
            ref={canvasRef}
            onClick={() => setSelectedId(null)}
            style={{
              position: "relative", width: "100%", aspectRatio: "16/9",
              background: "linear-gradient(135deg, #0a0612 0%, #0d0a1a 100%)",
              border: "1px solid rgba(124,58,237,0.25)",
              borderRadius: 10, overflow: "hidden",
              cursor: "default",
            }}>
            {/* Grid guide lines */}
            <div style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.07 }}>
              {[33, 66].map(p => (
                <div key={p} style={{ position: "absolute", left: `${p}%`, top: 0, width: 1, height: "100%", background: "rgba(255,255,255,0.5)" }} />
              ))}
              {[33, 66].map(p => (
                <div key={p} style={{ position: "absolute", top: `${p}%`, left: 0, height: 1, width: "100%", background: "rgba(255,255,255,0.5)" }} />
              ))}
            </div>

            {/* Stream background placeholder */}
            {layers.length === 0 && (
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <Layers style={{ width: 28, height: 28, color: "rgba(255,255,255,0.08)" }} />
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.12)", fontWeight: 500 }}>
                  Clique em um overlay à esquerda para adicionar
                </p>
              </div>
            )}

            {/* Layer items */}
            {layers.map(layer => (
              <CanvasItem
                key={layer.id}
                layer={layer}
                selected={selectedId === layer.id}
                onSelect={() => setSelectedId(layer.id)}
                onDragStart={(e) => {
                  const canvas = canvasRef.current!;
                  dragRef.current = { id: layer.id, sx: e.clientX, sy: e.clientY, ox: layer.x, oy: layer.y };
                }}
                onResizeStart={(e) => {
                  resizeRef.current = { id: layer.id, sx: e.clientX, sy: e.clientY, ow: layer.w, oh: layer.h };
                }}
              />
            ))}

            {/* Corner label */}
            <div style={{ position: "absolute", bottom: 6, right: 8, fontSize: 10, color: "rgba(255,255,255,0.15)", fontWeight: 600 }}>
              1920 × 1080
            </div>
          </div>

          {/* Canvas tips */}
          <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.2)" }}>
            <Move className="inline w-3 h-3 mr-0.5" /> Arraste para reposicionar — <Maximize2 className="inline w-3 h-3 mr-0.5" /> canto inferior direito para redimensionar
          </p>
        </div>

        {/* ── Layer list + Properties ──────────────────────────────────────── */}
        <div className="space-y-3">
          {/* Layer list */}
          <div>
            <p className="text-xs font-semibold mb-1.5 flex items-center gap-1.5" style={{ color: "rgba(255,255,255,0.5)" }}>
              <Layers className="w-3.5 h-3.5" /> Camadas ({layers.length}/10)
            </p>
            <div className="space-y-1 max-h-[200px] overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
              {layers.length === 0 && (
                <p className="text-xs py-4 text-center" style={{ color: "rgba(255,255,255,0.2)" }}>Nenhuma camada adicionada</p>
              )}
              {[...layers].reverse().map(layer => (
                <div key={layer.id}
                  onClick={() => setSelectedId(layer.id)}
                  className="group flex items-center gap-1.5 px-2 py-1.5 rounded-lg cursor-pointer transition-all"
                  style={{
                    background: selectedId === layer.id ? "rgba(124,58,237,0.2)" : "rgba(255,255,255,0.03)",
                    border: `1px solid ${selectedId === layer.id ? "rgba(124,58,237,0.4)" : "rgba(255,255,255,0.06)"}`,
                  }}>
                  <span className="text-sm">{layer.icon}</span>
                  <span className="flex-1 text-xs truncate" style={{ color: "rgba(255,255,255,0.75)" }}>{layer.label}</span>
                  <button onClick={e => { e.stopPropagation(); updateLayer(layer.id, { visible: !layer.visible }); }}
                    className="p-0.5 rounded" style={{ opacity: 0.5 }}>
                    {layer.visible ? <Eye className="w-3 h-3" style={{ color: "#a78bfa" }} /> : <EyeOff className="w-3 h-3" style={{ color: "rgba(255,255,255,0.2)" }} />}
                  </button>
                  <button onClick={e => { e.stopPropagation(); removeLayer(layer.id); }}
                    className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity">
                    <Trash2 className="w-3 h-3" style={{ color: "rgba(239,68,68,0.6)" }} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Properties panel */}
          {selectedLayer && (
            <div className="rounded-xl p-3 space-y-3"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(167,139,250,0.2)" }}>
              <p className="text-xs font-semibold flex items-center gap-1.5" style={{ color: "#a78bfa" }}>
                <Settings2 className="w-3.5 h-3.5" /> {selectedLayer.label}
              </p>

              {/* Position */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "rgba(255,255,255,0.3)" }}>Posição</p>
                <div className="grid grid-cols-2 gap-2">
                  {([["X", "x"], ["Y", "y"]] as const).map(([lbl, key]) => (
                    <div key={key}>
                      <Label className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>{lbl}: {selectedLayer[key].toFixed(1)}%</Label>
                      <Slider value={[selectedLayer[key]]} min={0} max={95} step={0.5}
                        onValueChange={([v]) => updateLayer(selectedLayer.id, { [key]: v })}
                        className="mt-1 [&_[role=slider]]:bg-violet-500" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Size */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "rgba(255,255,255,0.3)" }}>Tamanho</p>
                <div className="grid grid-cols-2 gap-2">
                  {([["W", "w"], ["H", "h"]] as const).map(([lbl, key]) => (
                    <div key={key}>
                      <Label className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>{lbl}: {selectedLayer[key].toFixed(1)}%</Label>
                      <Slider value={[selectedLayer[key]]} min={3} max={100} step={0.5}
                        onValueChange={([v]) => updateLayer(selectedLayer.id, { [key]: v })}
                        className="mt-1 [&_[role=slider]]:bg-violet-500" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Opacity */}
              <div>
                <Label className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>Opacidade: {selectedLayer.opacity}%</Label>
                <Slider value={[selectedLayer.opacity]} min={10} max={100} step={5}
                  onValueChange={([v]) => updateLayer(selectedLayer.id, { opacity: v })}
                  className="mt-1 [&_[role=slider]]:bg-violet-500" />
              </div>

              {/* Quick position buttons */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "rgba(255,255,255,0.3)" }}>Posição rápida</p>
                <div className="grid grid-cols-3 gap-1">
                  {[
                    { label: "↖", x: 0, y: 0 }, { label: "↑", x: 50 - selectedLayer.w / 2, y: 0 }, { label: "↗", x: 100 - selectedLayer.w, y: 0 },
                    { label: "←", x: 0, y: 50 - selectedLayer.h / 2 }, { label: "⊙", x: 50 - selectedLayer.w / 2, y: 50 - selectedLayer.h / 2 }, { label: "→", x: 100 - selectedLayer.w, y: 50 - selectedLayer.h / 2 },
                    { label: "↙", x: 0, y: 100 - selectedLayer.h }, { label: "↓", x: 50 - selectedLayer.w / 2, y: 100 - selectedLayer.h }, { label: "↘", x: 100 - selectedLayer.w, y: 100 - selectedLayer.h },
                  ].map(({ label, x, y }) => (
                    <button key={label} onClick={() => updateLayer(selectedLayer.id, { x: Math.max(0, x), y: Math.max(0, y) })}
                      className="py-1 rounded text-xs font-bold transition-colors"
                      style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(124,58,237,0.2)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── URL output panel ───────────────────────────────────────────────── */}
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
        <button onClick={() => setShowUrlPanel(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3"
          style={{ background: "rgba(255,255,255,0.03)" }}>
          <span className="text-xs font-semibold flex items-center gap-2" style={{ color: "rgba(255,255,255,0.6)" }}>
            <ExternalLink className="w-3.5 h-3.5 text-violet-400" />
            URLs para o OBS ({visibleDirectLayers.length} overlay{visibleDirectLayers.length !== 1 ? "s" : ""})
            {!username && <span className="text-[10px] text-amber-400">— insira seu username acima</span>}
          </span>
          {showUrlPanel ? <ChevronUp className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.3)" }} /> : <ChevronDown className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.3)" }} />}
        </button>

        {showUrlPanel && (
          <div className="px-4 pb-4 space-y-3 pt-2">
            {layers.length === 0 && (
              <p className="text-xs py-2 text-center" style={{ color: "rgba(255,255,255,0.25)" }}>Adicione overlays ao canvas para gerar as URLs</p>
            )}

            {layers.filter(l => l.visible).map(layer => {
              const url = buildUrl(layer, username);
              const css = obsCss(layer);
              return (
                <div key={layer.id} className="space-y-1.5 pb-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{layer.icon}</span>
                    <span className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.8)" }}>{layer.label}</span>
                    {!layer.direct && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "rgba(251,191,36,0.12)", color: "#fbbf24" }}>
                        Configurável
                      </span>
                    )}
                    <div className="flex items-center gap-1 ml-auto text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>
                      X:{layer.x.toFixed(0)}% Y:{layer.y.toFixed(0)}% W:{layer.w.toFixed(0)}% H:{layer.h.toFixed(0)}%
                    </div>
                  </div>

                  {/* URL */}
                  <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <code className="flex-1 text-[11px] font-mono truncate" style={{ color: "#a78bfa" }}>{url}</code>
                    <CopyBtn value={url} label="URL" />
                    <a href={url} target="_blank" rel="noopener noreferrer"
                      className="p-1 rounded hover:bg-white/5 transition-colors" style={{ color: "rgba(255,255,255,0.3)" }}>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  {/* OBS Custom CSS */}
                  {layer.direct && (
                    <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg" style={{ background: "rgba(59,130,246,0.05)", border: "1px solid rgba(59,130,246,0.15)" }}>
                      <span className="text-[10px] font-bold shrink-0" style={{ color: "#60a5fa" }}>CSS OBS:</span>
                      <code className="flex-1 text-[10px] font-mono truncate" style={{ color: "rgba(255,255,255,0.5)" }}>{css}</code>
                      <CopyBtn value={css} label="CSS" />
                    </div>
                  )}
                </div>
              );
            })}

            {/* Instructions */}
            {visibleDirectLayers.length > 0 && (
              <div className="flex items-start gap-2 p-3 rounded-lg" style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.15)" }}>
                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: "#60a5fa" }} />
                <p className="text-[11px] leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>
                  No <strong className="text-white/60">OBS</strong>: adicione cada URL como <em>Browser Source</em> (1920×1080) e cole o CSS em <em>Custom CSS</em> do Browser Source para posicionar automaticamente. No <strong className="text-white/60">TikTok LIVE Studio</strong>: adicione como <em>Fonte Web</em> e ajuste a posição manualmente.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
