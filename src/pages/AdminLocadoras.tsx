import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Pencil,
  Ban,
  CheckCircle,
  Plus,
  X,
  ShieldAlert,
  ShieldCheck,
  Trash2,
} from "lucide-react";

interface Locadora {
  id: string;
  nome: string;
  ativo: boolean;
  bloqueio_parcial?: boolean | null;
  plano?: string | null;
  data_vencimento?: string | null;
  email?: string | null;
  telefone?: string | null;
}

const initialForm = {
  nome: "",
  email: "",
  telefone: "",
  plano: "",
  data_vencimento: "",
  senha: "",
};

export default function AdminLocadorasPage() {
  const navigate = useNavigate();

  const [locadoras, setLocadoras] = useState<Locadora[]>([]);
  const [search, setSearch] = useState("");
  const [loadingList, setLoadingList] = useState(true);
  const [checkingAccess, setCheckingAccess] = useState(true);

  const [openModal, setOpenModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Locadora | null>(null);
  const [form, setForm] = useState(initialForm);

  useEffect(() => {
    void checkAccessAndLoad();
  }, []);

  async function checkAccessAndLoad() {
    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError || !authData.user) {
        navigate("/login", { replace: true });
        return;
      }

      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", authData.user.id)
        .maybeSingle();

      if (roleError) {
        toast.error("Erro ao validar acesso");
        navigate("/", { replace: true });
        return;
      }

      if (roleData?.role !== "admin") {
        toast.error("Acesso restrito ao administrador");
        navigate("/", { replace: true });
        return;
      }

      await fetchLocadoras();
    } catch (error) {
      console.error("Erro ao validar acesso:", error);
      navigate("/", { replace: true });
    } finally {
      setCheckingAccess(false);
    }
  }

  async function fetchLocadoras() {
    try {
      setLoadingList(true);

      const { data, error } = await supabase
        .from("locadoras")
        .select(
          "id, nome, ativo, bloqueio_parcial, plano, data_vencimento, email, telefone"
        )
        .order("nome");

      if (error) {
        console.error("Erro ao carregar locadoras:", error);
        toast.error("Erro ao carregar locadoras");
        return;
      }

      setLocadoras((data as Locadora[]) || []);
    } catch (error) {
      console.error("Erro ao carregar locadoras:", error);
      toast.error("Erro inesperado ao carregar locadoras");
    } finally {
      setLoadingList(false);
    }
  }

  function openCreateModal() {
    setEditing(null);
    setForm(initialForm);
    setOpenModal(true);
  }

  function handleEdit(locadora: Locadora) {
    setEditing(locadora);

    setForm({
      nome: locadora.nome || "",
      email: locadora.email || "",
      telefone: locadora.telefone || "",
      plano: locadora.plano || "",
      data_vencimento: locadora.data_vencimento || "",
      senha: "",
    });

    setOpenModal(true);
  }

  function closeModal() {
    setOpenModal(false);
    setEditing(null);
    setForm(initialForm);
  }

  async function salvarLocadora() {
    if (!form.nome.trim()) {
      toast.error("Informe o nome da locadora");
      return;
    }

    if (!editing) {
      if (!form.email.trim()) {
        toast.error("Informe o email de login da locadora");
        return;
      }

      if (!form.senha.trim()) {
        toast.error("Informe a senha inicial da locadora");
        return;
      }

      if (form.senha.trim().length < 6) {
        toast.error("A senha inicial deve ter pelo menos 6 caracteres");
        return;
      }
    }

    try {
      setSaving(true);

      if (editing) {
        const { error } = await supabase
          .from("locadoras")
          .update({
            nome: form.nome.trim(),
            email: form.email.trim() || null,
            telefone: form.telefone.trim() || null,
            plano: form.plano.trim() || null,
            data_vencimento: form.data_vencimento || null,
          })
          .eq("id", editing.id);

        if (error) {
          console.error("Erro ao atualizar locadora:", error);
          toast.error("Erro ao atualizar locadora");
          return;
        }

        toast.success("Locadora atualizada com sucesso!");
      } else {
        const { data, error } = await supabase.functions.invoke(
          "create-locadora-user",
          {
            body: {
              nome: form.nome.trim(),
              email: form.email.trim(),
              telefone: form.telefone.trim() || null,
              plano: form.plano.trim() || null,
              data_vencimento: form.data_vencimento || null,
              password: form.senha.trim(),
            },
          }
        );

        if (error) {
          console.error("Erro bruto ao criar locadora:", error);

          let mensagem = "Erro ao criar locadora";

          try {
            const context = (error as any)?.context;

            if (context) {
              const text = await context.text();
              const json = JSON.parse(text);

              if (json?.error) {
                mensagem = json.error;
              }
            }
          } catch (parseError) {
            console.error(parseError);
          }

          toast.error(mensagem);
          return;
        }

        if (data?.error) {
          toast.error(data.error);
          return;
        }

        toast.success("Locadora criada com sucesso!");
      }

      closeModal();
      await fetchLocadoras();
    } catch (error) {
      console.error("Erro ao salvar locadora:", error);
      toast.error("Erro inesperado ao salvar locadora");
    } finally {
      setSaving(false);
    }
  }

  async function toggleAtivo(loc: Locadora) {
    try {
      const { error } = await supabase
        .from("locadoras")
        .update({ ativo: !loc.ativo })
        .eq("id", loc.id);

      if (error) {
        console.error("Erro ao alterar status:", error);
        toast.error("Erro ao alterar status");
        return;
      }

      toast.success(
        loc.ativo
          ? "Locadora bloqueada totalmente!"
          : "Locadora desbloqueada!"
      );

      await fetchLocadoras();
    } catch (error) {
      console.error(error);
      toast.error("Erro inesperado");
    }
  }

  async function toggleBloqueioParcial(loc: Locadora) {
    try {
      const { error } = await supabase
        .from("locadoras")
        .update({
          bloqueio_parcial: !loc.bloqueio_parcial,
        })
        .eq("id", loc.id);

      if (error) {
        console.error("Erro bloqueio parcial:", error);
        toast.error("Erro ao alterar bloqueio parcial");
        return;
      }

      toast.success(
        loc.bloqueio_parcial
          ? "Bloqueio parcial removido!"
          : "Bloqueio parcial ativado!"
      );

      await fetchLocadoras();
    } catch (error) {
      console.error(error);
      toast.error("Erro inesperado");
    }
  }

  async function handleDeleteLocadora(loc: Locadora) {
    const confirmou = window.confirm(
      `Deseja realmente apagar a locadora "${loc.nome}"?\n\nEssa ação não pode ser desfeita.`
    );

    if (!confirmou) return;

    try {
      const { error } = await supabase
        .from("locadoras")
        .delete()
        .eq("id", loc.id);

      if (error) {
        console.error("Erro ao apagar locadora:", error);
        toast.error("Erro ao apagar locadora");
        return;
      }

      toast.success("Locadora apagada com sucesso!");

      await fetchLocadoras();
    } catch (error) {
      console.error("Erro inesperado ao apagar:", error);
      toast.error("Erro inesperado ao apagar");
    }
  }

  const filtered = locadoras.filter((l) =>
    l.nome.toLowerCase().includes(search.toLowerCase())
  );

  if (checkingAccess) {
    return (
      <Layout>
        <p className="p-8 text-muted-foreground">Validando acesso...</p>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <h1 className="text-3xl font-bold">Locadoras</h1>

          <Button type="button" onClick={openCreateModal}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Locadora
          </Button>
        </div>

        <Input
          placeholder="Buscar..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {loadingList ? (
          <p>Carregando...</p>
        ) : filtered.length === 0 ? (
          <p className="text-muted-foreground">
            Nenhuma locadora encontrada.
          </p>
        ) : (
          filtered.map((l) => (
            <div key={l.id} className="space-y-3 rounded-xl border p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="font-semibold">{l.nome}</p>

                  <p className="text-sm text-muted-foreground">
                    Status login: {l.ativo ? "Ativa" : "Bloqueada"}
                  </p>

                  <p className="text-sm text-muted-foreground">
                    Bloqueio parcial:{" "}
                    {l.bloqueio_parcial ? "Ativado" : "Desligado"}
                  </p>

                  <p className="text-sm text-muted-foreground">
                    Plano: {l.plano || "—"}
                  </p>

                  <p className="text-sm text-muted-foreground">
                    Vencimento: {l.data_vencimento || "—"}
                  </p>

                  <p className="text-sm text-muted-foreground">
                    Email: {l.email || "—"}
                  </p>

                  <p className="text-sm text-muted-foreground">
                    Telefone: {l.telefone || "—"}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => handleEdit(l)}
                    title="Editar"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => toggleBloqueioParcial(l)}
                    title={
                      l.bloqueio_parcial
                        ? "Remover bloqueio parcial"
                        : "Ativar bloqueio parcial"
                    }
                  >
                    {l.bloqueio_parcial ? (
                      <ShieldCheck className="h-4 w-4" />
                    ) : (
                      <ShieldAlert className="h-4 w-4" />
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => toggleAtivo(l)}
                    title={l.ativo ? "Bloqueio total" : "Desbloquear login"}
                  >
                    {l.ativo ? (
                      <Ban className="h-4 w-4" />
                    ) : (
                      <CheckCircle className="h-4 w-4" />
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => handleDeleteLocadora(l)}
                    title="Apagar locadora"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => toggleBloqueioParcial(l)}
                >
                  {l.bloqueio_parcial
                    ? "Remover bloqueio parcial"
                    : "Ativar bloqueio parcial"}
                </Button>

                <Button
                  type="button"
                  variant={l.ativo ? "destructive" : "outline"}
                  onClick={() => toggleAtivo(l)}
                >
                  {l.ativo ? "Bloqueio total" : "Desbloquear login"}
                </Button>

                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => handleDeleteLocadora(l)}
                >
                  Apagar Locadora
                </Button>
              </div>
            </div>
          ))
        )}

        {openModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-lg rounded-2xl bg-card p-6 shadow-2xl">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold">
                  {editing ? "Editar Locadora" : "Nova Locadora"}
                </h2>

                <Button type="button" variant="ghost" onClick={closeModal}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome</Label>

                  <Input
                    value={form.nome}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        nome: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Email de login</Label>

                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                  />
                </div>

                {!editing && (
                  <div className="space-y-2">
                    <Label>Senha inicial</Label>

                    <Input
                      type="password"
                      value={form.senha}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          senha: e.target.value,
                        }))
                      }
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Telefone</Label>

                  <Input
                    value={form.telefone}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        telefone: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Plano</Label>

                  <Input
                    value={form.plano}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        plano: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Data de vencimento</Label>

                  <Input
                    type="date"
                    value={form.data_vencimento}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        data_vencimento: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={closeModal}
                  >
                    Cancelar
                  </Button>

                  <Button
                    type="button"
                    onClick={salvarLocadora}
                    disabled={saving}
                  >
                    {saving ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}