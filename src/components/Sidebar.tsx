import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard,
  Package,
  Users,
  Plus,
  FileText,
  ArrowDownToLine,
  DollarSign,
  CalendarOff,
  BarChart3,
  HardDrive,
  Settings,
  LogOut,
  Building2,
  CreditCard,
} from "lucide-react";

const locadoraLinks = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/produtos", label: "Produtos", icon: Package },
  { to: "/clientes", label: "Clientes", icon: Users },
  { to: "/novo-aluguel", label: "Novo Aluguel", icon: Plus },
  { to: "/alugueis", label: "Aluguéis", icon: FileText },
  { to: "/devolucao", label: "Devolução", icon: ArrowDownToLine },
  { to: "/financeiro", label: "Financeiro", icon: DollarSign },
  { to: "/dias-nao-cobrados", label: "Dias Não Cobrados", icon: CalendarOff },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { to: "/backup", label: "Backup", icon: HardDrive },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
];

const adminLinks = [
  { to: "/admin-dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin-locadoras", label: "Locadoras", icon: Building2 },
  { to: "/admin-pagamentos", label: "Pagamentos", icon: CreditCard },
];

export default function Sidebar() {
  const location = useLocation();
  const { signOut, perfil, role } = useAuth();

  const links = role === "admin" ? adminLinks : locadoraLinks;
  const subtitulo = role === "admin" ? "Painel Master" : "Gestão de Locações";

  return (
    <aside className="no-print fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-primary/30 bg-sidebar shadow-[inset_-1px_0_0_hsl(210_100%_52%/0.15)]">
      <div className="flex h-16 items-center gap-3 border-b border-primary/20 px-6">
        <div className="gradient-primary flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold text-primary-foreground ring-2 ring-primary/30 ring-offset-1 ring-offset-sidebar">
          M
        </div>
        <div>
          <span className="text-lg font-bold tracking-tight text-foreground">MGM Sistemas</span>
          <p className="text-[10px] font-medium text-primary/70 -mt-0.5">{subtitulo}</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 overflow-auto p-4">
        {links.map((link) => {
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
