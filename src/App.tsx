import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index.tsx";
import Login from "./pages/Login.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import Clientes from "./pages/Clientes.tsx";
import Equipamentos from "./pages/Equipamentos.tsx";
import Locacoes from "./pages/Locacoes.tsx";
import NovaLocacao from "./pages/NovaLocacao.tsx";
import Contrato from "./pages/Contrato.tsx";
import EditarLocacao from "./pages/EditarLocacao.tsx";
import PerfilEmpresa from "./pages/PerfilEmpresa.tsx";
import Feriados from "./pages/Feriados.tsx";
import Devolucao from "./pages/Devolucao.tsx";
import Financeiro from "./pages/Financeiro.tsx";
import Relatorios from "./pages/Relatorios.tsx";
import Backup from "./pages/Backup.tsx";
import Configuracoes from "./pages/Configuracoes.tsx";
import AdminDashboard from "./pages/AdminDashboard.tsx";
import AdminLocadoras from "./pages/AdminLocadoras.tsx";
import AdminPagamentos from "./pages/AdminPagamentos.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

function AdminLoginPage() {
  return <Login adminMode />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/mgm-admin" element={<AdminLoginPage />} />
            <Route path="/admin" element={<Navigate to="/login" replace />} />

            {/* Admin (MGM owner) routes */}
            <Route path="/admin-dashboard" element={<ProtectedRoute allowedRoles={["admin"]}><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin-locadoras" element={<ProtectedRoute allowedRoles={["admin"]}><AdminLocadoras /></ProtectedRoute>} />
            <Route path="/admin-pagamentos" element={<ProtectedRoute allowedRoles={["admin"]}><AdminPagamentos /></ProtectedRoute>} />

            {/* Locadora (cliente) routes */}
            <Route path="/" element={<ProtectedRoute allowedRoles={["cliente"]}><Index /></ProtectedRoute>} />
            <Route path="/produtos" element={<ProtectedRoute allowedRoles={["cliente"]}><Equipamentos /></ProtectedRoute>} />
            <Route path="/clientes" element={<ProtectedRoute allowedRoles={["cliente"]}><Clientes /></ProtectedRoute>} />
            <Route path="/novo-aluguel" element={<ProtectedRoute allowedRoles={["cliente"]}><NovaLocacao /></ProtectedRoute>} />
            <Route path="/alugueis" element={<ProtectedRoute allowedRoles={["cliente"]}><Locacoes /></ProtectedRoute>} />
            <Route path="/alugueis/:id/editar" element={<ProtectedRoute allowedRoles={["cliente"]}><EditarLocacao /></ProtectedRoute>} />
            <Route path="/devolucao" element={<ProtectedRoute allowedRoles={["cliente"]}><Devolucao /></ProtectedRoute>} />
            <Route path="/financeiro" element={<ProtectedRoute allowedRoles={["cliente"]}><Financeiro /></ProtectedRoute>} />
            <Route path="/dias-nao-cobrados" element={<ProtectedRoute allowedRoles={["cliente"]}><Feriados /></ProtectedRoute>} />
            <Route path="/relatorios" element={<ProtectedRoute allowedRoles={["cliente"]}><Relatorios /></ProtectedRoute>} />
            <Route path="/backup" element={<ProtectedRoute allowedRoles={["cliente"]}><Backup /></ProtectedRoute>} />
            <Route path="/configuracoes" element={<ProtectedRoute allowedRoles={["cliente"]}><Configuracoes /></ProtectedRoute>} />
            <Route path="/perfil-empresa" element={<ProtectedRoute allowedRoles={["cliente"]}><PerfilEmpresa /></ProtectedRoute>} />

            {/* Shared routes */}
            <Route path="/locacoes/:id/contrato" element={<ProtectedRoute><Contrato /></ProtectedRoute>} />

            {/* Legacy redirects */}
            <Route path="/equipamentos" element={<Navigate to="/produtos" replace />} />
            <Route path="/locacoes" element={<Navigate to="/alugueis" replace />} />
            <Route path="/locacoes/nova" element={<Navigate to="/novo-aluguel" replace />} />
            <Route path="/feriados" element={<Navigate to="/dias-nao-cobrados" replace />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
