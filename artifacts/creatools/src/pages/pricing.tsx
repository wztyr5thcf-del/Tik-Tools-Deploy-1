import { Check, X, Zap, Shield, Crown, ExternalLink, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/auth-context";

interface PlanFeature {
  text: string;
  included: boolean;
}

interface Plan {
  id: "sandbox" | "basic" | "pro";
  name: string;
  tikToolsTier: string;
  price: string;
  period: string;
  description: string;
  badge?: string;
  badgeVariant?: "default" | "secondary" | "outline";
  icon: React.ElementType;
  iconColor: string;
  features: PlanFeature[];
  cta: string;
  ctaHref?: string;
  highlight?: boolean;
}

const plans: Plan[] = [
  {
    id: "sandbox",
    name: "Sandbox",
    tikToolsTier: "Sandbox",
    price: "Free",
    period: "",
    description: "Explore TikTok LIVE monitoring with generous limits — no credit card needed.",
    icon: Zap,
    iconColor: "text-chart-3",
    features: [
      { text: "Top live channels (no API key)", included: true },
      { text: "Live status check per user", included: true },
      { text: "Real-time WebSocket events", included: true },
      { text: "Gift catalog & diamond values", included: true },
      { text: "20 API calls / window", included: true },
      { text: "3 concurrent WebSocket sessions", included: true },
      { text: "10-min WebSocket sessions", included: true },
      { text: "Bulk live check (native)", included: false },
      { text: "Viewer counts in bulk results", included: false },
      { text: "User profile data", included: false },
    ],
    cta: "Get started free",
    ctaHref: "https://tik.tools",
  },
  {
    id: "basic",
    name: "Basic+",
    tikToolsTier: "Basic+",
    price: "$19",
    period: "/month",
    description: "Native bulk check, viewer counts, and higher rate limits for growing teams.",
    badge: "Popular",
    badgeVariant: "default",
    icon: Shield,
    iconColor: "text-primary",
    highlight: true,
    features: [
      { text: "Everything in Sandbox", included: true },
      { text: "Native bulk live check", included: true },
      { text: "Viewer counts in bulk results", included: true },
      { text: "Room title in bulk results", included: true },
      { text: "Higher API rate limits", included: true },
      { text: "More concurrent WebSockets", included: true },
      { text: "Priority support", included: true },
      { text: "User profile data", included: false },
      { text: "Follower / video counts", included: false },
      { text: "Bio & social metadata", included: false },
    ],
    cta: "Upgrade to Basic+",
    ctaHref: "https://tik.tools/pricing",
  },
  {
    id: "pro",
    name: "Pro",
    tikToolsTier: "Pro",
    price: "$49",
    period: "/month",
    description: "Full user profile data, unlimited WebSockets, and maximum throughput.",
    badge: "Full access",
    badgeVariant: "secondary",
    icon: Crown,
    iconColor: "text-secondary",
    features: [
      { text: "Everything in Basic+", included: true },
      { text: "User profile endpoint", included: true },
      { text: "Follower & following counts", included: true },
      { text: "Video count & total likes", included: true },
      { text: "Bio & signature metadata", included: true },
      { text: "Maximum API rate limits", included: true },
      { text: "Unlimited WebSocket sessions", included: true },
      { text: "Dedicated support", included: true },
      { text: "SLA guarantee", included: true },
      { text: "Custom integrations", included: true },
    ],
    cta: "Upgrade to Pro",
    ctaHref: "https://tik.tools/pricing",
  },
];

export default function Pricing() {
  const { user } = useAuth();

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary font-medium">
          <Activity className="w-3 h-3" />
          Powered by tik.tools API
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Plans & Pricing</h1>
        <p className="text-muted-foreground">
          Creatools uses the{" "}
          <a
            href="https://tik.tools"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline inline-flex items-center gap-0.5"
          >
            tik.tools API <ExternalLink className="w-3 h-3" />
          </a>{" "}
          for all real-time data. Choose the tier that fits your monitoring needs.
        </p>
      </div>

      {/* Plans grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {plans.map((plan) => {
          const Icon = plan.icon;
          return (
            <Card
              key={plan.id}
              className={`relative flex flex-col bg-card border transition-all ${
                plan.highlight
                  ? "border-primary/50 shadow-lg shadow-primary/10"
                  : "border-border"
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge variant={plan.badgeVariant ?? "default"} className="px-3 py-0.5 text-xs">
                    {plan.badge}
                  </Badge>
                </div>
              )}

              <CardHeader className="pb-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-9 h-9 rounded-lg bg-card border border-border flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${plan.iconColor}`} />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                    <span className="text-xs text-muted-foreground font-mono">tik.tools {plan.tikToolsTier}</span>
                  </div>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  {plan.period && (
                    <span className="text-muted-foreground text-sm">{plan.period}</span>
                  )}
                </div>

                <CardDescription className="text-sm leading-relaxed mt-1">
                  {plan.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="flex flex-col flex-1 gap-6">
                <ul className="space-y-2.5 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature.text} className="flex items-start gap-2.5 text-sm">
                      {feature.included ? (
                        <Check className="w-4 h-4 text-chart-3 mt-0.5 shrink-0" />
                      ) : (
                        <X className="w-4 h-4 text-muted-foreground/50 mt-0.5 shrink-0" />
                      )}
                      <span className={feature.included ? "text-foreground" : "text-muted-foreground/60"}>
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>

                {plan.ctaHref ? (
                  <a href={plan.ctaHref} target="_blank" rel="noopener noreferrer" className="w-full">
                    <Button
                      className="w-full"
                      variant={plan.highlight ? "default" : "outline"}
                    >
                      {plan.cta}
                      <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
                    </Button>
                  </a>
                ) : (
                  <Button
                    className="w-full"
                    variant={plan.highlight ? "default" : "outline"}
                  >
                    {plan.cta}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Current user plan status */}
      {user && (
        <div className="max-w-5xl mx-auto">
          <Card className="bg-card/50 border-border">
            <CardContent className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Your current plan</p>
                <p className="text-xs text-muted-foreground">
                  Logged in as <span className="font-mono">{user.email}</span>
                </p>
              </div>
              <Badge variant="outline" className="capitalize text-sm px-3 py-1">
                {user.plan === "free" ? "Sandbox (Free)" : user.plan === "basic" ? "Basic+" : "Pro"}
              </Badge>
            </CardContent>
          </Card>
        </div>
      )}

      {/* API key note */}
      <div className="max-w-5xl mx-auto text-center text-xs text-muted-foreground space-y-1 pb-4">
        <p>
          After purchasing a tik.tools plan, add your API key in{" "}
          <a href="/settings" className="text-primary hover:underline">Settings</a> to unlock features.
        </p>
        <p>Prices shown are for tik.tools API access — Creatools itself is free to use.</p>
      </div>
    </div>
  );
}
