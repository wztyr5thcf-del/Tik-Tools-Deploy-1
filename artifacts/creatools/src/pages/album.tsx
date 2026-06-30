import { useState } from "react";
import { Image, Upload, Trash2, Eye, Star, Grid, List, Download, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface AlbumItem {
  id: string;
  name: string;
  emoji: string;
  width: number;
  height: number;
  category: string;
  starred: boolean;
  createdAt: string;
}

const MOCK_ITEMS: AlbumItem[] = [
  { id: "1", name: "Banner Campanha", emoji: "🖼️", width: 1920, height: 1080, category: "Banners", starred: true, createdAt: "28/06" },
  { id: "2", name: "QR Code WhatsApp", emoji: "📱", width: 800, height: 800, category: "QR Codes", starred: false, createdAt: "27/06" },
  { id: "3", name: "Logo TIKSCAN", emoji: "🎨", width: 512, height: 512, category: "Logos", starred: true, createdAt: "25/06" },
  { id: "4", name: "Vinheta Abertura", emoji: "🎬", width: 1920, height: 1080, category: "Vídeos", starred: false, createdAt: "24/06" },
  { id: "5", name: "Thumbnail Live", emoji: "📸", width: 1280, height: 720, category: "Thumbnails", starred: false, createdAt: "23/06" },
  { id: "6", name: "Foto de Perfil", emoji: "👤", width: 400, height: 400, category: "Fotos", starred: false, createdAt: "21/06" },
];

const CATEGORIES = ["Todos", "Banners", "QR Codes", "Logos", "Vídeos", "Thumbnails", "Fotos"];

export default function Album() {
  const [items, setItems] = useState<AlbumItem[]>(MOCK_ITEMS);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [category, setCategory] = useState("Todos");
  const [search, setSearch] = useState("");

  const filtered = items.filter(item =>
    (category === "Todos" || item.category === category) &&
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  function toggleStar(id: string) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, starred: !i.starred } : i));
  }

  function deleteItem(id: string) {
    setItems(prev => prev.filter(i => i.id !== id));
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #ec4899, #f97316)" }}>
            <Image className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full" style={{ background: "rgba(167,139,250,0.15)", color: "#a78bfa" }}>FERRAMENTAS</span>
            </div>
            <h1 className="text-xl font-bold text-white">Álbum</h1>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Biblioteca de imagens e mídias para usar nas lives.</p>
          </div>
        </div>
        <Button className="gap-1.5 shrink-0" style={{ background: "#7c3aed" }}>
          <Upload className="w-4 h-4" /> Enviar Arquivo
        </Button>
      </div>

      {/* Upload zone */}
      <div className="rounded-xl border-2 border-dashed p-8 text-center cursor-pointer hover:border-purple-500/50 transition-colors"
        style={{ borderColor: "rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.02)" }}>
        <Upload className="w-8 h-8 mx-auto mb-3" style={{ color: "rgba(255,255,255,0.2)" }} />
        <p className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.3)" }}>Arraste arquivos aqui ou clique para enviar</p>
        <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.15)" }}>PNG, JPG, GIF, MP4 · Max 50MB</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..."
          className="w-48" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "white" }} />
        <div className="flex gap-1 flex-wrap flex-1">
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setCategory(c)}
              className="text-xs px-3 py-1.5 rounded-lg font-medium"
              style={{ background: category === c ? "rgba(124,58,237,0.3)" : "rgba(255,255,255,0.05)", color: category === c ? "#a78bfa" : "rgba(255,255,255,0.4)" }}>
              {c}
            </button>
          ))}
        </div>
        <div className="flex gap-1 p-1 rounded-lg" style={{ background: "rgba(255,255,255,0.05)" }}>
          <button onClick={() => setViewMode("grid")} className="p-1.5 rounded-md transition-colors"
            style={{ background: viewMode === "grid" ? "rgba(124,58,237,0.3)" : "transparent", color: viewMode === "grid" ? "#a78bfa" : "rgba(255,255,255,0.35)" }}>
            <Grid className="w-4 h-4" />
          </button>
          <button onClick={() => setViewMode("list")} className="p-1.5 rounded-md transition-colors"
            style={{ background: viewMode === "list" ? "rgba(124,58,237,0.3)" : "transparent", color: viewMode === "list" ? "#a78bfa" : "rgba(255,255,255,0.35)" }}>
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {viewMode === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {filtered.map(item => (
            <div key={item.id} className="group rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
              <div className="h-32 flex items-center justify-center relative" style={{ background: "rgba(0,0,0,0.4)" }}>
                <span className="text-4xl">{item.emoji}</span>
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button className="p-1.5 rounded-lg hover:bg-white/10 text-white"><Eye className="w-4 h-4" /></button>
                  <button className="p-1.5 rounded-lg hover:bg-white/10 text-white"><Download className="w-4 h-4" /></button>
                  <button onClick={() => deleteItem(item.id)} className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="p-3 flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white truncate">{item.name}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>{item.width}×{item.height} · {item.createdAt}</p>
                </div>
                <button onClick={() => toggleStar(item.id)}>
                  <Star className="w-3.5 h-3.5" style={{ color: item.starred ? "#f59e0b" : "rgba(255,255,255,0.2)", fill: item.starred ? "#f59e0b" : "none" }} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(item => (
            <div key={item.id} className="flex items-center gap-3 px-4 py-3 rounded-xl group"
              style={{ border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
              <span className="text-xl">{item.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">{item.name}</p>
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>{item.category} · {item.width}×{item.height} · {item.createdAt}</p>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="p-1.5 rounded-lg hover:bg-white/5" style={{ color: "rgba(255,255,255,0.5)" }}><Eye className="w-3.5 h-3.5" /></button>
                <button className="p-1.5 rounded-lg hover:bg-white/5" style={{ color: "rgba(255,255,255,0.5)" }}><Download className="w-3.5 h-3.5" /></button>
                <button onClick={() => toggleStar(item.id)} className="p-1.5 rounded-lg hover:bg-white/5">
                  <Star className="w-3.5 h-3.5" style={{ color: item.starred ? "#f59e0b" : "rgba(255,255,255,0.3)", fill: item.starred ? "#f59e0b" : "none" }} />
                </button>
                <button onClick={() => deleteItem(item.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <Image className="w-10 h-10 mx-auto mb-3" style={{ color: "rgba(255,255,255,0.1)" }} />
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.2)" }}>Nenhuma mídia encontrada</p>
        </div>
      )}
    </div>
  );
}
