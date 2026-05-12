import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import StatCard from "@/components/StatCard";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { DollarSign, AlertTriangle, CheckCircle, Building2 } from "lucide-react";

interface LocadoraPagamento {
  id: string;
  nome: string;
  ativo: boolean;
  bloqueio_parcial?: boolean | null;
  plano?: string | null;
  data_vencimento?: string | null;
  email?: string | null;
  telefone?: string | null;
}

export default function AdminPagamentosPage() {
  const navigate = useNavigate();

  const [locadoras, setLocadoras] = useState<LocadoraPagamento[]>([]);
  const [search, setSearch] = useState("");
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

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", authData.user.id)
        .single();

      if (roleData?.role !== "admin") {
        toast.error("Acesso restrito ao administrador");
        navigate("/", { replace: true });
        return;
      }

      await fetchPagamentos();
    } catch (error) {
      console.error("Erro ao validar acesso:", error);
      toast.error("Erro ao validar acesso");
      navigate("/", { replace: true });
    } finally {
      setCheckingAccess(false);
    }
  }

  async function fetchPagamentos() {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("locadoras")
        .select("id, nome, ativo, bloqueio_parcial, plano, data_vencimento, email, telefone")
        .order("nome");

      if (error) {
        toast.error("Erro ao carregar pagamentos");
        return;
      }

      setLocadoras((data as LocadoraPagamento[]) || []);
    } finally {
      setLoading(false);
    }
  }

  // 🔥 NOVA FUNÇÃO: DAR BAIXA NO PAGAMENTO
  async function marcarComoPago(locadora: LocadoraPagamento) {
    try {
      const novaData = new Date();
      novaData.setDate(novaData.getDate() + 30);

      const { error } = await supabase
        .from("locadoras")
        .update({
          ativo: true,
          bloqueio_parcial: false,
          data_vencimento: novaData.toISOString().split("T")[0],
        })
        .eq("id", locadora.id);

      if (error) {
        toast.error("Erro ao dar baixa");
        return;
      }

      toast.success("Pagamento confirmado!");
      fetchPagamentos();
    } catch (err) {
      console.error(err);
      toast.error("Erro inesperado");
    }
  }

  const hoje = new Date().toISOString().split("T")[0];

  const filtered = useMemo(() => {
    const term = search.toLowerCase();

    return locadoras.filter((l) => {
      return (
        l.nome.toLowerCase().includes(term) ||
        String(l.plano || "").toLowerCase().includes(term) ||
        String(l.email || "").toLowerCase().includes(term)
      );
    });
  }, [locadoras, search]);

  function getStatusPagamento(locadora: LocadoraPagamento) {
    if (!locadora.ativo) {
      return { label: "Bloqueada", className: "bg-destructive/20 text-destructive" };
    }

    if (!locadora.data_vencimento) {
      return { label: "Sem vencimento", className: "bg-muted text-muted-foreground" };
    }

    if (locadora.data_vencimento < hoje) {
      return { label: "Vencido", className: "bg-destructive/20 text-destructive" };
    }

    const diff =
      (new Date(locadora.data_vencimento + "T00:00:00").getTime() -
        new Date(hoje + "T00:00:00").getTime()) /
      (1000 * 60 * 60 * 24);

    if (diff <= 5) {
      return { label: "Vencendo", className: "bg-yellow-500/20 text-yellow-600" };
    }

    return { label: "Em dia", className: "bg-success/20 text-success" };
  }

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
        <h1 className="text-3xl font-bold">Pagamentos</h1>

        <Input
          placeholder="Buscar..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="rounded-[30px] border bg-card p-6">
          {loading ? (
            <p>Carregando...</p>
          ) : (
            <div className="space-y-3">
              {filtered.map((l) => {
                const status = getStatusPagamento(l);

                return (
                  <div
                    key={l.id}
                    className="flex items-center justify-between rounded-2xl bg-secondary p-4"
                  >
                    <div>
                      <p className="font-medium">{l.nome}</p>
                      <p className="text-sm">
                        Plano: {l.plano} • Venc: {l.data_vencimento}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <Badge className={status.className}>{status.label}</Badge>

                      {/* 🔥 BOTÃO NOVO */}
                      <Button
                        size="sm"
                        onClick={() => marcarComoPago(l)}
                      >
                        Pago
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}