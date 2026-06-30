import { useState } from "react";
import { useGetLiveAnalyticsVideoList, useGetLiveAnalyticsVideoDetail, getGetLiveAnalyticsVideoListQueryKey, getGetLiveAnalyticsVideoDetailQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart2, Search, Play, Eye, Heart, Users, TrendingUp, ArrowLeft, Video, Lock, RefreshCw } from "lucide-react";
import { useLocation } from "wouter";

interface VideoEntry {
  video_id?: string;
  title?: string;
  duration?: number;
  viewer_count?: number;
  peak_viewer_count?: number;
  start_time?: number;
  end_time?: number;
  cover_url?: string;
  like_count?: number;
  comment_count?: number;
  new_followers?: number;
  diamonds?: number;
}

interface VideoDetail {
  video_id?: string;
  title?: string;
  total_views?: number;
  peak_viewers?: number;
  avg_viewers?: number;
  new_followers?: number;
  like_count?: number;
  comment_count?: number;
  share_count?: number;
  diamonds?: number;
  duration?: number;
  engagement_rate?: number;
  start_time?: number;
}

function formatDuration(secs?: number): string {
  if (!secs) return "—";
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s}s`;
}

function formatDate(ts?: number): string {
  if (!ts) return "—";
  return new Date(ts * 1000).toLocaleDateString(undefined, {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function StatCard({ icon: Icon, label, value, sub }: { icon: React.ElementType; label: string; value: string | number; sub?: string }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center gap-2 mb-1">
          <Icon className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <p className="text-2xl font-bold">{typeof value === "number" ? value.toLocaleString() : value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export default function LiveAnalytics() {
  const [, nav] = useLocation();
  const [username, setUsername] = useState("");
  const [inputUsername, setInputUsername] = useState("");
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);

  const { data: videoListData, isLoading: loadingList, refetch: refetchList, error: listError } = useGetLiveAnalyticsVideoList(
    { unique_id: username, count: 20 },
    { query: { queryKey: getGetLiveAnalyticsVideoListQueryKey({ unique_id: username, count: 20 }), enabled: !!username, staleTime: 1000 * 60 * 5 } }
  );

  const { data: videoDetailData, isLoading: loadingDetail } = useGetLiveAnalyticsVideoDetail(
    { video_id: selectedVideoId ?? "" },
    { query: { queryKey: getGetLiveAnalyticsVideoDetailQueryKey({ video_id: selectedVideoId ?? "" }), enabled: !!selectedVideoId, staleTime: 1000 * 60 * 5 } }
  );

  const raw = videoListData as { videos?: VideoEntry[]; status_code?: number; error?: string } | undefined;
  const videos: VideoEntry[] = raw?.videos ?? [];
  const detail = videoDetailData as VideoDetail | undefined;

  function handleSearch() {
    const uid = inputUsername.trim().replace(/^@/, "");
    if (!uid) return;
    setUsername(uid);
    setSelectedVideoId(null);
  }

  const cookieWarning = (listError as { response?: { status?: number } } | null)?.response?.status === 401 ||
    (raw as { requires_cookie?: boolean } | undefined)?.requires_cookie;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <BarChart2 className="w-5 h-5 text-primary" />
            <h1 className="text-2xl font-bold">Live Analytics</h1>
          </div>
          <p className="text-muted-foreground text-sm">Historical live stream data — views, gifts, followers, engagement</p>
        </div>
      </div>

      {/* Cookie notice */}
      <Card className="border-amber-500/20 bg-amber-500/5">
        <CardContent className="pt-4">
          <div className="flex gap-2">
            <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-300">Session cookies required</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Live Analytics uses TikTok's internal API. You must be logged into TikTok and provide your session
                cookies via the <code className="bg-muted px-1 rounded">x-tiktok-cookie</code> header. This feature works best with
                your own account data.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
          <Input
            placeholder="username"
            className="pl-7"
            value={inputUsername}
            onChange={(e) => setInputUsername(e.target.value.replace(/^@/, ""))}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
        </div>
        <Button onClick={handleSearch} disabled={!inputUsername.trim()}>
          <Search className="w-4 h-4 mr-2" />Search
        </Button>
        {username && (
          <Button variant="outline" size="icon" onClick={() => refetchList()}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        )}
      </div>

      {!username ? (
        <Card>
          <CardContent className="py-16 text-center">
            <BarChart2 className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Enter a username to view their live stream history</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video list */}
          <div className="lg:col-span-1 space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Past Streams — @{username}</h2>
            {loadingList ? (
              Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))
            ) : videos.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <Video className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">No stream recordings found</p>
                  <p className="text-xs text-muted-foreground mt-1 opacity-60">
                    Cookie authentication may be required
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {videos.map((v) => (
                  <button
                    key={v.video_id}
                    onClick={() => setSelectedVideoId(v.video_id ?? null)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedVideoId === v.video_id
                        ? "bg-primary/10 border-primary/30"
                        : "border-border hover:bg-accent/40"
                    }`}
                  >
                    <p className="text-sm font-medium truncate mb-1">{v.title ?? "Untitled stream"}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                      <span>{formatDate(v.start_time)}</span>
                      <span className="text-border">·</span>
                      <span>{formatDuration(v.duration)}</span>
                      {v.peak_viewer_count !== undefined && (
                        <>
                          <span className="text-border">·</span>
                          <span className="flex items-center gap-0.5">
                            <Eye className="w-3 h-3" />{v.peak_viewer_count.toLocaleString()} peak
                          </span>
                        </>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Detail panel */}
          <div className="lg:col-span-2 space-y-4">
            {!selectedVideoId ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <Play className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">Select a stream to view analytics</p>
                </CardContent>
              </Card>
            ) : loadingDetail ? (
              <div className="grid grid-cols-2 gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h2 className="text-base font-semibold mb-0.5">{detail?.title ?? "Stream Analytics"}</h2>
                  {detail?.start_time && (
                    <p className="text-xs text-muted-foreground">{formatDate(detail.start_time)} · {formatDuration(detail.duration)}</p>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <StatCard icon={Eye} label="Total Views" value={detail?.total_views ?? "—"} />
                  <StatCard icon={Users} label="Peak Viewers" value={detail?.peak_viewers ?? "—"} />
                  <StatCard icon={Users} label="Avg Viewers" value={detail?.avg_viewers ?? "—"} />
                  <StatCard icon={TrendingUp} label="New Followers" value={detail?.new_followers ?? "—"} />
                  <StatCard icon={Heart} label="Likes" value={detail?.like_count ?? "—"} />
                  <StatCard icon={BarChart2} label="Diamonds" value={detail?.diamonds ?? "—"} />
                </div>
                {detail?.engagement_rate !== undefined && (
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Engagement Rate</span>
                        <span className="text-lg font-bold text-primary">{(detail.engagement_rate * 100).toFixed(1)}%</span>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${Math.min(100, (detail.engagement_rate ?? 0) * 100)}%` }}
                        />
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
