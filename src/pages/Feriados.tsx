import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  CalendarOff,
  CheckCircle,
  Ban,
  X,
} from "lucide-react";

type DiaNaoCobradoItem = {
  id: string;
  data: string;
  descricao?: string | null;
  ativo?: boolean | null;
};

const initialForm = {
  data: "",
  descricao: "",
};

export default function FeriadosPage() {
  const [dias, setDias] = useState<DiaNaoCobradoItem[]>([]);
  const [search, setSearch] = useState("");
  const [openModal, setOpenModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<DiaNaoCobradoItem | null>(null);
  const [form, setForm] = useState(initialForm);

  useEffect(() => {
    void fetchDias();
  }, []);

  async function fetchDias() {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("dias_nao_cobrados")
        .select("*")
        .order("data", { ascending: true });

      if (error) {
        console.error("Erro ao carregar dias não cobrados:", error);
        toast.error("Erro ao carregar dias não cobrados");
        return;
      }

      setDias((data as DiaNaoCobradoItem[]) || []);
    } catch (error) {
      console.error("Erro inesperado ao carregar dias não cobrados:", error);
      toast.error("Erro inesperado ao carregar dias não cobrados");
    } finally {
      setLoading(false);
    }
  }

  async function getUserLocadoraId() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) {
      toast.error("Usuário não encontrado");
      return null;
    }

    const { data: perfil, error } = await supabase
      .from("perfis")
      .select("locadora_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Erro ao buscar locadora:", error);
      toast.error("Erro ao identificar locadora");
      return null;
    }

    if (!perfil?.locadora_id) {
      toast.error("Locadora não encontrada");
      return null;
    }

    return perfil.locadora_id;
  }

  function openCreateModal() {
    setEditing(null);
    setForm(initialForm);
    setOpenModal(true);
  }

  function handleEdit(item: DiaNaoCobradoItem) {
    setEditing(item);
    setForm({
      data: item.data || "",
      descricao: item.descricao || "",
    });
    setOpenModal(true);
  }

  function closeModal() {
    setEditing(null);
    setForm(initialForm);
    setOpenModal(false);
  }

  async function handleSave() {
    if (!form.data) {
      toast.error("Informe a data");
      return;
    }

    try {
      setSaving(true);

      if (editing) {
        const { error } = await supabase
          .from("dias_nao_cobrados")
          .update({
            data: form.data,
            descricao: form.descricao.trim() || null,
          })
          .eq("id", editing.id);

        if (error) {
          console.error("Erro ao atualizar dia não cobrado:", error);
          toast.error("Erro ao atualizar dia não cobrado");
          return;
        }

        toast.success("Dia não cobrado atualizado com sucesso!");
      } else {
        const locadoraId = await getUserLocadoraId();

        if (!locadoraId) {
          return;
        }

        const { error } = await supabase.from("dias_nao_cobrados").insert({
          data: form.data,
          descricao: form.descricao.trim() || null,
          ativo: true,
          locadora_id: locadoraId,
        });

        if (error) {
          console.error("Erro ao cadastrar dia não cobrado:", error);
          toast.error("Erro ao cadastrar dia não cobrado");
          return;
        }

        toast.success("Dia não cobrado cadastrado com sucesso!");
      }

      closeModal();
      await fetchDias();
    } catch (error) {
      console.error("Erro inesperado ao salvar dia não cobrado:", error);
      toast.error("Erro inesperado ao salvar dia não cobrado");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    const confirmou = window.confirm("Deseja realmente excluir este dia não cobrado?");
    if (!confirmou) return;

    try {
      const { error } = await supabase
        .from("dias_nao_cobrados")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("Erro ao excluir dia não cobrado:", error);
        toast.error("Erro ao excluir dia não cobrado");
        return;
      }

      toast.success("Dia não cobrado excluído com sucesso!");
      await fetchDias();
    } catch (error) {
      console.error("Erro inesperado ao excluir dia não cobrado:", error);
      toast.error("Erro inesperado ao excluir dia não cobrado");
    }
  }

  async function toggleAtivo(item: DiaNaoCobradoItem) {
    try {
      const { error } = await supabase
        .from("dias_nao_cobrados")
        .update({ ativo: !item.ativo })
        .eq("id", item.id);

      if (error) {
        console.error("Erro ao alterar status do dia não cobrado:", error);
        toast.error("Erro ao alterar status");
        return;
      }

      toast.success(item.ativo ? "Dia desativado!" : "Dia ativado!");
      await fetchDias();
    } catch (error) {
      console.error("Erro inesperado ao alterar status:", error);
      toast.error("Erro inesperado ao alterar status");
    }
  }

  const filtered = useMemo(() => {
    const term = search.toLowerCase();

    return dias.filter((item) => {
      return (
        item.data.toLowerCase().includes(term) ||
        (item.descricao || "").toLowerCase().includes(term)
      );
    });
  }, [dias, search]);

  return (
    <Layout>
      <div className="animate-fade-in space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Dias Não Cobrados
            </h1>
            <p className="text-muted-foreground">
              Gerencie domingos, feriados e dias que não devem ser cobrados
            </p>
          </div>

          <Button type="button" onClick={openCreateModal}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Dia
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            className="rounded-[30px] pl-10"
            placeholder="Buscar por data ou descrição..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <p className="text-muted-foreground">Carregando...</p>
        ) : filtered.length === 0 ? (
          <p className="text-muted-foreground">Nenhum dia cadastrado.</p>
        ) : (
          <div className="space-y-3">
            {filtered.map((item) => (
              <div
                key={item.id}
                className="rounded-[30px] border border-border bg-card p-5 transition-all hover:border-primary/30"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-secondary p-2.5">
                      <CalendarOff className="h-5 w-5 text-primary" />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <p className="font-semibold text-foreground">
                          {new Date(item.data + "T12:00:00").toLocaleDateString("pt-BR")}
                        </p>

                        <Badge
                          className={
                            item.ativo
                              ? "bg-success/20 text-success"
                              : "bg-destructive/20 text-destructive"
                          }
                        >
                          {item.ativo ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>

                      <p className="text-sm text-muted-foreground">
                        {item.descricao || "Sem descrição"}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => handleEdit(item)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => toggleAtivo(item)}
                    >
                      {item.ativo ? (
                        <Ban className="h-4 w-4" />
                      ) : (
                        <CheckCircle className="h-4 w-4" />
                      )}
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => handleDelete(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {openModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-lg rounded-[30px] bg-card p-6 shadow-2xl">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-foreground">
                  {editing ? "Editar Dia Não Cobrado" : "Novo Dia Não Cobrado"}
                </h2>

                <Button type="button" variant="ghost" onClick={closeModal}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Data</Label>
                  <Input
                    type="date"
                    value={form.data}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        data: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Input
                    value={form.descricao}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        descricao: e.target.value,
                      }))
                    }
                    placeholder="Ex.: Natal, Ano Novo, Feriado Municipal..."
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={closeModal}>
                    Cancelar
                  </Button>

                  <Button type="button" onClick={handleSave} disabled={saving}>
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