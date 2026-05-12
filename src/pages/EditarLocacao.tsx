import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { calcularDiasCobrados, formatCurrency } from "@/lib/calculos";
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

type EquipamentoItem = {
  id: string;
  nome?: string | null;
  valor_diaria?: number | string | null;
  quantidade_disponivel?: number | null;
  ativo?: boolean | null;
};

type DiaNaoCobradoItem = {
  id: string;
  data?: string | null;
  descricao?: string | null;
  ativo?: boolean | null;
};

type ItemLocacaoFormItem = {
  equipamento_id: string;
  equipamento_nome: string;
  quantidade_locada: number;
  valor_diaria_fechado: number;
  data_inicio_cobranca?: string | null;
};

type ItemLocacaoBanco = {
  equipamento_id: string;
  quantidade_locada: number;
  valor_diaria_fechado?: number | string | null;
  data_inicio_cobranca?: string | null;
};

type ClienteResumo = {
  nome_completo?: string | null;
};

type LocacaoEditItem = {
  id: string;
  numero_contrato?: number | string | null;
  data_inicio?: string | null;
  data_previsao_entrega?: string | null;
  taxa_entrega?: number | string | null;
  valor_desconto?: number | string | null;
  valor_total_pago?: number | string | null;
  valor_total_final?: number | string | null;
  cobrar_domingo?: boolean | null;
  notas_observacoes?: string | null;
  clientes?: ClienteResumo | null;
  itens_locacao?: ItemLocacaoBanco[] | null;
};

type FotoEntregaPreview = {
  id: string;
  file: File;
  preview: string;
};

function hojeISO() {
  return new Date().toISOString().split("T")[0];
}

export default function EditarLocacaoPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { blockedByBilling } = useBillingAccess();
  const { locadoraId } = useAuth();

  const [equipamentos, setEquipamentos] = useState<EquipamentoItem[]>([]);
  const [feriados, setFeriados] = useState<DiaNaoCobradoItem[]>([]);
  const [itens, setItens] = useState<ItemLocacaoFormItem[]>([]);
  const [originalItens, setOriginalItens] = useState<ItemLocacaoFormItem[]>([]);
  const [dataInicio, setDataInicio] = useState("");
  const [dataPrevisao, setDataPrevisao] = useState("");
  const [taxaEntrega, setTaxaEntrega] = useState(0);
  const [valorDesconto, setValorDesconto] = useState(0);
  const [valorEntrada, setValorEntrada] = useState(0);
  const [cobrarDomingo, setCobrarDomingo] = useState(false);
  const [notas, setNotas] = useState("");
  const [fotosEntrega, setFotosEntrega] = useState<FotoEntregaPreview[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [locacao, setLocacao] = useState<LocacaoEditItem | null>(null);

  useEffect(() => {
    if (!id) return;
    void fetchData();

    return () => {
      fotosEntrega.forEach((foto) => URL.revokeObjectURL(foto.preview));
    };
  }, [id]);

  async function fetchData() {
    if (!id) return;

    try {
      setLoading(true);

      const [l, e, f] = await Promise.all([
        supabase
          .from("locacoes")
          .select("*, clientes(*), itens_locacao(*)")
          .eq("id", id)
          .single(),
        supabase
          .from("equipamentos")
          .select("*")
          .eq("ativo", true)
          .order("nome"),
        supabase.from("dias_nao_cobrados").select("*").eq("ativo", true),
      ]);

      if (l.error || !l.data) {
        console.error("Erro ao buscar locação:", l.error);
        toast.error("Locação não encontrada");
        navigate("/alugueis");
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

      const loc = l.data as LocacaoEditItem;
      const listaEquipamentos = ((e.data as EquipamentoItem[]) || []).filter(
        Boolean
      );
      const listaFeriados = ((f.data as DiaNaoCobradoItem[]) || []).filter(
        Boolean
      );

      setLocacao(loc);
      setDataInicio(loc.data_inicio || "");
      setDataPrevisao(loc.data_previsao_entrega || "");
      setTaxaEntrega(Number(loc.taxa_entrega || 0));
      setValorDesconto(Number(loc.valor_desconto || 0));
      setValorEntrada(Number(loc.valor_total_pago || 0));
      setCobrarDomingo(!!loc.cobrar_domingo);
      setNotas(loc.notas_observacoes || "");
      setEquipamentos(listaEquipamentos);
      setFeriados(listaFeriados);

      const agrupados = new Map<string, ItemLocacaoFormItem>();

      for (const i of loc.itens_locacao || []) {
        const existente = agrupados.get(i.equipamento_id);
        const nome =
          listaEquipamentos.find((eq) => eq.id === i.equipamento_id)?.nome ||
          "Equipamento";

        if (existente) {
          existente.quantidade_locada += Number(i.quantidade_locada || 0);
        } else {
          agrupados.set(i.equipamento_id, {
            equipamento_id: i.equipamento_id,
            equipamento_nome: nome,
            quantidade_locada: Number(i.quantidade_locada || 0),
            valor_diaria_fechado: Number(i.valor_diaria_fechado || 0),
            data_inicio_cobranca:
              i.data_inicio_cobranca || loc.data_inicio || "",
          });
        }
      }

      const mapped = Array.from(agrupados.values());

      setItens(mapped);
      setOriginalItens(mapped);
    } catch (error) {
      console.error("Erro inesperado ao carregar locação:", error);
      toast.error("Erro inesperado ao carregar locação");
    } finally {
      setLoading(false);
    }
  }

  function addItem(eq: EquipamentoItem) {
    const originalQty =
      originalItens.find((i) => i.equipamento_id === eq.id)
        ?.quantidade_locada || 0;

    const currentInCart =
      itens.find((i) => i.equipamento_id === eq.id)?.quantidade_locada || 0;

    const effectiveAvailable =
      Number(eq.quantidade_disponivel || 0) + originalQty - currentInCart;

    if (effectiveAvailable <= 0) {
      toast.error("Sem estoque disponível");
      return;
    }

    const existing = itens.find((i) => i.equipamento_id === eq.id);

    if (existing) {
      setItens(
        itens.map((i) =>
          i.equipamento_id === eq.id
            ? { ...i, quantidade_locada: i.quantidade_locada + 1 }
            : i
        )
      );
    } else {
      setItens([
        ...itens,
        {
          equipamento_id: eq.id,
          equipamento_nome: eq.nome || "Equipamento",
          quantidade_locada: 1,
          valor_diaria_fechado: Number(eq.valor_diaria || 0),
          data_inicio_cobranca: hojeISO(),
        },
      ]);
    }
  }

  function removeItem(eqId: string) {
    setItens(itens.filter((i) => i.equipamento_id !== eqId));
  }

  function updateQty(eqId: string, delta: number) {
    const eq = equipamentos.find((e) => e.id === eqId);
    const originalQty =
      originalItens.find((i) => i.equipamento_id === eqId)
        ?.quantidade_locada || 0;

    setItens(
      itens.map((i) => {
        if (i.equipamento_id !== eqId) return i;

        const maxAvail = Number(eq?.quantidade_disponivel || 0) + originalQty;
        const newQty = Math.max(
          1,
          Math.min(i.quantidade_locada + delta, maxAvail)
        );

        return { ...i, quantidade_locada: newQty };
      })
    );
  }

  function updateDailyPrice(eqId: string, value: string) {
    const novoValor = Number(value);

    setItens(
      itens.map((i) =>
        i.equipamento_id === eqId
          ? {
              ...i,
              valor_diaria_fechado: Number.isNaN(novoValor) ? 0 : novoValor,
            }
          : i
      )
    );
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

  function removerFotoEntrega(idFoto: string) {
    setFotosEntrega((prev) => {
      const foto = prev.find((f) => f.id === idFoto);

      if (foto) {
        URL.revokeObjectURL(foto.preview);
      }

      return prev.filter((f) => f.id !== idFoto);
    });
  }

  async function salvarFotosEntrega(locacaoId: string) {
    if (!locadoraId || fotosEntrega.length === 0) return;

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
        toast.error("Erro ao enviar uma foto da entrega.");
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

  const diasCobrados = useMemo(() => {
    if (!dataInicio) return 0;

    if (!dataPrevisao) return 1;

    return calcularDiasCobrados(
      new Date(dataInicio + "T12:00:00"),
      new Date(dataPrevisao + "T12:00:00"),
      feriados as never,
      cobrarDomingo
    );
  }, [dataInicio, dataPrevisao, feriados, cobrarDomingo]);

  const valorTotal = useMemo(() => {
    if (!dataPrevisao) {
      const subtotalSemPrevisao = itens.reduce((soma, item) => {
        return (
          soma +
          Number(item.quantidade_locada || 0) *
            Number(item.valor_diaria_fechado || 0)
        );
      }, 0);

      return subtotalSemPrevisao + taxaEntrega - valorDesconto;
    }

    const fim = new Date(dataPrevisao + "T12:00:00");
    const hojeComplemento = hojeISO();

    const subtotal = itens.reduce((soma, itemAtual) => {
      const itemOriginal = originalItens.find(
        (i) => i.equipamento_id === itemAtual.equipamento_id
      );

      const qtdAtual = Number(itemAtual.quantidade_locada || 0);
      const qtdOriginal = Number(itemOriginal?.quantidade_locada || 0);
      const diaria = Number(itemAtual.valor_diaria_fechado || 0);

      let totalItem = 0;

      const qtdBase = Math.min(qtdAtual, qtdOriginal);
      if (qtdBase > 0) {
        const inicioBase = itemOriginal?.data_inicio_cobranca || dataInicio;
        const diasBase = calcularDiasCobrados(
          new Date(inicioBase + "T12:00:00"),
          fim,
          feriados as never,
          cobrarDomingo
        );

        totalItem += qtdBase * diaria * diasBase;
      }

      const qtdComplemento = Math.max(qtdAtual - qtdOriginal, 0);
      if (qtdComplemento > 0) {
        const diasComplemento = calcularDiasCobrados(
          new Date(hojeComplemento + "T12:00:00"),
          fim,
          feriados as never,
          cobrarDomingo
        );

        totalItem += qtdComplemento * diaria * diasComplemento;
      }

      if (!itemOriginal && qtdAtual > 0) {
        const diasNovoItem = calcularDiasCobrados(
          new Date(hojeComplemento + "T12:00:00"),
          fim,
          feriados as never,
          cobrarDomingo
        );

        totalItem = qtdAtual * diaria * diasNovoItem;
      }

      return soma + totalItem;
    }, 0);

    return subtotal + taxaEntrega - valorDesconto;
  }, [
    itens,
    originalItens,
    dataInicio,
    dataPrevisao,
    taxaEntrega,
    valorDesconto,
    feriados,
    cobrarDomingo,
  ]);

  const saldo = valorTotal - valorEntrada;

  async function handleSave() {
    if (!id) return;

    if (blockedByBilling) {
      toast.error("Plano vencido. Não é possível editar.");
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

    try {
      setSaving(true);

      const { error: updateLocacaoError } = await supabase
        .from("locacoes")
        .update({
          data_inicio: dataInicio,
          data_previsao_entrega: dataPrevisao || null,
          taxa_entrega: taxaEntrega,
          valor_desconto: valorDesconto,
          valor_total_pago: valorEntrada,
          valor_total_final: valorTotal,
          cobrar_domingo: cobrarDomingo,
          notas_observacoes: notas,
        })
        .eq("id", id);

      if (updateLocacaoError) {
        console.error("Erro ao atualizar locação:", updateLocacaoError);
        toast.error("Erro ao atualizar locação");
        return;
      }

      for (const item of originalItens) {
        const eq = equipamentos.find((e) => e.id === item.equipamento_id);
        if (!eq) continue;

        const { error } = await supabase
          .from("equipamentos")
          .update({
            quantidade_disponivel:
              Number(eq.quantidade_disponivel || 0) +
              Number(item.quantidade_locada || 0),
          })
          .eq("id", item.equipamento_id);

        if (error) {
          console.error("Erro ao restaurar estoque:", error);
        }
      }

      const { error: deleteItemsError } = await supabase
        .from("itens_locacao")
        .delete()
        .eq("locacao_id", id);

      if (deleteItemsError) {
        console.error("Erro ao remover itens antigos:", deleteItemsError);
        toast.error("Erro ao atualizar itens da locação");
        return;
      }

      const hojeAditivo = hojeISO();

      const itensInsert = itens.flatMap((itemAtual) => {
        const itemOriginal = originalItens.find(
          (i) => i.equipamento_id === itemAtual.equipamento_id
        );

        const qtdAtual = Number(itemAtual.quantidade_locada || 0);
        const qtdOriginal = Number(itemOriginal?.quantidade_locada || 0);
        const diaria = Number(itemAtual.valor_diaria_fechado || 0);

        if (!itemOriginal) {
          return [
            {
              locacao_id: id,
              equipamento_id: itemAtual.equipamento_id,
              quantidade_locada: qtdAtual,
              valor_diaria_fechado: diaria,
              locadora_id: locadoraId,
              data_inicio_cobranca: hojeAditivo,
            },
          ];
        }

        const registros: Array<{
          locacao_id: string;
          equipamento_id: string;
          quantidade_locada: number;
          valor_diaria_fechado: number;
          locadora_id: string | null;
          data_inicio_cobranca: string;
        }> = [];

        const qtdBase = Math.min(qtdAtual, qtdOriginal);

        if (qtdBase > 0) {
          registros.push({
            locacao_id: id,
            equipamento_id: itemAtual.equipamento_id,
            quantidade_locada: qtdBase,
            valor_diaria_fechado: diaria,
            locadora_id: locadoraId,
            data_inicio_cobranca:
              itemOriginal.data_inicio_cobranca || dataInicio,
          });
        }

        const qtdComplemento = Math.max(qtdAtual - qtdOriginal, 0);

        if (qtdComplemento > 0) {
          registros.push({
            locacao_id: id,
            equipamento_id: itemAtual.equipamento_id,
            quantidade_locada: qtdComplemento,
            valor_diaria_fechado: diaria,
            locadora_id: locadoraId,
            data_inicio_cobranca: hojeAditivo,
          });
        }

        return registros;
      });

      const { error: insertItemsError } = await (supabase as any)
        .from("itens_locacao")
        .insert(itensInsert);

      if (insertItemsError) {
        console.error("Erro ao inserir novos itens:", insertItemsError);
        toast.error("Erro ao salvar itens da locação");
        return;
      }

      for (const item of itens) {
        const eq = equipamentos.find((e) => e.id === item.equipamento_id);
        if (!eq) continue;

        const restored =
          Number(eq.quantidade_disponivel || 0) +
          Number(
            originalItens.find((o) => o.equipamento_id === item.equipamento_id)
              ?.quantidade_locada || 0
          );

        const { error } = await supabase
          .from("equipamentos")
          .update({
            quantidade_disponivel:
              restored - Number(item.quantidade_locada || 0),
          })
          .eq("id", item.equipamento_id);

        if (error) {
          console.error("Erro ao atualizar novo estoque:", error);
        }
      }

      await salvarFotosEntrega(id);

      toast.success("Locação atualizada!");
      navigate("/alugueis");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar");
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

  if (!locacao) {
    return (
      <Layout>
        <p className="p-8 text-muted-foreground">Locação não encontrada.</p>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="animate-fade-in max-w-5xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Editar Locação #{locacao.numero_contrato ?? "-"}
          </h1>
          <p className="text-muted-foreground">
            Cliente: {locacao.clientes?.nome_completo || "Sem cliente"}
          </p>
        </div>

        <div className="space-y-4 rounded-[30px] border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">
            Itens da Locação
          </h2>

          <div className="grid max-h-56 grid-cols-1 gap-2 overflow-auto md:grid-cols-2">
            {equipamentos.map((eq) => (
              <button
                key={eq.id}
                type="button"
                className="rounded-2xl bg-secondary p-3 text-left transition-colors hover:bg-primary/10"
                onClick={() => addItem(eq)}
              >
                <p className="text-sm font-medium text-foreground">
                  {eq.nome || "Equipamento"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(Number(eq.valor_diaria || 0))}/dia •{" "}
                  {Number(eq.quantidade_disponivel || 0)} disp.
                </p>
              </button>
            ))}
          </div>

          {itens.length > 0 && (
            <div className="space-y-3 border-t border-border pt-4">
              {itens.map((item) => (
                <div
                  key={item.equipamento_id}
                  className="space-y-3 rounded-2xl bg-secondary p-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium text-foreground">
                        {item.equipamento_nome}
                      </p>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="rounded-full text-destructive"
                      onClick={() => removeItem(item.equipamento_id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <Label>Quantidade</Label>

                      <div className="mt-2 flex items-center gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="rounded-full"
                          onClick={() => updateQty(item.equipamento_id, -1)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>

                        <span className="w-10 text-center font-bold">
                          {item.quantidade_locada}
                        </span>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="rounded-full"
                          onClick={() => updateQty(item.equipamento_id, 1)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div>
                      <Label>Preço da diária</Label>

                      <Input
                        className="rounded-[30px]"
                        type="number"
                        step="0.01"
                        value={item.valor_diaria_fechado}
                        onChange={(e) =>
                          updateDailyPrice(item.equipamento_id, e.target.value)
                        }
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4 rounded-[30px] border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">
            Datas e Valores
          </h2>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label>Data Início</Label>
              <Input
                className="rounded-[30px]"
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
              />
            </div>

            <div>
              <Label>Previsão Entrega</Label>
              <Input
                className="rounded-[30px]"
                type="date"
                value={dataPrevisao}
                onChange={(e) => setDataPrevisao(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <Label>Taxa Entrega (R$)</Label>
              <Input
                className="rounded-[30px]"
                type="number"
                step="0.01"
                value={taxaEntrega}
                onChange={(e) => setTaxaEntrega(parseFloat(e.target.value) || 0)}
              />
            </div>

            <div>
              <Label>Desconto (R$)</Label>
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
              <Label>Entrada (R$)</Label>
              <Input
                className="rounded-[30px]"
                type="number"
                step="0.01"
                value={valorEntrada}
                onChange={(e) => setValorEntrada(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-border p-4">
            <div>
              <p className="font-medium text-foreground">Cobrar domingo</p>
              <p className="text-sm text-muted-foreground">
                Define se domingo entra no cálculo
              </p>
            </div>

            <Switch checked={cobrarDomingo} onCheckedChange={setCobrarDomingo} />
          </div>

          <div className="space-y-2">
            <Label>Observações</Label>
            <Input
              className="rounded-[30px]"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-4 rounded-[30px] border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">
            Fotos da entrega
          </h2>

          <p className="text-sm text-muted-foreground">
            Adicione fotos dos produtos caso não tenha colocado no cadastro da
            locação.
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

        <div className="space-y-3 rounded-[30px] border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">Resumo</h2>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Dias referência</span>
            <span className="font-medium text-foreground">{diasCobrados}</span>
          </div>

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

        <ActionGuard fallbackLabel="Edição bloqueada">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="rounded-[30px]"
          >
            {saving ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </ActionGuard>
      </div>
    </Layout>
  );
}