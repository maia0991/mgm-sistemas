import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Printer, ArrowLeft } from "lucide-react";
import {
  formatCurrency,
  formatDate,
  calcularDiasCobrados,
  tipoCobrancaLabel,
} from "@/lib/calculos";
import { DiaNaoCobrado, TipoCobranca } from "@/types";
import { toast } from "sonner";

interface ClienteContrato {
  id: string;
  nome_completo: string;
  cpf_cnpj: string | null;
  whatsapp: string | null;
  endereco_obra: string | null;
}

interface EquipamentoContrato {
  id: string;
  nome: string;
  valor_diaria?: number | string | null;
}

interface ItemLocacaoContrato {
  id?: string;
  equipamento_id: string;
  quantidade_locada: number;
  valor_diaria_fechado: number | string;
  tipo_cobranca?: TipoCobranca | string | null;
  data_inicio_cobranca?: string | null;
  equipamentos?: EquipamentoContrato | null;
}

interface LocacaoContrato {
  id: string;
  numero_contrato: number;
  data_inicio: string;
  data_previsao_entrega: string | null;
  taxa_entrega: number | string | null;
  valor_desconto: number | string | null;
  valor_total_pago: number | string | null;
  valor_total_final: number | string | null;
  cobrar_domingo: boolean;
  clientes: ClienteContrato | null;
  itens_locacao: ItemLocacaoContrato[];
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

interface FotoEntregaContrato {
  id: string;
  url_foto: string;
}

function normalizarTipo(tipo?: string | null): TipoCobranca {
  if (tipo === "mensal") return "mensal";
  return "diaria";
}

function calcularMesesEntre(dataInicio?: string | null, dataFim?: string | null) {
  if (!dataInicio || !dataFim) return 1;

  const inicio = new Date(dataInicio + "T12:00:00");
  const fim = new Date(dataFim + "T12:00:00");

  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime())) {
    return 1;
  }

  const meses =
    (fim.getFullYear() - inicio.getFullYear()) * 12 +
    (fim.getMonth() - inicio.getMonth());

  return Math.max(1, meses || 1);
}

export default function ContratoPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [locacao, setLocacao] = useState<LocacaoContrato | null>(null);
  const [perfilEmpresa, setPerfilEmpresa] = useState<PerfilEmpresa | null>(null);
  const [diasNaoCobrados, setDiasNaoCobrados] = useState<DiaNaoCobrado[]>([]);
  const [fotosEntrega, setFotosEntrega] = useState<FotoEntregaContrato[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      void fetchContrato();
    }
  }, [id]);

  async function fetchContrato() {
    try {
      setLoading(true);

      const [locacaoRes, perfilRes, diasRes, fotosRes] = await Promise.all([
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
                nome,
                valor_diaria
              )
            )
          `
          )
          .eq("id", id)
          .single(),

        supabase.from("perfil_empresa").select("*").maybeSingle(),

        supabase.from("dias_nao_cobrados").select("*").eq("ativo", true),

        (supabase as any)
          .from("fotos_entrega_locacao")
          .select("id, url_foto")
          .eq("locacao_id", id),
      ]);

      if (locacaoRes.error || !locacaoRes.data) {
        console.error("Erro ao carregar contrato:", locacaoRes.error);
        toast.error("Erro ao carregar contrato");
        return;
      }

      if (perfilRes.error) {
        console.error("Erro ao carregar perfil da empresa:", perfilRes.error);
      }

      if (diasRes.error) {
        console.error("Erro ao carregar dias não cobrados:", diasRes.error);
      }

      if (fotosRes.error) {
        console.error("Erro ao carregar fotos da entrega:", fotosRes.error);
      }

      const fotosBanco = (
        (fotosRes.data as unknown as FotoEntregaContrato[]) || []
      ).filter(Boolean);

      const fotosComUrl = await Promise.all(
        fotosBanco.map(async (foto) => {
          const { data: signed } = await supabase.storage
            .from("fotos-entrega")
            .createSignedUrl(foto.url_foto, 60 * 60);

          if (signed?.signedUrl) {
            return {
              ...foto,
              url_foto: signed.signedUrl,
            };
          }

          const publicUrl = supabase.storage
            .from("fotos-entrega")
            .getPublicUrl(foto.url_foto).data.publicUrl;

          return {
            ...foto,
            url_foto: publicUrl,
          };
        })
      );

      setLocacao(locacaoRes.data as unknown as LocacaoContrato);
      setPerfilEmpresa(
        (perfilRes.data as unknown as PerfilEmpresa | null) ?? null
      );
      setDiasNaoCobrados((diasRes.data as unknown as DiaNaoCobrado[]) || []);
      setFotosEntrega(fotosComUrl);
    } catch (error) {
      console.error("Erro inesperado ao carregar contrato:", error);
      toast.error("Erro inesperado ao carregar contrato");
    } finally {
      setLoading(false);
    }
  }

  const dataFimCalculo = locacao?.data_previsao_entrega || locacao?.data_inicio;

  const mesesContrato = useMemo(() => {
    if (!locacao) return 1;
    return calcularMesesEntre(locacao.data_inicio, locacao.data_previsao_entrega);
  }, [locacao]);

  const itensComNome = useMemo(() => {
    if (!locacao) return [];

    return (locacao.itens_locacao || []).map((item) => {
      const tipo = normalizarTipo(item.tipo_cobranca);
      const nome = item.equipamentos?.nome || "Equipamento";
      const qtd = Number(item.quantidade_locada || 0);
      const valorPeriodo = Number(item.valor_diaria_fechado || 0);

      const dataInicioCobranca =
        item.data_inicio_cobranca || locacao.data_inicio;

      const diasItem = locacao.data_previsao_entrega
        ? calcularDiasCobrados(
            new Date(dataInicioCobranca + "T12:00:00"),
            new Date(locacao.data_previsao_entrega + "T12:00:00"),
            diasNaoCobrados,
            locacao.cobrar_domingo
          )
        : 0;

      const periodos = tipo === "mensal" ? mesesContrato : diasItem;

      const subtotal =
        tipo === "mensal"
          ? qtd * valorPeriodo * mesesContrato
          : qtd * valorPeriodo * diasItem;

      return {
        ...item,
        nome,
        qtd,
        tipo,
        valorPeriodo,
        dataInicioCobranca,
        diasItem,
        periodos,
        subtotal,
      };
    });
  }, [locacao, diasNaoCobrados, mesesContrato]);

  const diasEfetivos = useMemo(() => {
    if (!locacao || !dataFimCalculo || !locacao.data_previsao_entrega) return 0;

    return calcularDiasCobrados(
      new Date(locacao.data_inicio + "T12:00:00"),
      new Date(dataFimCalculo + "T12:00:00"),
      diasNaoCobrados,
      locacao.cobrar_domingo
    );
  }, [locacao, diasNaoCobrados, dataFimCalculo]);

  const subtotalItens = useMemo(() => {
    return itensComNome.reduce((soma, item) => soma + item.subtotal, 0);
  }, [itensComNome]);

  const taxaEntrega = Number(locacao?.taxa_entrega || 0);
  const valorDesconto = Number(locacao?.valor_desconto || 0);
  const valorPagoNaSaida = Number(locacao?.valor_total_pago || 0);

  const valorTotalContrato = useMemo(() => {
    const totalCalculado = subtotalItens + taxaEntrega - valorDesconto;
    const totalBanco = Number(locacao?.valor_total_final || 0);
    return totalBanco > 0 ? totalBanco : totalCalculado;
  }, [subtotalItens, taxaEntrega, valorDesconto, locacao]);

  const saldoRestante = valorTotalContrato - valorPagoNaSaida;

  function handlePrint() {
    window.print();
  }

  function textoPeriodo(item: (typeof itensComNome)[number]) {
    if (!locacao?.data_previsao_entrega) return "A calcular";

    if (item.tipo === "mensal") {
      return `${item.periodos} mensalidade${item.periodos === 1 ? "" : "s"}`;
    }

    return `${item.diasItem} diária${item.diasItem === 1 ? "" : "s"}`;
  }

  if (loading) {
    return (
      <div className="p-10 text-center font-black uppercase">
        Carregando Contrato...
      </div>
    );
  }

  if (!locacao) {
    return (
      <div className="p-10 text-center font-black uppercase">
        Contrato não encontrado
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
          Imprimir Contrato
        </Button>
      </div>

      <div className="print-contract mx-auto min-h-[297mm] w-[210mm] bg-white px-16 py-12 text-black shadow-lg print:mx-0 print:w-full print:px-8 print:py-6 print:shadow-none">
        <div className="mb-8 border-b-2 border-black pb-6 text-center">
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

        <div className="mb-8 text-center uppercase">
          <h1 className="border-y border-black py-2 text-2xl font-black tracking-widest">
            Contrato de Locação
          </h1>

          <p className="mt-2 inline-block border border-black bg-gray-100 px-4 font-mono text-md font-black italic">
            Nº {locacao.numero_contrato}
          </p>
        </div>

        <div className="mb-8 grid grid-cols-2 gap-10">
          <div className="border-l-4 border-black pl-4">
            <h3 className="mb-1 text-[11px] font-black uppercase tracking-wider text-gray-500">
              Locatário (Cliente)
            </h3>

            <div className="space-y-1 text-[13px]">
              <p>
                <strong>NOME:</strong> {locacao.clientes?.nome_completo || "—"}
              </p>
              <p>
                <strong>CPF/CNPJ:</strong> {locacao.clientes?.cpf_cnpj || "—"}
              </p>
              <p>
                <strong>TELEFONE:</strong> {locacao.clientes?.whatsapp || "---"}
              </p>
              <p>
                <strong>ENDEREÇO:</strong>{" "}
                {locacao.clientes?.endereco_obra || "—"}
              </p>
            </div>
          </div>

          <div className="border-l-4 border-black pl-4">
            <h3 className="mb-1 text-[11px] font-black uppercase tracking-wider text-gray-500">
              Dados da Locação
            </h3>

            <div className="space-y-1 text-[13px]">
              <p>
                <strong>SAÍDA:</strong> {formatDate(locacao.data_inicio)}
              </p>
              <p>
                <strong>DEVOLUÇÃO:</strong>{" "}
                {locacao.data_previsao_entrega
                  ? formatDate(locacao.data_previsao_entrega)
                  : "Sem previsão"}
              </p>
              <p className="font-black uppercase italic text-blue-700">
                <strong>
                  {itensComNome.some((item) => item.tipo === "mensal")
                    ? `Meses cobrados: ${mesesContrato}`
                    : `Dias cobrados: ${
                        locacao.data_previsao_entrega
                          ? diasEfetivos
                          : "Sem previsão"
                      }`}
                </strong>
              </p>
            </div>
          </div>
        </div>

        <table className="mb-8 w-full text-[13px]">
          <thead>
            <tr className="border-b-2 border-black text-left text-[11px] font-black uppercase">
              <th className="py-2">Equipamento</th>
              <th className="py-2 text-center">Qtd</th>
              <th className="py-2 text-center">Cobrança</th>
              <th className="py-2 text-right">Valor</th>
              <th className="py-2 text-right">Subtotal</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200">
            {itensComNome.map((item, index) => (
              <tr key={index}>
                <td className="py-3 font-semibold uppercase">
                  {item.nome}
                  {item.dataInicioCobranca !== locacao.data_inicio && (
                    <div className="mt-1 text-[10px] font-normal normal-case text-gray-500">
                      Complemento em {formatDate(item.dataInicioCobranca)}
                    </div>
                  )}
                  <div className="mt-1 text-[10px] font-normal normal-case text-gray-500">
                    {textoPeriodo(item)}
                  </div>
                </td>

                <td className="py-3 text-center">{item.qtd}</td>

                <td className="py-3 text-center">
                  {tipoCobrancaLabel(item.tipo)}
                </td>

                <td className="py-3 text-right">
                  {formatCurrency(item.valorPeriodo)}
                </td>

                <td className="py-3 text-right font-bold">
                  {locacao.data_previsao_entrega
                    ? formatCurrency(item.subtotal)
                    : "A calcular"}
                </td>
              </tr>
            ))}
          </tbody>

          <tfoot className="border-t-2 border-black font-bold">
            <tr>
              <td colSpan={4} className="pt-4 text-right text-[10px] uppercase">
                Subtotal Itens:
              </td>
              <td className="pt-4 text-right">{formatCurrency(subtotalItens)}</td>
            </tr>

            {taxaEntrega > 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="pt-1 text-right text-[10px] uppercase text-blue-700"
                >
                  Taxa de Entrega / Frete:
                </td>
                <td className="pt-1 text-right text-blue-700">
                  {formatCurrency(taxaEntrega)}
                </td>
              </tr>
            )}

            {valorDesconto > 0 && (
              <tr className="text-rose-600">
                <td colSpan={4} className="pt-1 text-right text-[10px] uppercase">
                  (-) Desconto Especial:
                </td>
                <td className="pt-1 text-right font-black">
                  -{formatCurrency(valorDesconto)}
                </td>
              </tr>
            )}

            <tr className="border-t border-gray-300">
              <td colSpan={4} className="pt-2 text-right text-[11px] uppercase">
                Total Bruto:
              </td>
              <td className="pt-2 text-right">
                {formatCurrency(valorTotalContrato)}
              </td>
            </tr>

            {valorPagoNaSaida > 0 && (
              <tr className="italic text-rose-600">
                <td colSpan={4} className="pt-1 text-right text-[10px] uppercase">
                  (-) Valor Recebido (Entrada):
                </td>
                <td className="pt-1 text-right font-black">
                  {formatCurrency(valorPagoNaSaida)}
                </td>
              </tr>
            )}

            <tr className="text-xl">
              <td
                colSpan={4}
                className="pt-4 text-right font-black uppercase text-blue-700"
              >
                Saldo Final a Pagar:
              </td>
              <td className="border-b-4 border-blue-700 pt-4 text-right font-mono font-black text-blue-700">
                {formatCurrency(saldoRestante)}
              </td>
            </tr>
          </tfoot>
        </table>

        <div className="mt-10 space-y-3 border-t border-black pt-6 text-[11px] leading-relaxed text-gray-800">
          <p className="mb-2 text-center text-[12px] font-black uppercase tracking-widest text-black">
            Cláusulas Contratuais
          </p>

          <p>
            1. O <strong>LOCATÁRIO</strong> se compromete a devolver os
            equipamentos no prazo estipulado e em boas condições de uso.
          </p>

          <p>
            2. Em caso de atraso na devolução, será cobrada diária adicional
            pelos dias excedentes.
          </p>

          <p>3. Domingos e feriados cadastrados não são cobrados.</p>

          <p>
            4. Danos, avarias ou perdas dos equipamentos serão cobrados à parte,
            conforme avaliação.
          </p>

          <p>
            5. O <strong>LOCATÁRIO</strong> é responsável pela guarda e
            conservação dos equipamentos durante o período de locação.
          </p>
        </div>

        {fotosEntrega.length > 0 && (
          <div className="mt-12 break-before-page">
            <div className="mb-6 border-b border-black pb-2">
              <h2 className="text-center text-xl font-black uppercase tracking-widest">
                Fotos do Equipamento no ato da entrega
              </h2>

              <p className="mt-2 text-center text-[11px] uppercase text-gray-500">
                Registro fotográfico dos equipamentos entregues
              </p>
            </div>

            <div className="grid grid-cols-2 gap-6">
              {fotosEntrega.map((foto, index) => (
                <div
                  key={foto.id}
                  className="overflow-hidden rounded-xl border border-black"
                >
                  <img
                    src={foto.url_foto}
                    alt={`Foto ${index + 1}`}
                    className="h-[260px] w-full object-cover"
                  />

                  <div className="border-t border-black bg-gray-100 px-3 py-2 text-center text-[10px] font-bold uppercase">
                    Foto {index + 1}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-20 grid grid-cols-2 gap-20">
          <div className="border-t border-black pt-2 text-center">
            <p className="text-[10px] font-black uppercase">
              Assinatura do Locatário
            </p>
            <div className="mt-1 flex flex-col text-[10px] text-gray-800">
              <span className="font-bold uppercase">
                {locacao.clientes?.nome_completo || "—"}
              </span>
              <span>CPF/CNPJ: {locacao.clientes?.cpf_cnpj || "—"}</span>
            </div>
          </div>

          <div className="border-t border-black pt-2 text-center">
            <p className="text-[10px] font-black uppercase">
              Assinatura da Locadora
            </p>
            <div className="mt-1 flex flex-col text-[10px] text-gray-800">
              <span className="font-bold uppercase">
                {perfilEmpresa?.nome_empresa || "MGM Sistemas"}
              </span>
              <span>CNPJ: {perfilEmpresa?.cnpj || "—"}</span>
            </div>
          </div>
        </div>

        <div className="mt-12 text-center text-[9px] font-bold uppercase text-gray-400">
          Imperatriz/MA, {new Date().toLocaleDateString("pt-BR")}
        </div>
      </div>
    </div>
  );
}