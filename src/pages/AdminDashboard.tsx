import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import StatCard from "@/components/StatCard";
import Layout from "@/components/Layout";
import { Building2, DollarSign, AlertTriangle, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Locadora {
  id: string;
  nome: string;
  cnpj: string | null;
  responsavel: string | null;
  ativo: boolean;
  plano: string;
  data_vencimento: string | null;
  created_at: string;
}

export default function AdminDashboard() {
  const navigate = useNavigate();

  const [locadoras, setLocadoras] = useState<Locadora[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingAccess, setCheckingAccess] = useState(true);

  useEffect(() => {
    void checkAccessAndLoad();
  }, []);

  async function checkAccessAndLoad() {
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();

      if (authError || !authData.user) {
        navigate("/login", { replace: true });
        return;
      }

      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", authData.user.id)
        .maybeSingle();

      if (roleError) {
        console.error("Erro ao validar acesso:", roleError);
        toast.error("Erro ao validar acesso");
        navigate("/", { replace: true });
        return;
      }

      if (roleData?.role !== "admin") {
        toast.error("Acesso restrito ao administrador");
        navigate("/", { replace: true });
        return;
      }

      await fetchLocadoras();
    } catch (error) {
      console.error("Erro ao validar acesso:", error);
      toast.error("Erro ao validar acesso");
      navigate("/", { replace: true });
    } finally {
      setCheckingAccess(false);
    }
  }

  async function fetchLocadoras() {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("locadoras")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Erro ao carregar locadoras:", error);
        toast.error("Erro ao carregar locadoras");
        return;
      }

      setLocadoras((data as Locadora[]) || []);
    } catch (error) {
      console.error("Erro inesperado ao carregar dashboard:", error);
      toast.error("Erro inesperado ao carregar dashboard");
    } finally {
      setLoading(false);
    }
  }

  const ativas = locadoras.filter((l) => l.ativo);
  const bloqueadas = locadoras.filter((l) => !l.ativo);
  const hoje = new Date().toISOString().split("T")[0];

  const vencidas = locadoras.filter(
    (l) => l.ativo && l.data_vencimento && l.data_vencimento < hoje
  );

  if (checkingAccess) {
    return (
      <Layout>
        <p className="p-8 text-muted-foreground">Validando acesso...</p>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="animate-fade-in space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Painel Administrativo
          </h1>
          <p className="mt-1 text-muted-foreground">
            Gerencie todas as locadoras clientes do MGM Sistemas
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total de Locadoras"
            value={String(locadoras.length)}
            icon={Building2}
            variant="primary"
          />
          <StatCard
            title="Ativas"
            value={String(ativas.length)}
            icon={CheckCircle}
            variant="success"
          />
          <StatCard
            title="Bloqueadas"
            value={String(bloqueadas.length)}
            icon={AlertTriangle}
            variant="warning"
          />
          <StatCard
            title="Vencidas"
            value={String(vencidas.length)}
            icon={DollarSign}
            variant="default"
          />
        </div>

        {vencidas.length > 0 && (
          <div className="rounded-[30px] border border-destructive/30 bg-destructive/5 p-6">
            <h2 className="mb-4 text-lg font-semibold text-destructive">
              ⚠️ Locadoras com Pagamento Vencido
            </h2>

            <div className="space-y-3">
              {vencidas.map((l) => (
                <div
                  key={l.id}
                  className="flex items-center justify-between rounded-2xl bg-card p-4"
                >
                  <div>
                    <p className="font-medium text-foreground">{l.nome}</p>
                    <p className="text-sm text-muted-foreground">
                      {l.responsavel || "Sem responsável"} • Venceu:{" "}
                      {l.data_vencimento}
                    </p>
                  </div>

                  <Badge className="bg-destructive/20 text-destructive">
                    Vencido
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-[30px] border border-border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold text-foreground">
            Locadoras Recentes
          </h2>

          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : locadoras.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma locadora cadastrada.
            </p>
          ) : (
            <div className="space-y-3">
              {locadoras.slice(0, 10).map((l) => (
                <div
                  key={l.id}
                  className="flex items-center justify-between rounded-2xl bg-secondary p-4"
                >
                  <div>
                    <p className="font-medium text-foreground">{l.nome}</p>
                    <p className="text-sm text-muted-foreground">
                      {l.cnpj || "Sem CNPJ"} • {l.responsavel || "Sem responsável"}
                    </p>
                  </div>

                  <Badge
                    className={
                      l.ativo
                        ? "bg-success/20 text-success"
                        : "bg-destructive/20 text-destructive"
                    }
                  >
                    {l.ativo ? "Ativa" : "Bloqueada"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}