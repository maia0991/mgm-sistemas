import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  ChevronDown,
  Package,
  Users,
  FileText,
  Settings,
  BarChart3,
  CalendarOff,
  HardDrive,
  ArrowDownToLine,
  LogOut,
  Building2,
  DollarSign,
  Shield,
  CreditCard,
  AlertTriangle,
} from "lucide-react";

type MenuLink = {
  to: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
};

type MenuItem = {
  label: string;
  links: MenuLink[];
};

const clienteMenus: MenuItem[] = [
  {
    label: "Cadastros",
    links: [
      { to: "/clientes", label: "Clientes", icon: Users },
      { to: "/produtos", label: "Produtos", icon: Package },
      { to: "/perfil-empresa", label: "Perfil da Empresa", icon: Building2 },
    ],
  },
  {
    label: "Faturamento",
    links: [
      { to: "/novo-aluguel", label: "Novo Aluguel", icon: FileText },
      { to: "/alugueis", label: "Aluguéis", icon: FileText },
      { to: "/devolucao", label: "Devolução", icon: ArrowDownToLine },
      { to: "/financeiro", label: "Financeiro", icon: DollarSign },
    ],
  },
  {
    label: "Utilitários",
    links: [
      { to: "/dias-nao-cobrados", label: "Dias Não Cobrados", icon: CalendarOff },
      { to: "/backup", label: "Backup", icon: HardDrive },
    ],
  },
  {
    label: "Relatórios",
    links: [{ to: "/relatorios", label: "Relatórios", icon: BarChart3 }],
  },
  {
    label: "Configurações",
    links: [{ to: "/configuracoes", label: "Configurações", icon: Settings }],
  },
];

const clienteMenusBloqueioParcial: MenuItem[] = [
  {
    label: "Operações",
    links: [
      { to: "/alugueis", label: "Aluguéis", icon: FileText },
      { to: "/devolucao", label: "Devolução", icon: ArrowDownToLine },
    ],
  },
];

const adminMenus: MenuItem[] = [
  {
    label: "Painel",
    links: [
      { to: "/admin-dashboard", label: "Dashboard", icon: Shield },
      { to: "/admin-locadoras", label: "Locadoras", icon: Building2 },
      { to: "/admin-pagamentos", label: "Pagamentos", icon: CreditCard },
    ],
  },
  {
    label: "Gestão",
    links: [
      { to: "/admin-locadoras", label: "Bloqueios", icon: AlertTriangle },
    ],
  },
];

export default function Topbar() {
  const location = useLocation();
  const { signOut, role, bloqueioParcial, perfil } = useAuth();

  const [nomeEmpresa, setNomeEmpresa] = useState("MGM Sistemas");
  const [logoEmpresa, setLogoEmpresa] = useState<string | null>(null);

  useEffect(() => {
    async function fetchNomeEmpresa() {
      if (role === "admin" || !perfil?.locadora_id) {
        setNomeEmpresa("MGM Sistemas");
        setLogoEmpresa(null);
        return;
      }

      const { data, error } = await supabase
        .from("perfil_empresa")
        .select("nome_empresa, logo_url")
        .eq("locadora_id", perfil.locadora_id)
        .single();

      if (error) {
        console.error("Erro ao buscar nome da empresa:", error);
        setNomeEmpresa("MGM Sistemas");
        setLogoEmpresa(null);
        return;
      }

      const nome = data?.nome_empresa?.trim();
      const logo = data?.logo_url?.trim();

      setNomeEmpresa(nome || "MGM Sistemas");
      setLogoEmpresa(logo || null);
    }

    void fetchNomeEmpresa();
  }, [role, perfil?.locadora_id]);

  const isAdmin = role === "admin";

  const menus = isAdmin
    ? adminMenus
    : bloqueioParcial
    ? clienteMenusBloqueioParcial
    : clienteMenus;

  const homeLink = isAdmin ? "/admin-dashboard" : "/";
  const subtitle = isAdmin ? "Painel Administrativo" : "Gestão de Locações";
  const tituloSistema = isAdmin ? "MGM Sistemas" : nomeEmpresa;
  const temLogo = !!logoEmpresa && logoEmpresa.trim() !== "";

  return (
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-border bg-background">
      <div className="flex h-20 items-center justify-between px-6">
        <Link to={homeLink} className="flex items-center gap-3">
          <div className="bg-primary flex h-10 w-10 items-center justify-center overflow-hidden rounded-full font-bold text-white">
            {temLogo ? (
              <img
                src={`${logoEmpresa}?v=${encodeURIComponent(logoEmpresa || "")}`}
                alt={tituloSistema}
                className="h-full w-full object-cover"
              />
            ) : (
              "M"
            )}
          </div>

          <div>
            <p className="max-w-[220px] truncate font-bold">{tituloSistema}</p>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-6 lg:flex">
          {menus.map((menu) => (
            <div key={menu.label} className="group relative">
              <button
                type="button"
                className="flex items-center gap-1 text-sm font-semibold"
              >
                {menu.label}
                <ChevronDown className="h-4 w-4" />
              </button>

              <div className="invisible absolute top-full mt-3 w-64 rounded-xl border bg-card p-2 opacity-0 shadow-xl transition-all group-hover:visible group-hover:opacity-100">
                {menu.links.map((link) => {
                  const active = location.pathname === link.to;
                  const Icon = link.icon;

                  return (
                    <Link
                      key={link.to}
                      to={link.to}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${
                        active ? "bg-primary/10 text-primary" : "hover:bg-muted"
                      }`}
                    >
                      {Icon ? <Icon className="h-4 w-4" /> : null}
                      {link.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <button
          onClick={signOut}
          className="flex items-center gap-2 text-sm text-destructive"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </div>
    </header>
  );
}