import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  formatCurrency,
  formatDate,
  situacaoColor,
  situacaoLabel,
} from "@/lib/calculos";
import { toast } from "sonner";
import {
  FileText,
  DollarSign,
  CheckCircle,
  Clock,
  Download,
  Search,
} from "lucide-react";

interface ClienteRelatorio {
  id: string;
  nome_completo: string;
  cpf_cnpj?: string | null;
  whatsapp?: string | null;
}

interface ItemRelatorio {
  id: string;
  equipamento_id: string;
  quantidade_locada: number;
  valor_diaria_fechado: number | string;
}

interface LocacaoRelatorio {
  id: string;
  numero_contrato: number;
  cliente_id: string;
  data_inicio: string;
  data_previsao_entrega: string | null;
  taxa_entrega: number | string | null;
  valor_desconto: number | string | null;
  valor_total_pago: number | string | null;
  valor_total_final: number | string | null;
  situacao: string;
  created_at?: string | null;
  clientes: ClienteRelatorio | null;
  itens_locacao: ItemRelatorio[];
}

export default function RelatoriosPage() {
  const [locacoes, setLocacoes] = useState<LocacaoRelatorio[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("todos");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  useEffect(() => {
    void fetchRelatorio();
  }, []);

  async function fetchRelatorio() {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("locacoes")
        .select("*, clientes(*), itens_locacao(*)")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Erro ao carregar relatório:", error);
        toast.error("Erro ao carregar relatório");
        return;
      }

      setLocacoes((data as LocacaoRelatorio[]) || []);
    } catch (error) {
      console.error("Erro inesperado:", error);
      toast.error("Erro inesperado ao carregar relatório");
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();

    return locacoes.filter((l) => {
      const cliente = l.clientes?.nome_completo?.toLowerCase() || "";
      const contrato = String(l.numero_contrato || "");
      const situacao = l.situacao || "";

      const matchSearch =
        !term ||
        cliente.includes(term) ||
        contrato.includes(term) ||
        situacao.toLowerCase().includes(term);

      const matchStatus = status === "todos" || situacao === status;

      const dataLocacao = l.data_inicio;

      const matchDataInicio = !dataInicio || dataLocacao >= dataInicio;
      const matchDataFim = !dataFim || dataLocacao <= dataFim;

      return matchSearch && matchStatus && matchDataInicio && matchDataFim;
    });
  }, [locacoes, search, status, dataInicio, dataFim]);

  const totalLocacoes = filtered.length;

  const locacoesAtivas = filtered.filter((l) => l.situacao === "ativo").length;

  const locacoesFinalizadas = filtered.filter(
    (l) => l.situacao === "finalizado"
  ).length;

  const faturamentoTotal = filtered.reduce((acc, l) => {
    return acc + Number(l.valor_total_final || 0);
  }, 0);

  const totalRecebido = filtered.reduce((acc, l) => {
    return acc + Number(l.valor_total_pago || 0);
  }, 0);

  const saldoAberto = faturamentoTotal - totalRecebido;

  function limparFiltros() {
    setSearch("");
    setStatus("todos");
    setDataInicio("");
    setDataFim("");
  }

  function exportarCSV() {
    if (filtered.length === 0) {
      toast.error("Nenhum dado para exportar");
      return;
    }

    const linhas = filtered.map((l) => ({
      contrato: l.numero_contrato,
      cliente: l.clientes?.nome_completo || "Sem cliente",
      data_inicio: formatDate(l.data_inicio),
      previsao_devolucao: formatDate(l.data_previsao_entrega),
      situacao: situacaoLabel(l.situacao),
      itens: l.itens_locacao?.length || 0,
      valor_total: Number(l.valor_total_final || 0).toFixed(2),
      entrada: Number(l.valor_total_pago || 0).toFixed(2),
      saldo: (
        Number(l.valor_total_final || 0) - Number(l.valor_total_pago || 0)
      ).toFixed(2),
    }));

    const cabecalho = [
      "Contrato",
      "Cliente",
      "Data início",
      "Previsão devolução",
      "Situação",
      "Itens",
      "Valor total",
      "Entrada",
      "Saldo",
    ];

    const csv = [
      cabecalho.join(";"),
      ...linhas.map((l) =>
        [
          l.contrato,
          l.cliente,
          l.data_inicio,
          l.previsao_devolucao,
          l.situacao,
          l.itens,
          l.valor_total,
          l.entrada,
          l.saldo,
        ].join(";")
      ),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `relatorio-alugueis-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);

    toast.success("Relatório exportado com sucesso!");
  }

  return (
    <Layout>
      <div className="animate-fade-in space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Relatórios de Aluguéis
            </h1>
            <p className="text-muted-foreground">
              Acompanhe os aluguéis, faturamento, entradas e saldos
            </p>
          </div>

          <Button
            type="button"
            onClick={exportarCSV}
            className="gap-2 rounded-[30px]"
          >
            <Download className="h-4 w-4" />
            Exportar CSV
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-[30px] border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{totalLocacoes}</p>
              </div>
              <FileText className="h-6 w-6 text-primary" />
            </div>
          </div>

          <div className="rounded-[30px] border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ativas</p>
                <p className="text-2xl font-bold">{locacoesAtivas}</p>
              </div>
              <Clock className="h-6 w-6 text-primary" />
            </div>
          </div>

          <div className="rounded-[30px] border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Finalizadas</p>
                <p className="text-2xl font-bold">{locacoesFinalizadas}</p>
              </div>
              <CheckCircle className="h-6 w-6 text-success" />
            </div>
          </div>

          <div className="rounded-[30px] border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Faturamento</p>
                <p className="text-xl font-bold">
                  {formatCurrency(faturamentoTotal)}
                </p>
              </div>
              <DollarSign className="h-6 w-6 text-success" />
            </div>
          </div>

          <div className="rounded-[30px] border border-border bg-card p-5">
            <div>
              <p className="text-sm text-muted-foreground">Saldo em aberto</p>
              <p className="text-xl font-bold text-primary">
                {formatCurrency(saldoAberto)}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[30px] border border-border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold text-foreground">
            Filtros
          </h2>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label>Buscar</Label>
              <div className="relative">
                <Search className="absolute left-4 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  className="rounded-[30px] pl-10"
                  placeholder="Contrato, cliente ou situação"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Situação</Label>
              <select
                className="h-10 w-full rounded-[30px] border border-border bg-background px-4 text-sm text-foreground"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="todos">Todos</option>
                <option value="ativo">Ativos</option>
                <option value="finalizado">Finalizados</option>
                <option value="cancelado">Cancelados</option>
                <option value="atrasado">Atrasados</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label>De</Label>
              <Input
                className="rounded-[30px]"
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Até</Label>
              <Input
                className="rounded-[30px]"
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <Button type="button" variant="outline" onClick={limparFiltros}>
              Limpar filtros
            </Button>
          </div>
        </div>

        <div className="rounded-[30px] border border-border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold text-foreground">
            Lista de Aluguéis
          </h2>

          {loading ? (
            <p className="py-8 text-center text-muted-foreground">
              Carregando...
            </p>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              Nenhum aluguel encontrado.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="py-3 pr-4">Contrato</th>
                    <th className="py-3 pr-4">Cliente</th>
                    <th className="py-3 pr-4">Início</th>
                    <th className="py-3 pr-4">Previsão</th>
                    <th className="py-3 pr-4">Situação</th>
                    <th className="py-3 pr-4">Itens</th>
                    <th className="py-3 pr-4 text-right">Total</th>
                    <th className="py-3 pr-4 text-right">Entrada</th>
                    <th className="py-3 text-right">Saldo</th>
                  </tr>
                </thead>

                <tbody>
                  {filtered.map((l) => {
                    const total = Number(l.valor_total_final || 0);
                    const entrada = Number(l.valor_total_pago || 0);
                    const saldo = total - entrada;

                    return (
                      <tr key={l.id} className="border-b border-border">
                        <td className="py-3 pr-4 font-semibold">
                          #{l.numero_contrato}
                        </td>

                        <td className="py-3 pr-4">
                          {l.clientes?.nome_completo || "Sem cliente"}
                        </td>

                        <td className="py-3 pr-4">
                          {formatDate(l.data_inicio)}
                        </td>

                        <td className="py-3 pr-4">
                          {formatDate(l.data_previsao_entrega)}
                        </td>

                        <td className="py-3 pr-4">
                          <Badge className={situacaoColor(l.situacao)}>
                            {situacaoLabel(l.situacao)}
                          </Badge>
                        </td>

                        <td className="py-3 pr-4">
                          {l.itens_locacao?.length || 0}
                        </td>

                        <td className="py-3 pr-4 text-right font-medium">
                          {formatCurrency(total)}
                        </td>

                        <td className="py-3 pr-4 text-right text-success">
                          {formatCurrency(entrada)}
                        </td>

                        <td className="py-3 text-right font-bold text-primary">
                          {formatCurrency(saldo)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}