
-- 1. Enum for roles
CREATE TYPE public.app_role AS ENUM ('admin', 'cliente');

-- 2. User roles table (roles MUST be separate per security requirements)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Perfis table
CREATE TABLE public.perfis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email TEXT,
  nome TEXT,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;

-- 4. Security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 5. RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 6. RLS policies for perfis
CREATE POLICY "Users can view their own profile"
  ON public.perfis FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.perfis FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
  ON public.perfis FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all profiles"
  ON public.perfis FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 7. Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.perfis (user_id, email, nome)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 8. Trigger for updated_at on perfis
CREATE TRIGGER update_perfis_updated_at
  BEFORE UPDATE ON public.perfis
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 9. Update RLS on existing tables: restrict to authenticated users
-- Drop old public policies
DROP POLICY IF EXISTS "Acesso público clientes" ON public.clientes;
DROP POLICY IF EXISTS "Acesso público equipamentos" ON public.equipamentos;
DROP POLICY IF EXISTS "Acesso público locacoes" ON public.locacoes;
DROP POLICY IF EXISTS "Acesso público itens_locacao" ON public.itens_locacao;
DROP POLICY IF EXISTS "Acesso público dias_nao_cobrados" ON public.dias_nao_cobrados;

-- Clientes: admins full access, clients see only their linked record
CREATE POLICY "Admins full access clientes" ON public.clientes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Clients view own record" ON public.clientes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.perfis
      WHERE perfis.user_id = auth.uid() AND perfis.cliente_id = clientes.id
    )
  );

-- Equipamentos: admins only
CREATE POLICY "Admins full access equipamentos" ON public.equipamentos
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Locacoes: admins full, clients see their own
CREATE POLICY "Admins full access locacoes" ON public.locacoes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Clients view own locacoes" ON public.locacoes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.perfis
      WHERE perfis.user_id = auth.uid() AND perfis.cliente_id = locacoes.cliente_id
    )
  );

-- Itens locacao: admins full, clients see items from their locacoes
CREATE POLICY "Admins full access itens_locacao" ON public.itens_locacao
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Clients view own itens" ON public.itens_locacao
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.locacoes
      JOIN public.perfis ON perfis.cliente_id = locacoes.cliente_id
      WHERE locacoes.id = itens_locacao.locacao_id AND perfis.user_id = auth.uid()
    )
  );

-- Dias nao cobrados: admins manage, all authenticated can read
CREATE POLICY "Admins full access feriados" ON public.dias_nao_cobrados
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated read feriados" ON public.dias_nao_cobrados
  FOR SELECT TO authenticated
  USING (true);
