import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "./pages/dashboard";
import Monitor from "./pages/monitor";
import BulkCheck from "./pages/bulk-check";
import StreamerLookup from "./pages/streamer-lookup";
import StreamerWatchlist from "./pages/streamer-watchlist";
import StreamerJwt from "./pages/streamer-jwt";
import StreamerRateLimits from "./pages/streamer-rate-limits";
import Settings from "./pages/settings";
import GiftGallery from "./pages/gift-gallery";
import Pricing from "./pages/pricing";
import Login from "./pages/login";
import Profile from "./pages/profile";
import Admin from "./pages/admin";
import Leaderboards from "./pages/leaderboards";
import AppLayout from "./components/layout/app-layout";
import { AuthProvider, useAuth } from "./context/auth-context";
import { UIConfigProvider } from "./context/ui-config-context";
import { useEffect } from "react";

const queryClient = new QueryClient();

function Spinner() {
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Redirect to="/login" />;
  return <Component />;
}

function AdminRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Redirect to="/login" />;
  if (!user.isAdmin) return <Redirect to="/" />;
  return <Component />;
}

function GuestRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (user) return <Redirect to="/" />;
  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={() => <GuestRoute component={Login} />} />
      <Route>
        <AppLayout>
          <Switch>
            <Route path="/" component={() => <ProtectedRoute component={Dashboard} />} />
            <Route path="/monitor/:username" component={() => <ProtectedRoute component={Monitor} />} />

            {/* Streamer tools — each as its own page */}
            <Route path="/streamer/lookup" component={() => <ProtectedRoute component={StreamerLookup} />} />
            <Route path="/streamer/bulk-check" component={() => <ProtectedRoute component={BulkCheck} />} />
            <Route path="/streamer/watchlist" component={() => <ProtectedRoute component={StreamerWatchlist} />} />
            <Route path="/streamer/jwt" component={() => <ProtectedRoute component={StreamerJwt} />} />
            <Route path="/streamer/rate-limits" component={() => <ProtectedRoute component={StreamerRateLimits} />} />

            {/* Legacy redirects */}
            <Route path="/bulk-check" component={() => <Redirect to="/streamer/bulk-check" />} />
            <Route path="/streamers" component={() => <Redirect to="/streamer/lookup" />} />

            <Route path="/gift-gallery" component={() => <ProtectedRoute component={GiftGallery} />} />
            <Route path="/pricing" component={Pricing} />
            <Route path="/profile" component={() => <ProtectedRoute component={Profile} />} />
            <Route path="/settings" component={() => <ProtectedRoute component={Settings} />} />

            <Route path="/leaderboards" component={() => <ProtectedRoute component={Leaderboards} />} />

            {/* Admin — hard-gated: non-admins are redirected to / */}
            <Route path="/admin" component={() => <AdminRoute component={Admin} />} />

            <Route component={NotFound} />
          </Switch>
        </AppLayout>
      </Route>
    </Switch>
  );
}

function App() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <UIConfigProvider>
          <AuthProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
            <Toaster />
          </AuthProvider>
        </UIConfigProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
