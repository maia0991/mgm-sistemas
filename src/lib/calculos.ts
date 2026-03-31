import { isSunday, eachDayOfInterval, parseISO, format } from "date-fns";
import { DiaNaoCobrado } from "@/types";

export function calcularDiasCobrados(
  dataInicio: Date,
  dataFim: Date,
  feriados: DiaNaoCobrado[],
  cobrarDomingo: boolean
): number {
  const dias = eachDayOfInterval({ start: dataInicio, end: dataFim });
  const feriadosDatas = new Set(
    feriados.filter((f) => f.ativo).map((f) => f.data)
  );

  let diasCobrados = 0;
  for (const dia of dias) {
    const dataStr = format(dia, "yyyy-MM-dd");
    if (feriadosDatas.has(dataStr)) continue;
    if (!cobrarDomingo && isSunday(dia)) continue;
    diasCobrados++;
  }
  return diasCobrados;
}

export function calcularValorTotal(
  itens: { quantidade_locada: number; valor_diaria_fechado: number }[],
  diasCobrados: number,
  taxaEntrega: number,
  valorDesconto: number
): number {
  const totalItens = itens.reduce(
    (acc, item) => acc + item.quantidade_locada * item.valor_diaria_fechado * diasCobrados,
    0
  );
  return totalItens + taxaEntrega - valorDesconto;
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "dd/MM/yyyy");
}

export function situacaoLabel(situacao: string): string {
  const map: Record<string, string> = {
    ativo: "Ativo",
    finalizado: "Finalizado",
    cancelado: "Cancelado",
    atrasado: "Atrasado",
    alerta: "Alerta",
  };
  return map[situacao] || situacao;
}

export function situacaoColor(situacao: string): string {
  const map: Record<string, string> = {
    ativo: "bg-success/20 text-success",
    finalizado: "bg-muted text-muted-foreground",
    cancelado: "bg-destructive/20 text-destructive",
    atrasado: "bg-destructive/20 text-destructive",
    alerta: "bg-warning/20 text-warning",
  };
  return map[situacao] || "bg-muted text-muted-foreground";
}
