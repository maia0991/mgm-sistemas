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
  Menu,
  X,
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
      {
        to: "/dias-nao-cobrados",
        label: "Dias Não Cobrados",
        icon: CalendarOff,
      },
      { to: "/backup", label: "Backup", icon: HardDrive },
    ],
  },
  {
    label: "Relatórios",
    links: [{ to: "/relatorios", label: "Relatórios", icon: BarChart3 }],
  },
  {
    label: "Configurações",
    links: [
      { to: "/configuracoes", label: "Configurações", icon: Settings },
    ],
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
      {
        to: "/admin-locadoras",
        label: "Bloqueios",
        icon: AlertTriangle,
      },
    ],
  },
];

export default function Topbar() {
  const location = useLocation();

  const {
    signOut,
    role,
    bloqueioParcial,
    perfil,
    statusFinanceiro,
    diasParaVencimento,
  } = useAuth();

  const [nomeEmpresa, setNomeEmpresa] = useState("MGM Sistemas");
  const [logoEmpresa, setLogoEmpresa] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

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

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const isAdmin = role === "admin";

  const menus = isAdmin
    ? adminMenus
    : bloqueioParcial
    ? clienteMenusBloqueioParcial
    : clienteMenus;

  const homeLink = isAdmin ? "/admin-dashboard" : "/app";

  const subtitle = isAdmin
    ? "Painel Administrativo"
    : "Gestão de Locações";

  const tituloSistema = isAdmin ? "MGM Sistemas" : nomeEmpresa;

  const temLogo = !!logoEmpresa && logoEmpresa.trim() !== "";

  return (
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-border bg-background">
      <div className="flex h-20 items-center justify-between gap-3 px-4 md:px-6">
        <Link to={homeLink} className="flex min-w-0 items-center gap-3">
          <div className="bg-primary flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full font-bold text-white">
            {temLogo ? (
              <img
                src={`${logoEmpresa}?v=${encodeURIComponent(
                  logoEmpresa || ""
                )}`}
                alt={tituloSistema}
                className="h-full w-full object-cover"
              />
            ) : (
              "M"
            )}
          </div>

          <div className="min-w-0">
            <p className="max-w-[190px] truncate font-bold md:max-w-[260px]">
              {tituloSistema}
            </p>

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
                        active
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-muted"
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

        {!isAdmin && (
          <Link
            to="/minhas-faturas"
            className={`hidden items-center gap-2 rounded-[30px] px-4 py-2 text-sm font-bold transition lg:flex ${
              statusFinanceiro === "expired" ||
              statusFinanceiro === "blocked"
                ? "border border-red-500/30 bg-red-500/15 text-red-500"
                : statusFinanceiro === "warning" ||
                  (typeof diasParaVencimento === "number" &&
                    diasParaVencimento <= 3)
                ? "border border-yellow-500/30 bg-yellow-500/15 text-yellow-500"
                : "border border-green-500/30 bg-green-500/15 text-green-500"
            }`}
          >
            {statusFinanceiro === "expired" ||
            statusFinanceiro === "blocked"
              ? "🔴"
              : statusFinanceiro === "warning" ||
                (typeof diasParaVencimento === "number" &&
                  diasParaVencimento <= 3)
              ? "🟡"
              : "🟢"}

            Minhas Faturas
          </Link>
        )}

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-semibold lg:hidden"
          >
            {mobileOpen ? (
              <X className="h-4 w-4" />
            ) : (
              <Menu className="h-4 w-4" />
            )}

            Menu
          </button>

          <button
            onClick={signOut}
            className="hidden items-center gap-2 text-sm text-destructive sm:flex"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="max-h-[calc(100vh-80px)] overflow-auto border-t border-border bg-background px-4 py-4 lg:hidden">
          <div className="space-y-4">
            {menus.map((menu) => (
              <div
                key={menu.label}
                className="rounded-2xl border border-border bg-card p-3"
              >
                <p className="mb-2 text-sm font-bold text-foreground">
                  {menu.label}
                </p>

                <div className="space-y-1">
                  {menu.links.map((link) => {
                    const active = location.pathname === link.to;

                    const Icon = link.icon;

                    return (
                      <Link
                        key={link.to}
                        to={link.to}
                        className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm ${
                          active
                            ? "bg-primary/10 text-primary"
                            : "hover:bg-muted"
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

            {!isAdmin && (
              <Link
                to="/minhas-faturas"
                className={`flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold ${
                  statusFinanceiro === "expired" ||
                  statusFinanceiro === "blocked"
                    ? "border border-red-500/30 bg-red-500/15 text-red-500"
                    : statusFinanceiro === "warning" ||
                      (typeof diasParaVencimento === "number" &&
                        diasParaVencimento <= 3)
                    ? "border border-yellow-500/30 bg-yellow-500/15 text-yellow-500"
                    : "border border-green-500/30 bg-green-500/15 text-green-500"
                }`}
              >
                {statusFinanceiro === "expired" ||
                statusFinanceiro === "blocked"
                  ? "🔴"
                  : statusFinanceiro === "warning" ||
                    (typeof diasParaVencimento === "number" &&
                      diasParaVencimento <= 3)
                  ? "🟡"
                  : "🟢"}

                Minhas Faturas
              </Link>
            )}

            <button
              onClick={signOut}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-destructive/30 px-4 py-3 text-sm font-semibold text-destructive"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </button>
          </div>
        </div>
      )}
    </header>
  );
}