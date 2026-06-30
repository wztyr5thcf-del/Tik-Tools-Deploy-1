import { useState, useRef } from "react";
import { Volume2, Plus, Trash2, Upload, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SoundAlert {
  id: string;
  nome: string;
  trigger: string;
  valor: string;
  volume: number;
  ativo: boolean;
  file?: string;
}

const TRIGGERS_SOUND = [
  { id: "gift", label: "🎁 Presente", detail: "Qualquer gift" },
  { id: "follow", label: "👤 Follow", detail: "Novo seguidor" },
  { id: "share", label: "🔗 Share", detail: "Compartilhou" },
  { id: "like", label: "❤️ Like", detail: "100 likes" },
  { id: "join", label: "🚪 Entrou", detail: "Entrou na live" },
  { id: "subscribe", label: "⭐ Subscribe", detail: "Nova inscrição" },
];

const DEFAULT_ALERTS: SoundAlert[] = [
  { id: "1", nome: "Gift Rosa", trigger: "gift", valor: "1", volume: 80, ativo: true },
  { id: "2", nome: "Follow!", trigger: "follow", valor: "", volume: 70, ativo: true },
  { id: "3", nome: "Share Alert", trigger: "share", valor: "", volume: 60, ativo: false },
];

function AlertRow({ alert, onDelete, onToggle, onVolumeChange }: {
  alert: SoundAlert;
  onDelete: () => void;
  onToggle: (v: boolean) => void;
  onVolumeChange: (v: number) => void;
}) {
  const [playing, setPlaying] = useState(false);
  const trigger = TRIGGERS_SOUND.find(t => t.id === alert.trigger);
  return (
    <div className="rounded-xl p-4 space-y-3" style={{ border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
      <div className="flex items-center gap-3">
        <button
          onClick={() => setPlaying(v => !v)}
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors"
          style={{ background: playing ? "rgba(124,58,237,0.3)" : "rgba(255,255,255,0.05)" }}
        >
          {playing ? <Pause className="w-3.5 h-3.5 text-purple-400" /> : <Play className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.5)" }} />}
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white">{alert.nome}</p>
          <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
            {trigger?.label} {alert.valor ? `· min. ${alert.valor}x` : ""}
          </p>
        </div>
        <Switch checked={alert.ativo} onCheckedChange={onToggle} />
        <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      <div className="flex items-center gap-3">
        <Volume2 className="w-3.5 h-3.5 shrink-0" style={{ color: "rgba(255,255,255,0.35)" }} />
        <Slider value={[alert.volume]} min={0} max={100} onValueChange={([v]) => onVolumeChange(v)}
          className="flex-1 [&_[role=slider]]:bg-purple-500 [&_[role=slider]]:border-purple-400" />
        <span className="text-xs font-mono w-8 text-right" style={{ color: "rgba(255,255,255,0.4)" }}>{alert.volume}%</span>
      </div>
    </div>
  );
}

export default function SoundAlerts() {
  const [alerts, setAlerts] = useState<SoundAlert[]>(DEFAULT_ALERTS);
  const [mode, setMode] = useState<"fila" | "simultaneo">("fila");
  const [globalVol, setGlobalVol] = useState(80);
  const [showNew, setShowNew] = useState(false);
  const [newNome, setNewNome] = useState("");
  const [newTrigger, setNewTrigger] = useState("gift");
  const [newValor, setNewValor] = useState("1");

  function addAlert() {
    if (!newNome.trim()) return;
    setAlerts(a => [...a, { id: crypto.randomUUID(), nome: newNome, trigger: newTrigger, valor: newValor, volume: globalVol, ativo: true }]);
    setNewNome(""); setShowNew(false);
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444)" }}>
          <Volume2 className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full" style={{ background: "rgba(167,139,250,0.15)", color: "#a78bfa" }}>FERRAMENTAS</span>
          </div>
          <h1 className="text-xl font-bold text-white">Alertas Sonoros</h1>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Sons automáticos acionados por eventos da live.</p>
        </div>
      </div>

      {/* Global settings */}
      <div className="rounded-xl p-4 grid sm:grid-cols-2 gap-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.3)" }}>Modo de reprodução</Label>
          <div className="flex gap-1 p-1 rounded-lg" style={{ background: "rgba(255,255,255,0.05)" }}>
            {(["fila", "simultaneo"] as const).map(m => (
              <button key={m} onClick={() => setMode(m)}
                className="flex-1 text-xs font-medium py-1.5 rounded-md transition-all"
                style={{ background: mode === m ? "rgba(124,58,237,0.4)" : "transparent", color: mode === m ? "#a78bfa" : "rgba(255,255,255,0.4)" }}>
                {m === "fila" ? "🔃 Fila" : "🎵 Simultâneo"}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between">
            <Label className="text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.3)" }}>Volume Global</Label>
            <span className="text-xs font-mono text-white">{globalVol}%</span>
          </div>
          <Slider value={[globalVol]} min={0} max={100} onValueChange={([v]) => setGlobalVol(v)}
            className="[&_[role=slider]]:bg-orange-500 [&_[role=slider]]:border-orange-400" />
        </div>
      </div>

      <div className="flex justify-between items-center">
        <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>{alerts.length} alertas configurados</p>
        <Button size="sm" onClick={() => setShowNew(true)} className="gap-1.5" style={{ background: "#7c3aed" }}>
          <Plus className="w-3.5 h-3.5" /> Novo Alerta
        </Button>
      </div>

      {showNew && (
        <div className="rounded-xl p-4 space-y-3" style={{ border: "1px solid rgba(124,58,237,0.3)", background: "rgba(124,58,237,0.05)" }}>
          <p className="text-sm font-semibold text-white">Novo Alerta Sonoro</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 col-span-2">
              <Label className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Nome</Label>
              <Input value={newNome} onChange={e => setNewNome(e.target.value)} placeholder="Ex: Som de gift rosa"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white" }} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Evento</Label>
              <select value={newTrigger} onChange={e => setNewTrigger(e.target.value)}
                className="w-full text-sm rounded-lg px-3 py-2"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white" }}>
                {TRIGGERS_SOUND.map(t => <option key={t.id} value={t.id} style={{ background: "#1a1625" }}>{t.label}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Valor mínimo (gifts)</Label>
              <Input value={newValor} onChange={e => setNewValor(e.target.value)} placeholder="1"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white" }} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Arquivo de áudio (.mp3)</Label>
              <div className="flex gap-2">
                <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg text-sm" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.3)" }}>
                  <Upload className="w-3.5 h-3.5" />Nenhum arquivo selecionado
                </div>
                <Button size="sm" variant="outline" className="gap-1.5 shrink-0"><Upload className="w-3.5 h-3.5" />Upload</Button>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={addAlert} style={{ background: "#7c3aed" }}>Criar Alerta</Button>
            <Button size="sm" variant="ghost" onClick={() => setShowNew(false)}>Cancelar</Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {alerts.map(a => (
          <AlertRow key={a.id} alert={a}
            onDelete={() => setAlerts(prev => prev.filter(x => x.id !== a.id))}
            onToggle={v => setAlerts(prev => prev.map(x => x.id === a.id ? { ...x, ativo: v } : x))}
            onVolumeChange={v => setAlerts(prev => prev.map(x => x.id === a.id ? { ...x, volume: v } : x))} />
        ))}
      </div>
    </div>
  );
}
