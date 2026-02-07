import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

import AuthPage from "@/pages/auth";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import ModuleSteps from "@/pages/module-steps";
import Quiz from "@/pages/quiz";

// Redirect component for /app/modules/:id → /app/modules/:id/learn
function ModuleRedirect() {
  const [, setLocation] = useLocation();
  const path = window.location.pathname;
  useEffect(() => {
    setLocation(`${path}/learn`);
  }, [path, setLocation]);
  return null;
}
import AdminDashboard from "@/pages/admin/dashboard";
import AdminModules from "@/pages/admin/modules";
import ModuleEditor from "@/pages/admin/module-editor";
import ModuleBuilder from "@/pages/admin/module-builder";
import StepEditor from "@/pages/admin/step-editor";
import QuizEditor from "@/pages/admin/quiz-editor";
import AdminResults from "@/pages/admin/results";
import AdminUsers from "@/pages/admin/users";
import AdminGroups from "@/pages/admin/groups";
import AdminPathways from "@/pages/admin/pathways";
import NotFound from "@/pages/not-found";

function ProtectedRoute({
  children,
  requireAdmin = false
}: {
  children: React.ReactNode;
  requireAdmin?: boolean;
}) {
  const { isAuthenticated, isLoading, isAdmin } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      setLocation("/auth");
    } else if (!isLoading && requireAdmin && !isAdmin) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access this page.",
        variant: "destructive",
      });
      setTimeout(() => {
        setLocation("/app");
      }, 500);
    }
  }, [isAuthenticated, isLoading, isAdmin, requireAdmin, toast, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/20"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (requireAdmin && !isAdmin) {
    return null;
  }

  return <>{children}</>;
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      <Route path="/">
        {isLoading || !isAuthenticated ? <Landing /> : <Dashboard />}
      </Route>

      <Route path="/auth" component={AuthPage} />

      <Route path="/app">
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      </Route>

      <Route path="/app/modules/:id">
        <ProtectedRoute>
          <ModuleRedirect />
        </ProtectedRoute>
      </Route>

      <Route path="/app/modules/:id/learn">
        <ProtectedRoute>
          <ModuleSteps />
        </ProtectedRoute>
      </Route>

      <Route path="/app/modules/:id/quiz">
        <ProtectedRoute>
          <Quiz />
        </ProtectedRoute>
      </Route>

      <Route path="/admin">
        <ProtectedRoute requireAdmin>
          <AdminDashboard />
        </ProtectedRoute>
      </Route>

      <Route path="/admin/modules">
        <ProtectedRoute requireAdmin>
          <AdminModules />
        </ProtectedRoute>
      </Route>

      <Route path="/admin/modules/:id/edit">
        <ProtectedRoute requireAdmin>
          <ModuleEditor />
        </ProtectedRoute>
      </Route>

      <Route path="/admin/modules/:id/builder">
        <ProtectedRoute requireAdmin>
          <ModuleBuilder />
        </ProtectedRoute>
      </Route>

      <Route path="/admin/modules/:id/steps/edit">
        <ProtectedRoute requireAdmin>
          <StepEditor />
        </ProtectedRoute>
      </Route>

      <Route path="/admin/modules/:id/quiz/edit">
        <ProtectedRoute requireAdmin>
          <QuizEditor />
        </ProtectedRoute>
      </Route>

      <Route path="/admin/results">
        <ProtectedRoute requireAdmin>
          <AdminResults />
        </ProtectedRoute>
      </Route>

      <Route path="/admin/users">
        <ProtectedRoute requireAdmin>
          <AdminUsers />
        </ProtectedRoute>
      </Route>

      <Route path="/admin/groups">
        <ProtectedRoute requireAdmin>
          <AdminGroups />
        </ProtectedRoute>
      </Route>

      <Route path="/admin/pathways">
        <ProtectedRoute requireAdmin>
          <AdminPathways />
        </ProtectedRoute>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="learnhub-theme">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
