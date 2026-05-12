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
import ComprovanteLocacao from "./pages/ComprovanteLocacao.tsx";
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
            <Route path="/login" element={<Login />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/mgm-admin" element={<AdminLoginPage />} />
            <Route path="/admin" element={<Navigate to="/login" replace />} />

            <Route
              path="/admin-dashboard"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin-locadoras"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminLocadoras />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin-pagamentos"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminPagamentos />
                </ProtectedRoute>
              }
            />

            <Route
              path="/"
              element={
                <ProtectedRoute allowedRoles={["locadora"]}>
                  <Index />
                </ProtectedRoute>
              }
            />
            <Route
              path="/produtos"
              element={
                <ProtectedRoute allowedRoles={["locadora"]}>
                  <Equipamentos />
                </ProtectedRoute>
              }
            />
            <Route
              path="/clientes"
              element={
                <ProtectedRoute allowedRoles={["locadora"]}>
                  <Clientes />
                </ProtectedRoute>
              }
            />
            <Route
              path="/novo-aluguel"
              element={
                <ProtectedRoute allowedRoles={["locadora"]}>
                  <NovaLocacao />
                </ProtectedRoute>
              }
            />
            <Route
              path="/alugueis"
              element={
                <ProtectedRoute
                  allowedRoles={["locadora"]}
                  allowPartialBlock
                >
                  <Locacoes />
                </ProtectedRoute>
              }
            />
            <Route
              path="/alugueis/:id/editar"
              element={
                <ProtectedRoute allowedRoles={["locadora"]}>
                  <EditarLocacao />
                </ProtectedRoute>
              }
            />
            <Route
              path="/alugueis/:id/contrato"
              element={
                <ProtectedRoute
                  allowedRoles={["locadora"]}
                  allowPartialBlock
                >
                  <Contrato />
                </ProtectedRoute>
              }
            />
            <Route
              path="/alugueis/:id/comprovante"
              element={
                <ProtectedRoute
                  allowedRoles={["locadora"]}
                  allowPartialBlock
                >
                  <ComprovanteLocacao />
                </ProtectedRoute>
              }
            />
            <Route
              path="/devolucao"
              element={
                <ProtectedRoute
                  allowedRoles={["locadora"]}
                  allowPartialBlock
                >
                  <Devolucao />
                </ProtectedRoute>
              }
            />
            <Route
              path="/financeiro"
              element={
                <ProtectedRoute allowedRoles={["locadora"]}>
                  <Financeiro />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dias-nao-cobrados"
              element={
                <ProtectedRoute allowedRoles={["locadora"]}>
                  <Feriados />
                </ProtectedRoute>
              }
            />
            <Route
              path="/relatorios"
              element={
                <ProtectedRoute allowedRoles={["locadora"]}>
                  <Relatorios />
                </ProtectedRoute>
              }
            />
            <Route
              path="/backup"
              element={
                <ProtectedRoute allowedRoles={["locadora"]}>
                  <Backup />
                </ProtectedRoute>
              }
            />
            <Route
              path="/configuracoes"
              element={
                <ProtectedRoute allowedRoles={["locadora"]}>
                  <Configuracoes />
                </ProtectedRoute>
              }
            />
            <Route
              path="/perfil-empresa"
              element={
                <ProtectedRoute allowedRoles={["locadora"]}>
                  <PerfilEmpresa />
                </ProtectedRoute>
              }
            />

            <Route
              path="/locacoes/:id/contrato"
              element={
                <ProtectedRoute
                  allowedRoles={["locadora"]}
                  allowPartialBlock
                >
                  <Contrato />
                </ProtectedRoute>
              }
            />
            <Route
              path="/locacoes/:id/comprovante"
              element={
                <ProtectedRoute
                  allowedRoles={["locadora"]}
                  allowPartialBlock
                >
                  <ComprovanteLocacao />
                </ProtectedRoute>
              }
            />

            <Route
              path="/equipamentos"
              element={<Navigate to="/produtos" replace />}
            />
            <Route
              path="/locacoes"
              element={<Navigate to="/alugueis" replace />}
            />
            <Route
              path="/locacoes/nova"
              element={<Navigate to="/novo-aluguel" replace />}
            />
            <Route
              path="/feriados"
              element={<Navigate to="/dias-nao-cobrados" replace />}
            />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;