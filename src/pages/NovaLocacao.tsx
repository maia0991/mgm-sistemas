import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Equipamento,
  DiaNaoCobrado,
  ItemLocacaoForm,
  Cliente,
  TipoCobranca,
} from "@/types";
import {
  calcularDiasCobrados,
  formatCurrency,
  tipoCobrancaLabel,
} from "@/lib/calculos";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Minus, X, ImagePlus } from "lucide-react";
import ActionGuard from "@/components/ActionGuard";
import { useBillingAccess } from "@/hooks/useBillingAccess";
import { useAuth } from "@/contexts/AuthContext";

type FotoEntregaPreview = {
  id: string;
  file: File;
  preview: string;
};

type EquipamentoComValores = Equipamento & {
  valor_semanal?: number | string | null;
  valor_mensal?: number | string | null;
};

type ItemLocacaoFormCompleto = ItemLocacaoForm & {
  tipo_cobranca: TipoCobranca;
};

function getValorPorTipo(eq: EquipamentoComValores, tipo: TipoCobranca) {
  if (tipo === "mensal") return Number(eq.valor_mensal || 0);
  return Number(eq.valor_diaria || 0);
}

function addMeses(data: string, meses: number) {
  if (!data) return "";

  const d = new Date(data + "T12:00:00");
  d.setMonth(d.getMonth() + meses);

  return d.toISOString().split("T")[0];
}

export default function NovaLocacaoPage() {
  const navigate = useNavigate();
  const { blockedByBilling } = useBillingAccess();
  const { locadoraId } = useAuth();

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [equipamentos, setEquipamentos] = useState<EquipamentoComValores[]>([]);
  const [feriados, setFeriados] = useState<DiaNaoCobrado[]>([]);

  const [clienteId, setClienteId] = useState("");
  const [itens, setItens] = useState<ItemLocacaoFormCompleto[]>([]);
  const [tipoCobrancaPadrao, setTipoCobrancaPadrao] =
    useState<TipoCobranca>("diaria");

  const [dataInicio, setDataInicio] = useState("");
  const [dataPrevisao, setDataPrevisao] = useState("");
  const [quantidadeMeses, setQuantidadeMeses] = useState(1);
  const [semPrevisaoDevolucao, setSemPrevisaoDevolucao] = useState(false);

  const [taxaEntrega, setTaxaEntrega] = useState(0);
  const [valorDesconto, setValorDesconto] = useState(0);
  const [valorEntrada, setValorEntrada] = useState(0);
  const [cobrarDomingo, setCobrarDomingo] = useState(false);
  const [notas, setNotas] = useState("");

  const [fotosEntrega, setFotosEntrega] = useState<FotoEntregaPreview[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void fetchData();

    return () => {
      fotosEntrega.forEach((foto) => URL.revokeObjectURL(foto.preview));
    };
  }, []);

  useEffect(() => {
    if (!dataInicio || semPrevisaoDevolucao) return;

    if (tipoCobrancaPadrao === "mensal") {
      setDataPrevisao(addMeses(dataInicio, quantidadeMeses));
    }
  }, [dataInicio, quantidadeMeses, tipoCobrancaPadrao, semPrevisaoDevolucao]);

  async function fetchData() {
    try {
      setLoading(true);

      const [c, e, f] = await Promise.all([
        supabase.from("clientes").select("*").order("nome_completo"),
        supabase
          .from("equipamentos")
          .select("*")
          .eq("ativo", true)
          .order("nome"),
        supabase.from("dias_nao_cobrados").select("*").eq("ativo", true),
      ]);

      if (c.error) {
        console.error("Erro ao buscar clientes:", c.error);
        toast.error("Erro ao carregar clientes");
        return;
      }

      if (e.error) {
        console.error("Erro ao buscar equipamentos:", e.error);
        toast.error("Erro ao carregar equipamentos");
        return;
      }

      if (f.error) {
        console.error("Erro ao buscar feriados:", f.error);
        toast.error("Erro ao carregar feriados");
        return;
      }

      setClientes((c.data as unknown as Cliente[]) || []);
      setEquipamentos((e.data as unknown as EquipamentoComValores[]) || []);
      setFeriados((f.data as unknown as DiaNaoCobrado[]) || []);
    } catch (error) {
      console.error("Erro inesperado ao carregar nova locação:", error);
      toast.error("Erro inesperado ao carregar dados");
    } finally {
      setLoading(false);
    }
  }

  function addItem(eq: EquipamentoComValores) {
    const existing = itens.find((i) => i.equipamento_id === eq.id);

    if (eq.quantidade_disponivel <= 0 && !existing) {
      toast.error("Sem estoque disponível");
      return;
    }

    if (existing) {
      const novaQtd = existing.quantidade_locada + 1;

      if (novaQtd > eq.quantidade_disponivel) {
        toast.error("Quantidade acima do estoque disponível");
        return;
      }

      setItens(
        itens.map((i) =>
          i.equipamento_id === eq.id
            ? { ...i, quantidade_locada: novaQtd }
            : i
        )
      );
    } else {
      const tipoPadrao: TipoCobranca = tipoCobrancaPadrao;

      setItens([
        ...itens,
        {
          equipamento_id: eq.id,
          equipamento_nome: eq.nome,
          quantidade_locada: 1,
          valor_diaria_fechado: getValorPorTipo(eq, tipoPadrao),
          tipo_cobranca: tipoPadrao,
        },
      ]);
    }
  }

  function removeItem(eqId: string) {
    setItens(itens.filter((i) => i.equipamento_id !== eqId));
  }

  function updateQty(eqId: string, delta: number) {
    const eq = equipamentos.find((e) => e.id === eqId);
    if (!eq) return;

    setItens(
      itens.map((i) => {
        if (i.equipamento_id !== eqId) return i;

        const newQty = Math.max(
          1,
          Math.min(i.quantidade_locada + delta, eq.quantidade_disponivel)
        );

        return { ...i, quantidade_locada: newQty };
      })
    );
  }

  function setManualQty(eqId: string, value: string) {
    const eq = equipamentos.find((e) => e.id === eqId);
    if (!eq) return;

    let quantidade = Number(value);

    if (Number.isNaN(quantidade)) return;
    if (quantidade < 1) quantidade = 1;

    if (quantidade > eq.quantidade_disponivel) {
      quantidade = eq.quantidade_disponivel;
      toast.error("Quantidade acima do estoque disponível");
    }

    setItens(
      itens.map((i) =>
        i.equipamento_id === eqId
          ? { ...i, quantidade_locada: quantidade }
          : i
      )
    );
  }

  function alterarTipoCobranca(eqId: string, tipo: TipoCobranca) {
    const eq = equipamentos.find((e) => e.id === eqId);

    setItens(
      itens.map((i) => {
        if (i.equipamento_id !== eqId) return i;

        return {
          ...i,
          tipo_cobranca: tipo,
          valor_diaria_fechado: eq
            ? getValorPorTipo(eq, tipo)
            : i.valor_diaria_fechado,
        };
      })
    );
  }

  function alterarTipoCobrancaPadrao(tipo: TipoCobranca) {
    setTipoCobrancaPadrao(tipo);

    if (tipo === "diaria") {
      setQuantidadeMeses(1);
    }

    setItens(
      itens.map((item) => {
        const eq = equipamentos.find((e) => e.id === item.equipamento_id);

        return {
          ...item,
          tipo_cobranca: tipo,
          valor_diaria_fechado: eq
            ? getValorPorTipo(eq, tipo)
            : item.valor_diaria_fechado,
        };
      })
    );
  }

  function alterarValorFechado(eqId: string, value: string) {
    const valor = Number(value);

    setItens(
      itens.map((i) =>
        i.equipamento_id === eqId
          ? {
              ...i,
              valor_diaria_fechado: Number.isNaN(valor) ? 0 : valor,
            }
          : i
      )
    );
  }

  function handleSemPrevisaoDevolucao(value: boolean) {
    setSemPrevisaoDevolucao(value);

    if (value) {
      setDataPrevisao("");
    }
  }

  function handleFotosEntrega(files: FileList | null) {
    if (!files || files.length === 0) return;

    const novasFotos = Array.from(files).map((file) => ({
      id: crypto.randomUUID(),
      file,
      preview: URL.createObjectURL(file),
    }));

    setFotosEntrega((prev) => [...prev, ...novasFotos]);
  }

  function removerFotoEntrega(id: string) {
    setFotosEntrega((prev) => {
      const foto = prev.find((f) => f.id === id);

      if (foto) {
        URL.revokeObjectURL(foto.preview);
      }

      return prev.filter((f) => f.id !== id);
    });
  }

  const dataPrevisaoCalculada = useMemo(() => {
    if (semPrevisaoDevolucao) return "";

    if (tipoCobrancaPadrao === "mensal") {
      return addMeses(dataInicio, quantidadeMeses);
    }

    return dataPrevisao;
  }, [
    dataInicio,
    dataPrevisao,
    tipoCobrancaPadrao,
    quantidadeMeses,
    semPrevisaoDevolucao,
  ]);

  const diasCobrados = useMemo(() => {
    if (!dataInicio || !dataPrevisaoCalculada || semPrevisaoDevolucao) return 0;

    return calcularDiasCobrados(
      new Date(dataInicio + "T12:00:00"),
      new Date(dataPrevisaoCalculada + "T12:00:00"),
      feriados,
      cobrarDomingo
    );
  }, [
    dataInicio,
    dataPrevisaoCalculada,
    semPrevisaoDevolucao,
    feriados,
    cobrarDomingo,
  ]);

  const valorTotal = useMemo(() => {
    const totalItens = itens.reduce((soma, item) => {
      const quantidade = Number(item.quantidade_locada || 0);
      const valor = Number(item.valor_diaria_fechado || 0);

      if (item.tipo_cobranca === "mensal") {
        return soma + quantidade * valor * quantidadeMeses;
      }

      return soma + quantidade * valor * diasCobrados;
    }, 0);

    return totalItens + taxaEntrega - valorDesconto;
  }, [itens, diasCobrados, quantidadeMeses, taxaEntrega, valorDesconto]);

  const saldo = valorTotal - valorEntrada;

  async function gerarNumeroContratoUnico() {
    for (let tentativa = 0; tentativa < 10; tentativa++) {
      const numeroContrato = Math.floor(Math.random() * 900000) + 100000;

      const { data: contratoExistente, error } = await supabase
        .from("locacoes")
        .select("id")
        .eq("numero_contrato", numeroContrato)
        .maybeSingle();

      if (error) {
        console.error("Erro ao validar número de contrato:", error);
      }

      if (!contratoExistente) {
        return numeroContrato;
      }
    }

    return null;
  }

  async function salvarFotosEntrega(locacaoId: string) {
    if (fotosEntrega.length === 0) return;

    for (const foto of fotosEntrega) {
      const extensao = foto.file.name.split(".").pop() || "jpg";

      const caminho = `${locadoraId}/${locacaoId}/${crypto.randomUUID()}.${extensao}`;

      const { error: uploadError } = await supabase.storage
        .from("fotos-entrega")
        .upload(caminho, foto.file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        console.error("Erro ao enviar foto da entrega:", uploadError);
        toast.error("Locação criada, mas houve erro ao enviar uma foto.");
        continue;
      }

      const { error: fotoError } = await (supabase as any)
        .from("fotos_entrega_locacao")
        .insert({
          locadora_id: locadoraId,
          locacao_id: locacaoId,
          equipamento_id: null,
          url_foto: caminho,
          observacao: null,
        });

      if (fotoError) {
        console.error("Erro ao salvar registro da foto:", fotoError);
        toast.error("Foto enviada, mas não foi vinculada à locação.");
      }
    }
  }

  async function handleCreate() {
    if (blockedByBilling) {
      toast.error(
        "Seu plano está vencido ou bloqueado. Regularize para continuar."
      );
      return;
    }

    if (!locadoraId) {
      toast.error("Locadora não identificada.");
      return;
    }

    if (!clienteId) {
      toast.error("Selecione um cliente");
      return;
    }

    if (itens.length === 0) {
      toast.error("Adicione pelo menos um item");
      return;
    }

    if (!dataInicio) {
      toast.error("Preencha a data de início");
      return;
    }

    if (!semPrevisaoDevolucao && !dataPrevisaoCalculada) {
      toast.error("Informe a previsão de devolução ou marque sem previsão");
      return;
    }

    const numeroContrato = await gerarNumeroContratoUnico();

    if (!numeroContrato) {
      toast.error(
        "Não foi possível gerar um número de contrato. Tente novamente."
      );
      return;
    }

    try {
      setSaving(true);

      const { data: locacao, error: locacaoError } = await supabase
        .from("locacoes")
        .insert({
          cliente_id: clienteId,
          numero_contrato: numeroContrato,
          data_inicio: dataInicio,
          data_previsao_entrega: semPrevisaoDevolucao
            ? null
            : dataPrevisaoCalculada,
          taxa_entrega: taxaEntrega,
          valor_desconto: valorDesconto,
          valor_total_pago: valorEntrada,
          valor_total_final: valorTotal,
          cobrar_domingo: cobrarDomingo,
          notas_observacoes: notas || null,
          situacao: "ativo",
          locadora_id: locadoraId,
        })
        .select()
        .single();

      if (locacaoError || !locacao) {
        console.error("Erro ao criar locação:", locacaoError);
        toast.error("Erro ao criar locação");
        return;
      }

      const itensInsert = itens.map((i) => ({
        locacao_id: locacao.id,
        equipamento_id: i.equipamento_id,
        quantidade_locada: i.quantidade_locada,
        valor_diaria_fechado: i.valor_diaria_fechado,
        tipo_cobranca: i.tipo_cobranca || "diaria",
        locadora_id: locadoraId,
        data_inicio_cobranca: dataInicio,
      }));

      const { error: itensError } = await (supabase as any)
        .from("itens_locacao")
        .insert(itensInsert);

      if (itensError) {
        console.error("Erro ao salvar itens:", itensError);

        await supabase.from("locacoes").delete().eq("id", locacao.id);

        toast.error("Erro ao salvar itens da locação");
        return;
      }

      for (const item of itens) {
        const eq = equipamentos.find((e) => e.id === item.equipamento_id);
        if (!eq) continue;

        const { error } = await supabase
          .from("equipamentos")
          .update({
            quantidade_disponivel:
              Number(eq.quantidade_disponivel) -
              Number(item.quantidade_locada),
          })
          .eq("id", item.equipamento_id);

        if (error) {
          console.error("Erro ao atualizar estoque:", error);
        }
      }

      await salvarFotosEntrega(locacao.id);

      toast.success("Locação criada com sucesso!");
      navigate("/alugueis");
    } catch (error) {
      console.error("Erro inesperado ao criar locação:", error);
      toast.error("Erro inesperado ao criar locação");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Layout>
        <p className="p-8 text-muted-foreground">Carregando...</p>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="animate-fade-in max-w-5xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Nova Locação</h1>
          <p className="text-muted-foreground">
            Crie um novo aluguel para um cliente
          </p>
        </div>

        <div className="rounded-[30px] border border-border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Cliente</h2>

          <div className="space-y-2">
            <Label className="text-foreground">Selecione o cliente</Label>
            <select
              className="w-full rounded-[30px] border border-border bg-background px-4 py-2 text-foreground"
              value={clienteId}
              onChange={(e) => setClienteId(e.target.value)}
            >
              <option value="">Selecione...</option>
              {clientes.map((cliente) => (
                <option key={cliente.id} value={cliente.id}>
                  {cliente.nome_completo}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="rounded-[30px] border border-border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">
            Datas e valores
          </h2>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label className="text-foreground">Data de entrega</Label>
              <Input
                className="rounded-[30px]"
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
              />
            </div>

            <div>
              <Label className="text-foreground">Tipo de cobrança</Label>
              <select
                className="w-full rounded-[30px] border border-border bg-background px-4 py-2 text-foreground"
                value={tipoCobrancaPadrao}
                onChange={(e) =>
                  alterarTipoCobrancaPadrao(e.target.value as TipoCobranca)
                }
              >
                <option value="diaria">Diária</option>
                <option value="mensal">Mensal</option>
              </select>
            </div>

            {!semPrevisaoDevolucao && tipoCobrancaPadrao === "diaria" && (
              <div>
                <Label className="text-foreground">
                  Previsão de devolução
                </Label>
                <Input
                  className="rounded-[30px]"
                  type="date"
                  value={dataPrevisao}
                  onChange={(e) => setDataPrevisao(e.target.value)}
                />
              </div>
            )}

            {!semPrevisaoDevolucao && tipoCobrancaPadrao === "mensal" && (
              <div>
                <Label className="text-foreground">Quantidade de meses</Label>
                <Input
                  className="rounded-[30px]"
                  type="number"
                  min={1}
                  value={quantidadeMeses}
                  onChange={(e) =>
                    setQuantidadeMeses(Number(e.target.value) || 1)
                  }
                />
              </div>
            )}

            {!semPrevisaoDevolucao &&
              tipoCobrancaPadrao === "mensal" &&
              dataPrevisaoCalculada && (
                <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
                  <p className="text-sm text-muted-foreground">
                    Devolução prevista
                  </p>
                  <p className="font-semibold text-foreground">
                    {new Date(
                      dataPrevisaoCalculada + "T12:00:00"
                    ).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              )}

            <div className="flex items-center justify-between rounded-2xl border border-border p-4">
              <div>
                <p className="font-medium text-foreground">
                  Sem previsão de devolução
                </p>
                <p className="text-sm text-muted-foreground">
                  Use quando ainda não souber a data de devolução
                </p>
              </div>
              <Switch
                checked={semPrevisaoDevolucao}
                onCheckedChange={handleSemPrevisaoDevolucao}
              />
            </div>

            <div>
              <Label className="text-foreground">Taxa de entrega (R$)</Label>
              <Input
                className="rounded-[30px]"
                type="number"
                step="0.01"
                value={taxaEntrega}
                onChange={(e) =>
                  setTaxaEntrega(parseFloat(e.target.value) || 0)
                }
              />
            </div>

            <div>
              <Label className="text-foreground">Desconto (R$)</Label>
              <Input
                className="rounded-[30px]"
                type="number"
                step="0.01"
                value={valorDesconto}
                onChange={(e) =>
                  setValorDesconto(parseFloat(e.target.value) || 0)
                }
              />
            </div>

            <div>
              <Label className="text-foreground">Entrada paga (R$)</Label>
              <Input
                className="rounded-[30px]"
                type="number"
                step="0.01"
                value={valorEntrada}
                onChange={(e) =>
                  setValorEntrada(parseFloat(e.target.value) || 0)
                }
              />
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-border p-4">
              <div>
                <p className="font-medium text-foreground">Cobrar domingo</p>
                <p className="text-sm text-muted-foreground">
                  Define se domingo entra no cálculo
                </p>
              </div>
              <Switch
                checked={cobrarDomingo}
                onCheckedChange={setCobrarDomingo}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-foreground">Observações</Label>
            <Input
              className="rounded-[30px]"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
            />
          </div>
        </div>

        <div className="rounded-[30px] border border-border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">
            Equipamentos
          </h2>

          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {equipamentos.map((eq) => (
              <button
                key={eq.id}
                type="button"
                className="rounded-2xl bg-secondary p-3 text-left transition-colors hover:bg-primary/10"
                onClick={() => addItem(eq)}
              >
                <p className="text-sm font-medium text-foreground">
                  {eq.nome}
                </p>
                <p className="text-xs text-muted-foreground">
                  Diária: {formatCurrency(Number(eq.valor_diaria || 0))} •{" "}
                  Mensal: {formatCurrency(Number(eq.valor_mensal || 0))} •{" "}
                  Estoque: {eq.quantidade_disponivel}
                </p>
              </button>
            ))}
          </div>

          {itens.length > 0 && (
            <div className="space-y-3">
              {itens.map((item) => {
                const eq = equipamentos.find(
                  (e) => e.id === item.equipamento_id
                );
                const estoque = eq?.quantidade_disponivel || 0;

                const periodoTexto =
                  item.tipo_cobranca === "mensal"
                    ? `${quantidadeMeses} mensalidade${
                        quantidadeMeses === 1 ? "" : "s"
                      }`
                    : `${diasCobrados} diária${
                        diasCobrados === 1 ? "" : "s"
                      }`;

                const subtotal =
                  Number(item.quantidade_locada || 0) *
                  Number(item.valor_diaria_fechado || 0) *
                  (item.tipo_cobranca === "mensal"
                    ? quantidadeMeses
                    : diasCobrados);

                return (
                  <div
                    key={item.equipamento_id}
                    className="space-y-4 rounded-2xl bg-secondary p-4"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-medium text-foreground">
                          {item.equipamento_nome}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatCurrency(Number(item.valor_diaria_fechado))} por{" "}
                          {tipoCobrancaLabel(item.tipo_cobranca).toLowerCase()} •{" "}
                          Estoque: {estoque}
                        </p>
                      </div>

                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => removeItem(item.equipamento_id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <div>
                        <Label>Tipo de cobrança</Label>
                        <select
                          className="mt-2 w-full rounded-[30px] border border-border bg-background px-4 py-2 text-foreground"
                          value={item.tipo_cobranca || "diaria"}
                          onChange={(e) =>
                            alterarTipoCobranca(
                              item.equipamento_id,
                              e.target.value as TipoCobranca
                            )
                          }
                        >
                          <option value="diaria">Diária</option>
                          <option value="mensal">Mensal</option>
                        </select>
                      </div>

                      <div>
                        <Label>Valor fechado</Label>
                        <Input
                          className="mt-2 rounded-[30px]"
                          type="number"
                          step="0.01"
                          value={item.valor_diaria_fechado}
                          onChange={(e) =>
                            alterarValorFechado(
                              item.equipamento_id,
                              e.target.value
                            )
                          }
                        />
                      </div>

                      <div>
                        <Label>Quantidade</Label>
                        <div className="mt-2 flex items-center gap-2">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => updateQty(item.equipamento_id, -1)}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>

                          <Input
                            type="number"
                            min={1}
                            max={estoque}
                            value={item.quantidade_locada}
                            onChange={(e) =>
                              setManualQty(
                                item.equipamento_id,
                                e.target.value
                              )
                            }
                            className="h-9 w-20 text-center"
                          />

                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => updateQty(item.equipamento_id, 1)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-border bg-background p-3 text-sm text-muted-foreground">
                      Períodos cobrados:{" "}
                      <span className="font-semibold text-foreground">
                        {semPrevisaoDevolucao ? "Sem previsão" : periodoTexto}
                      </span>{" "}
                      • Subtotal:{" "}
                      <span className="font-semibold text-primary">
                        {formatCurrency(subtotal)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-[30px] border border-border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">
            Fotos da entrega
          </h2>

          <p className="text-sm text-muted-foreground">
            Adicione fotos dos produtos no momento da entrega.
          </p>

          <label className="flex cursor-pointer flex-col items-center justify-center rounded-[30px] border border-dashed border-border bg-secondary p-6 text-center transition hover:border-primary/50">
            <ImagePlus className="mb-2 h-8 w-8 text-primary" />
            <span className="font-medium text-foreground">
              Clique para adicionar fotos
            </span>
            <span className="text-sm text-muted-foreground">
              Você pode selecionar várias imagens
            </span>

            <Input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleFotosEntrega(e.target.files)}
            />
          </label>

          {fotosEntrega.length > 0 && (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {fotosEntrega.map((foto) => (
                <div
                  key={foto.id}
                  className="relative overflow-hidden rounded-2xl border border-border bg-secondary"
                >
                  <img
                    src={foto.preview}
                    alt="Foto da entrega"
                    className="h-32 w-full object-cover"
                  />

                  <Button
                    type="button"
                    size="icon"
                    variant="destructive"
                    className="absolute right-2 top-2 h-7 w-7 rounded-full"
                    onClick={() => removerFotoEntrega(foto.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-[30px] border border-border bg-card p-6 space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Resumo</h2>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {tipoCobrancaPadrao === "mensal"
                ? "Meses cobrados"
                : "Dias cobrados"}
            </span>
            <span className="font-medium text-foreground">
              {semPrevisaoDevolucao
                ? "Sem previsão"
                : tipoCobrancaPadrao === "mensal"
                ? quantidadeMeses
                : diasCobrados}
            </span>
          </div>

          {!semPrevisaoDevolucao && dataInicio && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Data de entrega</span>
              <span className="font-medium text-foreground">
                {new Date(dataInicio + "T12:00:00").toLocaleDateString("pt-BR")}
              </span>
            </div>
          )}

          {!semPrevisaoDevolucao && dataPrevisaoCalculada && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Data de devolução</span>
              <span className="font-medium text-foreground">
                {new Date(
                  dataPrevisaoCalculada + "T12:00:00"
                ).toLocaleDateString("pt-BR")}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Valor total</span>
            <span className="font-medium text-foreground">
              {formatCurrency(valorTotal)}
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Entrada</span>
            <span className="font-medium text-success">
              {formatCurrency(valorEntrada)}
            </span>
          </div>

          <div className="flex items-center justify-between border-t border-border pt-3 text-base">
            <span className="font-semibold text-foreground">Saldo</span>
            <span className="font-bold text-primary">
              {formatCurrency(saldo)}
            </span>
          </div>
        </div>

        <ActionGuard fallbackLabel="Criação bloqueada">
          <Button
            onClick={handleCreate}
            disabled={saving}
            className="rounded-[30px]"
          >
            {saving ? "Salvando..." : "Criar Locação"}
          </Button>
        </ActionGuard>
      </div>
    </Layout>
  );
}