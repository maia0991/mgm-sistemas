import type { Database } from "@/integrations/supabase/types";

export type Cliente = Database["public"]["Tables"]["clientes"]["Row"];
export type ClienteInsert =
  Database["public"]["Tables"]["clientes"]["Insert"];

export type Equipamento =
  Database["public"]["Tables"]["equipamentos"]["Row"];
export type EquipamentoInsert =
  Database["public"]["Tables"]["equipamentos"]["Insert"];

export type Locacao =
  Database["public"]["Tables"]["locacoes"]["Row"];
export type LocacaoInsert =
  Database["public"]["Tables"]["locacoes"]["Insert"];

export type ItemLocacao =
  Database["public"]["Tables"]["itens_locacao"]["Row"];
export type ItemLocacaoInsert =
  Database["public"]["Tables"]["itens_locacao"]["Insert"];

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

export interface ItemLocacaoForm {
  equipamento_id: string;
  equipamento_nome: string;
  quantidade_locada: number;
  valor_diaria_fechado: number;
  data_inicio_cobranca?: string | null;
}

export interface LocacaoComCliente extends Locacao {
  clientes: Cliente | null;
  itens_locacao: ItemLocacao[];
}