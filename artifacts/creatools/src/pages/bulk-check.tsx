import { useState } from "react";
import { useLocation } from "wouter";
import { useBulkLiveCheck } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users, Activity, Loader2, ExternalLink, Radio } from "lucide-react";

export default function BulkCheck() {
  const [, setLocation] = useLocation();
  const [input, setInput] = useState("");
  const [results, setResults] = useState<Array<{
    uniqueId: string;
    isLive: boolean;
    roomId: string | null;
    title: string | null;
    viewerCount: number | null;
  }> | null>(null);

  const bulkCheck = useBulkLiveCheck();

  const parseUsernames = (raw: string): string[] => {
    return raw
      .split(/[\n,]+/)
      .map((u) => u.trim().replace(/^@/, ""))
      .filter((u) => u.length > 0);
  };

  const handleCheck = () => {
    const usernames = parseUsernames(input);
    if (usernames.length === 0) return;

    bulkCheck.mutate(
      { data: { uniqueIds: usernames } },
      {
        onSuccess: (data) => {
          setResults(data as typeof results);
        },
      }
    );
  };

  const liveCount = results?.filter((r) => r.isLive).length ?? 0;
  const offlineCount = results ? results.length - liveCount : 0;

  const sortedResults = results
    ? [...results].sort((a, b) => {
        if (a.isLive === b.isLive) return (b.viewerCount || 0) - (a.viewerCount || 0);
        return a.isLive ? -1 : 1;
      })
    : null;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Bulk Check</h1>
        <p className="text-muted-foreground mt-1">Check live status for multiple creators at once</p>
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Add Usernames
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder={`Enter usernames, one per line or comma-separated:\ncharlidamelio\naddison.rae, khaby.lame\naljazeeraenglish`}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={6}
            className="font-mono text-sm bg-background border-border resize-none"
            data-testid="textarea-usernames"
          />
          <div className="flex items-center gap-3">
            <Button
              onClick={handleCheck}
              disabled={!input.trim() || bulkCheck.isPending}
              data-testid="button-check"
            >
              {bulkCheck.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <Activity className="w-4 h-4 mr-2" />
                  Check {parseUsernames(input).length > 0 ? `${parseUsernames(input).length} ` : ""}Creators
                </>
              )}
            </Button>
            {results && (
              <span className="text-sm text-muted-foreground font-mono">
                {liveCount} live / {offlineCount} offline
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {sortedResults && sortedResults.length > 0 && (
        <div className="space-y-4">
          {/* Summary row */}
          <div className="flex gap-4">
            <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-green-400/10 border border-green-400/20">
              <Radio className="w-4 h-4 text-green-400 animate-pulse" />
              <span className="text-green-400 font-mono font-bold">{liveCount}</span>
              <span className="text-xs text-muted-foreground">LIVE</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/30 border border-border">
              <span className="w-2 h-2 rounded-full bg-muted-foreground" />
              <span className="text-muted-foreground font-mono font-bold">{offlineCount}</span>
              <span className="text-xs text-muted-foreground">Offline</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {sortedResults.map((creator) => (
              <Card
                key={creator.uniqueId}
                className={`bg-card border transition-colors ${
                  creator.isLive
                    ? "border-green-400/30 hover:border-green-400/60"
                    : "border-border opacity-70"
                }`}
                data-testid={`card-creator-${creator.uniqueId}`}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="relative shrink-0">
                    <Avatar className="w-10 h-10 border border-border">
                      <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                        {creator.uniqueId.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card ${
                        creator.isLive ? "bg-green-400" : "bg-muted-foreground"
                      }`}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">@{creator.uniqueId}</span>
                      {creator.isLive && (
                        <Badge className="text-xs px-1.5 py-0 bg-green-400/15 text-green-400 border-green-400/30 shrink-0">
                          LIVE
                        </Badge>
                      )}
                    </div>
                    {creator.isLive ? (
                      <div className="flex items-center gap-3 mt-0.5">
                        {creator.viewerCount !== null && (
                          <span className="flex items-center gap-1 text-xs text-cyan-400 font-mono">
                            <Users className="w-3 h-3" />
                            {creator.viewerCount.toLocaleString()}
                          </span>
                        )}
                        {creator.title && (
                          <span className="text-xs text-muted-foreground truncate">{creator.title}</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground mt-0.5 block">Offline</span>
                    )}
                  </div>

                  {creator.isLive && (
                    <div className="flex gap-1 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-xs border-green-400/30 text-green-400 hover:bg-green-400/10"
                        onClick={() => setLocation(`/monitor/${creator.uniqueId}`)}
                        data-testid={`button-monitor-${creator.uniqueId}`}
                      >
                        Monitor
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {sortedResults && sortedResults.length === 0 && (
        <Card className="bg-card border-border border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <ExternalLink className="w-8 h-8 mb-3 text-muted" />
            <p className="text-sm">No results returned. Check usernames and try again.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
