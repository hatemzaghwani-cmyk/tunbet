import { Suspense, lazy } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import NotFound from "@/pages/not-found";
import { Layout } from "@/components/Layout";

const Lobby = lazy(() => import("@/pages/Lobby"));
const Sports = lazy(() => import("@/pages/Sports"));
const Live = lazy(() => import("@/pages/Live"));
const Vault = lazy(() => import("@/pages/Vault"));
const Zenyx = lazy(() => import("@/pages/Zenyx"));
const AdminPanel = lazy(() => import("@/pages/admin/AdminPanel"));
const AgentPanel = lazy(() => import("@/pages/agent/AgentPanel"));

const queryClient = new QueryClient();

function Spinner() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-[#00D1FF] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function CasinoRouter() {
  return (
    <Switch>
      <Route path="/" component={Lobby} />
      <Route path="/sports" component={Sports} />
      <Route path="/live" component={Live} />
      <Route path="/vault" component={Vault} />
      <Route path="/zenyx" component={Zenyx} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Switch>
              <Route path="/admin">
                <Suspense fallback={<Spinner />}>
                  <AdminPanel />
                </Suspense>
              </Route>
              <Route path="/agent">
                <Suspense fallback={<Spinner />}>
                  <AgentPanel />
                </Suspense>
              </Route>
              <Route>
                {() => (
                  <Layout>
                    <Suspense fallback={<Spinner />}>
                      <CasinoRouter />
                    </Suspense>
                  </Layout>
                )}
              </Route>
            </Switch>
          </WouterRouter>
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
