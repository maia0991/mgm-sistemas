import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LocacaoComCliente } from "@/types";
import { formatCurrency, formatDate } from "@/lib/calculos";
import StatCard from "@/components/StatCard";
import Layout from "@/components/Layout";
import { DollarSign, TrendingUp, TrendingDown, Receipt } from "lucide-react";
import { format } from "date-fns";

export default function FinanceiroPage() {
  const [locacoes, setLocacoes] = useState<LocacaoComCliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroMes, setFiltroMes] = useState(format(new Date(), "yyyy-MM"));

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    const { data } = await supabase.from("locacoes").select("*, clientes(*), itens_locacao(*)").order("created_at", { ascending: false });
    setLocacoes((data as LocacaoComCliente[]) || []);
    setLoading(false);
  }

  const finalizadas = locacoes.filter((l) => l.situacao === "finalizado");
  const ativas = locacoes.filter((l) => l.situacao === "ativo");

  const faturamentoTotal = finalizadas.reduce((acc, l) => acc + Number(l.valor_total_final), 0);
  const entradasRecebidas = locacoes.reduce((acc, l) => acc + Number(l.valor_total_pago), 0);
  const aReceber = ativas.reduce((acc, l) => acc + (Number(l.valor_total_final) - Number(l.valor_total_pago)), 0);
  const totalContratos = locacoes.length;

  // Filter by month
  const locacoesMes = locacoes.filter((l) => l.created_at.startsWith(filtroMes));
  const faturamentoMes = locacoesMes.filter((l) => l.situacao === "finalizado").reduce((acc, l) => acc + Number(l.valor_total_final), 0);

  return (
    <Layout>
      <div className="animate-fade-in space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Financeiro</h1>
          <p className="text-muted-foreground">Visão geral das finanças</p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Faturamento Total" value={formatCurrency(faturamentoTotal)} icon={DollarSign} variant="success" />
          <StatCard title="Entradas Recebidas" value={formatCurrency(entradasRecebidas)} icon={TrendingUp} variant="primary" />
          <StatCard title="A Receber (Ativos)" value={formatCurrency(aReceber)} icon={TrendingDown} variant="warning" />
          <StatCard title="Total de Contratos" value={String(totalContratos)} icon={Receipt} variant="default" />
        </div>

        <div className="rounded-[30px] border border-border bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Histórico de Locações</h2>
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
              <p className="text-sm text-muted-foreground mb-4">
                Faturamento do mês: <span className="font-bold text-primary">{formatCurrency(faturamentoMes)}</span> • {locacoesMes.length} contratos
              </p>
              <div className="space-y-2 max-h-96 overflow-auto">
                {locacoesMes.map((l) => (
                  <div key={l.id} className="flex items-center justify-between rounded-2xl bg-secondary p-4">
                    <div>
                      <p className="font-medium text-foreground text-sm">#{l.numero_contrato} - {l.clientes?.nome_completo}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(l.data_inicio)} → {formatDate(l.data_previsao_entrega)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-foreground text-sm">{formatCurrency(Number(l.valor_total_final))}</p>
                      {Number(l.valor_total_pago) > 0 && <p className="text-xs text-success">Entrada: {formatCurrency(Number(l.valor_total_pago))}</p>}
                    </div>
                  </div>
                ))}
                {locacoesMes.length === 0 && <p className="text-center text-muted-foreground py-4">Nenhuma locação neste mês.</p>}
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
