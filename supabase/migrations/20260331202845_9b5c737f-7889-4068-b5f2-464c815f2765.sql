
-- Tabela de clientes
CREATE TABLE public.clientes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome_completo TEXT NOT NULL,
  cpf_cnpj TEXT,
  whatsapp TEXT,
  endereco_obra TEXT,
  notas_observacoes TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de equipamentos
CREATE TABLE public.equipamentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  categoria TEXT,
  descricao TEXT,
  valor_diaria NUMERIC(10,2) NOT NULL DEFAULT 0,
  quantidade_total INTEGER NOT NULL DEFAULT 0,
  quantidade_disponivel INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Sequência para número de contrato
CREATE SEQUENCE public.locacoes_numero_contrato_seq START 1;

-- Tabela de locações
CREATE TABLE public.locacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  numero_contrato INTEGER NOT NULL DEFAULT nextval('public.locacoes_numero_contrato_seq'),
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  data_inicio DATE NOT NULL,
  data_previsao_entrega DATE NOT NULL,
  data_devolucao_real DATE,
  situacao TEXT NOT NULL DEFAULT 'ativo' CHECK (situacao IN ('ativo', 'finalizado', 'cancelado', 'atrasado', 'alerta')),
  taxa_entrega NUMERIC(10,2) NOT NULL DEFAULT 0,
  valor_desconto NUMERIC(10,2) NOT NULL DEFAULT 0,
  valor_total_pago NUMERIC(10,2) NOT NULL DEFAULT 0,
  valor_total_final NUMERIC(10,2) NOT NULL DEFAULT 0,
  valor_avaria NUMERIC(10,2) NOT NULL DEFAULT 0,
  cobrar_domingo BOOLEAN NOT NULL DEFAULT false,
  notas_observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de itens da locação
CREATE TABLE public.itens_locacao (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  locacao_id UUID NOT NULL REFERENCES public.locacoes(id) ON DELETE CASCADE,
  equipamento_id UUID NOT NULL REFERENCES public.equipamentos(id) ON DELETE CASCADE,
  quantidade_locada INTEGER NOT NULL DEFAULT 1,
  valor_diaria_fechado NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de dias não cobrados (feriados)
CREATE TABLE public.dias_nao_cobrados (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  data DATE NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'feriado',
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itens_locacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dias_nao_cobrados ENABLE ROW LEVEL SECURITY;

-- Public access policies (sistema interno, sem auth por enquanto)
CREATE POLICY "Acesso público clientes" ON public.clientes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso público equipamentos" ON public.equipamentos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso público locacoes" ON public.locacoes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso público itens_locacao" ON public.itens_locacao FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso público dias_nao_cobrados" ON public.dias_nao_cobrados FOR ALL USING (true) WITH CHECK (true);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_clientes_updated_at BEFORE UPDATE ON public.clientes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_equipamentos_updated_at BEFORE UPDATE ON public.equipamentos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_locacoes_updated_at BEFORE UPDATE ON public.locacoes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
