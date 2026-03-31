import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { LocacaoComCliente, Equipamento } from "@/types";
import { formatCurrency, formatDate } from "@/lib/calculos";

export default function ContratoPage() {
  const { id } = useParams<{ id: string }>();
  const [locacao, setLocacao] = useState<LocacaoComCliente | null>(null);
  const [equipamentos, setEquipamentos] = useState<Record<string, Equipamento>>({});

  useEffect(() => {
    if (!id) return;
    async function fetch() {
      const { data } = await supabase
        .from("locacoes")
        .select("*, clientes(*), itens_locacao(*)")
        .eq("id", id)
        .single();
      if (data) {
        setLocacao(data as LocacaoComCliente);
        const eqIds = (data.itens_locacao || []).map((i: { equipamento_id: string }) => i.equipamento_id);
        if (eqIds.length > 0) {
          const { data: eqs } = await supabase.from("equipamentos").select("*").in("id", eqIds);
          const map: Record<string, Equipamento> = {};
          (eqs || []).forEach((e) => { map[e.id] = e; });
          setEquipamentos(map);
        }
      }
    }
    fetch();
  }, [id]);

  if (!locacao) return <div className="flex min-h-screen items-center justify-center"><p className="text-muted-foreground">Carregando...</p></div>;

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="no-print mb-4 flex justify-end">
        <button onClick={() => window.print()} className="rounded-[30px] bg-primary px-6 py-2 text-sm font-medium text-primary-foreground">
          Imprimir Contrato
        </button>
      </div>

      <div className="mx-auto max-w-[210mm] bg-background p-8 print:bg-white print:text-black print:p-12">
        <div className="mb-8 text-center border-b border-border pb-6 print:border-black">
          <h1 className="text-2xl font-bold text-foreground print:text-black">MGM SISTEMAS</h1>
          <p className="text-sm text-muted-foreground print:text-gray-600">Locação de Equipamentos de Alto Padrão</p>
          <p className="mt-2 text-lg font-semibold text-foreground print:text-black">CONTRATO DE LOCAÇÃO Nº {locacao.numero_contrato}</p>
        </div>

        <div className="mb-6 space-y-2">
          <h2 className="font-bold text-foreground print:text-black">DADOS DO CLIENTE</h2>
          <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
            <p className="text-muted-foreground print:text-gray-600">Nome: <span className="text-foreground font-medium print:text-black">{locacao.clientes?.nome_completo}</span></p>
            <p className="text-muted-foreground print:text-gray-600">CPF/CNPJ: <span className="text-foreground font-medium print:text-black">{locacao.clientes?.cpf_cnpj || "-"}</span></p>
            <p className="text-muted-foreground print:text-gray-600">WhatsApp: <span className="text-foreground font-medium print:text-black">{locacao.clientes?.whatsapp || "-"}</span></p>
            <p className="text-muted-foreground print:text-gray-600">Endereço: <span className="text-foreground font-medium print:text-black">{locacao.clientes?.endereco_obra || "-"}</span></p>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="font-bold text-foreground print:text-black mb-2">ITENS LOCADOS</h2>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border print:border-black">
                <th className="py-2 text-left text-muted-foreground print:text-gray-600">Equipamento</th>
                <th className="py-2 text-center text-muted-foreground print:text-gray-600">Qtd</th>
                <th className="py-2 text-right text-muted-foreground print:text-gray-600">Valor/Dia</th>
              </tr>
            </thead>
            <tbody>
              {locacao.itens_locacao.map((item) => (
                <tr key={item.id} className="border-b border-border/50 print:border-gray-300">
                  <td className="py-2 text-foreground print:text-black">{equipamentos[item.equipamento_id]?.nome || item.equipamento_id}</td>
                  <td className="py-2 text-center text-foreground print:text-black">{item.quantidade_locada}</td>
                  <td className="py-2 text-right text-foreground print:text-black">{formatCurrency(Number(item.valor_diaria_fechado))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
          <h2 className="col-span-2 font-bold text-foreground print:text-black mb-1">PERÍODO E VALORES</h2>
          <p className="text-muted-foreground print:text-gray-600">Início: <span className="text-foreground font-medium print:text-black">{formatDate(locacao.data_inicio)}</span></p>
          <p className="text-muted-foreground print:text-gray-600">Previsão Entrega: <span className="text-foreground font-medium print:text-black">{formatDate(locacao.data_previsao_entrega)}</span></p>
          <p className="text-muted-foreground print:text-gray-600">Taxa Entrega: <span className="text-foreground font-medium print:text-black">{formatCurrency(Number(locacao.taxa_entrega))}</span></p>
          <p className="text-muted-foreground print:text-gray-600">Desconto: <span className="text-foreground font-medium print:text-black">{formatCurrency(Number(locacao.valor_desconto))}</span></p>
          <p className="text-muted-foreground print:text-gray-600">Entrada: <span className="text-foreground font-medium print:text-black">{formatCurrency(Number(locacao.valor_total_pago))}</span></p>
          <p className="text-muted-foreground print:text-gray-600 font-bold">Valor Total: <span className="text-foreground font-bold print:text-black">{formatCurrency(Number(locacao.valor_total_final))}</span></p>
        </div>

        <div className="mb-8 text-sm text-muted-foreground print:text-gray-600 space-y-2">
          <h2 className="font-bold text-foreground print:text-black">TERMOS DE USO</h2>
          <p>1. O LOCATÁRIO se compromete a devolver os equipamentos em perfeito estado de conservação.</p>
          <p>2. Qualquer dano causado aos equipamentos será de responsabilidade do LOCATÁRIO.</p>
          <p>3. O não pagamento nas datas acordadas acarretará multa de 2% ao mês sobre o valor devido.</p>
          <p>4. A devolução dos equipamentos após a data prevista incorrerá em cobrança de diárias adicionais.</p>
          <p>5. Domingos e feriados {locacao.cobrar_domingo ? "SERÃO" : "NÃO serão"} cobrados nesta locação.</p>
        </div>

        {locacao.notas_observacoes && (
          <div className="mb-8 text-sm">
            <h2 className="font-bold text-foreground print:text-black">OBSERVAÇÕES</h2>
            <p className="text-muted-foreground print:text-gray-600">{locacao.notas_observacoes}</p>
          </div>
        )}

        <div className="mt-16 grid grid-cols-2 gap-16 text-sm text-center">
          <div>
            <div className="border-t border-border print:border-black pt-2">
              <p className="text-foreground font-medium print:text-black">MGM Sistemas</p>
              <p className="text-muted-foreground print:text-gray-600">LOCADOR</p>
            </div>
          </div>
          <div>
            <div className="border-t border-border print:border-black pt-2">
              <p className="text-foreground font-medium print:text-black">{locacao.clientes?.nome_completo}</p>
              <p className="text-muted-foreground print:text-gray-600">LOCATÁRIO</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
