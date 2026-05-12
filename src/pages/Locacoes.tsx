import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  formatCurrency,
  formatDate,
  situacaoLabel,
  situacaoColor,
  calcularDiasCobrados,
} from "@/lib/calculos";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Search,
  Pencil,
  FileText,
  Trash2,
  RefreshCcw,
  Receipt,
} from "lucide-react";
import ActionGuard from "@/components/ActionGuard";
import { useBillingAccess } from "@/hooks/useBillingAccess";
import { DiaNaoCobrado } from "@/types";

type ClienteLocacao = {
  nome_completo?: string | null;
};

type ItemLocacao = {
  id: string;
  equipamento_id: string;
  quantidade_locada: number | string;
  valor_diaria_fechado?: number | string | null;
  data_inicio_cobranca?: string | null;
};

type LocacaoListItem = {
  id: string;
  numero_contrato?: number | string | null;
  situacao?: string | null;
  data_inicio?: string | null;
  data_previsao_entrega?: string | null;
  valor_total_final?: number | string | null;
  valor_total_pago?: number | string | null;
  valor_desconto?: number | string | null;
  taxa_entrega?: number | string | null;
  cobrar_domingo?: boolean | null;
  clientes?: ClienteLocacao | null;
  itens_locacao?: ItemLocacao[] | null;
};

export default function LocacoesPage() {
  const navigate = useNavigate();
  const { blockedByBilling } = useBillingAccess();

  const [locacoes, setLocacoes] = useState<LocacaoListItem[]>([]);
  const [search, setSearch] = useState("");
  const [filtro, setFiltro] = useState<"ativo" | "todos">("ativo");
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [renewingId, setRenewingId] = useState<string | null>(null);

  useEffect(() => {
    void fetchLocacoes();
  }, []);

  async function fetchLocacoes() {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("locacoes")
        .select("*, clientes(*), itens_locacao(*)")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Erro ao carregar locações:", error);
        toast.error("Erro ao carregar locações");
        return;
      }

      setLocacoes(((data as LocacaoListItem[]) || []).filter(Boolean));
    } catch (error) {
      console.error("Erro inesperado ao carregar locações:", error);
      toast.error("Erro inesperado ao carregar locações");
    } finally {
      setLoading(false);
    }
  }

  function handleEdit(id: string) {
    if (blockedByBilling) {
      toast.error("Plano vencido. Não é possível editar locações.");
      return;
    }

    navigate(`/alugueis/${id}/editar`);
  }

  function handlePrintContract(id: string) {
    navigate(`/alugueis/${id}/contrato`);
  }

  function handlePrintComprovante(id: string) {
    navigate(`/alugueis/${id}/comprovante`);
  }

  async function handleRenew(locacao: LocacaoListItem) {
    if (blockedByBilling) {
      toast.error("Plano vencido. Não é possível renovar locações.");
      return;
    }

    if (locacao.situacao !== "ativo") {
      toast.error("Só é possível renovar locações ativas.");
      return;
    }

    const novaData = window.prompt(
      `Informe a nova data de devolução para a locação #${locacao.numero_contrato} (AAAA-MM-DD):`,
      locacao.data_previsao_entrega || ""
    );

    if (!novaData) return;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(novaData)) {
      toast.error("Data inválida. Use o formato AAAA-MM-DD.");
      return;
    }

    if (!locacao.data_previsao_entrega || !locacao.data_inicio) {
      toast.error("Locação sem datas válidas para renovação.");
      return;
    }

    if (novaData <= locacao.data_previsao_entrega) {
      toast.error("A nova data precisa ser maior que a data atual de devolução.");
      return;
    }

    try {
      setRenewingId(locacao.id);

      const { data: diasData, error: diasError } = await supabase
        .from("dias_nao_cobrados")
        .select("*")
        .eq("ativo", true);

      if (diasError) {
        console.error("Erro ao buscar dias não cobrados:", diasError);
        toast.error("Erro ao calcular renovação");
        return;
      }

      const diasNaoCobrados = (diasData as DiaNaoCobrado[]) || [];

      const subtotalItens = (locacao.itens_locacao || []).reduce((acc, item) => {
        const inicioItem = item.data_inicio_cobranca || locacao.data_inicio || "";
        const dias = calcularDiasCobrados(
          new Date(inicioItem + "T12:00:00"),
          new Date(novaData + "T12:00:00"),
          diasNaoCobrados,
          !!locacao.cobrar_domingo
        );

        return (
          acc +
          Number(item.quantidade_locada || 0) *
            Number(item.valor_diaria_fechado || 0) *
            dias
        );
      }, 0);

      const novoTotal =
        subtotalItens +
        Number(locacao.taxa_entrega || 0) -
        Number(locacao.valor_desconto || 0);

      const { error: updateError } = await supabase
        .from("locacoes")
        .update({
          data_previsao_entrega: novaData,
          valor_total_final: novoTotal,
        })
        .eq("id", locacao.id);

      if (updateError) {
        console.error("Erro ao renovar locação:", updateError);
        toast.error("Erro ao renovar locação");
        return;
      }

      toast.success("Locação renovada com sucesso!");
      await fetchLocacoes();
    } catch (error) {
      console.error("Erro inesperado ao renovar locação:", error);
      toast.error("Erro inesperado ao renovar locação");
    } finally {
      setRenewingId(null);
    }
  }

  async function handleDelete(locacao: LocacaoListItem) {
    if (blockedByBilling) {
      toast.error("Plano vencido. Não é possível excluir locações.");
      return;
    }

    const confirmou = window.confirm(
      `Deseja realmente excluir a locação #${locacao.numero_contrato ?? ""}?`
    );

    if (!confirmou) return;

    try {
      setDeletingId(locacao.id);

      for (const item of locacao.itens_locacao || []) {
        const { data: eq, error: eqError } = await supabase
          .from("equipamentos")
          .select("quantidade_disponivel")
          .eq("id", item.equipamento_id)
          .maybeSingle();

        if (eqError) {
          console.error("Erro ao consultar estoque:", eqError);
          continue;
        }

        if (eq) {
          const { error: estoqueError } = await supabase
            .from("equipamentos")
            .update({
              quantidade_disponivel:
                Number(eq.quantidade_disponivel) +
                Number(item.quantidade_locada || 0),
            })
            .eq("id", item.equipamento_id);

          if (estoqueError) {
            console.error("Erro ao restaurar estoque:", estoqueError);
          }
        }
      }

      const { error: deleteItensError } = await supabase
        .from("itens_locacao")
        .delete()
        .eq("locacao_id", locacao.id);

      if (deleteItensError) {
        console.error("Erro ao excluir itens da locação:", deleteItensError);
        toast.error("Erro ao excluir itens da locação");
        return;
      }

      const { error: deleteLocacaoError } = await supabase
        .from("locacoes")
        .delete()
        .eq("id", locacao.id);

      if (deleteLocacaoError) {
        console.error("Erro ao excluir locação:", deleteLocacaoError);
        toast.error("Erro ao excluir locação");
        return;
      }

      toast.success("Locação excluída com sucesso!");
      await fetchLocacoes();
    } catch (error) {
      console.error("Erro inesperado ao excluir locação:", error);
      toast.error("Erro inesperado ao excluir locação");
    } finally {
      setDeletingId(null);
    }
  }

  const filtered = useMemo(() => {
    const term = search.toLowerCase();

    return locacoes.filter((l) => {
      const matchBusca =
        String(l.numero_contrato ?? "").toLowerCase().includes(term) ||
        (l.clientes?.nome_completo || "").toLowerCase().includes(term) ||
        String(l.situacao ?? "").toLowerCase().includes(term);

      const matchFiltro = filtro === "todos" ? true : l.situacao === "ativo";

      return matchBusca && matchFiltro;
    });
  }, [locacoes, search, filtro]);

  return (
    <Layout>
      <div className="animate-fade-in space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Aluguéis</h1>
          <p className="text-muted-foreground">
            Gerencie as locações da sua locadora
          </p>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            className="rounded-[30px] pl-10"
            placeholder="Buscar por contrato, cliente ou situação..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            variant={filtro === "ativo" ? "default" : "outline"}
            className="rounded-[30px]"
            onClick={() => setFiltro("ativo")}
          >
            Em aberto
          </Button>

          <Button
            type="button"
            variant={filtro === "todos" ? "default" : "outline"}
            className="rounded-[30px]"
            onClick={() => setFiltro("todos")}
          >
            Todos
          </Button>
        </div>

        <div className="space-y-3">
          {loading ? (
            <p className="py-8 text-center text-muted-foreground">Carregando...</p>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              Nenhuma locação encontrada.
            </p>
          ) : (
            filtered.map((l) => (
              <div
                key={l.id}
                className="rounded-[30px] border border-border bg-card p-5 transition-all hover:border-primary/30"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <p className="font-semibold text-foreground">
                        #{l.numero_contrato ?? "-"}
                      </p>

                      <Badge className={situacaoColor(l.situacao ?? "")}>
                        {situacaoLabel(l.situacao ?? "")}
                      </Badge>
                    </div>

                    <p className="text-sm text-muted-foreground">
                      Cliente: {l.clientes?.nome_completo || "Sem cliente"}
                    </p>

                    <p className="text-sm text-muted-foreground">
                      {formatDate(l.data_inicio || "")} →{" "}
                      {formatDate(l.data_previsao_entrega || "")}
                    </p>

                    <p className="text-sm text-muted-foreground">
                      Total: {formatCurrency(Number(l.valor_total_final || 0))}
                    </p>

                    {Number(l.valor_total_pago || 0) > 0 && (
                      <p className="text-sm text-success">
                        Entrada: {formatCurrency(Number(l.valor_total_pago || 0))}
                      </p>
                    )}

                    {!!l.itens_locacao?.length && (
                      <p className="text-xs text-muted-foreground">
                        Itens: {l.itens_locacao.length}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <ActionGuard fallbackLabel="Edição bloqueada">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => handleEdit(l.id)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </ActionGuard>

                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => handlePrintContract(l.id)}
                    >
                      <FileText className="h-4 w-4" />
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => handlePrintComprovante(l.id)}
                    >
                      <Receipt className="h-4 w-4" />
                    </Button>

                    <ActionGuard fallbackLabel="Renovação bloqueada">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => handleRenew(l)}
                        disabled={renewingId === l.id}
                      >
                        <RefreshCcw className="h-4 w-4" />
                      </Button>
                    </ActionGuard>

                    <ActionGuard fallbackLabel="Exclusão bloqueada">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => handleDelete(l)}
                        disabled={deletingId === l.id}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </ActionGuard>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}