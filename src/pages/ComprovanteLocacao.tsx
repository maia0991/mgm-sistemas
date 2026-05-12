import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Printer, ArrowLeft } from "lucide-react";
import {
  formatCurrency,
  formatDate,
  calcularDiasCobrados,
} from "@/lib/calculos";
import { DiaNaoCobrado } from "@/types";
import { toast } from "sonner";

interface ClienteComprovante {
  id: string;
  nome_completo: string;
  cpf_cnpj: string | null;
  whatsapp: string | null;
  endereco_obra: string | null;
}

interface ItemLocacaoComprovante {
  id?: string;
  equipamento_id: string;
  quantidade_locada: number;
  valor_diaria_fechado: number | string;
  data_inicio_cobranca?: string | null;
}

interface LocacaoComprovante {
  id: string;
  numero_contrato: number;
  data_inicio: string;
  data_previsao_entrega: string;
  taxa_entrega: number | string | null;
  valor_desconto: number | string | null;
  valor_total_pago: number | string | null;
  valor_total_final: number | string | null;
  cobrar_domingo: boolean;
  clientes: ClienteComprovante | null;
  itens_locacao: ItemLocacaoComprovante[];
}

interface EquipamentoComprovante {
  id: string;
  nome: string;
}

interface PerfilEmpresa {
  nome_empresa?: string | null;
  responsavel?: string | null;
  telefone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  cnpj?: string | null;
  endereco?: string | null;
}

export default function ComprovanteLocacaoPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [locacao, setLocacao] = useState<LocacaoComprovante | null>(null);
  const [perfilEmpresa, setPerfilEmpresa] = useState<PerfilEmpresa | null>(null);
  const [equipamentos, setEquipamentos] = useState<EquipamentoComprovante[]>([]);
  const [diasNaoCobrados, setDiasNaoCobrados] = useState<DiaNaoCobrado[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataDevolucaoVisual, setDataDevolucaoVisual] = useState("");

  useEffect(() => {
    if (id) {
      void fetchComprovante();
    }
  }, [id]);

  async function fetchComprovante() {
    try {
      setLoading(true);

      const [locacaoRes, perfilRes, equipamentosRes, diasRes] = await Promise.all([
        supabase
          .from("locacoes")
          .select("*, clientes(*), itens_locacao(*)")
          .eq("id", id)
          .single(),
        supabase.from("perfil_empresa").select("*").maybeSingle(),
        supabase.from("equipamentos").select("id, nome"),
        supabase
          .from("dias_nao_cobrados")
          .select("*")
          .eq("ativo", true),
      ]);

      if (locacaoRes.error || !locacaoRes.data) {
        console.error("Erro ao carregar comprovante:", locacaoRes.error);
        toast.error("Erro ao carregar comprovante");
        return;
      }

      if (perfilRes.error) {
        console.error("Erro ao carregar perfil da empresa:", perfilRes.error);
      }

      if (equipamentosRes.error) {
        console.error("Erro ao carregar equipamentos:", equipamentosRes.error);
      }

      if (diasRes.error) {
        console.error("Erro ao carregar dias não cobrados:", diasRes.error);
      }

      const locacaoData = locacaoRes.data as LocacaoComprovante;

      setLocacao(locacaoData);
      setDataDevolucaoVisual(locacaoData.data_previsao_entrega || "");
      setPerfilEmpresa((perfilRes.data as PerfilEmpresa | null) ?? null);
      setEquipamentos((equipamentosRes.data as EquipamentoComprovante[]) || []);
      setDiasNaoCobrados((diasRes.data as DiaNaoCobrado[]) || []);
    } catch (error) {
      console.error("Erro inesperado ao carregar comprovante:", error);
      toast.error("Erro inesperado ao carregar comprovante");
    } finally {
      setLoading(false);
    }
  }

  const itensComNome = useMemo(() => {
    if (!locacao || !dataDevolucaoVisual) return [];

    return locacao.itens_locacao.map((item) => {
      const equipamento = equipamentos.find((e) => e.id === item.equipamento_id);
      const nome = equipamento?.nome || "Equipamento";
      const qtd = Number(item.quantidade_locada || 0);
      const diaria = Number(item.valor_diaria_fechado || 0);
      const dataInicioCobranca =
        item.data_inicio_cobranca || locacao.data_inicio;

      const diasItem = calcularDiasCobrados(
        new Date(dataInicioCobranca + "T12:00:00"),
        new Date(dataDevolucaoVisual + "T12:00:00"),
        diasNaoCobrados,
        locacao.cobrar_domingo
      );

      return {
        ...item,
        nome,
        qtd,
        diaria,
        dataInicioCobranca,
        diasItem,
        subtotal: qtd * diaria * diasItem,
      };
    });
  }, [locacao, equipamentos, diasNaoCobrados, dataDevolucaoVisual]);

  const subtotalItens = useMemo(() => {
    return itensComNome.reduce((soma, item) => soma + item.subtotal, 0);
  }, [itensComNome]);

  const taxaEntrega = Number(locacao?.taxa_entrega || 0);
  const valorDesconto = Number(locacao?.valor_desconto || 0);
  const valorPago = Number(locacao?.valor_total_pago || 0);
  const valorTotal = subtotalItens + taxaEntrega - valorDesconto;
  const saldo = valorTotal - valorPago;

  function handlePrint() {
    window.print();
  }

  if (loading) {
    return (
      <div className="p-10 text-center font-black uppercase">
        Carregando Comprovante...
      </div>
    );
  }

  if (!locacao) {
    return (
      <div className="p-10 text-center font-black uppercase">
        Comprovante não encontrado
      </div>
    );
  }

  return (
    <div className="min-h-screen space-y-4 bg-slate-50 pb-10">
      <div className="no-print sticky top-0 z-10 flex justify-center gap-4 border-b bg-white p-4 shadow-sm">
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>

        <Button
          onClick={handlePrint}
          className="bg-primary font-black uppercase tracking-widest text-white hover:bg-primary/90"
        >
          <Printer className="mr-2 h-4 w-4" />
          Imprimir Comprovante
        </Button>
      </div>

      <div className="print-contract mx-auto min-h-[297mm] w-[210mm] bg-white px-12 py-10 text-black shadow-lg print:mx-0 print:w-full print:px-8 print:py-6 print:shadow-none">
        <div className="mb-6 border-b-2 border-black pb-4 text-center">
          <h2 className="text-2xl font-black uppercase">
            {perfilEmpresa?.nome_empresa || "MGM Sistemas"}
          </h2>

          <div className="mt-2 text-[12px] font-medium uppercase leading-relaxed">
            <p>{perfilEmpresa?.endereco || "—"}</p>
            <p>
              CNPJ: {perfilEmpresa?.cnpj || "—"} | TEL:{" "}
              {perfilEmpresa?.telefone || perfilEmpresa?.whatsapp || "—"}
            </p>
          </div>
        </div>

        <div className="mb-6 text-center uppercase">
          <h1 className="border-y border-black py-2 text-2xl font-black tracking-widest">
            Comprovante de Locação
          </h1>

          <p className="mt-2 inline-block border border-black bg-gray-100 px-4 text-md font-black italic font-mono">
            Nº {locacao.numero_contrato}
          </p>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-8">
          <div className="border-l-4 border-black pl-4">
            <h3 className="mb-1 text-[11px] font-black uppercase tracking-wider text-gray-500">
              Cliente
            </h3>

            <div className="space-y-1 text-[13px]">
              <p>
                <strong>NOME:</strong> {locacao.clientes?.nome_completo || "—"}
              </p>
              <p>
                <strong>CPF/CNPJ:</strong> {locacao.clientes?.cpf_cnpj || "—"}
              </p>
              <p>
                <strong>TELEFONE:</strong> {locacao.clientes?.whatsapp || "—"}
              </p>
              <p>
                <strong>ENDEREÇO:</strong> {locacao.clientes?.endereco_obra || "—"}
              </p>
            </div>
          </div>

          <div className="border-l-4 border-black pl-4">
            <h3 className="mb-1 text-[11px] font-black uppercase tracking-wider text-gray-500">
              Dados da Locação
            </h3>

            <div className="space-y-3 text-[13px]">
              <p>
                <strong>SAÍDA:</strong> {formatDate(locacao.data_inicio)}
              </p>

              <div>
                <strong>NOVA DEVOLUÇÃO:</strong>
                <Input
                  type="date"
                  style={{ colorScheme: "light" }}
                  className="mt-2 rounded-[20px] no-print border-black bg-white text-black"
                  value={dataDevolucaoVisual}
                  onChange={(e) => setDataDevolucaoVisual(e.target.value)}
                />
                <p className="print:block hidden mt-1">
                  {formatDate(dataDevolucaoVisual)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <table className="mb-8 w-full text-[13px]">
          <thead>
            <tr className="border-b-2 border-black text-left text-[11px] font-black uppercase">
              <th className="py-2">Equipamento</th>
              <th className="py-2 text-center">Qtd</th>
              <th className="py-2 text-right">Diária</th>
              <th className="py-2 text-right">Subtotal</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200">
            {itensComNome.map((item, index) => (
              <tr key={index}>
                <td className="py-3">
                  <div className="flex flex-col">
                    <span className="font-semibold uppercase">
                      {item.nome}
                    </span>

                    {item.dataInicioCobranca &&
                      item.dataInicioCobranca !== locacao.data_inicio && (
                        <span className="text-[10px] font-bold uppercase text-blue-600">
                          Complemento em {formatDate(item.dataInicioCobranca)}
                        </span>
                      )}
                  </div>
                </td>

                <td className="py-3 text-center">{item.qtd}</td>
                <td className="py-3 text-right">{formatCurrency(item.diaria)}</td>
                <td className="py-3 text-right font-bold">
                  {formatCurrency(item.subtotal)}
                </td>
              </tr>
            ))}
          </tbody>

          <tfoot className="border-t-2 border-black font-bold">
            <tr>
              <td colSpan={3} className="pt-4 text-right text-[10px] uppercase">
                Subtotal Itens:
              </td>
              <td className="pt-4 text-right">{formatCurrency(subtotalItens)}</td>
            </tr>

            {taxaEntrega > 0 && (
              <tr>
                <td colSpan={3} className="pt-1 text-right text-[10px] uppercase">
                  Taxa de Entrega:
                </td>
                <td className="pt-1 text-right">{formatCurrency(taxaEntrega)}</td>
              </tr>
            )}

            {valorDesconto > 0 && (
              <tr className="text-rose-600">
                <td colSpan={3} className="pt-1 text-right text-[10px] uppercase">
                  (-) Desconto:
                </td>
                <td className="pt-1 text-right font-black">
                  -{formatCurrency(valorDesconto)}
                </td>
              </tr>
            )}

            <tr className="border-t border-gray-300">
              <td colSpan={3} className="pt-2 text-right text-[11px] uppercase">
                Total:
              </td>
              <td className="pt-2 text-right">
                {formatCurrency(valorTotal)}
              </td>
            </tr>

            {valorPago > 0 && (
              <tr className="italic text-rose-600">
                <td colSpan={3} className="pt-1 text-right text-[10px] uppercase">
                  (-) Entrada:
                </td>
                <td className="pt-1 text-right font-black">
                  {formatCurrency(valorPago)}
                </td>
              </tr>
            )}

            <tr className="text-xl">
              <td
                colSpan={3}
                className="pt-4 text-right font-black uppercase text-blue-700"
              >
                Saldo:
              </td>
              <td className="border-b-4 border-blue-700 pt-4 text-right font-mono font-black text-blue-700">
                {formatCurrency(saldo)}
              </td>
            </tr>
          </tfoot>
        </table>

        <div className="mt-10 border-t border-black pt-4 text-center text-[10px] font-bold uppercase text-gray-500">
          Imperatriz/MA, {new Date().toLocaleDateString("pt-BR")}
        </div>
      </div>
    </div>
  );
}