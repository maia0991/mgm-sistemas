import {
  isSunday,
  eachDayOfInterval,
  parseISO,
  format,
  isValid,
} from "date-fns";
import { DiaNaoCobrado } from "@/types";

export function calcularDiasCobrados(
  dataInicio: Date,
  dataFim: Date,
  feriados: DiaNaoCobrado[],
  cobrarDomingo: boolean
): number {
  if (!isValid(dataInicio) || !isValid(dataFim)) return 0;

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
    (acc, item) =>
      acc +
      Number(item.quantidade_locada || 0) *
        Number(item.valor_diaria_fechado || 0) *
        diasCobrados,
    0
  );

  return totalItens + taxaEntrega - valorDesconto;
}

export function calcularValorItemComPeriodo(
  item: {
    quantidade_locada: number;
    valor_diaria_fechado: number;
    data_inicio_cobranca?: string | null;
  },
  dataInicioPadrao: string,
  dataFim: string | null | undefined,
  feriados: DiaNaoCobrado[],
  cobrarDomingo: boolean
): number {
  if (!dataFim) return 0;

  const dataInicioItem = item.data_inicio_cobranca || dataInicioPadrao;

  const dias = calcularDiasCobrados(
    new Date(dataInicioItem + "T12:00:00"),
    new Date(dataFim + "T12:00:00"),
    feriados,
    cobrarDomingo
  );

  return (
    Number(item.quantidade_locada || 0) *
    Number(item.valor_diaria_fechado || 0) *
    dias
  );
}

export function calcularValorTotalPorItensComPeriodo(
  itens: {
    quantidade_locada: number;
    valor_diaria_fechado: number;
    data_inicio_cobranca?: string | null;
  }[],
  dataInicioPadrao: string,
  dataFim: string | null | undefined,
  feriados: DiaNaoCobrado[],
  cobrarDomingo: boolean,
  taxaEntrega: number,
  valorDesconto: number
): number {
  if (!dataFim) return taxaEntrega - valorDesconto;

  const totalItens = itens.reduce((acc, item) => {
    return (
      acc +
      calcularValorItemComPeriodo(
        item,
        dataInicioPadrao,
        dataFim,
        feriados,
        cobrarDomingo
      )
    );
  }, 0);

  return totalItens + taxaEntrega - valorDesconto;
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value || 0);
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "Sem previsão";

  const d = typeof date === "string" ? parseISO(date) : date;

  if (!isValid(d)) return "Sem previsão";

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

export function getStatusVencimentoLocacao(
  dataPrevisaoEntrega: string | null | undefined
) {
  if (!dataPrevisaoEntrega) {
    return {
      label: "Sem previsão",
      className: "bg-muted text-muted-foreground",
    };
  }

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const previsao = new Date(dataPrevisaoEntrega + "T00:00:00");
  previsao.setHours(0, 0, 0, 0);

  if (!isValid(previsao)) {
    return {
      label: "Sem previsão",
      className: "bg-muted text-muted-foreground",
    };
  }

  const diffDias = Math.ceil(
    (previsao.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDias < 0) {
    return {
      label: "Vencido",
      className: "bg-destructive/20 text-destructive",
    };
  }

  if (diffDias <= 1) {
    return {
      label: "Prox. ao Vencimento",
      className: "bg-yellow-500/20 text-yellow-600",
    };
  }

  return {
    label: "Em Dia",
    className: "bg-success/20 text-success",
  };
}