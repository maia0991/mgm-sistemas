import AvisoFinanceiro from "./AvisoFinanceiro";
import Topbar from "./Topbar";
import { useAuth } from "@/contexts/AuthContext";
import { ReactNode } from "react";

export default function Layout({ children }: { children: ReactNode }) {
  const { role, loading } = useAuth();
  const isAdmin = role === "admin";

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {isAdmin && (
        <div className="fixed left-0 right-0 top-0 z-[60] h-[2px] bg-gradient-to-r from-primary via-accent to-primary opacity-80" />
      )}

      <Topbar />
      <AvisoFinanceiro />

      <main className="min-h-screen px-6 py-6 pt-28">
        {children}
      </main>
    </div>
  );
}