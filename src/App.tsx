import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AnimatePresence } from "framer-motion";
import { AuthProvider } from "@/contexts/AuthContext";
import NotFound from "@/pages/not-found";
import Lobby from "@/pages/Lobby";
import Sports from "@/pages/Sports";
import Live from "@/pages/Live";
import Vault from "@/pages/Vault";
import { Layout } from "@/components/Layout";
import AdminPanel from "@/pages/admin/AdminPanel";
import AgentPanel from "@/pages/agent/AgentPanel";

const queryClient = new QueryClient();

function CasinoRouter() {
  return (
    <AnimatePresence mode="wait">
      <Switch>
        <Route path="/" component={Lobby} />
        <Route path="/sports" component={Sports} />
        <Route path="/live" component={Live} />
        <Route path="/vault" component={Vault} />
        <Route component={NotFound} />
      </Switch>
    </AnimatePresence>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Switch>
              <Route path="/admin" component={AdminPanel} />
              <Route path="/agent" component={AgentPanel} />
              <Route>
                {() => (
                  <Layout>
                    <CasinoRouter />
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
