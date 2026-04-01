import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LocacaoComCliente, DiaNaoCobrado } from "@/types";
import { formatCurrency, formatDate, situacaoLabel, situacaoColor, calcularDiasCobrados, calcularValorTotal } from "@/lib/calculos";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Search, CheckCircle } from "lucide-react";

export default function DevolucaoPage() {
  const [locacoes, setLocacoes] = useState<LocacaoComCliente[]>([]);
  const [feriados, setFeriados] = useState<DiaNaoCobrado[]>([]);
  const [search, setSearch] = useState("");
  const [baixaOpen, setBaixaOpen] = useState(false);
  const [selectedLocacao, setSelectedLocacao] = useState<LocacaoComCliente | null>(null);
  const [dataDevolucao, setDataDevolucao] = useState("");
  const [valorAvaria, setValorAvaria] = useState(0);
  const [descontoBaixa, setDescontoBaixa] = useState(0);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    const [l, f] = await Promise.all([
      supabase.from("locacoes").select("*, clientes(*), itens_locacao(*)").eq("situacao", "ativo").order("data_previsao_entrega", { ascending: true }),
      supabase.from("dias_nao_cobrados").select("*").eq("ativo", true),
    ]);
    setLocacoes((l.data as LocacaoComCliente[]) || []);
    setFeriados(f.data || []);
  }

  function openBaixa(loc: LocacaoComCliente) {
    setSelectedLocacao(loc);
    setDataDevolucao("");
    setValorAvaria(0);
    setDescontoBaixa(0);
    setBaixaOpen(true);
  }

  const baixaPreview = (() => {
    if (!selectedLocacao || !dataDevolucao) return null;
    const diasReais = calcularDiasCobrados(
      new Date(selectedLocacao.data_inicio + "T12:00:00"),
      new Date(dataDevolucao + "T12:00:00"),
      feriados,
      selectedLocacao.cobrar_domingo
    );
    const valorCalculado = calcularValorTotal(
      selectedLocacao.itens_locacao.map((i) => ({ quantidade_locada: i.quantidade_locada, valor_diaria_fechado: Number(i.valor_diaria_fechado) })),
      diasReais,
      Number(selectedLocacao.taxa_entrega),
      Number(selectedLocacao.valor_desconto)
    ) + valorAvaria - descontoBaixa;
    const entrada = Number(selectedLocacao.valor_total_pago);
    const saldo = valorCalculado - entrada;
    return { diasReais, valorCalculado, entrada, saldo };
  })();

  async function handleBaixa() {
    if (!selectedLocacao || !dataDevolucao || !baixaPreview) { toast.error("Preencha a data de devolução"); return; }

    await supabase.from("locacoes").update({
      data_devolucao_real: dataDevolucao,
      valor_avaria: valorAvaria,
      valor_total_final: baixaPreview.valorCalculado,
      situacao: "finalizado",
    }).eq("id", selectedLocacao.id);

    for (const item of selectedLocacao.itens_locacao) {
      const { data: eq } = await supabase.from("equipamentos").select("quantidade_disponivel").eq("id", item.equipamento_id).single();
      if (eq) {
        await supabase.from("equipamentos").update({
          quantidade_disponivel: eq.quantidade_disponivel + item.quantidade_locada,
        }).eq("id", item.equipamento_id);
      }
    }

    toast.success("Devolução registrada com sucesso!");
    setBaixaOpen(false);
    fetchData();
  }

  const filtered = locacoes.filter((l) =>
    (l.clientes?.nome_completo || "").toLowerCase().includes(search.toLowerCase()) ||
    String(l.numero_contrato).includes(search)
  );

  return (
    <Layout>
      <div className="animate-fade-in space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Devolução</h1>
          <p className="text-muted-foreground">Dê baixa nos aluguéis ativos</p>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-3 h-4 w-4 text-muted-foreground" />
          <Input className="rounded-[30px] pl-10" placeholder="Buscar por cliente ou contrato..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        <div className="space-y-3">
          {filtered.map((l) => (
            <div key={l.id} className="rounded-[30px] border border-border bg-card p-5 transition-all hover:border-primary/30">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <p className="font-semibold text-foreground">#{l.numero_contrato}</p>
                    <Badge className={situacaoColor(l.situacao)}>{situacaoLabel(l.situacao)}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{l.clientes?.nome_completo}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(l.data_inicio)} → {formatDate(l.data_previsao_entrega)} | {formatCurrency(Number(l.valor_total_final))}
                    {Number(l.valor_total_pago) > 0 && <span className="text-success"> (Entrada: {formatCurrency(Number(l.valor_total_pago))})</span>}
                  </p>
                </div>
                <Button className="rounded-[30px] gap-2" onClick={() => openBaixa(l)}>
                  <CheckCircle className="h-4 w-4" /> Dar Baixa
                </Button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">Nenhum aluguel ativo para devolução.</p>}
        </div>

        <Dialog open={baixaOpen} onOpenChange={setBaixaOpen}>
          <DialogContent className="rounded-[30px] border-border bg-card sm:max-w-md">
            <DialogHeader><DialogTitle className="text-foreground">Devolução - Contrato #{selectedLocacao?.numero_contrato}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Cliente: {selectedLocacao?.clientes?.nome_completo}</p>
              <div><Label className="text-foreground">Data Real de Devolução</Label><Input className="rounded-[30px]" type="date" value={dataDevolucao} onChange={(e) => setDataDevolucao(e.target.value)} /></div>
              <div><Label className="text-foreground">Valor de Avarias (R$)</Label><Input className="rounded-[30px]" type="number" step="0.01" value={valorAvaria} onChange={(e) => setValorAvaria(parseFloat(e.target.value) || 0)} /></div>
              <div><Label className="text-foreground">Desconto na Devolução (R$)</Label><Input className="rounded-[30px]" type="number" step="0.01" value={descontoBaixa} onChange={(e) => setDescontoBaixa(parseFloat(e.target.value) || 0)} /></div>

              {baixaPreview && (
                <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 space-y-2 text-sm">
                  <p className="font-semibold text-foreground">Resumo da Devolução:</p>
                  <div className="grid grid-cols-2 gap-1">
                    <p className="text-muted-foreground">Dias cobrados:</p><p className="text-right font-bold text-foreground">{baixaPreview.diasReais}</p>
                    <p className="text-muted-foreground">Valor calculado:</p><p className="text-right font-bold text-foreground">{formatCurrency(baixaPreview.valorCalculado)}</p>
                    <p className="text-muted-foreground">Entrada paga:</p><p className="text-right font-bold text-success">{formatCurrency(baixaPreview.entrada)}</p>
                    <p className="text-muted-foreground font-bold">Saldo a cobrar:</p>
                    <p className={`text-right text-lg font-bold ${baixaPreview.saldo <= 0 ? "text-success" : "text-destructive"}`}>
                      {baixaPreview.saldo <= 0 ? "ZERADO" : formatCurrency(baixaPreview.saldo)}
                    </p>
                  </div>
                </div>
              )}

              <Button className="w-full rounded-[30px]" onClick={handleBaixa}>Confirmar Devolução</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
