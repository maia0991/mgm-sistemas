import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Pencil, Ban, CheckCircle, X } from "lucide-react";
import ActionGuard from "@/components/ActionGuard";
import { useBillingAccess } from "@/hooks/useBillingAccess";
import { useAuth } from "@/contexts/AuthContext";

interface EquipamentoRow {
  id: string;
  nome: string;
  descricao: string | null;
  valor_diaria: number | string;
  quantidade_disponivel: number;
  ativo: boolean;
  created_at?: string;
}

const initialForm = {
  nome: "",
  descricao: "",
  valor_diaria: "",
  quantidade_disponivel: "1",
};

export default function EquipamentosPage() {
  const { blockedByBilling } = useBillingAccess();
  const { locadoraId } = useAuth();

  const [equipamentos, setEquipamentos] = useState<EquipamentoRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const [openModal, setOpenModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<EquipamentoRow | null>(null);
  const [form, setForm] = useState(initialForm);

  useEffect(() => {
    void fetchEquipamentos();
  }, []);

  async function fetchEquipamentos() {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("equipamentos")
        .select("*")
        .order("nome");

      if (error) {
        console.error("Erro ao carregar equipamentos:", error);
        toast.error("Erro ao carregar equipamentos");
        return;
      }

      setEquipamentos((data as EquipamentoRow[]) || []);
    } catch (error) {
      console.error("Erro inesperado ao carregar equipamentos:", error);
      toast.error("Erro inesperado ao carregar equipamentos");
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setEditing(null);
    setForm(initialForm);
    setOpenModal(true);
  }

  function handleEdit(eq: EquipamentoRow) {
    setEditing(eq);
    setForm({
      nome: eq.nome || "",
      descricao: eq.descricao || "",
      valor_diaria: String(eq.valor_diaria ?? ""),
      quantidade_disponivel: String(eq.quantidade_disponivel ?? 1),
    });
    setOpenModal(true);
  }

  function closeModal() {
    setOpenModal(false);
    setEditing(null);
    setForm(initialForm);
  }

  async function handleSave() {
    if (blockedByBilling) {
      toast.error("Plano vencido. Não é possível salvar equipamentos.");
      return;
    }

    if (!locadoraId) {
      toast.error("Locadora não identificada.");
      return;
    }

    if (!form.nome.trim()) {
      toast.error("Informe o nome do equipamento");
      return;
    }

    const valorDiaria = Number(form.valor_diaria);
    const quantidadeDisponivel = Number(form.quantidade_disponivel);

    if (Number.isNaN(valorDiaria) || valorDiaria < 0) {
      toast.error("Informe um valor de diária válido");
      return;
    }

    if (
      Number.isNaN(quantidadeDisponivel) ||
      quantidadeDisponivel < 0 ||
      !Number.isInteger(quantidadeDisponivel)
    ) {
      toast.error("Informe uma quantidade válida");
      return;
    }

    try {
      setSaving(true);

      if (editing) {
        const { error } = await supabase
          .from("equipamentos")
          .update({
            nome: form.nome.trim(),
            descricao: form.descricao.trim() || null,
            valor_diaria: valorDiaria,
            quantidade_disponivel: quantidadeDisponivel,
          })
          .eq("id", editing.id);

        if (error) {
          console.error("Erro ao atualizar equipamento:", error);
          toast.error("Erro ao atualizar equipamento");
          return;
        }

        toast.success("Equipamento atualizado com sucesso!");
      } else {
        const { error } = await supabase.from("equipamentos").insert({
          nome: form.nome.trim(),
          descricao: form.descricao.trim() || null,
          valor_diaria: valorDiaria,
          quantidade_disponivel: quantidadeDisponivel,
          ativo: true,
          locadora_id: locadoraId,
        });

        if (error) {
          console.error("Erro ao criar equipamento:", error);
          toast.error("Erro ao criar equipamento");
          return;
        }

        toast.success("Equipamento criado com sucesso!");
      }

      closeModal();
      await fetchEquipamentos();
    } catch (error) {
      console.error("Erro inesperado ao salvar equipamento:", error);
      toast.error("Erro inesperado ao salvar equipamento");
    } finally {
      setSaving(false);
    }
  }

  async function toggleAtivo(eq: EquipamentoRow) {
    if (blockedByBilling) {
      toast.error("Plano vencido. Não é possível alterar equipamentos.");
      return;
    }

    try {
      const { error } = await supabase
        .from("equipamentos")
        .update({ ativo: !eq.ativo })
        .eq("id", eq.id);

      if (error) {
        console.error("Erro ao alterar status do equipamento:", error);
        toast.error("Erro ao alterar status do equipamento");
        return;
      }

      toast.success(
        eq.ativo
          ? "Equipamento desativado com sucesso!"
          : "Equipamento ativado com sucesso!"
      );

      await fetchEquipamentos();
    } catch (error) {
      console.error("Erro inesperado ao alterar status:", error);
      toast.error("Erro inesperado ao alterar status do equipamento");
    }
  }

  const filtered = useMemo(() => {
    const term = search.toLowerCase();

    return equipamentos.filter((eq) => {
      return (
        eq.nome.toLowerCase().includes(term) ||
        (eq.descricao || "").toLowerCase().includes(term)
      );
    });
  }, [equipamentos, search]);

  return (
    <Layout>
      <div className="animate-fade-in space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Equipamentos</h1>
            <p className="text-muted-foreground">
              Gerencie os equipamentos da sua locadora
            </p>
          </div>

          <ActionGuard fallbackLabel="Cadastro bloqueado">
            <Button type="button" onClick={openCreateModal}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Equipamento
            </Button>
          </ActionGuard>
        </div>

        <Input
          placeholder="Buscar equipamento..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {loading ? (
          <p className="text-muted-foreground">Carregando...</p>
        ) : filtered.length === 0 ? (
          <p className="text-muted-foreground">
            Nenhum equipamento encontrado.
          </p>
        ) : (
          <div className="space-y-3">
            {filtered.map((eq) => (
              <div
                key={eq.id}
                className="rounded-[30px] border border-border bg-card p-5 transition-all hover:border-primary/30"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <p className="font-semibold text-foreground">{eq.nome}</p>

                      <Badge
                        className={
                          eq.ativo
                            ? "bg-success/20 text-success"
                            : "bg-destructive/20 text-destructive"
                        }
                      >
                        {eq.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>

                    <p className="text-sm text-muted-foreground">
                      {eq.descricao || "Sem descrição"}
                    </p>

                    <p className="text-sm text-muted-foreground">
                      Diária: R$ {Number(eq.valor_diaria).toFixed(2)} • Estoque:{" "}
                      {eq.quantidade_disponivel}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <ActionGuard fallbackLabel="Edição bloqueada">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => handleEdit(eq)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </ActionGuard>

                    <ActionGuard fallbackLabel="Alteração bloqueada">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => toggleAtivo(eq)}
                      >
                        {eq.ativo ? (
                          <Ban className="h-4 w-4" />
                        ) : (
                          <CheckCircle className="h-4 w-4" />
                        )}
                      </Button>
                    </ActionGuard>
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
                  {editing ? "Editar Equipamento" : "Novo Equipamento"}
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
                      setForm((prev) => ({ ...prev, nome: e.target.value }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Input
                    value={form.descricao}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, descricao: e.target.value }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Valor da Diária</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.valor_diaria}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        valor_diaria: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Quantidade Disponível</Label>
                  <Input
                    type="number"
                    step="1"
                    value={form.quantidade_disponivel}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        quantidade_disponivel: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={closeModal}>
                    Cancelar
                  </Button>

                  <ActionGuard fallbackLabel="Salvar bloqueado">
                    <Button type="button" onClick={handleSave} disabled={saving}>
                      {saving ? "Salvando..." : "Salvar"}
                    </Button>
                  </ActionGuard>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}