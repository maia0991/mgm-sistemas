import { useEffect, useMemo, useState } from "react";
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
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Search, CheckCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

type TipoCobranca = "diaria" | "mensal";

type DiaNaoCobradoItem = {
  id: string;
  data: string | null;
  tipo?: string | null;
  ativo?: boolean | null;
};

type ClienteResumo = {
  id: string;
  nome_completo: string | null;
};

type EquipamentoResumo = {
  id: string;
  valor_diaria?: number | string | null;
};

type ItemLocacaoComData = {
  id?: string;
  equipamento_id: string;
  quantidade_locada: number | string;
  valor_diaria_fechado: number | string | null;
  tipo_cobranca?: TipoCobranca | string | null;
  data_inicio_cobranca?: string | null;
  equipamentos?: EquipamentoResumo | null;
};

type LocacaoComClienteItem = {
  id: string;
  numero_contrato: number | string | null;
  situacao: string | null;
  data_inicio: string;
  data_previsao_entrega: string;
  data_devolucao_real?: string | null;
  taxa_entrega?: number | string | null;
  valor_desconto?: number | string | null;
  valor_total_pago?: number | string | null;
  valor_total_final?: number | string | null;
  valor_avaria?: number | string | null;
  locadora_id?: string | null;
  cobrar_domingo: boolean | null;
  clientes: ClienteResumo | null;
  itens_locacao: ItemLocacaoComData[];
};

function normalizarTipo(tipo?: string | null): TipoCobranca {
  if (tipo === "mensal") return "mensal";
  return "diaria";
}

function isDataDepois(dataA: string, dataB: string) {
  return new Date(dataA + "T12:00:00").getTime() > new Date(dataB + "T12:00:00").getTime();
}

function calcularValorLocacaoPorItens(
  locacao: LocacaoComClienteItem,
  dataFinal: string,
  feriados: DiaNaoCobradoItem[]
) {
  const itens = locacao.itens_locacao || [];
  const dataVencimento = locacao.data_previsao_entrega;
  const valorContratoFechado = Number(locacao.valor_total_final || 0);

  const temItemMensal = itens.some(
    (item) => normalizarTipo(item.tipo_cobranca) === "mensal"
  );

  if (temItemMensal) {
    const valorBaseContrato =
      valorContratoFechado -
      Number(locacao.taxa_entrega || 0) +
      Number(locacao.valor_desconto || 0);

    if (!dataVencimento || !isDataDepois(dataFinal, dataVencimento)) {
      return {
        subtotalItens: valorBaseContrato,
        diasExtras: 0,
        valorExtras: 0,
      };
    }

    const valorExtras = itens.reduce((soma, item) => {
      const tipo = normalizarTipo(item.tipo_cobranca);

      if (tipo !== "mensal") return soma;

      const diasExtras = calcularDiasCobrados(
        new Date(dataVencimento + "T12:00:00"),
        new Date(dataFinal + "T12:00:00"),
        feriados as never,
        !!locacao.cobrar_domingo
      );

      return (
        soma +
        Number(item.quantidade_locada || 0) *
          Number(item.equipamentos?.valor_diaria || 0) *
          diasExtras
      );
    }, 0);

    const diasExtras = calcularDiasCobrados(
      new Date(dataVencimento + "T12:00:00"),
      new Date(dataFinal + "T12:00:00"),
      feriados as never,
      !!locacao.cobrar_domingo
    );

    return {
      subtotalItens: valorBaseContrato + valorExtras,
      diasExtras,
      valorExtras,
    };
  }

  const subtotalItens = itens.reduce((soma, item) => {
    const inicio = item.data_inicio_cobranca || locacao.data_inicio;

    const dias = calcularDiasCobrados(
      new Date(inicio + "T12:00:00"),
      new Date(dataFinal + "T12:00:00"),
      feriados as never,
      !!locacao.cobrar_domingo
    );

    return (
      soma +
      Number(item.quantidade_locada || 0) *
        Number(item.valor_diaria_fechado || 0) *
        dias
    );
  }, 0);

  return {
    subtotalItens,
    diasExtras: 0,
    valorExtras: 0,
  };
}

export default function DevolucaoPage() {
  const { statusFinanceiro, role } = useAuth();

  const [locacoes, setLocacoes] = useState<LocacaoComClienteItem[]>([]);
  const [feriados, setFeriados] = useState<DiaNaoCobradoItem[]>([]);
  const [search, setSearch] = useState("");
  const [baixaOpen, setBaixaOpen] = useState(false);
  const [selectedLocacao, setSelectedLocacao] =
    useState<LocacaoComClienteItem | null>(null);
  const [dataDevolucao, setDataDevolucao] = useState("");
  const [valorAvaria, setValorAvaria] = useState(0);
  const [descontoBaixa, setDescontoBaixa] = useState(0);
  const [clienteFicouDevendo, setClienteFicouDevendo] = useState(false);
  const [dataVencimentoDebito, setDataVencimentoDebito] = useState("");
  const [observacaoDebito, setObservacaoDebito] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const mostrarAvisoFinanceiro =
    role !== "admin" &&
    (statusFinanceiro === "expired" || statusFinanceiro === "blocked");

  useEffect(() => {
    void fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);

      const [l, f] = await Promise.all([
        supabase
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
          .eq("situacao", "ativo")
          .order("data_previsao_entrega", { ascending: true }),
        supabase
          .from("dias_nao_cobrados")
          .select("*")
          .eq("ativo", true),
      ]);

      if (l.error) {
        console.error("Erro ao buscar locações:", l.error);
        toast.error("Erro ao carregar locações");
        return;
      }

      if (f.error) {
        console.error("Erro ao buscar feriados:", f.error);
        toast.error("Erro ao carregar feriados");
        return;
      }

      setLocacoes((l.data as unknown as LocacaoComClienteItem[]) || []);
      setFeriados((f.data as unknown as DiaNaoCobradoItem[]) || []);
    } catch (error) {
      console.error("Erro inesperado ao carregar devoluções:", error);
      toast.error("Erro inesperado ao carregar devoluções");
    } finally {
      setLoading(false);
    }
  }

  function openBaixa(loc: LocacaoComClienteItem) {
    if (mostrarAvisoFinanceiro) {
      toast.warning(
        "Seu plano está vencido, mas devoluções continuam liberadas."
      );
    }

    setSelectedLocacao(loc);
    setDataDevolucao("");
    setValorAvaria(0);
    setDescontoBaixa(0);
    setClienteFicouDevendo(false);
    setDataVencimentoDebito("");
    setObservacaoDebito("");
    setBaixaOpen(true);
  }

  const baixaPreview = useMemo(() => {
    if (!selectedLocacao || !dataDevolucao) return null;

    const diasReais = calcularDiasCobrados(
      new Date(selectedLocacao.data_inicio + "T12:00:00"),
      new Date(dataDevolucao + "T12:00:00"),
      feriados as never,
      !!selectedLocacao.cobrar_domingo
    );

    const resultadoItens = calcularValorLocacaoPorItens(
      selectedLocacao,
      dataDevolucao,
      feriados
    );

    const subtotalItens = resultadoItens.subtotalItens;

    const valorCalculado =
      subtotalItens +
      Number(selectedLocacao.taxa_entrega || 0) -
      Number(selectedLocacao.valor_desconto || 0) +
      valorAvaria -
      descontoBaixa;

    const entrada = Number(selectedLocacao.valor_total_pago || 0);
    const saldo = valorCalculado - entrada;

    return {
      diasReais,
      diasExtras: resultadoItens.diasExtras,
      valorExtras: resultadoItens.valorExtras,
      valorCalculado,
      entrada,
      saldo,
    };
  }, [
    selectedLocacao,
    dataDevolucao,
    feriados,
    valorAvaria,
    descontoBaixa,
  ]);

  async function getUserLocadoraId() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: perfil, error } = await supabase
      .from("perfis")
      .select("locadora_id")
      .eq("user_id", user?.id)
      .maybeSingle();

    if (error) {
      console.error("Erro ao buscar perfil:", error);
      return null;
    }

    return {
      user,
      locadora_id: perfil?.locadora_id || null,
    };
  }

  async function handleBaixa() {
    if (!selectedLocacao || !dataDevolucao || !baixaPreview) {
      toast.error("Preencha a data de devolução");
      return;
    }

    if (clienteFicouDevendo) {
      if (baixaPreview.saldo <= 0) {
        toast.error("Não existe saldo em aberto para lançar no contas a receber.");
        return;
      }

      if (!dataVencimentoDebito) {
        toast.error("Informe a data de vencimento do débito.");
        return;
      }
    }

    try {
      setSaving(true);

      const valorPagoFinal = clienteFicouDevendo
        ? Number(selectedLocacao.valor_total_pago || 0)
        : baixaPreview.valorCalculado;

      const { error: updateLocacaoError } = await supabase
        .from("locacoes")
        .update({
          data_devolucao_real: dataDevolucao,
          valor_avaria: valorAvaria,
          valor_total_final: baixaPreview.valorCalculado,
          valor_total_pago: valorPagoFinal,
          situacao: "finalizado",
        })
        .eq("id", selectedLocacao.id);

      if (updateLocacaoError) {
        console.error("Erro ao finalizar locação:", updateLocacaoError);
        toast.error("Erro ao registrar devolução");
        return;
      }

      if (clienteFicouDevendo && baixaPreview.saldo > 0) {
        const authData = await getUserLocadoraId();

        const locadoraId =
          selectedLocacao.locadora_id || authData?.locadora_id || null;

        if (!locadoraId) {
          toast.error("Locadora não identificada para lançar conta a receber.");
          return;
        }

        const { error: contaReceberError } = await (supabase as any)
          .from("contas_receber")
          .insert({
            locadora_id: locadoraId,
            usuario_id: authData?.user?.id || null,
            descricao: `Débito da locação #${selectedLocacao.numero_contrato}`,
            cliente_nome: selectedLocacao.clientes?.nome_completo || null,
            categoria: "Locação",
            valor: baixaPreview.saldo,
            data_vencimento: dataVencimentoDebito,
            status: "pendente",
            forma_pagamento: null,
            observacao:
              observacaoDebito.trim() ||
              `Saldo em aberto da locação #${selectedLocacao.numero_contrato}`,
          });

        if (contaReceberError) {
          console.error("Erro ao criar conta a receber:", contaReceberError);
          toast.error("Devolução feita, mas erro ao criar conta a receber.");
          return;
        }
      }

      for (const item of selectedLocacao.itens_locacao || []) {
        const { data: eq, error: eqError } = await supabase
          .from("equipamentos")
          .select("quantidade_disponivel")
          .eq("id", item.equipamento_id)
          .maybeSingle();

        if (eqError) {
          console.error("Erro ao consultar equipamento:", eqError);
          continue;
        }

        if (eq) {
          const { error: estoqueError } = await supabase
            .from("equipamentos")
            .update({
              quantidade_disponivel:
                Number(eq.quantidade_disponivel) +
                Number(item.quantidade_locada),
            })
            .eq("id", item.equipamento_id);

          if (estoqueError) {
            console.error("Erro ao devolver item ao estoque:", estoqueError);
          }
        }
      }

      toast.success(
        clienteFicouDevendo
          ? "Devolução registrada e conta a receber criada!"
          : "Devolução registrada com pagamento confirmado!"
      );

      setBaixaOpen(false);
      setSelectedLocacao(null);
      setClienteFicouDevendo(false);
      setDataVencimentoDebito("");
      setObservacaoDebito("");
      await fetchData();
    } catch (error) {
      console.error("Erro inesperado ao registrar devolução:", error);
      toast.error("Erro inesperado ao registrar devolução");
    } finally {
      setSaving(false);
    }
  }

  const filtered = locacoes.filter(
    (l) =>
      (l.clientes?.nome_completo || "")
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      String(l.numero_contrato || "").includes(search)
  );

  return (
    <Layout>
      <div className="animate-fade-in space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Devolução</h1>
          <p className="text-muted-foreground">Dê baixa nos aluguéis ativos</p>
        </div>

        {mostrarAvisoFinanceiro && (
          <div className="rounded-[30px] border border-yellow-500/30 bg-yellow-500/10 p-4">
            <p className="text-sm font-medium text-yellow-400">
              Seu plano está vencido ou bloqueado. Novas ações estão restritas,
              mas devoluções continuam liberadas.
            </p>
          </div>
        )}

        <div className="relative">
          <Search className="absolute left-4 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            className="rounded-[30px] pl-10"
            placeholder="Buscar por cliente ou contrato..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="space-y-3">
          {loading ? (
            <p className="py-8 text-center text-muted-foreground">
              Carregando...
            </p>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              Nenhum aluguel ativo para devolução.
            </p>
          ) : (
            filtered.map((l) => (
              <div
                key={l.id}
                className="rounded-[30px] border border-border bg-card p-5 transition-all hover:border-primary/30"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <p className="font-semibold text-foreground">
                        #{l.numero_contrato}
                      </p>
                      <Badge className={situacaoColor(l.situacao || "")}>
                        {situacaoLabel(l.situacao || "")}
                      </Badge>
                    </div>

                    <p className="mt-1 text-sm text-muted-foreground">
                      {l.clientes?.nome_completo}
                    </p>

                    <p className="text-xs text-muted-foreground">
                      {formatDate(l.data_inicio)} →{" "}
                      {formatDate(l.data_previsao_entrega)} |{" "}
                      {formatCurrency(Number(l.valor_total_final || 0))}
                      {Number(l.valor_total_pago || 0) > 0 && (
                        <span className="text-success">
                          {" "}
                          (Entrada:{" "}
                          {formatCurrency(Number(l.valor_total_pago || 0))})
                        </span>
                      )}
                    </p>
                  </div>

                  <Button
                    className="gap-2 rounded-[30px]"
                    onClick={() => openBaixa(l)}
                  >
                    <CheckCircle className="h-4 w-4" />
                    Dar Baixa
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        <Dialog open={baixaOpen} onOpenChange={setBaixaOpen}>
          <DialogContent className="max-h-[90vh] overflow-auto rounded-[30px] border-border bg-card sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-foreground">
                Registrar Devolução
              </DialogTitle>
            </DialogHeader>

            {selectedLocacao && (
              <div className="space-y-4">
                <div className="rounded-2xl bg-secondary p-4">
                  <p className="font-medium text-foreground">
                    Contrato #{selectedLocacao.numero_contrato}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Cliente: {selectedLocacao.clientes?.nome_completo}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Início: {formatDate(selectedLocacao.data_inicio)} •
                    Previsão: {formatDate(selectedLocacao.data_previsao_entrega)}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-foreground">Data da devolução</Label>
                  <Input
                    className="rounded-[30px]"
                    type="date"
                    value={dataDevolucao}
                    onChange={(e) => setDataDevolucao(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-foreground">Valor de avaria</Label>
                  <Input
                    className="rounded-[30px]"
                    type="number"
                    step="0.01"
                    value={valorAvaria}
                    onChange={(e) =>
                      setValorAvaria(parseFloat(e.target.value) || 0)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-foreground">Desconto</Label>
                  <Input
                    className="rounded-[30px]"
                    type="number"
                    step="0.01"
                    value={descontoBaixa}
                    onChange={(e) =>
                      setDescontoBaixa(parseFloat(e.target.value) || 0)
                    }
                  />
                </div>

                {baixaPreview && (
                  <div className="space-y-2 rounded-2xl border border-primary/20 bg-primary/5 p-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Dias totais
                      </span>
                      <span className="font-medium text-foreground">
                        {baixaPreview.diasReais}
                      </span>
                    </div>

                    {baixaPreview.diasExtras > 0 && (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            Diárias extras após vencimento
                          </span>
                          <span className="font-medium text-foreground">
                            {baixaPreview.diasExtras}
                          </span>
                        </div>

                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            Valor das diárias extras
                          </span>
                          <span className="font-medium text-foreground">
                            {formatCurrency(baixaPreview.valorExtras)}
                          </span>
                        </div>
                      </>
                    )}

                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Valor calculado
                      </span>
                      <span className="font-medium text-foreground">
                        {formatCurrency(baixaPreview.valorCalculado)}
                      </span>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Entrada</span>
                      <span className="font-medium text-success">
                        {formatCurrency(baixaPreview.entrada)}
                      </span>
                    </div>

                    <div className="flex justify-between border-t border-border pt-2 text-sm">
                      <span className="font-medium text-foreground">Saldo</span>
                      <span className="font-bold text-primary">
                        {formatCurrency(baixaPreview.saldo)}
                      </span>
                    </div>
                  </div>
                )}

                {baixaPreview && baixaPreview.saldo > 0 && (
                  <div className="space-y-4 rounded-2xl border border-border bg-secondary p-4">
                    <label className="flex cursor-pointer items-center gap-3 text-sm text-foreground">
                      <input
                        type="checkbox"
                        checked={clienteFicouDevendo}
                        onChange={(e) =>
                          setClienteFicouDevendo(e.target.checked)
                        }
                      />
                      Cliente ficou devendo e quero lançar em Contas a Receber
                    </label>

                    {clienteFicouDevendo && (
                      <>
                        <div className="space-y-2">
                          <Label className="text-foreground">
                            Valor que irá para contas a receber
                          </Label>
                          <Input
                            className="rounded-[30px]"
                            value={formatCurrency(baixaPreview.saldo)}
                            disabled
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-foreground">
                            Data de vencimento do débito
                          </Label>
                          <Input
                            className="rounded-[30px]"
                            type="date"
                            value={dataVencimentoDebito}
                            onChange={(e) =>
                              setDataVencimentoDebito(e.target.value)
                            }
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-foreground">Observação</Label>
                          <Input
                            className="rounded-[30px]"
                            placeholder="Opcional"
                            value={observacaoDebito}
                            onChange={(e) =>
                              setObservacaoDebito(e.target.value)
                            }
                          />
                        </div>
                      </>
                    )}
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    className="rounded-[30px]"
                    onClick={() => setBaixaOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    className="rounded-[30px]"
                    onClick={handleBaixa}
                    disabled={saving}
                  >
                    {saving ? "Salvando..." : "Confirmar Baixa"}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}