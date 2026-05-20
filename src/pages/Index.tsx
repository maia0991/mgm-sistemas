import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, formatDate } from "@/lib/calculos";
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
  const [equipamentos, setEquipamentos] = useState<EquipamentoDashboardItem[]>([]);
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

      setLocacoes(((locacoesRes.data as LocacaoDashboardItem[]) || []).filter(Boolean));
      setEquipamentos(((equipamentosRes.data as EquipamentoDashboardItem[]) || []).filter(Boolean));
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
        <div className="relative overflow-hidden rounded-[35px] border border-border bg-gradient-to-br from-primary/20 via-background to-background p-8">
          <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />

          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-primary">
                MGM Sistemas
              </p>

              <h1 className="text-4xl font-black tracking-tight text-foreground">
                Painel de Controle
              </h1>

              <p className="mt-3 max-w-2xl text-muted-foreground">
                Controle sua locadora com mais organização, rapidez e segurança.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => navigate("/novo-aluguel")}
                className="rounded-[30px] px-6"
              >
                Novo Aluguel
              </Button>

              <Button
                variant="secondary"
                onClick={goToDevolucao}
                className="gap-2 rounded-[30px] px-6"
              >
                <ArrowDownToLine className="h-4 w-4" />
                Dar Baixa
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          <div className="relative overflow-hidden rounded-[30px] border border-green-500/20 bg-gradient-to-br from-green-500/10 to-background p-6">
            <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-green-500/10 blur-2xl" />
            <div className="relative z-10">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-green-500/15">
                <DollarSign className="h-7 w-7 text-green-500" />
              </div>
              <p className="text-sm text-muted-foreground">Faturamento Total</p>
              <h2 className="mt-2 text-3xl font-black">
                {formatCurrency(faturamento)}
              </h2>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[30px] border border-primary/20 bg-gradient-to-br from-primary/10 to-background p-6">
            <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-primary/10 blur-2xl" />
            <div className="relative z-10">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15">
                <FileText className="h-7 w-7 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">Locações Ativas</p>
              <h2 className="mt-2 text-3xl font-black">{ativas.length}</h2>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[30px] border border-yellow-500/20 bg-gradient-to-br from-yellow-500/10 to-background p-6">
            <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-yellow-500/10 blur-2xl" />
            <div className="relative z-10">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-yellow-500/15">
                <TruckIcon className="h-7 w-7 text-yellow-500" />
              </div>
              <p className="text-sm text-muted-foreground">Saídas Hoje</p>
              <h2 className="mt-2 text-3xl font-black">{saidasHoje.length}</h2>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[30px] border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 to-background p-6">
            <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-cyan-500/10 blur-2xl" />
            <div className="relative z-10">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/15">
                <ArrowDownToLine className="h-7 w-7 text-cyan-500" />
              </div>
              <p className="text-sm text-muted-foreground">Retornos Hoje</p>
              <h2 className="mt-2 text-3xl font-black">{retornosHoje.length}</h2>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <button
            type="button"
            onClick={() => navigate("/novo-aluguel")}
            className="rounded-[30px] border border-border bg-card p-6 text-left transition hover:scale-[1.02] hover:border-primary/30"
          >
            <FileText className="mb-5 h-10 w-10 text-primary" />
            <h3 className="text-xl font-bold">Novo Aluguel</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Criar contrato e iniciar nova locação.
            </p>
          </button>

          <button
            type="button"
            onClick={() => navigate("/clientes")}
            className="rounded-[30px] border border-border bg-card p-6 text-left transition hover:scale-[1.02] hover:border-primary/30"
          >
            <TruckIcon className="mb-5 h-10 w-10 text-primary" />
            <h3 className="text-xl font-bold">Clientes</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Gerencie seus clientes cadastrados.
            </p>
          </button>

          <button
            type="button"
            onClick={() => navigate("/financeiro")}
            className="rounded-[30px] border border-border bg-card p-6 text-left transition hover:scale-[1.02] hover:border-primary/30"
          >
            <DollarSign className="mb-5 h-10 w-10 text-primary" />
            <h3 className="text-xl font-bold">Financeiro</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Controle entradas, saídas e faturamento.
            </p>
          </button>
        </div>

        <div className="rounded-[35px] border border-border bg-card p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-black">Disponibilidade de Estoque</h2>
            <p className="text-sm text-muted-foreground">
              Equipamentos disponíveis para locação
            </p>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : equipamentos.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum equipamento cadastrado.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {equipamentos.map((eq) => {
                const quantidadeDisponivel = Number(eq.quantidade_disponivel || 0);
                const status = getEstoqueStatus(quantidadeDisponivel);

                return (
                  <div
                    key={eq.id}
                    className={`rounded-[25px] border p-5 ${status.boxClass}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          {eq.nome || "Sem nome"}
                        </p>

                        <h3 className={`mt-3 text-4xl font-black ${status.valueClass}`}>
                          {quantidadeDisponivel}
                        </h3>

                        <p className="text-sm text-muted-foreground">
                          unidades disponíveis
                        </p>
                      </div>

                      <Badge className={`rounded-full ${status.textClass}`}>
                        {status.label}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-[35px] border border-border bg-card p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-black">Avisos e Cobranças</h2>
            <p className="text-sm text-muted-foreground">
              Locações próximas do vencimento
            </p>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : locacoesAvisos.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma locação ativa cadastrada.
            </p>
          ) : (
            <div className="space-y-4">
              {locacoesAvisos.map((locacao) => {
                const status = getCobrancaStatus(locacao.data_previsao_entrega);
                const quantidadePecas = getQuantidadePecas(locacao);

                return (
                  <div
                    key={locacao.id}
                    className="rounded-[25px] border border-border bg-secondary/50 p-5"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <h3 className="text-lg font-bold">
                          #{locacao.numero_contrato ?? "-"} —{" "}
                          {locacao.clientes?.nome_completo || "Sem cliente"}
                        </h3>

                        <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
                          <p>Locou: {formatDate(locacao.data_inicio || "")}</p>
                          <p>
                            Devolve:{" "}
                            {locacao.data_previsao_entrega
                              ? formatDate(locacao.data_previsao_entrega)
                              : "Sem previsão"}
                          </p>
                          <p>Peças: {quantidadePecas}</p>
                        </div>
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
                          onClick={() => abrirWhatsApp(locacao)}
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