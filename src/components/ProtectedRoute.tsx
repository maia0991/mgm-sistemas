import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { AppRole } from "@/types";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: AppRole[];
  allowPartialBlock?: boolean;
}

export default function ProtectedRoute({
  children,
  allowedRoles,
  allowPartialBlock = false,
}: ProtectedRouteProps) {
  const { session, role, loading, bloqueioParcial } = useAuth();
  const location = useLocation();

  const denied = useRef(false);
  const partialDenied = useRef(false);

  const hasRoleRestriction = !!allowedRoles && allowedRoles.length > 0;

  const isBlockedByRole =
    hasRoleRestriction &&
    (!role || !allowedRoles.includes(role));

  const isBlockedByPartial =
    role === "locadora" &&
    bloqueioParcial &&
    !allowPartialBlock;

  useEffect(() => {
    if (!loading && session && isBlockedByRole && !denied.current) {
      denied.current = true;
      toast.error("Acesso negado. Você não tem permissão para acessar esta área.", {
        duration: 4000,
      });
    }

    if (!isBlockedByRole) {
      denied.current = false;
    }
  }, [loading, session, isBlockedByRole]);

  useEffect(() => {
    if (!loading && session && isBlockedByPartial && !partialDenied.current) {
      partialDenied.current = true;
      toast.error(
        "Seu acesso está parcialmente bloqueado. Apenas baixas/devoluções estão liberadas.",
        {
          duration: 4000,
        }
      );
    }

    if (!isBlockedByPartial) {
      partialDenied.current = false;
    }
  }, [loading, session, isBlockedByPartial, location.pathname]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="gradient-primary flex h-12 w-12 animate-pulse items-center justify-center rounded-xl">
            <span className="text-lg font-bold text-primary-foreground">M</span>
          </div>
          <p className="animate-pulse text-sm text-muted-foreground">
            Carregando...
          </p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (isBlockedByRole) {
    if (role === "admin") {
      return <Navigate to="/admin-dashboard" replace />;
    }

    if (role === "locadora") {
      return <Navigate to="/" replace />;
    }

    return <Navigate to="/login" replace />;
  }

  if (isBlockedByPartial) {
    return <Navigate to="/devolucao" replace />;
  }

  return <>{children}</>;
}