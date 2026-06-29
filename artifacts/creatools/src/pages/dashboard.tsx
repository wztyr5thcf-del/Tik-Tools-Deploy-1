import { useGetTopChannels, getGetTopChannelsQueryKey } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Activity, Users, Star, ArrowRight, Search } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  
  const { data: channels, isLoading } = useGetTopChannels({ 
    query: { queryKey: getGetTopChannelsQueryKey() } 
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Remove @ if present
      const username = searchQuery.trim().replace(/^@/, "");
      setLocation(`/monitor/${username}`);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mission Control</h1>
          <p className="text-muted-foreground mt-1">Real-time global TikTok LIVE overview</p>
        </div>
        
        <form onSubmit={handleSearch} className="flex gap-2 max-w-md w-full md:w-auto">
          <Input 
            placeholder="Check username (e.g. charlidamelio)" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-card border-border font-mono text-sm"
          />
          <Button type="submit" disabled={!searchQuery.trim()}>
            <Search className="w-4 h-4 mr-2" />
            Monitor
          </Button>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Streams</CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-primary">
              {isLoading ? <Skeleton className="h-8 w-16" /> : (channels?.length || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Monitoring in real-time</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Viewers</CardTitle>
            <Users className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-secondary">
              {isLoading ? <Skeleton className="h-8 w-24" /> : 
                (channels?.reduce((acc, curr) => acc + (curr.viewerCount || 0), 0).toLocaleString() || "0")}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Across top channels</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">API Status</CardTitle>
            <Star className="h-4 w-4 text-chart-3" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-chart-3">Operational</div>
            <p className="text-xs text-muted-foreground mt-1">tik.tools connected</p>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <Activity className="w-5 h-5 mr-2 text-primary" />
          Top Live Channels
        </h2>
        
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
          ) : channels?.length === 0 ? (
            <div className="col-span-full py-12 text-center text-muted-foreground bg-card/50 rounded-lg border border-border border-dashed">
              No active channels found right now.
            </div>
          ) : (
            channels?.map((channel) => (
              <Card 
                key={channel.uniqueId} 
                className="bg-card border-border hover:border-primary/50 transition-colors cursor-pointer group"
                onClick={() => setLocation(`/monitor/${channel.uniqueId}`)}
              >
                <CardContent className="p-4 flex items-start gap-4">
                  <div className="relative">
                    <Avatar className="w-12 h-12 border-2 border-primary/20 group-hover:border-primary transition-colors">
                      <AvatarImage src={channel.profilePictureUrl || ""} alt={channel.uniqueId} />
                      <AvatarFallback className="bg-muted text-muted-foreground">
                        {channel.uniqueId.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-chart-3 rounded-full border-2 border-card"></div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <h3 className="font-semibold text-foreground truncate pr-2">
                        {channel.nickname || channel.uniqueId}
                      </h3>
                      <div className="flex items-center text-xs font-mono text-secondary bg-secondary/10 px-2 py-0.5 rounded">
                        <Users className="w-3 h-3 mr-1" />
                        {channel.viewerCount?.toLocaleString() || 0}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">@{channel.uniqueId}</p>
                    <p className="text-sm mt-1 truncate text-foreground/80">{channel.title || "Live Stream"}</p>
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
