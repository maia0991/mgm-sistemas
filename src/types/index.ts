import type { Database } from "@/integrations/supabase/types";

export type Cliente = Database["public"]["Tables"]["clientes"]["Row"];
export type ClienteInsert =
  Database["public"]["Tables"]["clientes"]["Insert"];

export type Equipamento =
  Database["public"]["Tables"]["equipamentos"]["Row"] & {
    valor_semanal?: number | string | null;
    valor_mensal?: number | string | null;
  };

export type EquipamentoInsert =
  Database["public"]["Tables"]["equipamentos"]["Insert"] & {
    valor_semanal?: number | string | null;
    valor_mensal?: number | string | null;
  };

export type Locacao = Database["public"]["Tables"]["locacoes"]["Row"];
export type LocacaoInsert =
  Database["public"]["Tables"]["locacoes"]["Insert"];

export type ItemLocacao =
  Database["public"]["Tables"]["itens_locacao"]["Row"] & {
    tipo_cobranca?: "diaria" | "semanal" | "mensal" | string | null;
  };

export type ItemLocacaoInsert =
  Database["public"]["Tables"]["itens_locacao"]["Insert"] & {
    tipo_cobranca?: "diaria" | "semanal" | "mensal" | string | null;
  };

export type DiaNaoCobrado =
  Database["public"]["Tables"]["dias_nao_cobrados"]["Row"];
export type DiaNaoCobradoInsert =
  Database["public"]["Tables"]["dias_nao_cobrados"]["Insert"];

export type Perfil = Database["public"]["Tables"]["perfis"]["Row"];
export type UserRole = Database["public"]["Tables"]["user_roles"]["Row"];
export type AppRole = Database["public"]["Enums"]["app_role"];

export type SituacaoLocacao =
  | "ativo"
  | "finalizado"
  | "cancelado"
  | "atrasado"
  | "alerta";

export type TipoCobranca = "diaria" | "semanal" | "mensal";

export interface ItemLocacaoForm {
  equipamento_id: string;
  equipamento_nome: string;
  quantidade_locada: number;
  valor_diaria_fechado: number;
  tipo_cobranca?: TipoCobranca;
  data_inicio_cobranca?: string | null;
}

export interface LocacaoComCliente extends Locacao {
  clientes: Cliente | null;
  itens_locacao: ItemLocacao[];
}