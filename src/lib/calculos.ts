import {
  isSunday,
  eachDayOfInterval,
  parseISO,
  format,
  isValid,
} from "date-fns";
import { DiaNaoCobrado } from "@/types";

export type TipoCobranca = "diaria" | "semanal" | "mensal";

export function calcularDiasCobrados(
  dataInicio: Date,
  dataFim: Date,
  feriados: DiaNaoCobrado[],
  cobrarDomingo: boolean
): number {
  if (!isValid(dataInicio) || !isValid(dataFim)) return 0;

  const dias = eachDayOfInterval({
    start: dataInicio,
    end: dataFim,
  });

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

export function calcularPeriodosCobrados(
  diasCobrados: number,
  tipoCobranca: TipoCobranca | string | null | undefined
) {
  if (diasCobrados <= 0) {
    return {
      periodos: 0,
      diasExtras: 0,
      totalEquivalente: 0,
    };
  }

  if (tipoCobranca === "semanal") {
    const semanas = Math.floor(diasCobrados / 7);
    const diasExtras = diasCobrados % 7;

    return {
      periodos: semanas <= 0 ? 1 : semanas,
      diasExtras,
      totalEquivalente:
        (semanas <= 0 ? 1 : semanas) + diasExtras,
    };
  }

  if (tipoCobranca === "mensal") {
    const meses = Math.floor(diasCobrados / 30);
    const diasExtras = diasCobrados % 30;

    return {
      periodos: meses <= 0 ? 1 : meses,
      diasExtras,
      totalEquivalente:
        (meses <= 0 ? 1 : meses) + diasExtras,
    };
  }

  return {
    periodos: diasCobrados,
    diasExtras: 0,
    totalEquivalente: diasCobrados,
  };
}

export function tipoCobrancaLabel(
  tipoCobranca: TipoCobranca | string | null | undefined
): string {
  if (tipoCobranca === "mensal") return "Mensal";
  if (tipoCobranca === "semanal") return "Semanal";
  return "Diária";
}

export function unidadeCobrancaLabel(
  tipoCobranca: TipoCobranca | string | null | undefined
): string {
  if (tipoCobranca === "mensal") return "mês";
  if (tipoCobranca === "semanal") return "semana";
  return "dia";
}

export function calcularValorTotal(
  itens: {
    quantidade_locada: number;
    valor_diaria_fechado: number;
    tipo_cobranca?: TipoCobranca | string | null;
  }[],
  diasCobrados: number,
  taxaEntrega: number,
  valorDesconto: number
): number {
  const totalItens = itens.reduce((acc, item) => {
    const calculo = calcularPeriodosCobrados(
      diasCobrados,
      item.tipo_cobranca || "diaria"
    );

    const valorBase =
      Number(item.quantidade_locada || 0) *
      Number(item.valor_diaria_fechado || 0);

    const totalPeriodos =
      valorBase * Number(calculo.periodos || 0);

    const totalExtras =
      Number(item.tipo_cobranca) === Number("diaria")
        ? 0
        : Number(item.quantidade_locada || 0) *
          Number(item.valor_diaria_fechado || 0) /
          (item.tipo_cobranca === "mensal" ? 30 : 7) *
          Number(calculo.diasExtras || 0);

    return acc + totalPeriodos + totalExtras;
  }, 0);

  return totalItens + taxaEntrega - valorDesconto;
}

export function calcularValorItemComPeriodo(
  item: {
    quantidade_locada: number;
    valor_diaria_fechado: number;
    tipo_cobranca?: TipoCobranca | string | null;
    data_inicio_cobranca?: string | null;
  },
  dataInicioPadrao: string,
  dataFim: string | null | undefined,
  feriados: DiaNaoCobrado[],
  cobrarDomingo: boolean
): number {
  if (!dataFim) return 0;

  const dataInicioItem =
    item.data_inicio_cobranca || dataInicioPadrao;

  const dias = calcularDiasCobrados(
    new Date(dataInicioItem + "T12:00:00"),
    new Date(dataFim + "T12:00:00"),
    feriados,
    cobrarDomingo
  );

  const calculo = calcularPeriodosCobrados(
    dias,
    item.tipo_cobranca || "diaria"
  );

  const valorBase =
    Number(item.quantidade_locada || 0) *
    Number(item.valor_diaria_fechado || 0);

  const totalPeriodos =
    valorBase * Number(calculo.periodos || 0);

  const totalExtras =
    item.tipo_cobranca === "diaria"
      ? 0
      : Number(item.quantidade_locada || 0) *
        Number(item.valor_diaria_fechado || 0) /
        (item.tipo_cobranca === "mensal" ? 30 : 7) *
        Number(calculo.diasExtras || 0);

  return totalPeriodos + totalExtras;
}

export function calcularValorTotalPorItensComPeriodo(
  itens: {
    quantidade_locada: number;
    valor_diaria_fechado: number;
    tipo_cobranca?: TipoCobranca | string | null;
    data_inicio_cobranca?: string | null;
  }[],
  dataInicioPadrao: string,
  dataFim: string | null | undefined,
  feriados: DiaNaoCobrado[],
  cobrarDomingo: boolean,
  taxaEntrega: number,
  valorDesconto: number
): number {
  if (!dataFim) {
    return taxaEntrega - valorDesconto;
  }

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

export function formatDate(
  date: string | Date | null | undefined
): string {
  if (!date) return "Sem previsão";

  const d =
    typeof date === "string"
      ? parseISO(date)
      : date;

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

  const previsao = new Date(
    dataPrevisaoEntrega + "T00:00:00"
  );

  previsao.setHours(0, 0, 0, 0);

  if (!isValid(previsao)) {
    return {
      label: "Sem previsão",
      className: "bg-muted text-muted-foreground",
    };
  }

  const diffDias = Math.ceil(
    (previsao.getTime() - hoje.getTime()) /
      (1000 * 60 * 60 * 24)
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