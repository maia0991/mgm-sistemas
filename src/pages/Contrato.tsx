import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { LocacaoComCliente, Equipamento } from "@/types";
import { formatCurrency, formatDate } from "@/lib/calculos";
import { ArrowLeft } from "lucide-react";

interface PerfilEmpresa {
  nome_empresa: string;
  cpf_cnpj: string;
  endereco: string;
  telefone: string;
  email: string;
  responsavel: string;
}

export default function ContratoPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [locacao, setLocacao] = useState<LocacaoComCliente | null>(null);
  const [equipamentos, setEquipamentos] = useState<Record<string, Equipamento>>({});
  const [empresa, setEmpresa] = useState<PerfilEmpresa | null>(null);

  useEffect(() => {
    if (!id) return;
    async function fetch() {
      const [locRes, empRes] = await Promise.all([
        supabase.from("locacoes").select("*, clientes(*), itens_locacao(*)").eq("id", id).single(),
        supabase.from("perfil_empresa").select("*").limit(1).single(),
      ]);
      if (locRes.data) {
        setLocacao(locRes.data as LocacaoComCliente);
        const eqIds = (locRes.data.itens_locacao || []).map((i: { equipamento_id: string }) => i.equipamento_id);
        if (eqIds.length > 0) {
          const { data: eqs } = await supabase.from("equipamentos").select("*").in("id", eqIds);
          const map: Record<string, Equipamento> = {};
          (eqs || []).forEach((e) => { map[e.id] = e; });
          setEquipamentos(map);
        }
      }
      if (empRes.data) setEmpresa(empRes.data as PerfilEmpresa);
    }
    fetch();
  }, [id]);

  if (!locacao) return <div className="flex min-h-screen items-center justify-center"><p className="text-muted-foreground">Carregando...</p></div>;

  const nomeEmpresa = empresa?.nome_empresa || "MGM SISTEMAS";
  const entrada = Number(locacao.valor_total_pago);
  const total = Number(locacao.valor_total_final);
  const saldo = total - entrada;

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="no-print mb-4 flex justify-between">
        <button onClick={() => navigate(-1)} className="rounded-[30px] bg-muted px-6 py-2 text-sm font-medium text-foreground flex items-center gap-2 hover:bg-muted/80">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>
        <button onClick={() => window.print()} className="rounded-[30px] bg-primary px-6 py-2 text-sm font-medium text-primary-foreground">
          Imprimir Contrato
        </button>
      </div>

      <div className="mx-auto max-w-[210mm] bg-background p-8 print:bg-white print:text-black print:p-12">
        {/* Header da Empresa */}
        <div className="mb-8 text-center border-b border-border pb-6 print:border-black">
          <h1 className="text-2xl font-bold text-foreground print:text-black">{nomeEmpresa}</h1>
          {empresa ? (
            <div className="text-xs text-muted-foreground print:text-gray-600 mt-1 space-y-0.5">
              {empresa.cpf_cnpj && <p>CNPJ/CPF: {empresa.cpf_cnpj}</p>}
              {empresa.endereco && <p>{empresa.endereco}</p>}
              <p>
                {[empresa.telefone, empresa.email].filter(Boolean).join(" • ")}
              </p>
              {empresa.responsavel && <p>Responsável: {empresa.responsavel}</p>}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground print:text-gray-600">Locação de Equipamentos</p>
          )}
          <p className="mt-2 text-lg font-semibold text-foreground print:text-black">CONTRATO DE LOCAÇÃO Nº {locacao.numero_contrato}</p>
        </div>

        {/* Dados do Cliente */}
        <div className="mb-6 space-y-2">
          <h2 className="font-bold text-foreground print:text-black">DADOS DO CLIENTE</h2>
          <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
            <p className="text-muted-foreground print:text-gray-600">Nome: <span className="text-foreground font-medium print:text-black">{locacao.clientes?.nome_completo}</span></p>
            <p className="text-muted-foreground print:text-gray-600">CPF/CNPJ: <span className="text-foreground font-medium print:text-black">{locacao.clientes?.cpf_cnpj || "-"}</span></p>
            <p className="text-muted-foreground print:text-gray-600">WhatsApp: <span className="text-foreground font-medium print:text-black">{locacao.clientes?.whatsapp || "-"}</span></p>
            <p className="text-muted-foreground print:text-gray-600">Endereço: <span className="text-foreground font-medium print:text-black">{locacao.clientes?.endereco_obra || "-"}</span></p>
          </div>
        </div>

        {/* Itens */}
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

        {/* Período e Valores */}
        <div className="mb-6 grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
          <h2 className="col-span-2 font-bold text-foreground print:text-black mb-1">PERÍODO E VALORES</h2>
          <p className="text-muted-foreground print:text-gray-600">Início: <span className="text-foreground font-medium print:text-black">{formatDate(locacao.data_inicio)}</span></p>
          <p className="text-muted-foreground print:text-gray-600">Previsão Entrega: <span className="text-foreground font-medium print:text-black">{formatDate(locacao.data_previsao_entrega)}</span></p>
          <p className="text-muted-foreground print:text-gray-600">Taxa Entrega: <span className="text-foreground font-medium print:text-black">{formatCurrency(Number(locacao.taxa_entrega))}</span></p>
          <p className="text-muted-foreground print:text-gray-600">Desconto: <span className="text-foreground font-medium print:text-black">{formatCurrency(Number(locacao.valor_desconto))}</span></p>
          <p className="text-muted-foreground print:text-gray-600">Entrada/Antecipado: <span className="text-foreground font-medium print:text-black">{formatCurrency(entrada)}</span></p>
          <p className="text-muted-foreground print:text-gray-600 font-bold">Valor Total: <span className="text-foreground font-bold print:text-black">{formatCurrency(total)}</span></p>
          <p className="text-muted-foreground print:text-gray-600 font-bold">Saldo Restante: <span className="text-foreground font-bold print:text-black">{formatCurrency(saldo > 0 ? saldo : 0)}</span></p>
        </div>

        {/* Termos */}
        <div className="mb-8 text-sm text-muted-foreground print:text-gray-600 space-y-2">
          <h2 className="font-bold text-foreground print:text-black">TERMOS DE USO</h2>
          <p>1. O LOCATÁRIO se compromete a devolver os equipamentos em perfeito estado de conservação.</p>
          <p>2. Qualquer dano causado aos equipamentos será de responsabilidade do LOCATÁRIO.</p>
          <p>3. O não pagamento nas datas acordadas acarretará multa de 2% ao mês sobre o valor devido.</p>
          <p>4. A devolução dos equipamentos após a data prevista incorrerá em cobrança de diárias adicionais.</p>
          <p>5. Domingos e feriados {locacao.cobrar_domingo ? "SERÃO" : "NÃO serão"} cobrados nesta locação.</p>
          <p>6. Este contrato entra em vigor na data de retirada dos equipamentos.</p>
        </div>

        {locacao.notas_observacoes && (
          <div className="mb-8 text-sm">
            <h2 className="font-bold text-foreground print:text-black">OBSERVAÇÕES</h2>
            <p className="text-muted-foreground print:text-gray-600">{locacao.notas_observacoes}</p>
          </div>
        )}

        {/* Assinaturas */}
        <div className="mt-16 grid grid-cols-2 gap-16 text-sm text-center">
          <div>
            <div className="border-t border-border print:border-black pt-2">
              <p className="text-foreground font-medium print:text-black">{nomeEmpresa}</p>
              {empresa?.responsavel && <p className="text-xs text-muted-foreground print:text-gray-600">{empresa.responsavel}</p>}
              <p className="text-muted-foreground print:text-gray-600">LOCADOR</p>
            </div>
          </div>
          <div>
            <div className="border-t border-border print:border-black pt-2">
              <p className="text-foreground font-medium print:text-black">{locacao.clientes?.nome_completo}</p>
              {locacao.clientes?.cpf_cnpj && <p className="text-xs text-muted-foreground print:text-gray-600">{locacao.clientes.cpf_cnpj}</p>}
              <p className="text-muted-foreground print:text-gray-600">LOCATÁRIO</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
