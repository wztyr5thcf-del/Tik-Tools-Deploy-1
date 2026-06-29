import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { useMintJwt, useGetRoomInfo, useGetGiftCatalog, getGetGiftCatalogQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MessageCircle, Gift, Heart, UserPlus, Share2, Users,
  Wifi, WifiOff, Loader2, ArrowLeft, ExternalLink, RefreshCw, Diamond,
} from "lucide-react";

type EventType = "chat" | "gift" | "like" | "member" | "follow" | "share" | "roomInfo" | "roomUserSeq" | string;

interface LiveEvent {
  id: string;
  event: EventType;
  timestamp: Date;
  user?: { nickname?: string; uniqueId?: string; payGrade?: number; level?: number };
  comment?: string;
  giftName?: string;
  giftId?: string;
  repeatCount?: number;
  diamondCount?: number;
  likeCount?: number;
}

interface TopGifter {
  userId: string;
  nickname: string;
  diamonds: number;
  giftCount: number;
}

type ConnStatus = "idle" | "connecting" | "connected" | "disconnected" | "error";

const EVENT_COLORS: Record<string, string> = {
  chat: "text-cyan-400",
  gift: "text-yellow-400",
  like: "text-pink-400",
  member: "text-green-400",
  follow: "text-violet-400",
  share: "text-blue-400",
};

const EVENT_ICONS: Record<string, React.ElementType> = {
  chat: MessageCircle,
  gift: Gift,
  like: Heart,
  member: UserPlus,
  follow: UserPlus,
  share: Share2,
};

const EVENT_LABELS: Record<string, string> = {
  chat: "CHAT",
  gift: "GIFT",
  like: "LIKE",
  member: "JOIN",
  follow: "FOLLOW",
  share: "SHARE",
};

function formatEvent(ev: LiveEvent): string {
  switch (ev.event) {
    case "chat": return ev.comment || "";
    case "gift": return `sent ${ev.giftName || "a gift"}${ev.repeatCount && ev.repeatCount > 1 ? ` x${ev.repeatCount}` : ""}${ev.diamondCount ? ` — ${ev.diamondCount.toLocaleString()} diamonds` : ""}`;
    case "like": return `liked x${ev.likeCount || 1}`;
    case "member": return "joined the stream";
    case "follow": return "followed";
    case "share": return "shared the stream";
    default: return "";
  }
}

export default function Monitor() {
  const { username } = useParams<{ username: string }>();
  const [, setLocation] = useLocation();
  const [searchInput, setSearchInput] = useState(username || "");
  const [activeUsername, setActiveUsername] = useState(username || "");
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [connStatus, setConnStatus] = useState<ConnStatus>("idle");
  const [viewerCount, setViewerCount] = useState<number | null>(null);
  const [totalDiamonds, setTotalDiamonds] = useState(0);
  const [totalLikes, setTotalLikes] = useState(0);
  const [topGifters, setTopGifters] = useState<TopGifter[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mintJwt = useMintJwt();
  const roomInfo = useGetRoomInfo();
  const { data: giftCatalog } = useGetGiftCatalog({
    query: { queryKey: getGetGiftCatalogQueryKey() }
  });

  // Build a name→icon map from gift catalog for enriching feed events
  const giftIconMap = useRef<Record<string, string>>({});
  const giftDiamondMap = useRef<Record<string, number>>({});
  useEffect(() => {
    if (giftCatalog) {
      for (const g of giftCatalog) {
        giftIconMap.current[g.name.toLowerCase()] = g.iconUrl;
        giftDiamondMap.current[g.name.toLowerCase()] = g.diamondCount;
      }
    }
  }, [giftCatalog]);

  const addEvent = useCallback((ev: LiveEvent) => {
    setEvents((prev) => [ev, ...prev].slice(0, 200));
  }, []);

  const updateTopGifters = useCallback((userId: string, nickname: string, diamonds: number) => {
    setTopGifters((prev) => {
      const existing = prev.find((g) => g.userId === userId);
      if (existing) {
        return prev
          .map((g) => g.userId === userId
            ? { ...g, diamonds: g.diamonds + diamonds, giftCount: g.giftCount + 1 }
            : g
          )
          .sort((a, b) => b.diamonds - a.diamonds)
          .slice(0, 10);
      }
      return [...prev, { userId, nickname, diamonds, giftCount: 1 }]
        .sort((a, b) => b.diamonds - a.diamonds)
        .slice(0, 10);
    });
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnStatus("disconnected");
  }, []);

  const connect = useCallback((user: string, token: string) => {
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
    }

    setConnStatus("connecting");
    const ws = new WebSocket(`wss://api.tik.tools?uniqueId=${encodeURIComponent(user)}&jwtKey=${encodeURIComponent(token)}`);
    wsRef.current = ws;

    ws.onopen = () => setConnStatus("connected");

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data as string);
        const d = msg.data || {};

        if (msg.event === "roomUserSeq") {
          setViewerCount(d.viewerCount ?? null);
          return;
        }
        if (msg.event === "roomInfo") return;

        // Enrich gift diamonds from catalog if not provided in payload
        let diamonds = d.diamondCount ?? 0;
        const giftKey = (d.giftName || "").toLowerCase();
        if (msg.event === "gift" && !diamonds && giftKey) {
          const catalogDiamonds = giftDiamondMap.current[giftKey] ?? 0;
          const repeat = d.repeatCount ?? 1;
          diamonds = catalogDiamonds * repeat;
        }

        const ev: LiveEvent = {
          id: `${Date.now()}-${Math.random()}`,
          event: msg.event,
          timestamp: new Date(),
          user: d.user,
          comment: d.comment,
          giftName: d.giftName,
          giftId: d.giftId,
          repeatCount: d.repeatCount,
          diamondCount: diamonds,
          likeCount: d.likeCount,
        };

        if (msg.event === "like") setTotalLikes((n) => n + (d.likeCount || 1));
        if (msg.event === "gift" && diamonds > 0) {
          setTotalDiamonds((n) => n + diamonds);
          const uid = d.user?.uniqueId || d.user?.userId || "unknown";
          const nick = d.user?.nickname || uid;
          updateTopGifters(uid, nick, diamonds);
        }

        addEvent(ev);
      } catch {}
    };

    ws.onclose = () => {
      setConnStatus("disconnected");
      wsRef.current = null;
      reconnectTimer.current = setTimeout(() => startConnection(user), 5000);
    };

    ws.onerror = () => setConnStatus("error");
  }, [addEvent, updateTopGifters]);

  const startConnection = useCallback((user: string) => {
    if (!user) return;
    setConnStatus("connecting");
    mintJwt.mutate(
      { data: { uniqueId: user } },
      {
        onSuccess: (data) => {
          connect(user, data.token);
          roomInfo.mutate({ data: { uniqueId: user } });
        },
        onError: () => setConnStatus("error"),
      }
    );
  }, [mintJwt, connect, roomInfo]);

  useEffect(() => {
    if (activeUsername) {
      setEvents([]);
      setTotalDiamonds(0);
      setTotalLikes(0);
      setTopGifters([]);
      setViewerCount(null);
      startConnection(activeUsername);
    }
    return () => { disconnect(); };
  }, [activeUsername]);

  const handleMonitor = (e: React.FormEvent) => {
    e.preventDefault();
    const user = searchInput.trim().replace(/^@/, "");
    if (!user) return;
    setLocation(`/monitor/${user}`);
    setActiveUsername(user);
  };

  const statusConfig = {
    idle: { label: "Idle", color: "text-muted-foreground", dot: "bg-muted-foreground" },
    connecting: { label: "Connecting...", color: "text-yellow-400", dot: "bg-yellow-400 animate-pulse" },
    connected: { label: "LIVE", color: "text-green-400", dot: "bg-green-400 animate-pulse" },
    disconnected: { label: "Reconnecting...", color: "text-orange-400", dot: "bg-orange-400 animate-pulse" },
    error: { label: "Error", color: "text-destructive", dot: "bg-destructive" },
  };

  const status = statusConfig[connStatus];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header row */}
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => setLocation("/")} className="w-fit">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Dashboard
        </Button>

        <form onSubmit={handleMonitor} className="flex gap-2 flex-1 max-w-lg">
          <Input
            placeholder="TikTok username..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="font-mono text-sm bg-card border-border"
          />
          <Button type="submit" disabled={!searchInput.trim() || connStatus === "connecting"}>
            {connStatus === "connecting" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Monitor"}
          </Button>
        </form>

        {activeUsername && (
          <div className="flex items-center gap-2">
            <span className={`flex items-center gap-1.5 text-sm font-medium ${status.color}`}>
              <span className={`w-2 h-2 rounded-full ${status.dot}`} />
              {status.label}
            </span>
            {(connStatus === "disconnected" || connStatus === "error") && (
              <Button size="sm" variant="outline" onClick={() => startConnection(activeUsername)}>
                <RefreshCw className="w-3 h-3 mr-1" />
                Retry
              </Button>
            )}
            {connStatus === "connected" && (
              <Button size="sm" variant="outline" onClick={disconnect}>Disconnect</Button>
            )}
          </div>
        )}
      </div>

      {activeUsername ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left sidebar */}
          <div className="space-y-4">
            {/* Stream info */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Stream Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {roomInfo.data ? (
                  <>
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10 border border-border">
                        <AvatarImage src={roomInfo.data.owner?.profilePictureUrl || ""} />
                        <AvatarFallback className="text-xs">{activeUsername.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-semibold text-sm">{roomInfo.data.owner?.nickname || activeUsername}</div>
                        <div className="text-xs text-muted-foreground font-mono">@{roomInfo.data.owner?.uniqueId || activeUsername}</div>
                      </div>
                    </div>
                    {roomInfo.data.title && (
                      <p className="text-xs text-muted-foreground border-l-2 border-primary/40 pl-2 leading-relaxed">{roomInfo.data.title}</p>
                    )}
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    <Skeleton className="w-10 h-10 rounded-full" />
                    <div className="space-y-1">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                )}
                <a
                  href={`https://tiktok.com/@${activeUsername}/live`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <ExternalLink className="w-3 h-3" />
                  Open on TikTok
                </a>
              </CardContent>
            </Card>

            {/* Live stats */}
            <div className="grid grid-cols-3 gap-2">
              <Card className="bg-card border-border">
                <CardContent className="p-3 text-center">
                  <Users className="w-4 h-4 mx-auto mb-1 text-cyan-400" />
                  <div className="text-sm font-bold font-mono text-cyan-400 leading-tight">
                    {viewerCount !== null ? viewerCount.toLocaleString() : "—"}
                  </div>
                  <div className="text-xs text-muted-foreground">Viewers</div>
                </CardContent>
              </Card>
              <Card className="bg-card border-border">
                <CardContent className="p-3 text-center">
                  <Diamond className="w-4 h-4 mx-auto mb-1 text-yellow-400" />
                  <div className="text-sm font-bold font-mono text-yellow-400 leading-tight">
                    {totalDiamonds.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground">Diamonds</div>
                </CardContent>
              </Card>
              <Card className="bg-card border-border">
                <CardContent className="p-3 text-center">
                  <Heart className="w-4 h-4 mx-auto mb-1 text-pink-400" />
                  <div className="text-sm font-bold font-mono text-pink-400 leading-tight">
                    {totalLikes.toLocaleString()}
                  </div>
                  <div className="text-xs text-muted-foreground">Likes</div>
                </CardContent>
              </Card>
            </div>

            {/* Event counts */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Event Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5 pt-0">
                {Object.entries(EVENT_LABELS).map(([key, label]) => {
                  const Icon = EVENT_ICONS[key] || MessageCircle;
                  const count = events.filter((e) => e.event === key).length;
                  return (
                    <div key={key} className="flex items-center justify-between text-xs">
                      <span className={`flex items-center gap-1.5 ${EVENT_COLORS[key] || "text-muted-foreground"}`}>
                        <Icon className="w-3 h-3" />
                        {label}
                      </span>
                      <span className="font-mono text-muted-foreground">{count}</span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Top Gifters leaderboard */}
            {topGifters.length > 0 && (
              <Card className="bg-card border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Diamond className="w-3 h-3 text-yellow-400" />
                    Top Gifters
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 pt-0">
                  {topGifters.map((gifter, i) => (
                    <div key={gifter.userId} className="flex items-center gap-2 text-xs">
                      <span className={`w-4 font-mono font-bold shrink-0 ${i === 0 ? "text-yellow-400" : i === 1 ? "text-slate-300" : i === 2 ? "text-amber-600" : "text-muted-foreground"}`}>
                        {i + 1}
                      </span>
                      <span className="flex-1 truncate text-foreground/90">{gifter.nickname}</span>
                      <span className="font-mono text-yellow-400 shrink-0">{gifter.diamonds.toLocaleString()}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Event Feed */}
          <div className="lg:col-span-2">
            <Card className="bg-card border-border h-full min-h-[500px] flex flex-col">
              <CardHeader className="pb-3 flex-row items-center justify-between">
                <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Live Events Feed
                </CardTitle>
                <Badge
                  variant="outline"
                  className={`text-xs font-mono ${connStatus === "connected" ? "border-green-400/50 text-green-400" : "border-muted text-muted-foreground"}`}
                >
                  {events.length} events
                </Badge>
              </CardHeader>
              <CardContent className="flex-1 p-0">
                <ScrollArea className="h-[500px] lg:h-[640px]">
                  {events.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                      {connStatus === "connecting" ? (
                        <>
                          <Loader2 className="w-8 h-8 animate-spin mb-3 text-primary" />
                          <span className="text-sm">Connecting to @{activeUsername}...</span>
                        </>
                      ) : connStatus === "connected" ? (
                        <>
                          <Wifi className="w-8 h-8 mb-3 text-green-400 animate-pulse" />
                          <span className="text-sm">Waiting for events...</span>
                        </>
                      ) : (
                        <>
                          <WifiOff className="w-8 h-8 mb-3 text-muted" />
                          <span className="text-sm">Not connected</span>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="divide-y divide-border/40">
                      {events.map((ev) => {
                        const color = EVENT_COLORS[ev.event] || "text-muted-foreground";
                        const Icon = EVENT_ICONS[ev.event] || MessageCircle;
                        const label = EVENT_LABELS[ev.event] || ev.event.toUpperCase();
                        const text = formatEvent(ev);
                        const payGrade = ev.user?.payGrade ?? (ev.user as { level?: number })?.level;
                        const giftIcon = ev.giftName ? giftIconMap.current[ev.giftName.toLowerCase()] : null;

                        return (
                          <div
                            key={ev.id}
                            className="flex items-start gap-3 px-4 py-2 hover:bg-muted/10 transition-colors animate-in slide-in-from-top-1 duration-150"
                          >
                            <div className={`mt-0.5 shrink-0 ${color}`}>
                              {giftIcon ? (
                                <img src={giftIcon} alt={ev.giftName} className="w-3.5 h-3.5 object-contain" />
                              ) : (
                                <Icon className="w-3.5 h-3.5" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-baseline gap-1.5 flex-wrap">
                                <span className={`text-xs font-mono font-bold uppercase ${color}`}>{label}</span>
                                <span className="text-xs font-semibold text-foreground/90">
                                  {ev.user?.nickname || ev.user?.uniqueId || "unknown"}
                                  {payGrade ? (
                                    <span className="ml-1 text-xs font-mono text-muted-foreground">lv{payGrade}</span>
                                  ) : null}
                                </span>
                                {text && <span className="text-xs text-muted-foreground truncate flex-1 min-w-0">{text}</span>}
                              </div>
                            </div>
                            <time className="text-xs text-muted-foreground/60 font-mono shrink-0">
                              {ev.timestamp.toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}
                            </time>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <Card className="bg-card border-border border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Wifi className="w-10 h-10 mb-4 text-muted" />
            <p className="text-base font-medium">Enter a TikTok username to start monitoring</p>
            <p className="text-sm mt-1">Real-time events appear here via WebSocket</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
