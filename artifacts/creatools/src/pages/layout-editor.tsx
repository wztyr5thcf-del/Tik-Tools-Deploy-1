import { useState } from "react";
import { Monitor, Plus, Layers, Eye, EyeOff, Trash2, Lock, Unlock, GripVertical, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { OverlayLink } from "./overlay-item-base";
import { useAuth } from "@/context/auth-context";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Layer {
  id: string;
  name: string;
  type: string;
  visible: boolean;
  locked: boolean;
}

const OVERLAY_TYPES = [
  { id: "likes", label: "Ranking de Likes", icon: "❤️" },
  { id: "gifts", label: "Gifts", icon: "🎁" },
  { id: "battle", label: "Battle", icon: "⚔️" },
  { id: "mvp", label: "MVP", icon: "👑" },
  { id: "pote", label: "Pote", icon: "🫙" },
  { id: "notifications", label: "Notificações", icon: "🔔" },
  { id: "whatsapp", label: "WhatsApp", icon: "💬" },
  { id: "shares", label: "Top Shares", icon: "🔗" },
];

const DEFAULT_LAYERS: Layer[] = [
  { id: "1", name: "Ranking de Likes", type: "likes", visible: true, locked: false },
  { id: "2", name: "Pote de Gifts", type: "pote", visible: true, locked: false },
  { id: "3", name: "Notificações", type: "notifications", visible: false, locked: true },
];

function LayerItem({ layer, onToggleVis, onToggleLock, onDelete }: { layer: Layer; onToggleVis: () => void; onToggleLock: () => void; onDelete: () => void }) {
  const ot = OVERLAY_TYPES.find(o => o.id === layer.type);
  return (
    <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl group"
      style={{ border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
      <GripVertical className="w-4 h-4 shrink-0 cursor-grab opacity-20 group-hover:opacity-50" style={{ color: "rgba(255,255,255,0.5)" }} />
      <span className="text-base">{ot?.icon}</span>
      <span className="flex-1 text-sm text-white">{layer.name}</span>
      <button onClick={onToggleVis} className="p-1 rounded hover:bg-white/5">
        {layer.visible ? <Eye className="w-3.5 h-3.5" style={{ color: "#a78bfa" }} /> : <EyeOff className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.2)" }} />}
      </button>
      <button onClick={onToggleLock} className="p-1 rounded hover:bg-white/5">
        {layer.locked ? <Lock className="w-3.5 h-3.5" style={{ color: "#f97316" }} /> : <Unlock className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.2)" }} />}
      </button>
      <button onClick={onDelete} className="p-1 rounded hover:bg-red-500/10 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

const SCREENS = ["Tela 1", "Tela 2", "Tela 3", "Tela 4", "Tela 5"];

export default function LayoutEditor() {
  const { user } = useAuth();
  const [activeScreen, setActiveScreen] = useState(0);
  const [layers, setLayers] = useState<Layer[][]>([DEFAULT_LAYERS, [], [], [], []]);
  const [showAddOverlay, setShowAddOverlay] = useState(false);

  const currentLayers = layers[activeScreen];
  const overlayUrl = `${BASE}/overlay/${user?.tiktokUsername ?? "seulive"}?type=layout&screen=${activeScreen + 1}&session=${user?.id ?? "demo"}`;

  function updateLayers(updated: Layer[]) {
    setLayers(prev => prev.map((l, i) => i === activeScreen ? updated : l));
  }

  function addLayer(type: string) {
    const ot = OVERLAY_TYPES.find(o => o.id === type)!;
    updateLayers([...currentLayers, { id: crypto.randomUUID(), name: ot.label, type, visible: true, locked: false }]);
    setShowAddOverlay(false);
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #3b82f6, #7c3aed)" }}>
          <Monitor className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full" style={{ background: "rgba(167,139,250,0.15)", color: "#a78bfa" }}>LAYOUT OBS</span>
            <Badge className="text-[10px] px-2 py-0.5" style={{ background: "rgba(249,115,22,0.15)", color: "#f97316", border: "none" }}>PRO</Badge>
          </div>
          <h1 className="text-xl font-bold text-white">Editor de Layout</h1>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Combine sobreposições em múltiplas telas para o OBS.</p>
        </div>
      </div>

      {/* Screen tabs */}
      <div className="flex gap-1 p-1 rounded-xl overflow-x-auto" style={{ background: "rgba(255,255,255,0.04)" }}>
        {SCREENS.map((s, i) => (
          <button key={i} onClick={() => setActiveScreen(i)}
            className="flex-1 min-w-[80px] flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-medium transition-all"
            style={{
              background: i === activeScreen ? "rgba(124,58,237,0.3)" : "transparent",
              color: i === activeScreen ? "#a78bfa" : "rgba(255,255,255,0.35)",
            }}>
            <Monitor className="w-3.5 h-3.5" /> {s}
            {layers[i].length > 0 && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(124,58,237,0.3)", color: "#a78bfa" }}>{layers[i].length}</span>}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        {/* Canvas preview */}
        <div className="rounded-xl min-h-[300px] relative overflow-hidden flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.8)", border: "1px solid rgba(255,255,255,0.06)", aspectRatio: "16/9" }}>
          <div className="absolute inset-0">
            {currentLayers.filter(l => l.visible).map((layer, i) => {
              const ot = OVERLAY_TYPES.find(o => o.id === layer.type);
              return (
                <div key={layer.id} className="absolute flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                  style={{ top: 16 + i * 44, left: 16, background: "rgba(124,58,237,0.25)", border: "1px solid rgba(124,58,237,0.4)", color: "#c4b5fd" }}>
                  <span>{ot?.icon}</span> {layer.name}
                </div>
              );
            })}
            {currentLayers.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2" style={{ color: "rgba(255,255,255,0.15)" }}>
                <Layers className="w-8 h-8" />
                <p className="text-sm">Nenhuma camada nesta tela</p>
              </div>
            )}
          </div>
          <div className="absolute bottom-2 right-2 text-[10px] font-bold px-2 py-1 rounded" style={{ background: "rgba(0,0,0,0.6)", color: "rgba(255,255,255,0.3)" }}>
            1920×1080
          </div>
        </div>

        {/* Layers panel */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-white flex items-center gap-1.5">
              <Layers className="w-4 h-4" style={{ color: "#a78bfa" }} /> Camadas
            </p>
            <Button size="sm" variant="ghost" onClick={() => setShowAddOverlay(v => !v)} className="gap-1 text-xs">
              <Plus className="w-3.5 h-3.5" /> Adicionar
            </Button>
          </div>

          {showAddOverlay && (
            <div className="rounded-xl p-2 space-y-1" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
              {OVERLAY_TYPES.map(o => (
                <button key={o.id} onClick={() => addLayer(o.id)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left hover:bg-white/5 transition-colors">
                  <span>{o.icon}</span>
                  <span style={{ color: "rgba(255,255,255,0.7)" }}>{o.label}</span>
                </button>
              ))}
            </div>
          )}

          <div className="space-y-1.5">
            {currentLayers.map(layer => (
              <LayerItem key={layer.id} layer={layer}
                onToggleVis={() => updateLayers(currentLayers.map(l => l.id === layer.id ? { ...l, visible: !l.visible } : l))}
                onToggleLock={() => updateLayers(currentLayers.map(l => l.id === layer.id ? { ...l, locked: !l.locked } : l))}
                onDelete={() => updateLayers(currentLayers.filter(l => l.id !== layer.id))} />
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "rgba(255,255,255,0.3)" }}>Link OBS — {SCREENS[activeScreen]}</p>
        <OverlayLink url={overlayUrl} />
        <p className="text-[11px] mt-2" style={{ color: "rgba(255,255,255,0.25)" }}>OBS Browser Source 1920×1080</p>
      </div>
    </div>
  );
}
