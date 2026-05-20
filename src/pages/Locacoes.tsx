import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  formatCurrency,
  formatDate,
  situacaoLabel,
  situacaoColor,
  calcularDiasCobrados,
  calcularPeriodosCobrados,
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
  CheckCircle,
} from "lucide-react";
import ActionGuard from "@/components/ActionGuard";
import { useBillingAccess } from "@/hooks/useBillingAccess";
import { DiaNaoCobrado, TipoCobranca } from "@/types";

type ClienteLocacao = {
  nome_completo?: string | null;
};

type EquipamentoResumo = {
  id?: string;
  valor_diaria?: number | string | null;
};

type ItemLocacao = {
  id: string;
  equipamento_id: string;
  quantidade_locada: number | string;
  valor_diaria_fechado?: number | string | null;
  tipo_cobranca?: TipoCobranca | string | null;
  data_inicio_cobranca?: string | null;
  equipamentos?: EquipamentoResumo | null;
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

function normalizarTipo(tipo?: string | null): TipoCobranca {
  if (tipo === "mensal") return "mensal";
  if (tipo === "semanal") return "semanal";
  return "diaria";
}

function calcularSubtotalItem(item: ItemLocacao, dias: number) {
  const tipo = normalizarTipo(item.tipo_cobranca);

  const quantidade = Number(item.quantidade_locada || 0);

  const valorPeriodo = Number(item.valor_diaria_fechado || 0);

  const valorDiariaExtra =
    tipo === "diaria"
      ? valorPeriodo
      : Number(item.equipamentos?.valor_diaria || 0);

  if (tipo === "diaria") {
    return quantidade * valorPeriodo * dias;
  }

  const calculo = calcularPeriodosCobrados(dias, tipo);

  return (
    quantidade * valorPeriodo * Number(calculo.periodos || 0) +
    quantidade * valorDiariaExtra * Number(calculo.diasExtras || 0)
  );
}

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
        .select(
          `
          *,
          clientes(*),
          itens_locacao(
            *,
            equipamentos(
              id,
              valor_diaria
            )
          )
        `
        )
        .order("created_at", { ascending: false });

      if (error) {
        console.error(error);
        toast.error("Erro ao carregar locações");
        return;
      }

      setLocacoes((data as unknown as LocacaoListItem[]) || []);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar locações");
    } finally {
      setLoading(false);
    }
  }

  function handleEdit(id: string) {
    if (blockedByBilling) {
      toast.error("Plano vencido");
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

  function handleDarBaixa() {
    navigate("/devolucao");
  }

  async function handleRenew(locacao: LocacaoListItem) {
    if (blockedByBilling) {
      toast.error("Plano vencido");
      return;
    }

    const novaData = window.prompt(
      "Nova data de devolução:",
      locacao.data_previsao_entrega || ""
    );

    if (!novaData) return;

    try {
      setRenewingId(locacao.id);

      const { data: diasData } = await supabase
        .from("dias_nao_cobrados")
        .select("*")
        .eq("ativo", true);

      const diasNaoCobrados = (diasData as unknown as DiaNaoCobrado[]) || [];

      const subtotalItens = (locacao.itens_locacao || []).reduce(
        (acc, item) => {
          const inicio =
            item.data_inicio_cobranca || locacao.data_inicio || "";

          const dias = calcularDiasCobrados(
            new Date(inicio + "T12:00:00"),
            new Date(novaData + "T12:00:00"),
            diasNaoCobrados,
            !!locacao.cobrar_domingo
          );

          return acc + calcularSubtotalItem(item, dias);
        },
        0
      );

      const novoTotal =
        subtotalItens +
        Number(locacao.taxa_entrega || 0) -
        Number(locacao.valor_desconto || 0);

      const { error } = await supabase
        .from("locacoes")
        .update({
          data_previsao_entrega: novaData,
          valor_total_final: novoTotal,
        })
        .eq("id", locacao.id);

      if (error) {
        console.error(error);
        toast.error("Erro ao renovar");
        return;
      }

      toast.success("Locação renovada!");
      await fetchLocacoes();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao renovar");
    } finally {
      setRenewingId(null);
    }
  }

  async function handleDelete(locacao: LocacaoListItem) {
    if (blockedByBilling) {
      toast.error("Plano vencido");
      return;
    }

    const confirmou = window.confirm(
      `Deseja excluir a locação #${locacao.numero_contrato}?`
    );

    if (!confirmou) return;

    try {
      setDeletingId(locacao.id);

      for (const item of locacao.itens_locacao || []) {
        const { data: eq } = await supabase
          .from("equipamentos")
          .select("quantidade_disponivel")
          .eq("id", item.equipamento_id)
          .maybeSingle();

        if (eq) {
          await supabase
            .from("equipamentos")
            .update({
              quantidade_disponivel:
                Number(eq.quantidade_disponivel || 0) +
                Number(item.quantidade_locada || 0),
            })
            .eq("id", item.equipamento_id);
        }
      }

      await supabase
        .from("itens_locacao")
        .delete()
        .eq("locacao_id", locacao.id);

      const { error } = await supabase
        .from("locacoes")
        .delete()
        .eq("id", locacao.id);

      if (error) {
        console.error(error);
        toast.error("Erro ao excluir");
        return;
      }

      toast.success("Locação excluída!");
      await fetchLocacoes();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao excluir");
    } finally {
      setDeletingId(null);
    }
  }

  const filtered = useMemo(() => {
    const term = search.toLowerCase();

    return locacoes.filter((l) => {
      const matchBusca =
        String(l.numero_contrato || "")
          .toLowerCase()
          .includes(term) ||
        (l.clientes?.nome_completo || "")
          .toLowerCase()
          .includes(term);

      const matchFiltro =
        filtro === "todos" ? true : l.situacao === "ativo";

      return matchBusca && matchFiltro;
    });
  }, [locacoes, search, filtro]);

  return (
    <Layout>
      <div className="animate-fade-in space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Aluguéis
          </h1>

          <p className="text-muted-foreground">
            Gerencie as locações
          </p>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-3 h-4 w-4 text-muted-foreground" />

          <Input
            className="rounded-[30px] pl-10"
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex gap-2">
          <Button
            variant={filtro === "ativo" ? "default" : "outline"}
            className="rounded-[30px]"
            onClick={() => setFiltro("ativo")}
          >
            Em aberto
          </Button>

          <Button
            variant={filtro === "todos" ? "default" : "outline"}
            className="rounded-[30px]"
            onClick={() => setFiltro("todos")}
          >
            Todos
          </Button>
        </div>

        <div className="space-y-3">
          {loading ? (
            <p className="py-10 text-center text-muted-foreground">
              Carregando...
            </p>
          ) : filtered.length === 0 ? (
            <p className="py-10 text-center text-muted-foreground">
              Nenhuma locação encontrada
            </p>
          ) : (
            filtered.map((l) => (
              <div
                key={l.id}
                className="rounded-[30px] border border-border bg-card p-5"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="font-semibold text-foreground">
                        #{l.numero_contrato}
                      </p>

                      <Badge className={situacaoColor(l.situacao || "")}>
                        {situacaoLabel(l.situacao || "")}
                      </Badge>
                    </div>

                    <p className="text-sm text-muted-foreground">
                      Cliente:{" "}
                      {l.clientes?.nome_completo || "Sem cliente"}
                    </p>

                    <p className="text-sm text-muted-foreground">
                      {formatDate(l.data_inicio || "")} →{" "}
                      {formatDate(l.data_previsao_entrega || "")}
                    </p>

                    <p className="text-sm text-muted-foreground">
                      Total:{" "}
                      {formatCurrency(
                        Number(l.valor_total_final || 0)
                      )}
                    </p>

                    {Number(l.valor_total_pago || 0) > 0 && (
                      <p className="text-sm text-success">
                        Entrada:{" "}
                        {formatCurrency(
                          Number(l.valor_total_pago || 0)
                        )}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    <ActionGuard fallbackLabel="Bloqueado">
                      <Button
                        type="button"
                        variant="outline"
                        className="justify-start gap-2 rounded-[30px]"
                        onClick={() => handleEdit(l.id)}
                      >
                        <Pencil className="h-4 w-4" />
                        Editar
                      </Button>
                    </ActionGuard>

                    <Button
                      type="button"
                      variant="outline"
                      className="justify-start gap-2 rounded-[30px]"
                      onClick={() => handlePrintContract(l.id)}
                    >
                      <FileText className="h-4 w-4" />
                      Contrato
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      className="justify-start gap-2 rounded-[30px]"
                      onClick={() => handlePrintComprovante(l.id)}
                    >
                      <Receipt className="h-4 w-4" />
                      Notinha
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      className="justify-start gap-2 rounded-[30px]"
                      onClick={handleDarBaixa}
                    >
                      <CheckCircle className="h-4 w-4" />
                      Dar baixa
                    </Button>

                    <ActionGuard fallbackLabel="Bloqueado">
                      <Button
                        type="button"
                        variant="outline"
                        className="justify-start gap-2 rounded-[30px]"
                        onClick={() => handleRenew(l)}
                        disabled={renewingId === l.id}
                      >
                        <RefreshCcw className="h-4 w-4" />
                        Renovar
                      </Button>
                    </ActionGuard>

                    <ActionGuard fallbackLabel="Bloqueado">
                      <Button
                        type="button"
                        variant="outline"
                        className="justify-start gap-2 rounded-[30px] text-destructive"
                        onClick={() => handleDelete(l)}
                        disabled={deletingId === l.id}
                      >
                        <Trash2 className="h-4 w-4" />
                        Excluir
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