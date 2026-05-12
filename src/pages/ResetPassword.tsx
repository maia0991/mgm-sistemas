import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Building2, Save } from "lucide-react";

interface PerfilEmpresa {
  id?: string;
  nome_empresa: string;
  cpf_cnpj: string;
  endereco: string;
  telefone: string;
  email: string;
  responsavel: string;
  notas: string;
}

const emptyForm: PerfilEmpresa = {
  nome_empresa: "",
  cpf_cnpj: "",
  endereco: "",
  telefone: "",
  email: "",
  responsavel: "",
  notas: "",
};

export default function PerfilEmpresaPage() {
  const [form, setForm] = useState<PerfilEmpresa>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(null);
  const { locadoraId } = useAuth();

  useEffect(() => {
    fetchPerfil();
  }, []);

  async function fetchPerfil() {
    try {
      const { data, error } = await supabase
        .from("perfil_empresa")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (data) {
        setForm({
          nome_empresa: data.nome_empresa || "",
          cpf_cnpj: data.cpf_cnpj || "",
          endereco: data.endereco || "",
          telefone: data.telefone || "",
          email: data.email || "",
          responsavel: data.responsavel || "",
          notas: data.notas || "",
        });
        setExistingId(data.id);
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro ao carregar perfil da empresa");
    }
  }

  async function handleSave() {
    if (!form.nome_empresa.trim()) {
      toast.error("Nome da empresa é obrigatório");
      return;
    }

    try {
      setSaving(true);

      if (existingId) {
        const { error } = await supabase
          .from("perfil_empresa")
          .update({
            nome_empresa: form.nome_empresa,
            cpf_cnpj: form.cpf_cnpj || null,
            endereco: form.endereco || null,
            telefone: form.telefone || null,
            email: form.email || null,
            responsavel: form.responsavel || null,
            notas: form.notas || null,
          })
          .eq("id", existingId);

        if (error) throw error;
      } else {
        const payload = {
          ...form,
          cpf_cnpj: form.cpf_cnpj || null,
          endereco: form.endereco || null,
          telefone: form.telefone || null,
          email: form.email || null,
          responsavel: form.responsavel || null,
          notas: form.notas || null,
          locadora_id: locadoraId,
        };

        const { data, error } = await supabase
          .from("perfil_empresa")
          .insert(payload)
          .select()
          .single();

        if (error) throw error;
        if (data) setExistingId(data.id);
      }

      toast.success("Perfil da empresa salvo!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  const set = (field: keyof PerfilEmpresa, value: string) =>
    setForm({ ...form, [field]: value });

  return (
    <Layout>
      <div className="animate-fade-in max-w-2xl space-y-6">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-primary/10 p-3">
            <Building2 className="h-6 w-6 text-primary" />
          </div>

          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Perfil da Empresa
            </h1>
            <p className="text-muted-foreground">
              Dados que aparecerão no contrato de locação
            </p>
          </div>
        </div>

        <div className="rounded-[30px] border border-border bg-card p-6 space-y-4">
          <div>
            <Label className="text-foreground">Nome da Empresa *</Label>
            <Input
              className="rounded-[30px]"
              value={form.nome_empresa}
              onChange={(e) => set("nome_empresa", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-foreground">CPF/CNPJ</Label>
              <Input
                className="rounded-[30px]"
                value={form.cpf_cnpj}
                onChange={(e) => set("cpf_cnpj", e.target.value)}
              />
            </div>

            <div>
              <Label className="text-foreground">Telefone</Label>
              <Input
                className="rounded-[30px]"
                value={form.telefone}
                onChange={(e) => set("telefone", e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label className="text-foreground">Endereço</Label>
            <Input
              className="rounded-[30px]"
              value={form.endereco}
              onChange={(e) => set("endereco", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-foreground">Email</Label>
              <Input
                className="rounded-[30px]"
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
              />
            </div>

            <div>
              <Label className="text-foreground">Responsável</Label>
              <Input
                className="rounded-[30px]"
                value={form.responsavel}
                onChange={(e) => set("responsavel", e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label className="text-foreground">Observações</Label>
            <Input
              className="rounded-[30px]"
              value={form.notas}
              onChange={(e) => set("notas", e.target.value)}
            />
          </div>

          <Button
            className="w-full rounded-[30px] h-12 gap-2"
            onClick={handleSave}
            disabled={saving}
          >
            <Save className="h-4 w-4" />
            {saving ? "Salvando..." : "Salvar Dados da Empresa"}
          </Button>
        </div>
      </div>
    </Layout>
  );
}