import { useGetTopChannels, getGetTopChannelsQueryKey } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Activity, Users, Search, Globe, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQueryClient } from "@tanstack/react-query";

const REGION_LABELS: Record<string, string> = {
  TW: "Taiwan", US: "United States", CA: "Canada", GB: "United Kingdom",
  DE: "Germany", FR: "France", JP: "Japan", KR: "South Korea",
  BR: "Brazil", AU: "Australia", MX: "Mexico", IN: "India",
  TH: "Thailand", ID: "Indonesia", PH: "Philippines", VN: "Vietnam",
  SG: "Singapore", MY: "Malaysia",
};

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRegion, setFilterRegion] = useState<string>("all");
  const queryClient = useQueryClient();

  const { data: channels, isLoading, isFetching } = useGetTopChannels({
    query: {
      queryKey: getGetTopChannelsQueryKey(),
      refetchInterval: 30_000,
    }
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setLocation(`/monitor/${searchQuery.trim().replace(/^@/, "")}`);
    }
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: getGetTopChannelsQueryKey() });
  };

  const regions = channels
    ? Array.from(new Set(channels.map((c) => c.region).filter(Boolean) as string[])).sort()
    : [];

  const filtered = filterRegion === "all"
    ? channels ?? []
    : (channels ?? []).filter((c) => c.region === filterRegion);

  const totalViewers = channels?.reduce((acc, c) => acc + (c.viewerCount ?? 0), 0) ?? 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Hero header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-500/15 via-violet-500/8 to-pink-500/10 border border-white/8 p-6">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,hsl(180_100%_50%/0.08),transparent_60%)] pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs font-semibold text-red-400 uppercase tracking-wider">Live Now</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight gradient-text">Mission Control</h1>
            <p className="text-muted-foreground mt-1 text-sm">Visão global do TikTok LIVE em tempo real</p>
          </div>
          <form onSubmit={handleSearch} className="flex gap-2 max-w-md w-full md:w-auto">
            <Input
              placeholder="Monitorar um username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-background/60 border-border font-mono text-sm backdrop-blur-sm"
            />
            <Button type="submit" disabled={!searchQuery.trim()} className="bg-gradient-to-r from-cyan-500 to-violet-500 hover:from-cyan-400 hover:to-violet-400 text-white border-0 shadow-lg shadow-cyan-500/20">
              <Search className="w-4 h-4 mr-2" />
              Monitor
            </Button>
          </form>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="relative overflow-hidden border-cyan-500/20 bg-gradient-to-br from-cyan-500/8 to-transparent card-glow-cyan">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-500 to-transparent" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Streams Ativos</CardTitle>
            <div className="w-7 h-7 rounded-lg bg-cyan-500/15 flex items-center justify-center">
              <Activity className="h-3.5 w-3.5 text-cyan-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono text-cyan-300">
              {isLoading ? <Skeleton className="h-8 w-16" /> : filtered.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {filterRegion === "all" ? "Ao vivo agora" : `Ao vivo em ${REGION_LABELS[filterRegion] ?? filterRegion}`}
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-violet-500/20 bg-gradient-to-br from-violet-500/8 to-transparent card-glow-violet">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-violet-500 to-transparent" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Viewers</CardTitle>
            <div className="w-7 h-7 rounded-lg bg-violet-500/15 flex items-center justify-center">
              <Users className="h-3.5 w-3.5 text-violet-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono text-violet-300">
              {isLoading ? <Skeleton className="h-8 w-24" /> : totalViewers.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Nos canais em destaque</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-emerald-500/20 bg-gradient-to-br from-emerald-500/8 to-transparent card-glow-green">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 to-transparent" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Regiões</CardTitle>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center">
              <Globe className="h-3.5 w-3.5 text-emerald-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono text-emerald-300">
              {isLoading ? <Skeleton className="h-8 w-12" /> : regions.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Países transmitindo</p>
          </CardContent>
        </Card>
      </div>

      {/* Channel list */}
      <div>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="text-xl font-semibold flex items-center">
            <Activity className="w-5 h-5 mr-2 text-primary" />
            Top Live Channels
          </h2>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Region filter */}
            {regions.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap">
                <button
                  onClick={() => setFilterRegion("all")}
                  className={`text-xs px-2 py-1 rounded font-mono transition-colors ${filterRegion === "all" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}
                >
                  All
                </button>
                {regions.map((r) => (
                  <button
                    key={r}
                    onClick={() => setFilterRegion(r)}
                    className={`text-xs px-2 py-1 rounded font-mono transition-colors ${filterRegion === r ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            )}
            <Button size="sm" variant="ghost" onClick={handleRefresh} disabled={isFetching} className="h-7 px-2">
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {isLoading ? (
            Array(6).fill(0).map((_, i) => (
              <Card key={i} className="bg-card border-border">
                <CardContent className="p-4 flex items-center gap-4">
                  <Skeleton className="w-12 h-12 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </CardContent>
              </Card>
            ))
          ) : filtered.length === 0 ? (
            <div className="col-span-full py-12 text-center text-muted-foreground bg-card/50 rounded-lg border border-border border-dashed">
              {channels?.length === 0
                ? "No active channels found right now."
                : `No channels from ${REGION_LABELS[filterRegion] ?? filterRegion} right now.`}
            </div>
          ) : (
            filtered.map((channel) => (
              <Card
                key={channel.uniqueId}
                className="bg-card border-border hover:border-primary/50 transition-colors cursor-pointer group"
                onClick={() => setLocation(`/monitor/${channel.uniqueId}`)}
              >
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="relative shrink-0">
                    <Avatar className="w-12 h-12 border-2 border-primary/20 group-hover:border-primary transition-colors">
                      <AvatarImage src={channel.profilePictureUrl || ""} alt={channel.uniqueId} />
                      <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                        {channel.uniqueId.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-chart-3 rounded-full border-2 border-card" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-1">
                      <h3 className="font-semibold text-sm text-foreground truncate">
                        {channel.nickname || channel.uniqueId}
                      </h3>
                      <div className="flex items-center gap-1 shrink-0">
                        {channel.region && (
                          <span
                            className="text-xs font-mono text-muted-foreground bg-muted/50 px-1 rounded"
                            title={REGION_LABELS[channel.region] ?? channel.region}
                          >
                            {channel.region}
                          </span>
                        )}
                        <div className="flex items-center text-xs font-mono text-secondary bg-secondary/10 px-1.5 py-0.5 rounded">
                          <Users className="w-3 h-3 mr-1" />
                          {channel.viewerCount?.toLocaleString() ?? 0}
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">@{channel.uniqueId}</p>
                    {channel.title && (
                      <p className="text-xs mt-1 truncate text-foreground/70">{channel.title}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
