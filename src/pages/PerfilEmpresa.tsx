import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

function onlyNumbers(value: string) {
  return value.replace(/\D/g, "");
}

function maskCnpj(value: string) {
  const numbers = onlyNumbers(value).slice(0, 14);

  return numbers
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

function maskPhone(value: string) {
  const numbers = onlyNumbers(value).slice(0, 11);

  if (numbers.length <= 10) {
    return numbers
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }

  return numbers
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}

export default function PerfilEmpresaPage() {
  const [form, setForm] = useState({
    nome_empresa: "",
    cnpj: "",
    telefone: "",
    whatsapp: "",
    email: "",
    endereco: "",
  });

  const [logoEmpresa, setLogoEmpresa] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPerfil();
  }, []);

  async function getLocadoraId() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error("Usuário não autenticado");
      return null;
    }

    const { data: perfil, error: perfilError } = await supabase
      .from("perfis")
      .select("locadora_id")
      .eq("user_id", user.id)
      .single();

    if (perfilError || !perfil?.locadora_id) {
      console.error(perfilError);
      toast.error("Locadora não encontrada");
      return null;
    }

    return perfil.locadora_id;
  }

  async function fetchPerfil() {
    try {
      setLoading(true);

      const locadoraId = await getLocadoraId();

      if (!locadoraId) {
        return;
      }

      const { data, error } = await supabase
        .from("perfil_empresa")
        .select("*")
        .eq("locadora_id", locadoraId)
        .maybeSingle();

      if (error) {
        console.error("Erro ao buscar perfil:", error);
        return;
      }

      if (data) {
        const perfil = data as {
          nome_empresa?: string | null;
          cnpj?: string | null;
          telefone?: string | null;
          whatsapp?: string | null;
          email?: string | null;
          endereco?: string | null;
          logo_url?: string | null;
        };

        setForm({
          nome_empresa: perfil.nome_empresa || "",
          cnpj: maskCnpj(perfil.cnpj || ""),
          telefone: maskPhone(perfil.telefone || ""),
          whatsapp: maskPhone(perfil.whatsapp || ""),
          email: perfil.email || "",
          endereco: perfil.endereco || "",
        });

        setLogoEmpresa(perfil.logo_url || null);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleUploadLogo(file: File) {
    try {
      setUploadingLogo(true);

      const locadoraId = await getLocadoraId();

      if (!locadoraId) {
        return;
      }

      const fileExt = file.name.split(".").pop();
      const filePath = `${locadoraId}/logo-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("logos")
        .upload(filePath, file, {
          upsert: true,
        });

      if (uploadError) {
        console.error("Erro ao enviar logo:", uploadError);
        toast.error("Erro ao enviar logo");
        return;
      }

      const { data } = supabase.storage.from("logos").getPublicUrl(filePath);

      setLogoEmpresa(data.publicUrl);
      toast.success("Logo enviada com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error("Erro inesperado ao enviar logo");
    } finally {
      setUploadingLogo(false);
    }
  }

  async function handleSave() {
    try {
      setSaving(true);

      const locadoraId = await getLocadoraId();

      if (!locadoraId) {
        return;
      }

      const payload = {
        nome_empresa: form.nome_empresa,
        cnpj: form.cnpj,
        telefone: form.telefone,
        whatsapp: form.whatsapp,
        email: form.email,
        endereco: form.endereco,
        logo_url: logoEmpresa,
        locadora_id: locadoraId,
      };

      const { error } = await supabase
        .from("perfil_empresa")
        .upsert(payload, {
          onConflict: "locadora_id",
        });

      if (error) {
        console.error("Erro ao salvar:", error);
        toast.error("Erro ao salvar perfil");
        return;
      }

      toast.success("Perfil atualizado com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error("Erro inesperado");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Layout>
        <p className="p-8 text-muted-foreground">Carregando...</p>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-3xl space-y-6">
        <h1 className="text-3xl font-bold text-foreground">
          Perfil da Empresa
        </h1>

        <div className="space-y-4">
          <div>
            <Label>Logo da empresa</Label>

            {logoEmpresa && (
              <div className="mb-3 mt-2">
                <img
                  src={logoEmpresa}
                  alt="Logo da empresa"
                  className="h-20 w-20 rounded-xl border object-cover"
                />
              </div>
            )}

            <Input
              type="file"
              accept="image/*"
              disabled={uploadingLogo}
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  handleUploadLogo(e.target.files[0]);
                }
              }}
            />

            {uploadingLogo && (
              <p className="mt-1 text-sm text-muted-foreground">
                Enviando logo...
              </p>
            )}
          </div>

          <div>
            <Label>Nome da empresa</Label>
            <Input
              value={form.nome_empresa}
              onChange={(e) =>
                setForm({ ...form, nome_empresa: e.target.value })
              }
            />
          </div>

          <div>
            <Label>CNPJ</Label>
            <Input
              value={form.cnpj}
              onChange={(e) =>
                setForm({ ...form, cnpj: maskCnpj(e.target.value) })
              }
              placeholder="00.000.000/0000-00"
            />
          </div>

          <div>
            <Label>Telefone</Label>
            <Input
              value={form.telefone}
              onChange={(e) =>
                setForm({ ...form, telefone: maskPhone(e.target.value) })
              }
              placeholder="(00) 0000-0000"
            />
          </div>

          <div>
            <Label>WhatsApp</Label>
            <Input
              value={form.whatsapp}
              onChange={(e) =>
                setForm({ ...form, whatsapp: maskPhone(e.target.value) })
              }
              placeholder="(00) 00000-0000"
            />
          </div>

          <div>
            <Label>Email</Label>
            <Input
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <div>
            <Label>Endereço</Label>
            <Input
              value={form.endereco}
              onChange={(e) => setForm({ ...form, endereco: e.target.value })}
            />
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={saving}
          className="rounded-[30px]"
        >
          {saving ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </Layout>
  );
}