import { useEffect, useMemo, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Printer, ArrowLeft, Receipt, MessageCircle, Image as ImageIcon } from "lucide-react";
import {
  formatCurrency,
  formatDate,
  calcularDiasCobrados,
} from "@/lib/calculos";
import { DiaNaoCobrado } from "@/types";
import { toast } from "sonner";
import html2canvas from "html2canvas";

interface ClienteComprovante {
  id: string;
  nome_completo: string;
  cpf_cnpj: string | null;
  whatsapp: string | null;
  endereco_obra: string | null;
}

interface EquipamentoComprovante {
  id: string;
  nome: string;
  valor_diaria?: number | string | null;
}

interface ItemLocacaoComprovante {
  id?: string;
  equipamento_id: string;
  quantidade_locada: number;
  valor_diaria_fechado: number | string;
  tipo_cobranca?: string | null;
  data_inicio_cobranca?: string | null;
  equipamentos?: EquipamentoComprovante | null;
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

interface PerfilEmpresa {
  nome_empresa?: string | null;
  responsavel?: string | null;
  telefone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  cnpj?: string | null;
  endereco?: string | null;
}

function normalizarTipo(tipo?: string | null): "diaria" | "mensal" {
  if (tipo === "mensal") return "mensal";
  return "diaria";
}

function isDataDepois(dataA: string, dataB: string) {
  return (
    new Date(dataA + "T12:00:00").getTime() >
    new Date(dataB + "T12:00:00").getTime()
  );
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

export default function ComprovanteLocacaoPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [locacao, setLocacao] = useState<LocacaoComprovante | null>(null);
  const [perfilEmpresa, setPerfilEmpresa] = useState<PerfilEmpresa | null>(null);
  const [diasNaoCobrados, setDiasNaoCobrados] = useState<DiaNaoCobrado[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataDevolucaoVisual, setDataDevolucaoVisual] = useState("");
  const [modoImpressao, setModoImpressao] = useState<"a4" | "termico">("a4");
  const [gerandoImagem, setGerandoImagem] = useState(false);

  const comprovanteRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (id) {
      void fetchComprovante();
    }
  }, [id]);

  async function fetchComprovante() {
    try {
      setLoading(true);

      const [locacaoRes, perfilRes, diasRes] = await Promise.all([
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

      if (diasRes.error) {
        console.error("Erro ao carregar dias não cobrados:", diasRes.error);
      }

      const locacaoData = locacaoRes.data as unknown as LocacaoComprovante;

      setLocacao(locacaoData);
      setDataDevolucaoVisual(locacaoData.data_previsao_entrega || "");
      setPerfilEmpresa((perfilRes.data as PerfilEmpresa | null) ?? null);
      setDiasNaoCobrados((diasRes.data as DiaNaoCobrado[]) || []);
    } catch (error) {
      console.error("Erro inesperado ao carregar comprovante:", error);
      toast.error("Erro inesperado ao carregar comprovante");
    } finally {
      setLoading(false);
    }
  }

  const temMensalidade = useMemo(() => {
    if (!locacao) return false;

    return (locacao.itens_locacao || []).some(
      (item) => normalizarTipo(item.tipo_cobranca) === "mensal"
    );
  }, [locacao]);

  const mesesContrato = useMemo(() => {
    if (!locacao) return 1;

    return calcularMesesEntre(locacao.data_inicio, locacao.data_previsao_entrega);
  }, [locacao]);

  const itensComNome = useMemo(() => {
    if (!locacao || !dataDevolucaoVisual) return [];

    const vencimento = locacao.data_previsao_entrega;
    const passouDoVencimento =
      temMensalidade &&
      vencimento &&
      isDataDepois(dataDevolucaoVisual, vencimento);

    return locacao.itens_locacao.map((item) => {
      const tipo = normalizarTipo(item.tipo_cobranca);
      const nome = item.equipamentos?.nome || "Equipamento";
      const qtd = Number(item.quantidade_locada || 0);
      const valorFechado = Number(item.valor_diaria_fechado || 0);
      const valorDiariaExtra = Number(item.equipamentos?.valor_diaria || 0);
      const dataInicioCobranca =
        item.data_inicio_cobranca || locacao.data_inicio;

      if (tipo === "mensal") {
        const diasExtras =
          passouDoVencimento && vencimento
            ? calcularDiasCobrados(
                new Date(vencimento + "T12:00:00"),
                new Date(dataDevolucaoVisual + "T12:00:00"),
                diasNaoCobrados,
                locacao.cobrar_domingo
              )
            : 0;

        const subtotalMensal = qtd * valorFechado * mesesContrato;
        const subtotalExtras = qtd * valorDiariaExtra * diasExtras;

        return {
          ...item,
          nome,
          tipo,
          qtd,
          valorFechado,
          valorDiariaExtra,
          dataInicioCobranca,
          diasItem: 0,
          diasExtras,
          mesesContrato,
          subtotal: subtotalMensal + subtotalExtras,
        };
      }

      const diasItem = calcularDiasCobrados(
        new Date(dataInicioCobranca + "T12:00:00"),
        new Date(dataDevolucaoVisual + "T12:00:00"),
        diasNaoCobrados,
        locacao.cobrar_domingo
      );

      return {
        ...item,
        nome,
        tipo,
        qtd,
        valorFechado,
        valorDiariaExtra,
        dataInicioCobranca,
        diasItem,
        diasExtras: 0,
        mesesContrato: 0,
        subtotal: qtd * valorFechado * diasItem,
      };
    });
  }, [
    locacao,
    diasNaoCobrados,
    dataDevolucaoVisual,
    temMensalidade,
    mesesContrato,
  ]);

  const subtotalItens = useMemo(() => {
    return itensComNome.reduce((soma, item) => soma + item.subtotal, 0);
  }, [itensComNome]);

  const taxaEntrega = Number(locacao?.taxa_entrega || 0);
  const valorDesconto = Number(locacao?.valor_desconto || 0);
  const valorPago = Number(locacao?.valor_total_pago || 0);
  const valorTotal = subtotalItens + taxaEntrega - valorDesconto;
  const saldo = valorTotal - valorPago;

  function handlePrint(tipo: "a4" | "termico") {
    setModoImpressao(tipo);
    setTimeout(() => {
      window.print();
    }, 150);
  }

  async function handleBaixarImagem() {
    if (!comprovanteRef.current) {
      toast.error("Erro ao localizar comprovante para imagem.");
      return;
    }

    try {
      setGerandoImagem(true);
      toast.info("Gerando foto do comprovante...");

      const canvas = await html2canvas(comprovanteRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });

      const image = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = image;
      link.download = `Comprovante_Locacao_${locacao?.numero_contrato || "MGM"}.png`;
      link.click();

      toast.success("Foto do comprovante baixada!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao gerar foto do comprovante.");
    } finally {
      setGerandoImagem(false);
    }
  }

  async function handleEnviarImagemWhatsApp() {
    await handleBaixarImagem();

    if (!locacao?.clientes?.whatsapp) {
      toast.error("Cliente não possui número de WhatsApp cadastrado!");
      return;
    }

    const numeroLimpo = locacao.clientes.whatsapp.replace(/\D/g, "");
    const numeroComDDD = numeroLimpo.length <= 11 ? `55${numeroLimpo}` : numeroLimpo;
    const nomeCliente = locacao.clientes.nome_completo || "Cliente";

    const mensagem = `Olá *${nomeCliente}*, segue a foto do seu comprovante de locação Nº *${locacao.numero_contrato}*.`;

    const url = `https://wa.me/${numeroComDDD}?text=${encodeURIComponent(mensagem)}`;
    window.open(url, "_blank");
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
      <div className="no-print sticky top-0 z-10 flex flex-wrap justify-center gap-3 border-b bg-white p-4 shadow-sm">
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>

        <Button
          onClick={() => handlePrint("a4")}
          className="bg-primary font-black uppercase tracking-widest text-white hover:bg-primary/90"
        >
          <Printer className="mr-2 h-4 w-4" />
          Imprimir A4
        </Button>

        <Button
          onClick={() => handlePrint("termico")}
          className="bg-slate-800 font-black uppercase tracking-widest text-white hover:bg-slate-700"
        >
          <Receipt className="mr-2 h-4 w-4" />
          Térmico (80mm)
        </Button>

        <Button
          onClick={handleBaixarImagem}
          disabled={gerandoImagem}
          variant="outline"
          className="border-blue-600 text-blue-600 hover:bg-blue-50 font-black uppercase tracking-widest"
        >
          <ImageIcon className="mr-2 h-4 w-4" />
          {gerandoImagem ? "Gerando..." : "Baixar PNG"}
        </Button>

        <Button
          onClick={handleEnviarImagemWhatsApp}
          className="bg-emerald-600 font-black uppercase tracking-widest text-white hover:bg-emerald-500"
        >
          <MessageCircle className="mr-2 h-4 w-4" />
          Enviar Foto no Zap
        </Button>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body {
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
          ${modoImpressao === "termico" ? `
            @page {
              size: 80mm auto;
              margin: 0mm;
            }
            body {
              width: 80mm;
            }
            .print-a4 {
              display: none !important;
            }
            .print-termico {
              display: block !important;
              width: 80mm !important;
              padding: 5mm !important;
              margin: 0 !important;
              box-shadow: none !important;
            }
          ` : `
            @page {
              size: A4;
              margin: 10mm;
            }
            .print-termico {
              display: none !important;
            }
            .print-a4 {
              display: block !important;
            }
          `}
        }
      ` }} />

      {/* FORMATO A4 */}
      <div
        ref={comprovanteRef}
        className={`print-a4 mx-auto min-h-[297mm] w-[210mm] bg-white px-12 py-10 text-black shadow-lg print:mx-0 print:w-full print:px-8 print:py-6 print:shadow-none ${
          modoImpressao === "termico" ? "hidden" : "block"
        }`}
      >
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
                <strong>ENDEREÇO:</strong>{" "}
                {locacao.clientes?.endereco_obra || "—"}
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

              {temMensalidade && (
                <p>
                  <strong>TIPO:</strong> Mensalidade ({mesesContrato}{" "}
                  {mesesContrato === 1 ? "mês" : "meses"})
                </p>
              )}
            </div>
          </div>
        </div>

        <table className="mb-8 w-full text-[13px]">
          <thead>
            <tr className="border-b-2 border-black text-left text-[11px] font-black uppercase">
              <th className="py-2">Equipamento</th>
              <th className="py-2 text-center">Qtd</th>
              <th className="py-2 text-right">Valor</th>
              <th className="py-2 text-right">Subtotal</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200">
            {itensComNome.map((item, index) => (
              <tr key={index}>
                <td className="py-3">
                  <div className="flex flex-col">
                    <span className="font-semibold uppercase">{item.nome}</span>

                    {item.dataInicioCobranca &&
                      item.dataInicioCobranca !== locacao.data_inicio && (
                        <span className="text-[10px] font-bold uppercase text-blue-600">
                          Complemento em {formatDate(item.dataInicioCobranca)}
                        </span>
                      )}

                    {item.tipo === "mensal" ? (
                      <span className="text-[10px] font-bold uppercase text-blue-600">
                        {item.mesesContrato}{" "}
                        {item.mesesContrato === 1 ? "mensalidade" : "mensalidades"}
                        {item.diasExtras > 0
                          ? ` + ${item.diasExtras} diária(s) extra(s)`
                          : ""}
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold uppercase text-blue-600">
                        {item.diasItem} diária(s)
                      </span>
                    )}
                  </div>
                </td>

                <td className="py-3 text-center">{item.qtd}</td>

                <td className="py-3 text-right">
                  {formatCurrency(item.valorFechado)}
                  {item.tipo === "mensal" && item.diasExtras > 0 && (
                    <div className="text-[10px] text-gray-500">
                      Extra: {formatCurrency(item.valorDiariaExtra)} / diária
                    </div>
                  )}
                </td>

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
              <td className="pt-2 text-right">{formatCurrency(valorTotal)}</td>
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

      {/* FORMATO TÉRMICO (80mm) */}
      <div className={`print-termico mx-auto w-[80mm] bg-white p-4 text-black text-xs font-mono shadow-lg ${modoImpressao === "termico" ? "block" : "hidden"}`}>
        <div className="text-center border-b border-black pb-2 mb-2">
          <h2 className="font-bold uppercase text-sm">
            {perfilEmpresa?.nome_empresa || "MGM Sistemas"}
          </h2>
          <p className="text-[10px]">{perfilEmpresa?.endereco || ""}</p>
          <p className="text-[10px]">CNPJ: {perfilEmpresa?.cnpj || "—"}</p>
          <p className="text-[10px]">TEL: {perfilEmpresa?.telefone || perfilEmpresa?.whatsapp || "—"}</p>
        </div>

        <div className="text-center border-b border-black pb-2 mb-2">
          <p className="font-bold uppercase text-sm">COMPROVANTE DE LOCAÇÃO</p>
          <p className="font-bold text-sm">CONTRATO Nº {locacao.numero_contrato}</p>
        </div>

        <div className="mb-2 space-y-0.5 text-[11px]">
          <p><strong>Cliente:</strong> {locacao.clientes?.nome_completo || "—"}</p>
          <p><strong>Doc:</strong> {locacao.clientes?.cpf_cnpj || "—"}</p>
          <p><strong>Tel:</strong> {locacao.clientes?.whatsapp || "—"}</p>
          <p><strong>Saída:</strong> {formatDate(locacao.data_inicio)}</p>
          <p><strong>Devolução:</strong> {formatDate(dataDevolucaoVisual)}</p>
        </div>

        <div className="border-t border-b border-black py-1 mb-2">
          <div className="flex justify-between font-bold text-[10px]">
            <span>ITEM / QTD</span>
            <span>SUBTOTAL</span>
          </div>
          {itensComNome.map((item, index) => (
            <div key={index} className="mt-1">
              <div className="flex justify-between font-semibold uppercase">
                <span>{item.qtd}x {item.nome}</span>
                <span>{formatCurrency(item.subtotal)}</span>
              </div>
              <div className="text-[9px] text-gray-600">
                {item.tipo === "mensal" ? `${item.mesesContrato} mês(es)` : `${item.diasItem} diária(s)`} - {formatCurrency(item.valorFechado)} un
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-0.5 text-right text-[11px] mb-3">
          <p>Subtotal: {formatCurrency(subtotalItens)}</p>
          {taxaEntrega > 0 && <p>Taxa Entrega: {formatCurrency(taxaEntrega)}</p>}
          {valorDesconto > 0 && <p>Desconto: -{formatCurrency(valorDesconto)}</p>}
          <p className="font-bold text-sm">TOTAL: {formatCurrency(valorTotal)}</p>
          {valorPago > 0 && <p>Entrada: {formatCurrency(valorPago)}</p>}
          <p className="font-bold text-sm text-blue-700">SALDO: {formatCurrency(saldo)}</p>
        </div>

        <div className="text-center border-t border-black pt-2 text-[10px]">
          <p>{new Date().toLocaleDateString("pt-BR")} {new Date().toLocaleTimeString("pt-BR")}</p>
          <p className="mt-1 font-bold">Obrigado pela preferência!</p>
        </div>
      </div>
    </div>
  );
}