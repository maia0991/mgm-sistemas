import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LocacaoComCliente } from "@/types";
import { formatCurrency, formatDate } from "@/lib/calculos";
import StatCard from "@/components/StatCard";
import Layout from "@/components/Layout";
import {
  DollarSign,
  TrendingDown,
  Wallet,
  MinusCircle,
  Plus,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Sangria {
  id: string;
  valor: number;
  motivo: string;
  forma_pagamento: string;
  observacao: string | null;
  created_at: string;
}

interface ContaPagar {
  id: string;
  descricao: string;
  fornecedor: string | null;
  categoria: string | null;
  valor: number;
  data_vencimento: string;
  data_pagamento: string | null;
  status: string;
  forma_pagamento: string | null;
  retirar_do_caixa: boolean;
  observacao: string | null;
  created_at: string;
}

interface ContaReceber {
  id: string;
  descricao: string;
  cliente_nome: string | null;
  categoria: string | null;
  valor: number;
  data_vencimento: string;
  data_recebimento: string | null;
  status: string;
  forma_pagamento: string | null;
  observacao: string | null;
  created_at: string;
}

type FiltroStatus = "aberto" | "vencidas" | "pagas" | "todas";

export default function FinanceiroPage() {
  const [locacoes, setLocacoes] = useState<LocacaoComCliente[]>([]);
  const [sangrias, setSangrias] = useState<Sangria[]>([]);
  const [contasPagar, setContasPagar] = useState<ContaPagar[]>([]);
  const [contasReceber, setContasReceber] = useState<ContaReceber[]>([]);

  const [loading, setLoading] = useState(true);
  const [filtroMes, setFiltroMes] = useState(format(new Date(), "yyyy-MM"));

  const [filtroContasReceber, setFiltroContasReceber] =
    useState<FiltroStatus>("aberto");
  const [filtroContasPagar, setFiltroContasPagar] =
    useState<FiltroStatus>("aberto");

  const [openSangria, setOpenSangria] = useState(false);
  const [savingSangria, setSavingSangria] = useState(false);

  const [openConta, setOpenConta] = useState(false);
  const [savingConta, setSavingConta] = useState(false);

  const [openContaReceber, setOpenContaReceber] = useState(false);
  const [savingContaReceber, setSavingContaReceber] = useState(false);

  const [baixandoConta, setBaixandoConta] = useState<ContaPagar | null>(null);
  const [savingBaixa, setSavingBaixa] = useState(false);

  const [recebendoConta, setRecebendoConta] = useState<ContaReceber | null>(
    null
  );
  const [savingRecebimento, setSavingRecebimento] = useState(false);

  const [formSangria, setFormSangria] = useState({
    valor: "",
    motivo: "",
    forma_pagamento: "dinheiro",
    observacao: "",
  });

  const [formConta, setFormConta] = useState({
    descricao: "",
    fornecedor: "",
    categoria: "",
    valor: "",
    data_vencimento: "",
    forma_pagamento: "dinheiro",
    observacao: "",
  });

  const [formContaReceber, setFormContaReceber] = useState({
    descricao: "",
    cliente_nome: "",
    categoria: "",
    valor: "",
    data_vencimento: "",
    forma_pagamento: "dinheiro",
    observacao: "",
  });

  const [formBaixa, setFormBaixa] = useState({
    forma_pagamento: "dinheiro",
    retirar_do_caixa: true,
  });

  const [formRecebimento, setFormRecebimento] = useState({
    forma_pagamento: "dinheiro",
  });

  useEffect(() => {
    void fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);

      const [
        { data: locacoesData, error: locacoesError },
        { data: sangriasData, error: sangriasError },
        { data: contasData, error: contasError },
        { data: receberData, error: receberError },
      ] = await Promise.all([
        supabase
          .from("locacoes")
          .select("*, clientes(*), itens_locacao(*)")
          .order("created_at", { ascending: false }),

        (supabase as any)
          .from("sangrias")
          .select("*")
          .order("created_at", { ascending: false }),

        (supabase as any)
          .from("contas_pagar")
          .select("*")
          .order("data_vencimento", { ascending: true }),

        (supabase as any)
          .from("contas_receber")
          .select("*")
          .order("data_vencimento", { ascending: true }),
      ]);

      if (locacoesError) {
        console.error(locacoesError);
        toast.error("Erro ao carregar financeiro");
        return;
      }

      if (sangriasError) {
        console.error(sangriasError);
        toast.error("Erro ao carregar sangrias");
        return;
      }

      if (contasError) {
        console.error(contasError);
        toast.error("Erro ao carregar contas a pagar");
        return;
      }

      if (receberError) {
        console.error(receberError);
        toast.error("Erro ao carregar contas a receber");
        return;
      }

      setLocacoes((locacoesData as LocacaoComCliente[]) || []);
      setSangrias((sangriasData || []) as Sangria[]);
      setContasPagar((contasData || []) as ContaPagar[]);
      setContasReceber((receberData || []) as ContaReceber[]);
    } catch (error) {
      console.error(error);
      toast.error("Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  async function getUserLocadora() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: perfil, error } = await supabase
      .from("perfis")
      .select("locadora_id")
      .eq("user_id", user?.id)
      .maybeSingle();

    if (error) {
      console.error(error);
      toast.error("Erro ao identificar locadora");
      return null;
    }

    if (!perfil?.locadora_id) {
      toast.error("Locadora não encontrada");
      return null;
    }

    return {
      user,
      locadora_id: perfil.locadora_id,
    };
  }

  async function salvarSangria() {
    if (!formSangria.valor || Number(formSangria.valor) <= 0) {
      toast.error("Informe o valor");
      return;
    }

    if (!formSangria.motivo.trim()) {
      toast.error("Informe o motivo");
      return;
    }

    try {
      setSavingSangria(true);

      const authData = await getUserLocadora();
      if (!authData) return;

      const { error } = await (supabase as any).from("sangrias").insert({
        valor: Number(formSangria.valor),
        motivo: formSangria.motivo.trim(),
        forma_pagamento: formSangria.forma_pagamento,
        observacao: formSangria.observacao.trim() || null,
        locadora_id: authData.locadora_id,
        usuario_id: authData.user?.id || null,
      });

      if (error) {
        console.error(error);
        toast.error("Erro ao salvar sangria");
        return;
      }

      toast.success("Sangria registrada com sucesso!");

      setFormSangria({
        valor: "",
        motivo: "",
        forma_pagamento: "dinheiro",
        observacao: "",
      });

      setOpenSangria(false);
      await fetchData();
    } catch (error) {
      console.error(error);
      toast.error("Erro inesperado");
    } finally {
      setSavingSangria(false);
    }
  }

  async function salvarConta() {
    if (!formConta.descricao.trim()) {
      toast.error("Informe a descrição da conta");
      return;
    }

    if (!formConta.valor || Number(formConta.valor) <= 0) {
      toast.error("Informe o valor da conta");
      return;
    }

    if (!formConta.data_vencimento) {
      toast.error("Informe a data de vencimento");
      return;
    }

    try {
      setSavingConta(true);

      const authData = await getUserLocadora();
      if (!authData) return;

      const { error } = await (supabase as any).from("contas_pagar").insert({
        descricao: formConta.descricao.trim(),
        fornecedor: formConta.fornecedor.trim() || null,
        categoria: formConta.categoria.trim() || null,
        valor: Number(formConta.valor),
        data_vencimento: formConta.data_vencimento,
        forma_pagamento: formConta.forma_pagamento,
        observacao: formConta.observacao.trim() || null,
        status: "pendente",
        retirar_do_caixa: true,
        locadora_id: authData.locadora_id,
        usuario_id: authData.user?.id || null,
      });

      if (error) {
        console.error(error);
        toast.error("Erro ao salvar conta");
        return;
      }

      toast.success("Conta cadastrada com sucesso!");

      setFormConta({
        descricao: "",
        fornecedor: "",
        categoria: "",
        valor: "",
        data_vencimento: "",
        forma_pagamento: "dinheiro",
        observacao: "",
      });

      setOpenConta(false);
      await fetchData();
    } catch (error) {
      console.error(error);
      toast.error("Erro inesperado");
    } finally {
      setSavingConta(false);
    }
  }

  async function salvarContaReceber() {
    if (!formContaReceber.descricao.trim()) {
      toast.error("Informe a descrição da conta a receber");
      return;
    }

    if (!formContaReceber.valor || Number(formContaReceber.valor) <= 0) {
      toast.error("Informe o valor da conta a receber");
      return;
    }

    if (!formContaReceber.data_vencimento) {
      toast.error("Informe a data de vencimento");
      return;
    }

    try {
      setSavingContaReceber(true);

      const authData = await getUserLocadora();
      if (!authData) return;

      const { error } = await (supabase as any).from("contas_receber").insert({
        descricao: formContaReceber.descricao.trim(),
        cliente_nome: formContaReceber.cliente_nome.trim() || null,
        categoria: formContaReceber.categoria.trim() || null,
        valor: Number(formContaReceber.valor),
        data_vencimento: formContaReceber.data_vencimento,
        forma_pagamento: formContaReceber.forma_pagamento,
        observacao: formContaReceber.observacao.trim() || null,
        status: "pendente",
        locadora_id: authData.locadora_id,
        usuario_id: authData.user?.id || null,
      });

      if (error) {
        console.error(error);
        toast.error("Erro ao salvar conta a receber");
        return;
      }

      toast.success("Conta a receber cadastrada com sucesso!");

      setFormContaReceber({
        descricao: "",
        cliente_nome: "",
        categoria: "",
        valor: "",
        data_vencimento: "",
        forma_pagamento: "dinheiro",
        observacao: "",
      });

      setOpenContaReceber(false);
      await fetchData();
    } catch (error) {
      console.error(error);
      toast.error("Erro inesperado");
    } finally {
      setSavingContaReceber(false);
    }
  }

  function abrirBaixaConta(conta: ContaPagar) {
    setBaixandoConta(conta);
    setFormBaixa({
      forma_pagamento: conta.forma_pagamento || "dinheiro",
      retirar_do_caixa: true,
    });
  }

  async function darBaixaConta() {
    if (!baixandoConta) return;

    try {
      setSavingBaixa(true);

      const { error } = await (supabase as any)
        .from("contas_pagar")
        .update({
          status: "pago",
          data_pagamento: format(new Date(), "yyyy-MM-dd"),
          forma_pagamento: formBaixa.forma_pagamento,
          retirar_do_caixa: formBaixa.retirar_do_caixa,
          updated_at: new Date().toISOString(),
        })
        .eq("id", baixandoConta.id);

      if (error) {
        console.error(error);
        toast.error("Erro ao dar baixa na conta");
        return;
      }

      toast.success("Conta baixada com sucesso!");

      setBaixandoConta(null);
      await fetchData();
    } catch (error) {
      console.error(error);
      toast.error("Erro inesperado");
    } finally {
      setSavingBaixa(false);
    }
  }

  function abrirRecebimento(conta: ContaReceber) {
    setRecebendoConta(conta);
    setFormRecebimento({
      forma_pagamento: conta.forma_pagamento || "dinheiro",
    });
  }

  async function receberConta() {
    if (!recebendoConta) return;

    try {
      setSavingRecebimento(true);

      const { error } = await (supabase as any)
        .from("contas_receber")
        .update({
          status: "recebido",
          data_recebimento: format(new Date(), "yyyy-MM-dd"),
          forma_pagamento: formRecebimento.forma_pagamento,
          updated_at: new Date().toISOString(),
        })
        .eq("id", recebendoConta.id);

      if (error) {
        console.error(error);
        toast.error("Erro ao receber conta");
        return;
      }

      toast.success("Conta recebida com sucesso!");

      setRecebendoConta(null);
      await fetchData();
    } catch (error) {
      console.error(error);
      toast.error("Erro inesperado");
    } finally {
      setSavingRecebimento(false);
    }
  }

  const hoje = format(new Date(), "yyyy-MM-dd");

  const finalizadas = useMemo(
    () => locacoes.filter((l) => l.situacao === "finalizado"),
    [locacoes]
  );

  const ativas = useMemo(
    () => locacoes.filter((l) => l.situacao === "ativo"),
    [locacoes]
  );

  const faturamentoTotal = finalizadas.reduce(
    (acc, l) => acc + Number(l.valor_total_final || 0),
    0
  );

  const entradasRecebidas = locacoes.reduce(
    (acc, l) => acc + Number(l.valor_total_pago || 0),
    0
  );

  const aReceber = ativas.reduce(
    (acc, l) =>
      acc +
      (Number(l.valor_total_final || 0) - Number(l.valor_total_pago || 0)),
    0
  );

  const totalSangrias = sangrias.reduce(
    (acc, s) => acc + Number(s.valor || 0),
    0
  );

  const contasPendentes = contasPagar.filter((c) => c.status === "pendente");
  const contasPagas = contasPagar.filter((c) => c.status === "pago");

  const contasVencidas = contasPendentes.filter(
    (c) => c.data_vencimento < hoje
  );

  const contasReceberPendentes = contasReceber.filter(
    (c) => c.status === "pendente"
  );

  const contasRecebidas = contasReceber.filter(
    (c) => c.status === "recebido"
  );

  const contasReceberVencidas = contasReceberPendentes.filter(
    (c) => c.data_vencimento < hoje
  );

  const contasPagarFiltradas = useMemo(() => {
    if (filtroContasPagar === "todas") return contasPagar;
    if (filtroContasPagar === "pagas") return contasPagas;
    if (filtroContasPagar === "vencidas") return contasVencidas;
    return contasPendentes;
  }, [contasPagar, contasPagas, contasVencidas, contasPendentes, filtroContasPagar]);

  const contasReceberFiltradas = useMemo(() => {
    if (filtroContasReceber === "todas") return contasReceber;
    if (filtroContasReceber === "pagas") return contasRecebidas;
    if (filtroContasReceber === "vencidas") return contasReceberVencidas;
    return contasReceberPendentes;
  }, [
    contasReceber,
    contasRecebidas,
    contasReceberVencidas,
    contasReceberPendentes,
    filtroContasReceber,
  ]);

  const totalContasReceberPendentes = contasReceberPendentes.reduce(
    (acc, c) => acc + Number(c.valor || 0),
    0
  );

  const totalContasRecebidas = contasRecebidas.reduce(
    (acc, c) => acc + Number(c.valor || 0),
    0
  );

  const totalContasPagasCaixa = contasPagas
    .filter((c) => c.retirar_do_caixa)
    .reduce((acc, c) => acc + Number(c.valor || 0), 0);

  const saldoCaixa =
    entradasRecebidas +
    totalContasRecebidas -
    totalSangrias -
    totalContasPagasCaixa;

  const locacoesMes = locacoes.filter((l) => l.created_at?.startsWith(filtroMes));

  const faturamentoMes = locacoesMes
    .filter((l) => l.situacao === "finalizado")
    .reduce((acc, l) => acc + Number(l.valor_total_final || 0), 0);

  function filtroButtonClass(ativo: boolean) {
    return ativo ? "default" : "outline";
  }

  function mensagemFiltroVazio(tipo: "pagar" | "receber") {
    const filtro = tipo === "pagar" ? filtroContasPagar : filtroContasReceber;

    if (filtro === "aberto") return "Nenhuma conta em aberto.";
    if (filtro === "vencidas") return "Nenhuma conta vencida.";
    if (filtro === "pagas") {
      return tipo === "pagar"
        ? "Nenhuma conta paga encontrada."
        : "Nenhuma conta recebida encontrada.";
    }

    return "Nenhuma conta cadastrada.";
  }

  return (
    <Layout>
      <div className="animate-fade-in space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Financeiro</h1>
            <p className="text-muted-foreground">Visão geral das finanças</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => setOpenSangria(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Sangria
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => setOpenConta(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Nova Conta a Pagar
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => setOpenContaReceber(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Nova Conta a Receber
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-5">
          <StatCard
            title="Valor Total em Contratos"
            value={formatCurrency(faturamentoTotal)}
            icon={DollarSign}
            variant="success"
          />

          <StatCard
            title="A Receber Ativos"
            value={formatCurrency(aReceber)}
            icon={TrendingDown}
            variant="warning"
          />

          <StatCard
            title="Contas a Receber"
            value={formatCurrency(totalContasReceberPendentes)}
            icon={DollarSign}
            variant="warning"
          />

          <StatCard
            title="Sangrias"
            value={formatCurrency(totalSangrias)}
            icon={MinusCircle}
            variant="warning"
          />

          <StatCard
            title="Saldo em Caixa"
            value={formatCurrency(saldoCaixa)}
            icon={Wallet}
            variant="success"
          />
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
          <div className="rounded-[30px] border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">
              Contas a Pagar Pendentes
            </p>
            <p className="text-2xl font-bold text-foreground">
              {contasPendentes.length}
            </p>
          </div>

          <div className="rounded-[30px] border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">
              Contas a Pagar Vencidas
            </p>
            <p className="text-2xl font-bold text-destructive">
              {contasVencidas.length}
            </p>
          </div>

          <div className="rounded-[30px] border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">
              Contas a Receber Pendentes
            </p>
            <p className="text-2xl font-bold text-warning">
              {contasReceberPendentes.length}
            </p>
          </div>

          <div className="rounded-[30px] border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">
              Contas a Receber Vencidas
            </p>
            <p className="text-2xl font-bold text-destructive">
              {contasReceberVencidas.length}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-[30px] border border-border bg-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                Histórico de Locações
              </h2>

              <input
                type="month"
                value={filtroMes}
                onChange={(e) => setFiltroMes(e.target.value)}
                className="rounded-[30px] border border-border bg-secondary px-4 py-2 text-sm text-foreground"
              />
            </div>

            {loading ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : (
              <>
                <p className="mb-4 text-sm text-muted-foreground">
                  Valor total em contratos no mês:{" "}
                  <span className="font-bold text-primary">
                    {formatCurrency(faturamentoMes)}
                  </span>{" "}
                  • {locacoesMes.length} contratos
                </p>

                <div className="max-h-96 space-y-2 overflow-auto">
                  {locacoesMes.map((l) => (
                    <div
                      key={l.id}
                      className="flex items-center justify-between rounded-2xl bg-secondary p-4"
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          #{l.numero_contrato} - {l.clientes?.nome_completo}
                        </p>

                        <p className="text-xs text-muted-foreground">
                          {formatDate(l.data_inicio)} →{" "}
                          {formatDate(l.data_previsao_entrega)}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-sm font-bold text-foreground">
                          {formatCurrency(Number(l.valor_total_final || 0))}
                        </p>

                        {Number(l.valor_total_pago) > 0 && (
                          <p className="text-xs text-success">
                            Pago: {formatCurrency(Number(l.valor_total_pago))}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}

                  {locacoesMes.length === 0 && (
                    <p className="py-4 text-center text-muted-foreground">
                      Nenhuma locação neste mês.
                    </p>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="rounded-[30px] border border-border bg-card p-6">
            <h2 className="mb-4 text-lg font-semibold text-foreground">
              Histórico de Sangrias
            </h2>

            <div className="max-h-96 space-y-2 overflow-auto">
              {sangrias.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between rounded-2xl bg-secondary p-4"
                >
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {s.motivo}
                    </p>

                    <p className="text-xs text-muted-foreground">
                      {formatDate(s.created_at)}
                    </p>

                    {s.observacao && (
                      <p className="text-xs text-muted-foreground">
                        {s.observacao}
                      </p>
                    )}
                  </div>

                  <div className="text-right">
                    <p className="font-bold text-destructive">
                      - {formatCurrency(Number(s.valor))}
                    </p>

                    <p className="text-xs text-muted-foreground">
                      {s.forma_pagamento}
                    </p>
                  </div>
                </div>
              ))}

              {sangrias.length === 0 && (
                <p className="py-4 text-center text-muted-foreground">
                  Nenhuma sangria cadastrada.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-[30px] border border-border bg-card p-6">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Contas a Receber
              </h2>
              <p className="text-sm text-muted-foreground">
                Por padrão aparecem apenas as contas em aberto.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant={filtroButtonClass(filtroContasReceber === "aberto")}
                onClick={() => setFiltroContasReceber("aberto")}
              >
                Em aberto
              </Button>

              <Button
                type="button"
                size="sm"
                variant={filtroButtonClass(filtroContasReceber === "vencidas")}
                onClick={() => setFiltroContasReceber("vencidas")}
              >
                Vencidas
              </Button>

              <Button
                type="button"
                size="sm"
                variant={filtroButtonClass(filtroContasReceber === "pagas")}
                onClick={() => setFiltroContasReceber("pagas")}
              >
                Recebidas
              </Button>

              <Button
                type="button"
                size="sm"
                variant={filtroButtonClass(filtroContasReceber === "todas")}
                onClick={() => setFiltroContasReceber("todas")}
              >
                Todas
              </Button>
            </div>
          </div>

          <div className="max-h-[500px] space-y-2 overflow-auto">
            {contasReceberFiltradas.map((conta) => (
              <div
                key={conta.id}
                className="flex flex-col gap-4 rounded-2xl bg-secondary p-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {conta.descricao}
                  </p>

                  {conta.cliente_nome && (
                    <p className="text-xs text-muted-foreground">
                      Cliente: {conta.cliente_nome}
                    </p>
                  )}

                  <p className="text-xs text-muted-foreground">
                    Vencimento: {formatDate(conta.data_vencimento)}
                  </p>

                  {conta.categoria && (
                    <p className="text-xs text-muted-foreground">
                      Categoria: {conta.categoria}
                    </p>
                  )}

                  {conta.status === "recebido" && (
                    <p className="text-xs text-success">
                      Recebido em:{" "}
                      {conta.data_recebimento
                        ? formatDate(conta.data_recebimento)
                        : "—"}
                    </p>
                  )}

                  {conta.status === "pendente" &&
                    conta.data_vencimento < hoje && (
                      <p className="text-xs font-semibold text-destructive">
                        Conta vencida
                      </p>
                    )}

                  {conta.observacao && (
                    <p className="text-xs text-muted-foreground">
                      Obs.: {conta.observacao}
                    </p>
                  )}
                </div>

                <div className="flex flex-col items-start gap-2 md:items-end">
                  <p className="font-bold text-foreground">
                    {formatCurrency(Number(conta.valor))}
                  </p>

                  <p
                    className={
                      conta.status === "recebido"
                        ? "text-xs font-semibold text-success"
                        : "text-xs font-semibold text-warning"
                    }
                  >
                    {conta.status === "recebido" ? "Recebido" : "Pendente"}
                  </p>

                  {conta.status === "pendente" && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => abrirRecebimento(conta)}
                    >
                      Receber
                    </Button>
                  )}
                </div>
              </div>
            ))}

            {contasReceberFiltradas.length === 0 && (
              <p className="py-4 text-center text-muted-foreground">
                {mensagemFiltroVazio("receber")}
              </p>
            )}
          </div>
        </div>

        <div className="rounded-[30px] border border-border bg-card p-6">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Contas a Pagar
              </h2>
              <p className="text-sm text-muted-foreground">
                Por padrão aparecem apenas as contas em aberto.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant={filtroButtonClass(filtroContasPagar === "aberto")}
                onClick={() => setFiltroContasPagar("aberto")}
              >
                Em aberto
              </Button>

              <Button
                type="button"
                size="sm"
                variant={filtroButtonClass(filtroContasPagar === "vencidas")}
                onClick={() => setFiltroContasPagar("vencidas")}
              >
                Vencidas
              </Button>

              <Button
                type="button"
                size="sm"
                variant={filtroButtonClass(filtroContasPagar === "pagas")}
                onClick={() => setFiltroContasPagar("pagas")}
              >
                Pagas
              </Button>

              <Button
                type="button"
                size="sm"
                variant={filtroButtonClass(filtroContasPagar === "todas")}
                onClick={() => setFiltroContasPagar("todas")}
              >
                Todas
              </Button>
            </div>
          </div>

          <div className="max-h-[500px] space-y-2 overflow-auto">
            {contasPagarFiltradas.map((conta) => (
              <div
                key={conta.id}
                className="flex flex-col gap-4 rounded-2xl bg-secondary p-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {conta.descricao}
                  </p>

                  <p className="text-xs text-muted-foreground">
                    Vencimento: {formatDate(conta.data_vencimento)}
                  </p>

                  {conta.fornecedor && (
                    <p className="text-xs text-muted-foreground">
                      Fornecedor: {conta.fornecedor}
                    </p>
                  )}

                  {conta.categoria && (
                    <p className="text-xs text-muted-foreground">
                      Categoria: {conta.categoria}
                    </p>
                  )}

                  {conta.status === "pago" && (
                    <p className="text-xs text-success">
                      Pago em:{" "}
                      {conta.data_pagamento
                        ? formatDate(conta.data_pagamento)
                        : "—"}{" "}
                      •{" "}
                      {conta.retirar_do_caixa
                        ? "Retirado do caixa"
                        : "Dinheiro externo"}
                    </p>
                  )}

                  {conta.status === "pendente" &&
                    conta.data_vencimento < hoje && (
                      <p className="text-xs font-semibold text-destructive">
                        Conta vencida
                      </p>
                    )}
                </div>

                <div className="flex flex-col items-start gap-2 md:items-end">
                  <p className="font-bold text-foreground">
                    {formatCurrency(Number(conta.valor))}
                  </p>

                  <p
                    className={
                      conta.status === "pago"
                        ? "text-xs font-semibold text-success"
                        : "text-xs font-semibold text-warning"
                    }
                  >
                    {conta.status === "pago" ? "Pago" : "Pendente"}
                  </p>

                  {conta.status === "pendente" && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => abrirBaixaConta(conta)}
                    >
                      Dar baixa
                    </Button>
                  )}
                </div>
              </div>
            ))}

            {contasPagarFiltradas.length === 0 && (
              <p className="py-4 text-center text-muted-foreground">
                {mensagemFiltroVazio("pagar")}
              </p>
            )}
          </div>
        </div>

        {openSangria && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-md rounded-[30px] bg-card p-6 shadow-2xl">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-foreground">
                  Nova Sangria
                </h2>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setOpenSangria(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Valor</Label>

                  <Input
                    type="number"
                    placeholder="0,00"
                    value={formSangria.valor}
                    onChange={(e) =>
                      setFormSangria((prev) => ({
                        ...prev,
                        valor: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Motivo</Label>

                  <Input
                    placeholder="Ex: Retirada do caixa"
                    value={formSangria.motivo}
                    onChange={(e) =>
                      setFormSangria((prev) => ({
                        ...prev,
                        motivo: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Forma de pagamento</Label>

                  <select
                    value={formSangria.forma_pagamento}
                    onChange={(e) =>
                      setFormSangria((prev) => ({
                        ...prev,
                        forma_pagamento: e.target.value,
                      }))
                    }
                    className="w-full rounded-[30px] border border-border bg-secondary px-4 py-3 text-sm text-foreground"
                  >
                    <option value="dinheiro">Dinheiro</option>
                    <option value="pix">PIX</option>
                    <option value="cartao">Cartão</option>
                    <option value="transferencia">Transferência</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>Observação</Label>

                  <Input
                    placeholder="Opcional"
                    value={formSangria.observacao}
                    onChange={(e) =>
                      setFormSangria((prev) => ({
                        ...prev,
                        observacao: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOpenSangria(false)}
                  >
                    Cancelar
                  </Button>

                  <Button
                    type="button"
                    onClick={salvarSangria}
                    disabled={savingSangria}
                  >
                    {savingSangria ? "Salvando..." : "Salvar Sangria"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {openConta && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-lg rounded-[30px] bg-card p-6 shadow-2xl">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-foreground">
                  Nova Conta a Pagar
                </h2>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setOpenConta(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Input
                    placeholder="Ex: Energia, internet, fornecedor..."
                    value={formConta.descricao}
                    onChange={(e) =>
                      setFormConta((prev) => ({
                        ...prev,
                        descricao: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Fornecedor</Label>
                  <Input
                    placeholder="Opcional"
                    value={formConta.fornecedor}
                    onChange={(e) =>
                      setFormConta((prev) => ({
                        ...prev,
                        fornecedor: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Input
                    placeholder="Ex: Despesa fixa, manutenção..."
                    value={formConta.categoria}
                    onChange={(e) =>
                      setFormConta((prev) => ({
                        ...prev,
                        categoria: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Valor</Label>
                  <Input
                    type="number"
                    placeholder="0,00"
                    value={formConta.valor}
                    onChange={(e) =>
                      setFormConta((prev) => ({
                        ...prev,
                        valor: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Data de vencimento</Label>
                  <Input
                    type="date"
                    value={formConta.data_vencimento}
                    onChange={(e) =>
                      setFormConta((prev) => ({
                        ...prev,
                        data_vencimento: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Forma de pagamento prevista</Label>
                  <select
                    value={formConta.forma_pagamento}
                    onChange={(e) =>
                      setFormConta((prev) => ({
                        ...prev,
                        forma_pagamento: e.target.value,
                      }))
                    }
                    className="w-full rounded-[30px] border border-border bg-secondary px-4 py-3 text-sm text-foreground"
                  >
                    <option value="dinheiro">Dinheiro</option>
                    <option value="pix">PIX</option>
                    <option value="cartao">Cartão</option>
                    <option value="transferencia">Transferência</option>
                    <option value="boleto">Boleto</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>Observação</Label>
                  <Input
                    placeholder="Opcional"
                    value={formConta.observacao}
                    onChange={(e) =>
                      setFormConta((prev) => ({
                        ...prev,
                        observacao: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOpenConta(false)}
                  >
                    Cancelar
                  </Button>

                  <Button
                    type="button"
                    onClick={salvarConta}
                    disabled={savingConta}
                  >
                    {savingConta ? "Salvando..." : "Salvar Conta"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {openContaReceber && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-lg rounded-[30px] bg-card p-6 shadow-2xl">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-foreground">
                  Nova Conta a Receber
                </h2>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setOpenContaReceber(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Input
                    placeholder="Ex: Débito de cliente, parcela, venda..."
                    value={formContaReceber.descricao}
                    onChange={(e) =>
                      setFormContaReceber((prev) => ({
                        ...prev,
                        descricao: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Cliente</Label>
                  <Input
                    placeholder="Nome do cliente"
                    value={formContaReceber.cliente_nome}
                    onChange={(e) =>
                      setFormContaReceber((prev) => ({
                        ...prev,
                        cliente_nome: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Input
                    placeholder="Ex: Locação, venda, parcela..."
                    value={formContaReceber.categoria}
                    onChange={(e) =>
                      setFormContaReceber((prev) => ({
                        ...prev,
                        categoria: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Valor</Label>
                  <Input
                    type="number"
                    placeholder="0,00"
                    value={formContaReceber.valor}
                    onChange={(e) =>
                      setFormContaReceber((prev) => ({
                        ...prev,
                        valor: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Data de vencimento</Label>
                  <Input
                    type="date"
                    value={formContaReceber.data_vencimento}
                    onChange={(e) =>
                      setFormContaReceber((prev) => ({
                        ...prev,
                        data_vencimento: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Forma de recebimento prevista</Label>
                  <select
                    value={formContaReceber.forma_pagamento}
                    onChange={(e) =>
                      setFormContaReceber((prev) => ({
                        ...prev,
                        forma_pagamento: e.target.value,
                      }))
                    }
                    className="w-full rounded-[30px] border border-border bg-secondary px-4 py-3 text-sm text-foreground"
                  >
                    <option value="dinheiro">Dinheiro</option>
                    <option value="pix">PIX</option>
                    <option value="cartao">Cartão</option>
                    <option value="transferencia">Transferência</option>
                    <option value="boleto">Boleto</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>Observação</Label>
                  <Input
                    placeholder="Opcional"
                    value={formContaReceber.observacao}
                    onChange={(e) =>
                      setFormContaReceber((prev) => ({
                        ...prev,
                        observacao: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOpenContaReceber(false)}
                  >
                    Cancelar
                  </Button>

                  <Button
                    type="button"
                    onClick={salvarContaReceber}
                    disabled={savingContaReceber}
                  >
                    {savingContaReceber ? "Salvando..." : "Salvar Conta"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {baixandoConta && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-md rounded-[30px] bg-card p-6 shadow-2xl">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-foreground">
                  Dar Baixa na Conta
                </h2>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setBaixandoConta(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl bg-secondary p-4">
                  <p className="text-sm font-semibold text-foreground">
                    {baixandoConta.descricao}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Valor: {formatCurrency(Number(baixandoConta.valor))}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Forma de pagamento</Label>
                  <select
                    value={formBaixa.forma_pagamento}
                    onChange={(e) =>
                      setFormBaixa((prev) => ({
                        ...prev,
                        forma_pagamento: e.target.value,
                      }))
                    }
                    className="w-full rounded-[30px] border border-border bg-secondary px-4 py-3 text-sm text-foreground"
                  >
                    <option value="dinheiro">Dinheiro</option>
                    <option value="pix">PIX</option>
                    <option value="cartao">Cartão</option>
                    <option value="transferencia">Transferência</option>
                    <option value="boleto">Boleto</option>
                  </select>
                </div>

                <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-border bg-secondary p-4 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={formBaixa.retirar_do_caixa}
                    onChange={(e) =>
                      setFormBaixa((prev) => ({
                        ...prev,
                        retirar_do_caixa: e.target.checked,
                      }))
                    }
                  />
                  Retirar esse valor do caixa
                </label>

                {!formBaixa.retirar_do_caixa && (
                  <p className="rounded-2xl bg-secondary p-3 text-xs text-muted-foreground">
                    Marcado como dinheiro externo: a conta será paga, mas o
                    valor não será descontado do saldo em caixa.
                  </p>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setBaixandoConta(null)}
                  >
                    Cancelar
                  </Button>

                  <Button
                    type="button"
                    onClick={darBaixaConta}
                    disabled={savingBaixa}
                  >
                    {savingBaixa ? "Baixando..." : "Confirmar Baixa"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {recebendoConta && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-md rounded-[30px] bg-card p-6 shadow-2xl">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-foreground">
                  Receber Conta
                </h2>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setRecebendoConta(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl bg-secondary p-4">
                  <p className="text-sm font-semibold text-foreground">
                    {recebendoConta.descricao}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Valor: {formatCurrency(Number(recebendoConta.valor))}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Forma de recebimento</Label>
                  <select
                    value={formRecebimento.forma_pagamento}
                    onChange={(e) =>
                      setFormRecebimento((prev) => ({
                        ...prev,
                        forma_pagamento: e.target.value,
                      }))
                    }
                    className="w-full rounded-[30px] border border-border bg-secondary px-4 py-3 text-sm text-foreground"
                  >
                    <option value="dinheiro">Dinheiro</option>
                    <option value="pix">PIX</option>
                    <option value="cartao">Cartão</option>
                    <option value="transferencia">Transferência</option>
                    <option value="boleto">Boleto</option>
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setRecebendoConta(null)}
                  >
                    Cancelar
                  </Button>

                  <Button
                    type="button"
                    onClick={receberConta}
                    disabled={savingRecebimento}
                  >
                    {savingRecebimento ? "Recebendo..." : "Confirmar Recebimento"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}