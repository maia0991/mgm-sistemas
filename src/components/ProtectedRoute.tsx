import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { AppRole } from "@/types";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: AppRole[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { session, role, loading } = useAuth();
  const denied = useRef(false);

  const isBlocked = allowedRoles && role && !allowedRoles.includes(role);

  useEffect(() => {
    if (!loading && session && isBlocked && !denied.current) {
      denied.current = true;
      toast.error("Acesso Negado — Você não tem permissão para acessar esta área.", { duration: 4000 });
    }
  }, [loading, session, isBlocked]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="gradient-primary flex h-12 w-12 items-center justify-center rounded-xl animate-pulse">
            <span className="text-lg font-bold text-primary-foreground">M</span>
          </div>
          <p className="text-sm text-muted-foreground animate-pulse">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (isBlocked) {
    if (role === "cliente") return <Navigate to="/meus-alugueis" replace />;
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
