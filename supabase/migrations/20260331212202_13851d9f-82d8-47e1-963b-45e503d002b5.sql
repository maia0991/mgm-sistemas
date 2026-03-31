
-- 1. Create locadoras table
CREATE TABLE public.locadoras (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  cnpj text DEFAULT '',
  responsavel text DEFAULT '',
  telefone text DEFAULT '',
  email text DEFAULT '',
  endereco text DEFAULT '',
  plano text NOT NULL DEFAULT 'basico',
  ativo boolean NOT NULL DEFAULT true,
  data_vencimento date,
  notas text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.locadoras ENABLE ROW LEVEL SECURITY;

-- 2. Add locadora_id to data tables
ALTER TABLE public.clientes ADD COLUMN locadora_id uuid REFERENCES public.locadoras(id);
ALTER TABLE public.equipamentos ADD COLUMN locadora_id uuid REFERENCES public.locadoras(id);
ALTER TABLE public.locacoes ADD COLUMN locadora_id uuid REFERENCES public.locadoras(id);
ALTER TABLE public.dias_nao_cobrados ADD COLUMN locadora_id uuid REFERENCES public.locadoras(id);
ALTER TABLE public.perfil_empresa ADD COLUMN locadora_id uuid REFERENCES public.locadoras(id);
ALTER TABLE public.perfis ADD COLUMN locadora_id uuid REFERENCES public.locadoras(id);

-- 3. Helper function to get user's locadora_id
CREATE OR REPLACE FUNCTION public.get_user_locadora_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT locadora_id FROM public.perfis WHERE user_id = _user_id LIMIT 1
$$;

-- 4. Auto-set locadora_id trigger function
CREATE OR REPLACE FUNCTION public.set_locadora_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.locadora_id IS NULL THEN
    NEW.locadora_id := public.get_user_locadora_id(auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

-- Apply trigger to all data tables
CREATE TRIGGER set_locadora_id_clientes BEFORE INSERT ON public.clientes FOR EACH ROW EXECUTE FUNCTION public.set_locadora_id();
CREATE TRIGGER set_locadora_id_equipamentos BEFORE INSERT ON public.equipamentos FOR EACH ROW EXECUTE FUNCTION public.set_locadora_id();
CREATE TRIGGER set_locadora_id_locacoes BEFORE INSERT ON public.locacoes FOR EACH ROW EXECUTE FUNCTION public.set_locadora_id();
CREATE TRIGGER set_locadora_id_dias BEFORE INSERT ON public.dias_nao_cobrados FOR EACH ROW EXECUTE FUNCTION public.set_locadora_id();
CREATE TRIGGER set_locadora_id_perfil_empresa BEFORE INSERT ON public.perfil_empresa FOR EACH ROW EXECUTE FUNCTION public.set_locadora_id();

-- 5. RLS for locadoras table
CREATE POLICY "Admins full access locadoras" ON public.locadoras
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Locadora view own" ON public.locadoras
  FOR SELECT TO authenticated
  USING (id = public.get_user_locadora_id(auth.uid()));

-- 6. Drop old RLS policies and create new multi-tenant ones

-- clientes
DROP POLICY IF EXISTS "Admins full access clientes" ON public.clientes;
DROP POLICY IF EXISTS "Clients view own record" ON public.clientes;

CREATE POLICY "Admins full access clientes" ON public.clientes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Locadora full access own clientes" ON public.clientes
  FOR ALL TO authenticated
  USING (locadora_id = public.get_user_locadora_id(auth.uid()))
  WITH CHECK (locadora_id = public.get_user_locadora_id(auth.uid()));

-- equipamentos
DROP POLICY IF EXISTS "Admins full access equipamentos" ON public.equipamentos;

CREATE POLICY "Admins full access equipamentos" ON public.equipamentos
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Locadora full access own equipamentos" ON public.equipamentos
  FOR ALL TO authenticated
  USING (locadora_id = public.get_user_locadora_id(auth.uid()))
  WITH CHECK (locadora_id = public.get_user_locadora_id(auth.uid()));

-- locacoes
DROP POLICY IF EXISTS "Admins full access locacoes" ON public.locacoes;
DROP POLICY IF EXISTS "Clients view own locacoes" ON public.locacoes;

CREATE POLICY "Admins full access locacoes" ON public.locacoes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Locadora full access own locacoes" ON public.locacoes
  FOR ALL TO authenticated
  USING (locadora_id = public.get_user_locadora_id(auth.uid()))
  WITH CHECK (locadora_id = public.get_user_locadora_id(auth.uid()));

-- itens_locacao
DROP POLICY IF EXISTS "Admins full access itens_locacao" ON public.itens_locacao;
DROP POLICY IF EXISTS "Clients view own itens" ON public.itens_locacao;

CREATE POLICY "Admins full access itens_locacao" ON public.itens_locacao
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Locadora full access own itens" ON public.itens_locacao
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.locacoes
    WHERE locacoes.id = itens_locacao.locacao_id
    AND locacoes.locadora_id = public.get_user_locadora_id(auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.locacoes
    WHERE locacoes.id = itens_locacao.locacao_id
    AND locacoes.locadora_id = public.get_user_locadora_id(auth.uid())
  ));

-- dias_nao_cobrados
DROP POLICY IF EXISTS "Admins full access feriados" ON public.dias_nao_cobrados;
DROP POLICY IF EXISTS "Authenticated read feriados" ON public.dias_nao_cobrados;

CREATE POLICY "Admins full access dias" ON public.dias_nao_cobrados
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Locadora full access own dias" ON public.dias_nao_cobrados
  FOR ALL TO authenticated
  USING (locadora_id = public.get_user_locadora_id(auth.uid()))
  WITH CHECK (locadora_id = public.get_user_locadora_id(auth.uid()));

-- perfil_empresa
DROP POLICY IF EXISTS "Admins full access perfil_empresa" ON public.perfil_empresa;
DROP POLICY IF EXISTS "Authenticated read perfil_empresa" ON public.perfil_empresa;

CREATE POLICY "Admins full access perfil_empresa" ON public.perfil_empresa
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Locadora full access own perfil" ON public.perfil_empresa
  FOR ALL TO authenticated
  USING (locadora_id = public.get_user_locadora_id(auth.uid()))
  WITH CHECK (locadora_id = public.get_user_locadora_id(auth.uid()));

-- perfis - keep existing policies, they already use user_id = auth.uid()
