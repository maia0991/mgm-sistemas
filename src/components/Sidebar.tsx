import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard,
  Users,
  Package,
  FileText,
  Calendar,
  Plus,
  LogOut,
  UserCog,
} from "lucide-react";

const adminLinks = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/locacoes/nova", label: "Nova Locação", icon: Plus },
  { to: "/locacoes", label: "Locações", icon: FileText },
  { to: "/clientes", label: "Clientes", icon: Users },
  { to: "/equipamentos", label: "Equipamentos", icon: Package },
  { to: "/feriados", label: "Feriados", icon: Calendar },
  { to: "/usuarios", label: "Usuários", icon: UserCog },
];

export default function Sidebar() {
  const location = useLocation();
  const { signOut, perfil } = useAuth();

  return (
    <aside className="no-print fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-border bg-sidebar">
      <div className="flex h-16 items-center gap-3 border-b border-border px-6">
        <div className="gradient-primary flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold text-primary-foreground">
          M
        </div>
        <span className="text-lg font-bold tracking-tight text-foreground">
          MGM Sistemas
        </span>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {adminLinks.map((link) => {
          const active = location.pathname === link.to;
          return (
            <Link
              key={link.to}
              to={link.to}
              className={cn(
                "flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <link.icon className="h-4 w-4" />
              {link.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border p-4 space-y-3">
        <p className="text-xs text-muted-foreground truncate">{perfil?.email}</p>
        <button
          onClick={signOut}
          className="flex w-full items-center gap-2 rounded-lg px-4 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
        >
          <LogOut className="h-4 w-4" /> Sair
        </button>
      </div>
    </aside>
  );
}
