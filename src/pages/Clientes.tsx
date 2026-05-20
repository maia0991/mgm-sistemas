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

const estadosBrasil = [
  { uf: "AC", nome: "Acre" },
  { uf: "AL", nome: "Alagoas" },
  { uf: "AP", nome: "Amapá" },
  { uf: "AM", nome: "Amazonas" },
  { uf: "BA", nome: "Bahia" },
  { uf: "CE", nome: "Ceará" },
  { uf: "DF", nome: "Distrito Federal" },
  { uf: "ES", nome: "Espírito Santo" },
  { uf: "GO", nome: "Goiás" },
  { uf: "MA", nome: "Maranhão" },
  { uf: "MT", nome: "Mato Grosso" },
  { uf: "MS", nome: "Mato Grosso do Sul" },
  { uf: "MG", nome: "Minas Gerais" },
  { uf: "PA", nome: "Pará" },
  { uf: "PB", nome: "Paraíba" },
  { uf: "PR", nome: "Paraná" },
  { uf: "PE", nome: "Pernambuco" },
  { uf: "PI", nome: "Piauí" },
  { uf: "RJ", nome: "Rio de Janeiro" },
  { uf: "RN", nome: "Rio Grande do Norte" },
  { uf: "RS", nome: "Rio Grande do Sul" },
  { uf: "RO", nome: "Rondônia" },
  { uf: "RR", nome: "Roraima" },
  { uf: "SC", nome: "Santa Catarina" },
  { uf: "SP", nome: "São Paulo" },
  { uf: "SE", nome: "Sergipe" },
  { uf: "TO", nome: "Tocantins" },
];

const initialForm = {
  nome_completo: "",
  cpf_cnpj: "",
  whatsapp: "",
  endereco: "",
  numero: "",
  bairro: "",
  estado: "",
  cidade: "",
  complemento: "",
  cep: "",
  referencias_comerciais: "",
  notas_observacoes: "",
};

function montarEnderecoObra(form: typeof initialForm) {
  return [
    form.endereco && `Endereço: ${form.endereco}`,
    form.numero && `Número: ${form.numero}`,
    form.bairro && `Bairro: ${form.bairro}`,
    form.estado && `Estado: ${form.estado}`,
    form.cidade && `Cidade: ${form.cidade}`,
    form.complemento && `Complemento: ${form.complemento}`,
    form.cep && `CEP: ${form.cep}`,
    form.referencias_comerciais &&
      `Referências comerciais: ${form.referencias_comerciais}`,
  ]
    .filter(Boolean)
    .join(" | ");
}

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

  const [cidades, setCidades] = useState<string[]>([]);
  const [loadingCidades, setLoadingCidades] = useState(false);

  useEffect(() => {
    void fetchClientes();
  }, []);

  useEffect(() => {
    async function fetchCidades() {
      if (!form.estado) {
        setCidades([]);
        return;
      }

      try {
        setLoadingCidades(true);

        const res = await fetch(
          `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${form.estado}/municipios`
        );

        const data = await res.json();

        const nomes = (data || [])
          .map((cidade: { nome: string }) => cidade.nome)
          .sort((a: string, b: string) => a.localeCompare(b));

        setCidades(nomes);
      } catch (error) {
        console.error("Erro ao carregar cidades:", error);
        toast.error("Erro ao carregar cidades do estado");
        setCidades([]);
      } finally {
        setLoadingCidades(false);
      }
    }

    void fetchCidades();
  }, [form.estado]);

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
      ...initialForm,
      nome_completo: cliente.nome_completo || "",
      cpf_cnpj: cliente.cpf_cnpj || "",
      whatsapp: cliente.whatsapp || "",
      endereco: cliente.endereco_obra || "",
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

    const enderecoObra = montarEnderecoObra(form);

    try {
      setSaving(true);

      if (editing) {
        const { error } = await supabase
          .from("clientes")
          .update({
            nome_completo: form.nome_completo.trim(),
            cpf_cnpj: form.cpf_cnpj.trim() || null,
            whatsapp: form.whatsapp.trim() || null,
            endereco_obra: enderecoObra || null,
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
          endereco_obra: enderecoObra || null,
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
            <div className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-[30px] bg-card p-6 shadow-2xl">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-foreground">
                  {editing ? "Editar Cliente" : "Novo Cliente"}
                </h2>

                <Button type="button" variant="ghost" onClick={closeModal}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-5">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="space-y-2 md:col-span-3">
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
                    <Label>CEP</Label>
                    <Input
                      value={form.cep}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          cep: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="rounded-[24px] border border-border bg-secondary/40 p-4">
                  <h3 className="mb-4 text-base font-semibold text-foreground">
                    Endereço da obra
                  </h3>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                    <div className="space-y-2 md:col-span-3">
                      <Label>Endereço</Label>
                      <Input
                        value={form.endereco}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            endereco: e.target.value,
                          }))
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Número</Label>
                      <Input
                        value={form.numero}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            numero: e.target.value,
                          }))
                        }
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label>Bairro</Label>
                      <Input
                        value={form.bairro}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            bairro: e.target.value,
                          }))
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Estado</Label>
                      <select
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                        value={form.estado}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            estado: e.target.value,
                            cidade: "",
                          }))
                        }
                      >
                        <option value="">Selecione...</option>
                        {estadosBrasil.map((estado) => (
                          <option key={estado.uf} value={estado.uf}>
                            {estado.uf} - {estado.nome}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label>Cidade</Label>
                      <select
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                        value={form.cidade}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            cidade: e.target.value,
                          }))
                        }
                        disabled={!form.estado || loadingCidades}
                      >
                        <option value="">
                          {loadingCidades
                            ? "Carregando..."
                            : "Selecione..."}
                        </option>
                        {cidades.map((cidade) => (
                          <option key={cidade} value={cidade}>
                            {cidade}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2 md:col-span-3">
                      <Label>Complemento</Label>
                      <Input
                        value={form.complemento}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            complemento: e.target.value,
                          }))
                        }
                      />
                    </div>

                    <div className="space-y-2 md:col-span-4">
                      <Label>Referências comerciais</Label>
                      <Input
                        value={form.referencias_comerciais}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            referencias_comerciais: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
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