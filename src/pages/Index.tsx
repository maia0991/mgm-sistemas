import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, formatDate } from "@/lib/calculos";
import StatCard from "@/components/StatCard";
import Layout from "@/components/Layout";
import {
  DollarSign,
  FileText,
  TruckIcon,
  ArrowDownToLine,
} from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type ClienteResumo = {
  nome_completo?: string | null;
  whatsapp?: string | null;
};

type ItemLocacaoResumo = {
  id: string;
  quantidade_locada?: number | string | null;
};

type LocacaoDashboardItem = {
  id: string;
  numero_contrato?: number | string | null;
  situacao?: string | null;
  data_inicio?: string | null;
  data_previsao_entrega?: string | null;
  valor_total_final?: number | string | null;
  clientes?: ClienteResumo | null;
  itens_locacao?: ItemLocacaoResumo[] | null;
};

type EquipamentoDashboardItem = {
  id: string;
  nome?: string | null;
  quantidade_disponivel?: number | string | null;
  ativo?: boolean | null;
};

export default function Dashboard() {
  const navigate = useNavigate();

  const [locacoes, setLocacoes] = useState<LocacaoDashboardItem[]>([]);
  const [equipamentos, setEquipamentos] = useState<EquipamentoDashboardItem[]>(
    []
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);

      const [locacoesRes, equipamentosRes] = await Promise.all([
        supabase
          .from("locacoes")
          .select("*, clientes(*), itens_locacao(*)")
          .order("created_at", { ascending: false }),

        supabase
          .from("equipamentos")
          .select("*")
          .eq("ativo", true)
          .order("nome"),
      ]);

      if (locacoesRes.error) {
        console.error("Erro ao carregar dashboard:", locacoesRes.error);
        toast.error("Erro ao carregar dashboard");
        return;
      }

      if (equipamentosRes.error) {
        console.error("Erro ao carregar equipamentos:", equipamentosRes.error);
        toast.error("Erro ao carregar equipamentos");
        return;
      }

      setLocacoes(
        ((locacoesRes.data as LocacaoDashboardItem[]) || []).filter(Boolean)
      );
      setEquipamentos(
        ((equipamentosRes.data as EquipamentoDashboardItem[]) || []).filter(
          Boolean
        )
      );
    } catch (error) {
      console.error("Erro inesperado:", error);
      toast.error("Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  function goToDevolucao() {
    navigate("/devolucao");
  }

  const hoje = format(new Date(), "yyyy-MM-dd");

  const ativas = useMemo(
    () => locacoes.filter((l) => l.situacao === "ativo"),
    [locacoes]
  );

  const faturamento = useMemo(
    () =>
      locacoes
        .filter((l) => l.situacao === "finalizado")
        .reduce((acc, l) => acc + Number(l.valor_total_final || 0), 0),
    [locacoes]
  );

  const saidasHoje = useMemo(
    () => locacoes.filter((l) => l.data_inicio === hoje),
    [locacoes, hoje]
  );

  const retornosHoje = useMemo(
    () => locacoes.filter((l) => l.data_previsao_entrega === hoje),
    [locacoes, hoje]
  );

  const locacoesAvisos = useMemo(
    () =>
      locacoes
        .filter((l) => l.situacao === "ativo")
        .filter(Boolean)
        .slice(0, 8),
    [locacoes]
  );

  function getEstoqueStatus(qtd: number) {
    if (qtd <= 0) {
      return {
        label: "Sem Estoque",
        boxClass: "border-destructive/30 bg-destructive/5",
        textClass: "text-destructive",
        valueClass: "text-destructive",
      };
    }

    if (qtd <= 2) {
      return {
        label: "Estoque Baixo",
        boxClass: "border-yellow-500/30 bg-yellow-500/5",
        textClass: "text-yellow-500",
        valueClass: "text-yellow-500",
      };
    }

    return {
      label: "Disponível",
      boxClass: "border-success/30 bg-success/5",
      textClass: "text-success",
      valueClass: "text-success",
    };
  }

  function getCobrancaStatus(data?: string | null) {
    if (!data) {
      return {
        label: "Em dia",
        buttonClass: "bg-green-600 text-white hover:bg-green-700",
        acao: "Avisar",
      };
    }

    if (data < hoje) {
      return {
        label: "Vencido",
        buttonClass: "bg-red-600 text-white hover:bg-red-700",
        acao: "Cobrar",
      };
    }

    if (data === hoje) {
      return {
        label: "Vencendo hoje",
        buttonClass: "bg-yellow-500 text-white hover:bg-yellow-600",
        acao: "Avisar",
      };
    }

    return {
      label: "Em dia",
      buttonClass: "bg-green-600 text-white hover:bg-green-700",
      acao: "Avisar",
    };
  }

  function gerarLinkWhatsApp(numero: string, mensagem: string) {
    const numeroLimpo = numero.replace(/\D/g, "");

    if (!numeroLimpo || numeroLimpo.length < 10) {
      toast.error("Cliente sem WhatsApp válido cadastrado");
      return null;
    }

    const texto = encodeURIComponent(mensagem);
    return `https://wa.me/55${numeroLimpo}?text=${texto}`;
  }

  function montarMensagem(locacao: LocacaoDashboardItem) {
    const nome = locacao.clientes?.nome_completo || "cliente";
    const contrato = locacao.numero_contrato ?? "-";
    const dataEntrega = locacao.data_previsao_entrega || "";

    if (!dataEntrega) return null;

    const hojeDate = new Date();
    hojeDate.setHours(0, 0, 0, 0);

    const data = new Date(dataEntrega + "T12:00:00");

    const diffDias = Math.floor(
      (data.getTime() - hojeDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    const dataFormatada = formatDate(dataEntrega);

    const prefixo = "🤖 *Aviso automático - MGM Sistemas*\n\n";

    if (diffDias < 0) {
      return `${prefixo}Olá ${nome}, tudo bem?

Verificamos que a locação nº ${contrato} venceu em ${dataFormatada} e ainda consta em aberto.

Pedimos que responda esta mensagem para regularização ou agendamento da devolução.

Estamos à disposição!`;
    }

    if (diffDias === 0) {
      return `${prefixo}Olá ${nome}, tudo bem?

Verificamos que a locação nº ${contrato} vence hoje, ${dataFormatada}.

Caso precise renovar ou agendar a devolução, responda esta mensagem.

Estamos à disposição!`;
    }

    if (diffDias === 1) {
      return `${prefixo}Olá ${nome}, tudo bem?

Passando para lembrar que a locação nº ${contrato} vence amanhã, ${dataFormatada}.

Se precisar renovar ou agendar a devolução, é só responder esta mensagem.

Estamos à disposição!`;
    }

    return null;
  }

  function abrirWhatsApp(locacao: LocacaoDashboardItem) {
    const mensagem = montarMensagem(locacao);

    if (!mensagem) {
      toast.message("Esta locação ainda não precisa de aviso.");
      return;
    }

    const numero = locacao.clientes?.whatsapp || "";
    const link = gerarLinkWhatsApp(numero, mensagem);

    if (!link) return;

    window.open(link, "_blank");
  }

  function getQuantidadePecas(locacao: LocacaoDashboardItem) {
    return (locacao.itens_locacao || []).reduce(
      (acc, item) => acc + Number(item.quantidade_locada || 0),
      0
    );
  }

  return (
    <Layout>
      <div className="animate-fade-in space-y-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="mt-1 text-muted-foreground">
              Visão geral do MGM Sistemas
            </p>
          </div>

          <Button onClick={goToDevolucao} className="gap-2 rounded-[30px]">
            <ArrowDownToLine className="h-4 w-4" />
            Baixa
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Faturamento Total"
            value={formatCurrency(faturamento)}
            icon={DollarSign}
            variant="success"
          />
          <StatCard
            title="Locações Ativas"
            value={String(ativas.length)}
            icon={FileText}
            variant="primary"
          />
          <StatCard
            title="Saídas Hoje"
            value={String(saidasHoje.length)}
            icon={TruckIcon}
            variant="warning"
          />
          <StatCard
            title="Retornos Hoje"
            value={String(retornosHoje.length)}
            icon={ArrowDownToLine}
            variant="default"
          />
        </div>

        <div className="rounded-[30px] border border-border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold text-foreground">
            Disponibilidade de Estoque
          </h2>

          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : equipamentos.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum equipamento cadastrado.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {equipamentos.map((eq) => {
                const quantidadeDisponivel = Number(
                  eq.quantidade_disponivel || 0
                );
                const status = getEstoqueStatus(quantidadeDisponivel);

                return (
                  <div
                    key={eq.id}
                    className={`rounded-2xl border p-4 ${status.boxClass}`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase text-muted-foreground">
                          {eq.nome || "Sem nome"}
                        </p>

                        <p
                          className={`mt-2 text-2xl font-bold ${status.valueClass}`}
                        >
                          {quantidadeDisponivel}
                          <span className="ml-1 text-sm text-muted-foreground">
                            un
                          </span>
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${status.textClass}`}
                      >
                        {status.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-[30px] border border-border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold text-foreground">
            Avisos e Cobranças
          </h2>

          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : locacoesAvisos.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma locação ativa cadastrada.
            </p>
          ) : (
            <div className="space-y-3">
              {locacoesAvisos.map((l) => {
                const status = getCobrancaStatus(l.data_previsao_entrega);
                const quantidadePecas = getQuantidadePecas(l);

                return (
                  <div key={l.id} className="rounded-2xl bg-secondary p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-medium text-foreground">
                          #{l.numero_contrato ?? "-"} -{" "}
                          {l.clientes?.nome_completo || "Sem cliente"}
                        </p>

                        <p className="text-sm text-muted-foreground">
                          Locou: {formatDate(l.data_inicio || "")}
                        </p>

                        <p className="text-sm text-muted-foreground">
                          Devolve: {formatDate(l.data_previsao_entrega || "")}
                        </p>

                        <p className="text-sm text-muted-foreground">
                          Peças alugadas: {quantidadePecas}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <Badge
                          className={
                            status.label === "Vencido"
                              ? "bg-red-100 text-red-700"
                              : status.label === "Vencendo hoje"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-green-100 text-green-700"
                          }
                        >
                          {status.label}
                        </Badge>

                        <Button
                          size="sm"
                          className={`rounded-[30px] ${status.buttonClass}`}
                          onClick={() => abrirWhatsApp(l)}
                        >
                          {status.acao}
                        </Button>
                      </div>
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