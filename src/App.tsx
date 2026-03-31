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
import Usuarios from "./pages/Usuarios.tsx";
import MeusAlugueis from "./pages/MeusAlugueis.tsx";
import MeuPerfil from "./pages/MeuPerfil.tsx";
import Devolucao from "./pages/Devolucao.tsx";
import Financeiro from "./pages/Financeiro.tsx";
import Relatorios from "./pages/Relatorios.tsx";
import Backup from "./pages/Backup.tsx";
import Configuracoes from "./pages/Configuracoes.tsx";
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

            {/* Main system routes */}
            <Route path="/" element={<ProtectedRoute allowedRoles={["admin"]}><Index /></ProtectedRoute>} />
            <Route path="/produtos" element={<ProtectedRoute allowedRoles={["admin"]}><Equipamentos /></ProtectedRoute>} />
            <Route path="/clientes" element={<ProtectedRoute allowedRoles={["admin"]}><Clientes /></ProtectedRoute>} />
            <Route path="/novo-aluguel" element={<ProtectedRoute allowedRoles={["admin"]}><NovaLocacao /></ProtectedRoute>} />
            <Route path="/alugueis" element={<ProtectedRoute allowedRoles={["admin"]}><Locacoes /></ProtectedRoute>} />
            <Route path="/alugueis/:id/editar" element={<ProtectedRoute allowedRoles={["admin"]}><EditarLocacao /></ProtectedRoute>} />
            <Route path="/devolucao" element={<ProtectedRoute allowedRoles={["admin"]}><Devolucao /></ProtectedRoute>} />
            <Route path="/financeiro" element={<ProtectedRoute allowedRoles={["admin"]}><Financeiro /></ProtectedRoute>} />
            <Route path="/dias-nao-cobrados" element={<ProtectedRoute allowedRoles={["admin"]}><Feriados /></ProtectedRoute>} />
            <Route path="/relatorios" element={<ProtectedRoute allowedRoles={["admin"]}><Relatorios /></ProtectedRoute>} />
            <Route path="/backup" element={<ProtectedRoute allowedRoles={["admin"]}><Backup /></ProtectedRoute>} />
            <Route path="/configuracoes" element={<ProtectedRoute allowedRoles={["admin"]}><Configuracoes /></ProtectedRoute>} />
            <Route path="/perfil-empresa" element={<ProtectedRoute allowedRoles={["admin"]}><PerfilEmpresa /></ProtectedRoute>} />
            <Route path="/usuarios" element={<ProtectedRoute allowedRoles={["admin"]}><Usuarios /></ProtectedRoute>} />

            {/* Shared routes */}
            <Route path="/locacoes/:id/contrato" element={<ProtectedRoute><Contrato /></ProtectedRoute>} />

            {/* Client portal routes */}
            <Route path="/meus-alugueis" element={<ProtectedRoute allowedRoles={["cliente"]}><MeusAlugueis /></ProtectedRoute>} />
            <Route path="/meu-perfil" element={<ProtectedRoute allowedRoles={["cliente"]}><MeuPerfil /></ProtectedRoute>} />

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
