import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AdminLayout } from "@/components/AdminLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Tenants from "./pages/Tenants";
import Modules from "./pages/Modules";
import Subscriptions from "./pages/Subscriptions";
import Transactions from "./pages/Transactions";
import AuditLogs from "./pages/AuditLogs";
import SystemSettings from "./pages/SystemSettings";
import NotFound from "./pages/NotFound";
import TenantDetail from "./pages/TenantDetails";
import KnowledgeLibrary from "./pages/KnowledgeLibrary";
import KnowledgeEntryEditor from "./pages/KnowledgeEntryEditor";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <AdminLayout>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/tenants" element={<Tenants />} />
                    <Route path="/tenants/:id" element={<TenantDetail />} />
                    <Route path="/modules" element={<Modules />} />
                    <Route path="/subscriptions" element={<Subscriptions />} />
                    <Route path="/transactions" element={<Transactions />} />
                    <Route path="/audit-logs" element={<AuditLogs />} />
                    <Route path="/settings" element={<SystemSettings />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </AdminLayout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
