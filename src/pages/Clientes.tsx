import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Pencil, Ban, CheckCircle, X, Search } from "lucide-react";
import ActionGuard from "@/components/ActionGuard";
import { useBillingAccess } from "@/hooks/useBillingAccess";
import { useAuth } from "@/contexts/AuthContext";
import { maskCpfCnpj, maskTelefone } from "@/lib/masks";

interface ClienteRow {
  id: string;
  nome_completo: string;
  cpf_cnpj: string | null;
  whatsapp: string | null;
  endereco_obra: string | null;
  notas_observacoes: string | null;
  ativo?: boolean | null;
  created_at?: string;
}

const initialForm = {
  nome_completo: "",
  cpf_cnpj: "",
  whatsapp: "",
  endereco_obra: "",
  notas_observacoes: "",
};

export default function ClientesPage() {
  const { blockedByBilling } = useBillingAccess();
  const { locadoraId } = useAuth();

  const [clientes, setClientes] = useState<ClienteRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const [openModal, setOpenModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<ClienteRow | null>(null);
  const [form, setForm] = useState(initialForm);

  useEffect(() => {
    void fetchClientes();
  }, []);

  async function fetchClientes() {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("clientes")
        .select("*")
        .order("nome_completo");

      if (error) {
        console.error("Erro ao carregar clientes:", error);
        toast.error("Erro ao carregar clientes");
        return;
      }

      setClientes((data as ClienteRow[]) || []);
    } catch (error) {
      console.error("Erro inesperado ao carregar clientes:", error);
      toast.error("Erro inesperado ao carregar clientes");
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setEditing(null);
    setForm(initialForm);
    setOpenModal(true);
  }

  function handleEdit(cliente: ClienteRow) {
    setEditing(cliente);
    setForm({
      nome_completo: cliente.nome_completo || "",
      cpf_cnpj: cliente.cpf_cnpj || "",
      whatsapp: cliente.whatsapp || "",
      endereco_obra: cliente.endereco_obra || "",
      notas_observacoes: cliente.notas_observacoes || "",
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
      toast.error("Plano vencido. Não é possível salvar clientes.");
      return;
    }

    if (!locadoraId) {
      toast.error("Locadora não identificada.");
      return;
    }

    if (!form.nome_completo.trim()) {
      toast.error("Informe o nome do cliente");
      return;
    }

    try {
      setSaving(true);

      if (editing) {
        const { error } = await supabase
          .from("clientes")
          .update({
            nome_completo: form.nome_completo.trim(),
            cpf_cnpj: form.cpf_cnpj.trim() || null,
            whatsapp: form.whatsapp.trim() || null,
            endereco_obra: form.endereco_obra.trim() || null,
            notas_observacoes: form.notas_observacoes.trim() || null,
          })
          .eq("id", editing.id);

        if (error) {
          console.error("Erro ao atualizar cliente:", error);
          toast.error("Erro ao atualizar cliente");
          return;
        }

        toast.success("Cliente atualizado com sucesso!");
      } else {
        const { error } = await supabase.from("clientes").insert({
          nome_completo: form.nome_completo.trim(),
          cpf_cnpj: form.cpf_cnpj.trim() || null,
          whatsapp: form.whatsapp.trim() || null,
          endereco_obra: form.endereco_obra.trim() || null,
          notas_observacoes: form.notas_observacoes.trim() || null,
          ativo: true,
          locadora_id: locadoraId,
        });

        if (error) {
          console.error("Erro ao criar cliente:", error);
          toast.error("Erro ao criar cliente");
          return;
        }

        toast.success("Cliente criado com sucesso!");
      }

      closeModal();
      await fetchClientes();
    } catch (error) {
      console.error("Erro inesperado ao salvar cliente:", error);
      toast.error("Erro inesperado ao salvar cliente");
    } finally {
      setSaving(false);
    }
  }

  async function toggleAtivo(cliente: ClienteRow) {
    if (blockedByBilling) {
      toast.error("Plano vencido. Não é possível alterar clientes.");
      return;
    }

    if (typeof cliente.ativo !== "boolean") {
      toast.error("Esta tabela não possui controle de ativo configurado.");
      return;
    }

    try {
      const { error } = await supabase
        .from("clientes")
        .update({ ativo: !cliente.ativo })
        .eq("id", cliente.id);

      if (error) {
        console.error("Erro ao alterar status do cliente:", error);
        toast.error("Erro ao alterar status do cliente");
        return;
      }

      toast.success(
        cliente.ativo
          ? "Cliente desativado com sucesso!"
          : "Cliente ativado com sucesso!"
      );

      await fetchClientes();
    } catch (error) {
      console.error("Erro inesperado ao alterar status:", error);
      toast.error("Erro inesperado ao alterar status do cliente");
    }
  }

  const filtered = useMemo(() => {
    const term = search.toLowerCase();

    return clientes.filter((cliente) => {
      return (
        cliente.nome_completo.toLowerCase().includes(term) ||
        (cliente.cpf_cnpj || "").toLowerCase().includes(term) ||
        (cliente.whatsapp || "").toLowerCase().includes(term) ||
        (cliente.endereco_obra || "").toLowerCase().includes(term)
      );
    });
  }, [clientes, search]);

  return (
    <Layout>
      <div className="animate-fade-in space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Clientes</h1>
            <p className="text-muted-foreground">
              Gerencie os clientes da sua locadora
            </p>
          </div>

          <ActionGuard fallbackLabel="Cadastro bloqueado">
            <Button type="button" onClick={openCreateModal}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Cliente
            </Button>
          </ActionGuard>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            className="rounded-[30px] pl-10"
            placeholder="Buscar cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <p className="text-muted-foreground">Carregando...</p>
        ) : filtered.length === 0 ? (
          <p className="text-muted-foreground">Nenhum cliente encontrado.</p>
        ) : (
          <div className="space-y-3">
            {filtered.map((cliente) => (
              <div
                key={cliente.id}
                className="rounded-[30px] border border-border bg-card p-5 transition-all hover:border-primary/30"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <p className="font-semibold text-foreground">
                        {cliente.nome_completo}
                      </p>

                      {typeof cliente.ativo === "boolean" && (
                        <Badge
                          className={
                            cliente.ativo
                              ? "bg-success/20 text-success"
                              : "bg-destructive/20 text-destructive"
                          }
                        >
                          {cliente.ativo ? "Ativo" : "Inativo"}
                        </Badge>
                      )}
                    </div>

                    <p className="text-sm text-muted-foreground">
                      CPF/CNPJ: {cliente.cpf_cnpj || "—"}
                    </p>

                    <p className="text-sm text-muted-foreground">
                      WhatsApp: {cliente.whatsapp || "—"}
                    </p>

                    <p className="text-sm text-muted-foreground">
                      Endereço da obra: {cliente.endereco_obra || "—"}
                    </p>

                    {cliente.notas_observacoes && (
                      <p className="text-sm text-muted-foreground">
                        Obs.: {cliente.notas_observacoes}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <ActionGuard fallbackLabel="Edição bloqueada">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => handleEdit(cliente)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </ActionGuard>

                    {typeof cliente.ativo === "boolean" && (
                      <ActionGuard fallbackLabel="Alteração bloqueada">
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => toggleAtivo(cliente)}
                        >
                          {cliente.ativo ? (
                            <Ban className="h-4 w-4" />
                          ) : (
                            <CheckCircle className="h-4 w-4" />
                          )}
                        </Button>
                      </ActionGuard>
                    )}
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
                  {editing ? "Editar Cliente" : "Novo Cliente"}
                </h2>

                <Button type="button" variant="ghost" onClick={closeModal}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome completo</Label>
                  <Input
                    value={form.nome_completo}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        nome_completo: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>CPF/CNPJ</Label>
                  <Input
                    value={form.cpf_cnpj}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        cpf_cnpj: maskCpfCnpj(e.target.value),
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>WhatsApp</Label>
                  <Input
                    value={form.whatsapp}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        whatsapp: maskTelefone(e.target.value),
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Endereço da obra</Label>
                  <Input
                    value={form.endereco_obra}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        endereco_obra: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Observações</Label>
                  <Input
                    value={form.notas_observacoes}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        notas_observacoes: e.target.value,
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