
CREATE TABLE public.perfil_empresa (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome_empresa text NOT NULL DEFAULT '',
  cpf_cnpj text DEFAULT '',
  endereco text DEFAULT '',
  telefone text DEFAULT '',
  email text DEFAULT '',
  responsavel text DEFAULT '',
  notas text DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.perfil_empresa ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access perfil_empresa" ON public.perfil_empresa
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated read perfil_empresa" ON public.perfil_empresa
  FOR SELECT TO authenticated
  USING (true);
