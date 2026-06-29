import { useState } from "react";
import { useGetConfig, getGetConfigQueryKey, useSaveConfig, useGetRateLimits, getGetRateLimitsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, AlertCircle, Key, Zap, Wifi, Loader2, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [showKey, setShowKey] = useState(false);

  const { data: config, isLoading: configLoading } = useGetConfig({
    query: { queryKey: getGetConfigQueryKey() },
  });

  const { data: rateLimits, isLoading: rateLimitsLoading } = useGetRateLimits({
    query: { queryKey: getGetRateLimitsQueryKey() },
  });

  const saveConfig = useSaveConfig();

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKeyInput.trim()) return;
    saveConfig.mutate(
      { data: { apiKey: apiKeyInput.trim() } },
      {
        onSuccess: () => {
          setApiKeyInput("");
          queryClient.invalidateQueries({ queryKey: getGetConfigQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetRateLimitsQueryKey() });
          toast({ title: "API key saved", description: "Your tik.tools key has been updated." });
        },
        onError: () => {
          toast({ title: "Failed to save", description: "Could not save API key.", variant: "destructive" });
        },
      }
    );
  };

  const apiUsagePct = rateLimits
    ? Math.max(0, 100 - Math.round(((rateLimits.apiRemaining) / Math.max(rateLimits.apiLimit, 1)) * 100))
    : 0;

  const wsPct = rateLimits
    ? Math.round((rateLimits.wsCurrent / Math.max(rateLimits.wsLimit, 1)) * 100)
    : 0;

  const tierColors: Record<string, string> = {
    free: "border-muted text-muted-foreground",
    sandbox: "border-muted text-muted-foreground",
    basic: "border-cyan-400/50 text-cyan-400",
    pro: "border-violet-400/50 text-violet-400",
    ultra: "border-yellow-400/50 text-yellow-400",
  };

  const tierColor = rateLimits?.tier
    ? (tierColors[rateLimits.tier.toLowerCase()] ?? "border-border text-foreground")
    : "border-border text-foreground";

  return (
    <div className="space-y-8 max-w-2xl animate-in fade-in duration-300">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Configure your tik.tools API connection</p>
      </div>

      {/* API Key Card */}
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-primary" />
            <CardTitle className="text-base">API Key</CardTitle>
          </div>
          <CardDescription>
            Your tik.tools API key. Get one free at{" "}
            <a href="https://tik.tools/pricing" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              tik.tools/pricing
            </a>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {configLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <div className="flex items-center gap-3 p-3 rounded-md bg-background border border-border">
              {config?.apiKeySet ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                  <span className="font-mono text-sm text-muted-foreground flex-1" data-testid="text-api-key-masked">
                    {config.apiKeyMasked || "Key configured"}
                  </span>
                  <Badge variant="outline" className="text-xs border-green-400/30 text-green-400">Active</Badge>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
                  <span className="text-sm text-muted-foreground flex-1">No API key configured</span>
                  <Badge variant="outline" className="text-xs border-destructive/30 text-destructive">Missing</Badge>
                </>
              )}
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-3" data-testid="form-api-key">
            <div className="space-y-1.5">
              <Label htmlFor="api-key" className="text-xs text-muted-foreground uppercase tracking-wider">
                {config?.apiKeySet ? "Update Key" : "Set Key"}
              </Label>
              <div className="relative">
                <Input
                  id="api-key"
                  type={showKey ? "text" : "password"}
                  placeholder="tk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  className="font-mono text-sm bg-background border-border pr-10"
                  data-testid="input-api-key"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 text-muted-foreground"
                  onClick={() => setShowKey(!showKey)}
                >
                  {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </Button>
              </div>
            </div>
            <Button
              type="submit"
              disabled={!apiKeyInput.trim() || saveConfig.isPending}
              data-testid="button-save-key"
            >
              {saveConfig.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save API Key"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Rate Limits Card */}
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            <CardTitle className="text-base">Usage & Rate Limits</CardTitle>
          </div>
          <CardDescription>Current API quota consumption</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {rateLimitsLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : rateLimits ? (
            <>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Tier</span>
                <Badge variant="outline" className={`text-xs uppercase font-mono ${tierColor}`} data-testid="text-tier">
                  {rateLimits.tier}
                </Badge>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Zap className="w-3.5 h-3.5" />
                    API Requests
                  </span>
                  <span className="font-mono text-xs" data-testid="text-api-usage">
                    <span className="text-foreground">{rateLimits.apiRemaining}</span>
                    <span className="text-muted-foreground"> / {rateLimits.apiLimit} remaining</span>
                  </span>
                </div>
                <Progress value={apiUsagePct} className="h-1.5 bg-muted" />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Wifi className="w-3.5 h-3.5" />
                    WebSocket Connections
                  </span>
                  <span className="font-mono text-xs" data-testid="text-ws-usage">
                    <span className="text-foreground">{rateLimits.wsCurrent}</span>
                    <span className="text-muted-foreground"> / {rateLimits.wsLimit} active</span>
                  </span>
                </div>
                <Progress value={wsPct} className="h-1.5 bg-muted" />
              </div>

              {rateLimits.apiResetAt && (
                <p className="text-xs text-muted-foreground font-mono">
                  Resets at {new Date(rateLimits.apiResetAt * 1000).toLocaleTimeString()}
                </p>
              )}
            </>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <AlertCircle className="w-4 h-4" />
              Set an API key to view rate limits
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info */}
      <Card className="bg-card border-border border-dashed">
        <CardContent className="p-4 text-xs text-muted-foreground space-y-1">
          <p><span className="text-foreground font-medium">Creatools</span> is powered by the tik.tools API.</p>
          <p>The free Sandbox tier allows 1 concurrent WebSocket (10-min sessions). Upgrade at tik.tools/pricing for production use.</p>
          <p className="text-muted-foreground/60 pt-1">creatools.co &mdash; Real-time TikTok LIVE monitoring</p>
        </CardContent>
      </Card>
    </div>
  );
}
