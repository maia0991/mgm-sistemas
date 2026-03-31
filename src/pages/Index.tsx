import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LocacaoComCliente } from "@/types";
import { formatCurrency, formatDate, situacaoLabel, situacaoColor } from "@/lib/calculos";
import StatCard from "@/components/StatCard";
import Layout from "@/components/Layout";
import { DollarSign, FileText, TruckIcon, ArrowDownToLine } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const [locacoes, setLocacoes] = useState<LocacaoComCliente[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const { data } = await supabase
      .from("locacoes")
      .select("*, clientes(*), itens_locacao(*)")
      .order("created_at", { ascending: false });
    setLocacoes((data as LocacaoComCliente[]) || []);
    setLoading(false);
  }

  const hoje = format(new Date(), "yyyy-MM-dd");
  const ativas = locacoes.filter((l) => l.situacao === "ativo");
  const faturamento = locacoes
    .filter((l) => l.situacao === "finalizado")
    .reduce((acc, l) => acc + Number(l.valor_total_final), 0);
  const saidasHoje = locacoes.filter((l) => l.data_inicio === hoje);
  const retornosHoje = locacoes.filter((l) => l.data_previsao_entrega === hoje);

  return (
    <Layout>
      <div className="animate-fade-in space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="mt-1 text-muted-foreground">Visão geral do MGM Sistemas</p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Faturamento Total" value={formatCurrency(faturamento)} icon={DollarSign} variant="success" />
          <StatCard title="Locações Ativas" value={String(ativas.length)} icon={FileText} variant="primary" />
          <StatCard title="Saídas Hoje" value={String(saidasHoje.length)} icon={TruckIcon} variant="warning" />
          <StatCard title="Retornos Hoje" value={String(retornosHoje.length)} icon={ArrowDownToLine} variant="default" />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-[30px] border border-border bg-card p-6">
            <h2 className="mb-4 text-lg font-semibold text-foreground">Saídas de Hoje</h2>
            {saidasHoje.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma saída para hoje.</p>
            ) : (
              <div className="space-y-3">
                {saidasHoje.map((l) => (
                  <div key={l.id} className="flex items-center justify-between rounded-2xl bg-secondary p-4">
                    <div>
                      <p className="font-medium text-foreground">#{l.numero_contrato} - {l.clientes?.nome_completo}</p>
                      <p className="text-sm text-muted-foreground">Previsão: {formatDate(l.data_previsao_entrega)}</p>
                    </div>
                    <Badge className={situacaoColor(l.situacao)}>{situacaoLabel(l.situacao)}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-[30px] border border-border bg-card p-6">
            <h2 className="mb-4 text-lg font-semibold text-foreground">Retornos de Hoje</h2>
            {retornosHoje.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum retorno para hoje.</p>
            ) : (
              <div className="space-y-3">
                {retornosHoje.map((l) => (
                  <div key={l.id} className="flex items-center justify-between rounded-2xl bg-secondary p-4">
                    <div>
                      <p className="font-medium text-foreground">#{l.numero_contrato} - {l.clientes?.nome_completo}</p>
                      <p className="text-sm text-muted-foreground">Início: {formatDate(l.data_inicio)}</p>
                    </div>
                    <Badge className={situacaoColor(l.situacao)}>{situacaoLabel(l.situacao)}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent rentals */}
        <div className="rounded-[30px] border border-border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Locações Recentes</h2>
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : locacoes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma locação cadastrada.</p>
          ) : (
            <div className="space-y-3">
              {locacoes.slice(0, 5).map((l) => (
                <div key={l.id} className="flex items-center justify-between rounded-2xl bg-secondary p-4">
                  <div>
                    <p className="font-medium text-foreground">#{l.numero_contrato} - {l.clientes?.nome_completo}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(l.data_inicio)} → {formatDate(l.data_previsao_entrega)} | {formatCurrency(Number(l.valor_total_final))}
                    </p>
                  </div>
                  <Badge className={situacaoColor(l.situacao)}>{situacaoLabel(l.situacao)}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
