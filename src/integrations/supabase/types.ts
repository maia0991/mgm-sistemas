export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      clientes: {
        Row: {
          ativo: boolean
          cpf_cnpj: string | null
          created_at: string
          endereco_obra: string | null
          id: string
          nome_completo: string
          notas_observacoes: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          ativo?: boolean
          cpf_cnpj?: string | null
          created_at?: string
          endereco_obra?: string | null
          id?: string
          nome_completo: string
          notas_observacoes?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          ativo?: boolean
          cpf_cnpj?: string | null
          created_at?: string
          endereco_obra?: string | null
          id?: string
          nome_completo?: string
          notas_observacoes?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      dias_nao_cobrados: {
        Row: {
          ativo: boolean
          created_at: string
          data: string
          id: string
          nome: string
          tipo: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          data: string
          id?: string
          nome: string
          tipo?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          data?: string
          id?: string
          nome?: string
          tipo?: string
        }
        Relationships: []
      }
      equipamentos: {
        Row: {
          ativo: boolean
          categoria: string | null
          created_at: string
          descricao: string | null
          id: string
          nome: string
          quantidade_disponivel: number
          quantidade_total: number
          updated_at: string
          valor_diaria: number
        }
        Insert: {
          ativo?: boolean
          categoria?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          quantidade_disponivel?: number
          quantidade_total?: number
          updated_at?: string
          valor_diaria?: number
        }
        Update: {
          ativo?: boolean
          categoria?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          quantidade_disponivel?: number
          quantidade_total?: number
          updated_at?: string
          valor_diaria?: number
        }
        Relationships: []
      }
      itens_locacao: {
        Row: {
          created_at: string
          equipamento_id: string
          id: string
          locacao_id: string
          quantidade_locada: number
          valor_diaria_fechado: number
        }
        Insert: {
          created_at?: string
          equipamento_id: string
          id?: string
          locacao_id: string
          quantidade_locada?: number
          valor_diaria_fechado?: number
        }
        Update: {
          created_at?: string
          equipamento_id?: string
          id?: string
          locacao_id?: string
          quantidade_locada?: number
          valor_diaria_fechado?: number
        }
        Relationships: [
          {
            foreignKeyName: "itens_locacao_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "equipamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itens_locacao_locacao_id_fkey"
            columns: ["locacao_id"]
            isOneToOne: false
            referencedRelation: "locacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      locacoes: {
        Row: {
          cliente_id: string
          cobrar_domingo: boolean
          created_at: string
          data_devolucao_real: string | null
          data_inicio: string
          data_previsao_entrega: string
          id: string
          notas_observacoes: string | null
          numero_contrato: number
          situacao: string
          taxa_entrega: number
          updated_at: string
          valor_avaria: number
          valor_desconto: number
          valor_total_final: number
          valor_total_pago: number
        }
        Insert: {
          cliente_id: string
          cobrar_domingo?: boolean
          created_at?: string
          data_devolucao_real?: string | null
          data_inicio: string
          data_previsao_entrega: string
          id?: string
          notas_observacoes?: string | null
          numero_contrato?: number
          situacao?: string
          taxa_entrega?: number
          updated_at?: string
          valor_avaria?: number
          valor_desconto?: number
          valor_total_final?: number
          valor_total_pago?: number
        }
        Update: {
          cliente_id?: string
          cobrar_domingo?: boolean
          created_at?: string
          data_devolucao_real?: string | null
          data_inicio?: string
          data_previsao_entrega?: string
          id?: string
          notas_observacoes?: string | null
          numero_contrato?: number
          situacao?: string
          taxa_entrega?: number
          updated_at?: string
          valor_avaria?: number
          valor_desconto?: number
          valor_total_final?: number
          valor_total_pago?: number
        }
        Relationships: [
          {
            foreignKeyName: "locacoes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
