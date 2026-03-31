import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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
import { Search, Eye, CheckCircle, Printer } from "lucide-react";

export default function LocacoesPage() {
  const [locacoes, setLocacoes] = useState<LocacaoComCliente[]>([]);
  const [feriados, setFeriados] = useState<DiaNaoCobrado[]>([]);
  const [search, setSearch] = useState("");
  const [baixaOpen, setBaixaOpen] = useState(false);
  const [selectedLocacao, setSelectedLocacao] = useState<LocacaoComCliente | null>(null);
  const [dataDevolucao, setDataDevolucao] = useState("");
  const [valorAvaria, setValorAvaria] = useState(0);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    const [l, f] = await Promise.all([
      supabase.from("locacoes").select("*, clientes(*), itens_locacao(*)").order("created_at", { ascending: false }),
      supabase.from("dias_nao_cobrados").select("*").eq("ativo", true),
    ]);
    setLocacoes((l.data as LocacaoComCliente[]) || []);
    setFeriados(f.data || []);
  }

  function openBaixa(loc: LocacaoComCliente) {
    setSelectedLocacao(loc);
    setDataDevolucao("");
    setValorAvaria(0);
    setBaixaOpen(true);
  }

  async function handleBaixa() {
    if (!selectedLocacao || !dataDevolucao) { toast.error("Preencha a data de devolução"); return; }

    const diasReais = calcularDiasCobrados(
      new Date(selectedLocacao.data_inicio + "T12:00:00"),
      new Date(dataDevolucao + "T12:00:00"),
      feriados,
      selectedLocacao.cobrar_domingo
    );

    const valorFinal = calcularValorTotal(
      selectedLocacao.itens_locacao.map((i) => ({ quantidade_locada: i.quantidade_locada, valor_diaria_fechado: Number(i.valor_diaria_fechado) })),
      diasReais,
      Number(selectedLocacao.taxa_entrega),
      Number(selectedLocacao.valor_desconto)
    ) + valorAvaria;

    await supabase.from("locacoes").update({
      data_devolucao_real: dataDevolucao,
      valor_avaria: valorAvaria,
      valor_total_final: valorFinal,
      situacao: "finalizado",
    }).eq("id", selectedLocacao.id);

    // Return stock
    for (const item of selectedLocacao.itens_locacao) {
      const { data: eq } = await supabase.from("equipamentos").select("quantidade_disponivel").eq("id", item.equipamento_id).single();
      if (eq) {
        await supabase.from("equipamentos").update({
          quantidade_disponivel: eq.quantidade_disponivel + item.quantidade_locada,
        }).eq("id", item.equipamento_id);
      }
    }

    toast.success("Locação finalizada!");
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Locações</h1>
            <p className="text-muted-foreground">Gerencie todas as locações</p>
          </div>
          <Link to="/locacoes/nova"><Button className="rounded-[30px] gap-2">Nova Locação</Button></Link>
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
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link to={`/locacoes/${l.id}/contrato`}>
                    <Button variant="ghost" size="icon" className="rounded-full"><Printer className="h-4 w-4" /></Button>
                  </Link>
                  {l.situacao === "ativo" && (
                    <Button variant="ghost" size="icon" className="rounded-full text-success" onClick={() => openBaixa(l)}>
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">Nenhuma locação encontrada.</p>}
        </div>

        {/* Modal de Baixa */}
        <Dialog open={baixaOpen} onOpenChange={setBaixaOpen}>
          <DialogContent className="rounded-[30px] border-border bg-card sm:max-w-md">
            <DialogHeader><DialogTitle className="text-foreground">Dar Baixa na Locação #{selectedLocacao?.numero_contrato}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Cliente: {selectedLocacao?.clientes?.nome_completo}</p>
              <div><Label className="text-foreground">Data Real de Devolução</Label><Input className="rounded-[30px]" type="date" value={dataDevolucao} onChange={(e) => setDataDevolucao(e.target.value)} /></div>
              <div><Label className="text-foreground">Valor de Avarias (R$)</Label><Input className="rounded-[30px]" type="number" step="0.01" value={valorAvaria} onChange={(e) => setValorAvaria(parseFloat(e.target.value) || 0)} /></div>
              <Button className="w-full rounded-[30px]" onClick={handleBaixa}>Finalizar Locação</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
