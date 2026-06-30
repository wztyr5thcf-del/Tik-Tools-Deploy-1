import { useState } from "react";
import { Zap, Plus, Trash2, Play, Volume2, Image, Layers, Bell, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { OverlayLink } from "./overlay-item-base";
import { useAuth } from "@/context/auth-context";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Acao {
  id: string;
  nome: string;
  tipo: string;
  trigger: string;
  valor: string;
  ativo: boolean;
}

const TIPOS_ACAO = [
  { id: "alerta", label: "Mostrar Alerta", icon: "🔔" },
  { id: "audio", label: "Tocar Áudio", icon: "🔊" },
  { id: "imagem", label: "Mostrar Imagem", icon: "🖼️" },
  { id: "animacao", label: "Mostrar Animação", icon: "✨" },
  { id: "texto", label: "Mostrar Texto", icon: "📝" },
];

const TRIGGERS = [
  { id: "gift", label: "Presente" },
  { id: "follow", label: "Follow" },
  { id: "share", label: "Share" },
  { id: "like", label: "Like" },
  { id: "join", label: "Entrou na live" },
  { id: "subscribe", label: "Subscribe" },
];

const DEFAULT_ACOES: Acao[] = [
  { id: "1", nome: "Alerta de Gift", tipo: "alerta", trigger: "gift", valor: "1", ativo: true },
  { id: "2", nome: "Som de Follow", tipo: "audio", trigger: "follow", valor: "", ativo: true },
  { id: "3", nome: "Banner de Share", tipo: "alerta", trigger: "share", valor: "", ativo: false },
];

function AcaoCard({ acao, onDelete, onToggle }: { acao: Acao; onDelete: () => void; onToggle: (v: boolean) => void }) {
  const [open, setOpen] = useState(false);
  const tipo = TIPOS_ACAO.find(t => t.id === acao.tipo);
  const trigger = TRIGGERS.find(t => t.id === acao.trigger);
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="text-lg">{tipo?.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{acao.nome}</p>
          <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
            {tipo?.label} · ao <span className="text-purple-400">{trigger?.label}</span>
          </p>
        </div>
        <Switch checked={acao.ativo} onCheckedChange={onToggle} />
        <button onClick={() => setOpen(v => !v)} className="p-1.5 rounded-lg hover:bg-white/5" style={{ color: "rgba(255,255,255,0.35)" }}>
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      {open && (
        <div className="px-4 pb-4 grid grid-cols-2 gap-3 border-t" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
          <div className="space-y-1.5">
            <Label className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Nome</Label>
            <Input defaultValue={acao.nome} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white", fontSize: 13 }} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Mínimo de presentes</Label>
            <Input defaultValue={acao.valor} placeholder="1" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white", fontSize: 13 }} />
          </div>
        </div>
      )}
    </div>
  );
}

export default function Events() {
  const { user } = useAuth();
  const overlayUrl = `${BASE}/overlay/${user?.tiktokUsername ?? "seulive"}?type=events&session=${user?.id ?? "demo"}`;
  const [acoes, setAcoes] = useState<Acao[]>(DEFAULT_ACOES);
  const [showNew, setShowNew] = useState(false);
  const [newNome, setNewNome] = useState("");
  const [newTipo, setNewTipo] = useState("alerta");
  const [newTrigger, setNewTrigger] = useState("gift");

  function addAcao() {
    if (!newNome.trim()) return;
    setAcoes(a => [...a, { id: crypto.randomUUID(), nome: newNome, tipo: newTipo, trigger: newTrigger, valor: "1", ativo: true }]);
    setNewNome(""); setShowNew(false);
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #a855f7, #3b82f6)" }}>
          <Zap className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full" style={{ background: "rgba(167,139,250,0.15)", color: "#a78bfa" }}>EVENTOS</span>
            <Badge className="text-[10px] px-2 py-0.5" style={{ background: "rgba(249,115,22,0.15)", color: "#f97316", border: "none" }}>PRO</Badge>
          </div>
          <h1 className="text-xl font-bold text-white mt-0.5">Ações & Eventos</h1>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Configure ações automáticas acionadas por eventos da live.</p>
        </div>
      </div>

      <Tabs defaultValue="acoes">
        <TabsList style={{ background: "rgba(255,255,255,0.05)" }}>
          <TabsTrigger value="acoes">⚡ Ações</TabsTrigger>
          <TabsTrigger value="triggers">🎯 Eventos (Triggers)</TabsTrigger>
          <TabsTrigger value="overlay">🖥️ Tela de Sobreposição</TabsTrigger>
        </TabsList>

        <TabsContent value="acoes" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>{acoes.length} ações configuradas</p>
            <Button size="sm" onClick={() => setShowNew(true)} className="gap-1.5" style={{ background: "#7c3aed" }}>
              <Plus className="w-3.5 h-3.5" /> Nova Ação
            </Button>
          </div>

          {showNew && (
            <div className="rounded-xl p-4 space-y-3" style={{ border: "1px solid rgba(124,58,237,0.3)", background: "rgba(124,58,237,0.05)" }}>
              <p className="text-sm font-semibold text-white">Nova Ação</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5 col-span-2">
                  <Label className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Nome da ação</Label>
                  <Input value={newNome} onChange={e => setNewNome(e.target.value)} placeholder="Ex: Som de gift rosa"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white" }} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Tipo de ação</Label>
                  <select value={newTipo} onChange={e => setNewTipo(e.target.value)}
                    className="w-full text-sm rounded-lg px-3 py-2"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white" }}>
                    {TIPOS_ACAO.map(t => <option key={t.id} value={t.id} style={{ background: "#1a1625" }}>{t.icon} {t.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Disparar quando</Label>
                  <select value={newTrigger} onChange={e => setNewTrigger(e.target.value)}
                    className="w-full text-sm rounded-lg px-3 py-2"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white" }}>
                    {TRIGGERS.map(t => <option key={t.id} value={t.id} style={{ background: "#1a1625" }}>{t.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={addAcao} style={{ background: "#7c3aed" }}>Criar Ação</Button>
                <Button size="sm" variant="ghost" onClick={() => setShowNew(false)}>Cancelar</Button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {acoes.map(a => (
              <AcaoCard key={a.id} acao={a}
                onDelete={() => setAcoes(prev => prev.filter(x => x.id !== a.id))}
                onToggle={v => setAcoes(prev => prev.map(x => x.id === a.id ? { ...x, ativo: v } : x))} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="triggers" className="space-y-3 mt-4">
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Configure pontos necessários para cada trigger.</p>
          <div className="space-y-2">
            {TRIGGERS.map(t => (
              <div key={t.id} className="flex items-center justify-between px-4 py-3 rounded-xl"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <span className="text-sm text-white">{t.label}</span>
                <div className="flex items-center gap-2">
                  <Input defaultValue="1" className="w-20 text-center text-sm h-8"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white" }} />
                  <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>vezes</span>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="overlay" className="space-y-4 mt-4">
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Link do overlay de eventos para adicionar no OBS.</p>
          <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <OverlayLink url={overlayUrl} />
            <p className="text-[11px] mt-2" style={{ color: "rgba(255,255,255,0.25)" }}>OBS Browser Source 1920×1080</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
