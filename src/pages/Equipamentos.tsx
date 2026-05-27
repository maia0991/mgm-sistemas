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
  valor_mensal?: number | string | null;
  quantidade_disponivel: number;
  ativo: boolean;
  created_at?: string;
}

const initialForm = {
  nome: "",
  descricao: "",
  valor_diaria: "0,00",
  valor_mensal: "0,00",
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
        console.error(error);
        toast.error("Erro ao carregar equipamentos");
        return;
      }

      setEquipamentos((data as EquipamentoRow[]) || []);
    } catch (error) {
      console.error(error);
      toast.error("Erro inesperado");
    } finally {
      setLoading(false);
    }
  }

  function formatMoney(value: any) {
    const number = Number(value || 0);

    return number.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function openCreateModal() {
    setEditing(null);

    setForm({
      nome: "",
      descricao: "",
      valor_diaria: "0,00",
      valor_mensal: "0,00",
      quantidade_disponivel: "1",
    });

    setOpenModal(true);
  }

  function handleEdit(eq: EquipamentoRow) {
    setEditing(eq);

    setForm({
      nome: eq.nome || "",
      descricao: eq.descricao || "",
      valor_diaria: formatMoney(eq.valor_diaria),
      valor_mensal: formatMoney(eq.valor_mensal),
      quantidade_disponivel: String(eq.quantidade_disponivel || 1),
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
      toast.error("Plano vencido.");
      return;
    }

    if (!locadoraId) {
      toast.error("Locadora não identificada.");
      return;
    }

    if (!form.nome.trim()) {
      toast.error("Informe o nome");
      return;
    }

    const valorDiaria = Number(
      form.valor_diaria.replace(/\./g, "").replace(",", ".")
    );

    const valorMensal = Number(
      form.valor_mensal.replace(/\./g, "").replace(",", ".")
    );

    const quantidadeDisponivel = Number(form.quantidade_disponivel);

    try {
      setSaving(true);

      if (editing) {
        const { error } = await (supabase as any)
          .from("equipamentos")
          .update({
            nome: form.nome.trim(),
            descricao: form.descricao.trim() || null,
            valor_diaria: valorDiaria,
            valor_mensal: valorMensal,
            quantidade_disponivel: quantidadeDisponivel,
          })
          .eq("id", editing.id);

        if (error) {
          console.error(error);
          toast.error("Erro ao atualizar");
          return;
        }

        toast.success("Atualizado com sucesso!");
      } else {
        const { error } = await (supabase as any)
          .from("equipamentos")
          .insert({
            nome: form.nome.trim(),
            descricao: form.descricao.trim() || null,
            valor_diaria: valorDiaria,
            valor_mensal: valorMensal,
            quantidade_disponivel: quantidadeDisponivel,
            ativo: true,
            locadora_id: locadoraId,
          });

        if (error) {
          console.error(error);
          toast.error("Erro ao cadastrar");
          return;
        }

        toast.success("Equipamento cadastrado!");
      }

      closeModal();
      await fetchEquipamentos();
    } catch (error) {
      console.error(error);
      toast.error("Erro inesperado");
    } finally {
      setSaving(false);
    }
  }

  async function toggleAtivo(eq: EquipamentoRow) {
    try {
      const { error } = await supabase
        .from("equipamentos")
        .update({
          ativo: !eq.ativo,
        })
        .eq("id", eq.id);

      if (error) {
        console.error(error);
        toast.error("Erro ao alterar status");
        return;
      }

      toast.success("Status alterado!");
      await fetchEquipamentos();
    } catch (error) {
      console.error(error);
      toast.error("Erro inesperado");
    }
  }

  const filtered = useMemo(() => {
    const term = search.toLowerCase();

    return equipamentos.filter((eq) =>
      eq.nome.toLowerCase().includes(term)
    );
  }, [equipamentos, search]);

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Equipamentos
            </h1>

            <p className="text-muted-foreground">
              Gerencie seus equipamentos
            </p>
          </div>

          <ActionGuard fallbackLabel="Cadastro bloqueado">
            <Button onClick={openCreateModal}>
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
                className="rounded-[30px] border border-border bg-card p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <p className="font-semibold text-foreground">
                        {eq.nome}
                      </p>

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
                      Diária: R$ {formatMoney(eq.valor_diaria)} • Mensal: R${" "}
                      {formatMoney(eq.valor_mensal)} • Estoque:{" "}
                      {eq.quantidade_disponivel}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => handleEdit(eq)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>

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

                <Button variant="ghost" onClick={closeModal}>
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
                  <Label>Descrição</Label>

                  <Input
                    value={form.descricao}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        descricao: e.target.value,
                      }))
                    }
                  />
                </div>

                {/* ===== DIÁRIA ===== */}
                <div className="space-y-2">
                  <Label>Valor da Diária</Label>

                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="0,00"
                    value={form.valor_diaria}
                    onChange={(e) => {
                      const onlyNumbers = e.target.value.replace(/\D/g, "");

                      const value = Number(onlyNumbers) / 100;

                      const formatted = value.toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      });

                      setForm((prev) => ({
                        ...prev,
                        valor_diaria: formatted,
                      }));
                    }}
                  />
                </div>

                {/* ===== MENSAL ===== */}
                <div className="space-y-2">
                  <Label>Valor Mensal</Label>

                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="0,00"
                    value={form.valor_mensal}
                    onChange={(e) => {
                      const onlyNumbers = e.target.value.replace(/\D/g, "");

                      const value = Number(onlyNumbers) / 100;

                      const formatted = value.toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      });

                      setForm((prev) => ({
                        ...prev,
                        valor_mensal: formatted,
                      }));
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Quantidade Disponível</Label>

                  <Input
                    type="number"
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
                  <Button variant="outline" onClick={closeModal}>
                    Cancelar
                  </Button>

                  <ActionGuard fallbackLabel="Salvar bloqueado">
                    <Button onClick={handleSave} disabled={saving}>
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