import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Cliente, Equipamento, DiaNaoCobrado, ItemLocacaoForm } from "@/types";
import { calcularDiasCobrados, calcularValorTotal, formatCurrency } from "@/lib/calculos";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Minus, Search, X } from "lucide-react";

export default function NovaLocacaoPage() {
  const navigate = useNavigate();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [feriados, setFeriados] = useState<DiaNaoCobrado[]>([]);
  const [clienteSearch, setClienteSearch] = useState("");
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [itens, setItens] = useState<ItemLocacaoForm[]>([]);
  const [dataInicio, setDataInicio] = useState("");
  const [dataPrevisao, setDataPrevisao] = useState("");
  const [taxaEntrega, setTaxaEntrega] = useState(0);
  const [valorDesconto, setValorDesconto] = useState(0);
  const [valorEntrada, setValorEntrada] = useState(0);
  const [cobrarDomingo, setCobrarDomingo] = useState(false);
  const [notas, setNotas] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      supabase.from("clientes").select("*").eq("ativo", true).order("nome_completo"),
      supabase.from("equipamentos").select("*").eq("ativo", true).order("nome"),
      supabase.from("dias_nao_cobrados").select("*").eq("ativo", true),
    ]).then(([c, e, f]) => {
      setClientes(c.data || []);
      setEquipamentos(e.data || []);
      setFeriados(f.data || []);
    });
  }, []);

  const filteredClientes = clientes.filter((c) =>
    c.nome_completo.toLowerCase().includes(clienteSearch.toLowerCase())
  );

  function addItem(eq: Equipamento) {
    if (eq.quantidade_disponivel <= 0) { toast.error("Sem estoque disponível"); return; }
    const existing = itens.find((i) => i.equipamento_id === eq.id);
    if (existing) {
      if (existing.quantidade_locada >= eq.quantidade_disponivel) { toast.error("Estoque insuficiente"); return; }
      setItens(itens.map((i) => i.equipamento_id === eq.id ? { ...i, quantidade_locada: i.quantidade_locada + 1 } : i));
    } else {
      setItens([...itens, { equipamento_id: eq.id, equipamento_nome: eq.nome, quantidade_locada: 1, valor_diaria_fechado: Number(eq.valor_diaria) }]);
    }
  }

  function removeItem(eqId: string) {
    setItens(itens.filter((i) => i.equipamento_id !== eqId));
  }

  function updateQty(eqId: string, delta: number) {
    const eq = equipamentos.find((e) => e.id === eqId);
    setItens(itens.map((i) => {
      if (i.equipamento_id !== eqId) return i;
      const newQty = Math.max(1, Math.min(i.quantidade_locada + delta, eq?.quantidade_disponivel || 999));
      return { ...i, quantidade_locada: newQty };
    }));
  }

  const diasCobrados = dataInicio && dataPrevisao
    ? calcularDiasCobrados(new Date(dataInicio + "T12:00:00"), new Date(dataPrevisao + "T12:00:00"), feriados, cobrarDomingo)
    : 0;
  const valorTotal = calcularValorTotal(itens, diasCobrados, taxaEntrega, valorDesconto);
  const saldo = valorTotal - valorEntrada;

  async function handleSave() {
    if (!selectedCliente) { toast.error("Selecione um cliente"); return; }
    if (itens.length === 0) { toast.error("Adicione pelo menos um item"); return; }
    if (!dataInicio || !dataPrevisao) { toast.error("Preencha as datas"); return; }

    setSaving(true);
    try {
      const { data: locacao, error } = await supabase.from("locacoes").insert({
        cliente_id: selectedCliente.id,
        data_inicio: dataInicio,
        data_previsao_entrega: dataPrevisao,
        taxa_entrega: taxaEntrega,
        valor_desconto: valorDesconto,
        valor_total_pago: valorEntrada,
        valor_total_final: valorTotal,
        cobrar_domingo: cobrarDomingo,
        notas_observacoes: notas,
        situacao: "ativo",
      }).select().single();

      if (error) throw error;

      const itensInsert = itens.map((i) => ({
        locacao_id: locacao.id,
        equipamento_id: i.equipamento_id,
        quantidade_locada: i.quantidade_locada,
        valor_diaria_fechado: i.valor_diaria_fechado,
      }));
      await supabase.from("itens_locacao").insert(itensInsert);

      // Subtract stock
      for (const item of itens) {
        const eq = equipamentos.find((e) => e.id === item.equipamento_id);
        if (eq) {
          await supabase.from("equipamentos").update({
            quantidade_disponivel: eq.quantidade_disponivel - item.quantidade_locada,
          }).eq("id", item.equipamento_id);
        }
      }

      toast.success(`Locação #${locacao.numero_contrato} criada!`);
      navigate("/locacoes");
    } catch (err) {
      toast.error("Erro ao salvar locação");
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Layout>
      <div className="animate-fade-in max-w-4xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Nova Locação</h1>
          <p className="text-muted-foreground">Crie uma nova locação de equipamentos</p>
        </div>

        {/* Cliente */}
        <div className="rounded-[30px] border border-border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">1. Cliente</h2>
          {selectedCliente ? (
            <div className="flex items-center justify-between rounded-2xl bg-secondary p-4">
              <div>
                <p className="font-medium text-foreground">{selectedCliente.nome_completo}</p>
                <p className="text-sm text-muted-foreground">{selectedCliente.whatsapp} • {selectedCliente.endereco_obra}</p>
              </div>
              <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setSelectedCliente(null)}><X className="h-4 w-4" /></Button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-4 top-3 h-4 w-4 text-muted-foreground" />
                <Input className="rounded-[30px] pl-10" placeholder="Buscar cliente..." value={clienteSearch} onChange={(e) => setClienteSearch(e.target.value)} />
              </div>
              {clienteSearch && (
                <div className="max-h-40 overflow-auto space-y-1">
                  {filteredClientes.map((c) => (
                    <button key={c.id} className="w-full rounded-2xl bg-secondary p-3 text-left transition-colors hover:bg-primary/10" onClick={() => { setSelectedCliente(c); setClienteSearch(""); }}>
                      <p className="font-medium text-foreground text-sm">{c.nome_completo}</p>
                      <p className="text-xs text-muted-foreground">{c.cpf_cnpj}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Equipamentos */}
        <div className="rounded-[30px] border border-border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">2. Equipamentos</h2>
          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-auto">
            {equipamentos.map((eq) => (
              <button key={eq.id} className="rounded-2xl bg-secondary p-3 text-left transition-colors hover:bg-primary/10 disabled:opacity-40" disabled={eq.quantidade_disponivel <= 0} onClick={() => addItem(eq)}>
                <p className="text-sm font-medium text-foreground">{eq.nome}</p>
                <p className="text-xs text-muted-foreground">{formatCurrency(Number(eq.valor_diaria))}/dia • {eq.quantidade_disponivel} disp.</p>
              </button>
            ))}
          </div>
          {itens.length > 0 && (
            <div className="space-y-2 border-t border-border pt-4">
              <p className="text-sm font-medium text-muted-foreground">Itens selecionados:</p>
              {itens.map((item) => (
                <div key={item.equipamento_id} className="flex items-center justify-between rounded-2xl bg-secondary p-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.equipamento_nome}</p>
                    <p className="text-xs text-muted-foreground">{formatCurrency(item.valor_diaria_fechado)}/dia</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={() => updateQty(item.equipamento_id, -1)}><Minus className="h-3 w-3" /></Button>
                    <span className="text-sm font-bold text-foreground w-6 text-center">{item.quantidade_locada}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={() => updateQty(item.equipamento_id, 1)}><Plus className="h-3 w-3" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-destructive" onClick={() => removeItem(item.equipamento_id)}><X className="h-3 w-3" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Datas e Valores */}
        <div className="rounded-[30px] border border-border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">3. Datas e Valores</h2>
          <div className="grid grid-cols-2 gap-4">
            <div><Label className="text-foreground">Data Início</Label><Input className="rounded-[30px]" type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} /></div>
            <div><Label className="text-foreground">Previsão Entrega</Label><Input className="rounded-[30px]" type="date" value={dataPrevisao} onChange={(e) => setDataPrevisao(e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div><Label className="text-foreground">Taxa Entrega (R$)</Label><Input className="rounded-[30px]" type="number" step="0.01" value={taxaEntrega} onChange={(e) => setTaxaEntrega(parseFloat(e.target.value) || 0)} /></div>
            <div><Label className="text-foreground">Desconto (R$)</Label><Input className="rounded-[30px]" type="number" step="0.01" value={valorDesconto} onChange={(e) => setValorDesconto(parseFloat(e.target.value) || 0)} /></div>
            <div><Label className="text-foreground">Valor Entrada (R$)</Label><Input className="rounded-[30px]" type="number" step="0.01" value={valorEntrada} onChange={(e) => setValorEntrada(parseFloat(e.target.value) || 0)} /></div>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={cobrarDomingo} onCheckedChange={setCobrarDomingo} />
            <Label className="text-foreground">Cobrar Domingos</Label>
          </div>
          <div><Label className="text-foreground">Observações</Label><Input className="rounded-[30px]" value={notas} onChange={(e) => setNotas(e.target.value)} /></div>
        </div>

        {/* Resumo */}
        <div className="rounded-[30px] border border-primary/30 bg-primary/5 p-6 space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Resumo</h2>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <p className="text-muted-foreground">Dias cobrados:</p><p className="text-right font-bold text-foreground">{diasCobrados}</p>
            <p className="text-muted-foreground">Valor itens + frete - desconto:</p><p className="text-right font-bold text-foreground">{formatCurrency(valorTotal)}</p>
            <p className="text-muted-foreground">Entrada:</p><p className="text-right font-bold text-foreground">{formatCurrency(valorEntrada)}</p>
            <p className="text-muted-foreground">Saldo restante:</p><p className="text-right text-xl font-bold text-primary">{formatCurrency(saldo)}</p>
          </div>
        </div>

        <Button className="w-full rounded-[30px] h-12 text-base" onClick={handleSave} disabled={saving}>
          {saving ? "Salvando..." : "Criar Locação"}
        </Button>
      </div>
    </Layout>
  );
}
