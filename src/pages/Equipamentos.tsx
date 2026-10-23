import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Pencil, Ban, CheckCircle, X, Clock, Calendar, Wrench, Search, Package, DollarSign, Layers } from "lucide-react";
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
  cobranha_24h?: boolean;
  ativo: boolean;
  created_at?: string;
}

const initialForm = {
  nome: "",
  descricao: "",
  valor_diaria: "0,00",
  valor_mensal: "0,00",
  quantidade_disponivel: "1",
  cobranha_24h: true,
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
    setForm(initialForm);
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
      cobranha_24h: eq.cobranha_24h ?? true,
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
      toast.error("Informe o nome do equipamento");
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

      const payload = {
        nome: form.nome.trim(),
        descricao: form.descricao.trim() || null,
        valor_diaria: valorDiaria,
        valor_mensal: valorMensal,
        quantidade_disponivel: quantidadeDisponivel,
        cobranha_24h: form.cobranha_24h,
      };

      if (editing) {
        const { error } = await (supabase as any)
          .from("equipamentos")
          .update(payload)
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
            ...payload,
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
              Gerencie seus equipamentos e modalidades de cobrança
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

                      <Badge variant="outline" className="text-xs gap-1 border-primary/30 text-primary">
                        {eq.cobranha_24h ? (
                          <>
                            <Clock className="h-3 w-3" />
                            Diária 24h
                          </>
                        ) : (
                          <>
                            <Calendar className="h-3 w-3" />
                            Diária Calendário
                          </>
                        )}
                      </Badge>
                    </div>

                    <p className="text-sm text-muted-foreground">
                      {eq.descricao || "Sem descrição"}
                    </p>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground pt-1">
                      <span><strong>Diária:</strong> R$ {formatMoney(eq.valor_diaria)}</span>
                      <span><strong>Mensal:</strong> R$ {formatMoney(eq.valor_mensal)}</span>
                      <span><strong>Estoque:</strong> {eq.quantidade_disponivel} un</span>
                    </div>
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

        {/* MODAL PROFISSIONAL E DINÂMICO DE CADASTRO / EDIÇÃO */}
        {openModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md animate-fade-in">
            <div className="w-full max-w-xl rounded-3xl bg-card border border-border/80 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
              
              {/* HEADER DO MODAL */}
              <div className="px-6 py-5 border-b border-border/60 flex items-center justify-between bg-muted/20">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                    <Wrench className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-foreground">
                      {editing ? "Editar Equipamento" : "Novo Equipamento"}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Configure as informações e regras de cobrança
                    </p>
                  </div>
                </div>

                <Button variant="ghost" size="icon" onClick={closeModal} className="rounded-xl h-9 w-9 text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* CORPO DO FORMULÁRIO COM SCROLL */}
              <div className="p-6 space-y-5 overflow-y-auto">
                
                {/* DADOS BÁSICOS */}
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nome do Equipamento *</Label>
                    <Input
                      placeholder="Ex: Martelete Demolidor 15kg"
                      value={form.nome}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          nome: e.target.value,
                        }))
                      }
                      className="h-12 bg-background/80 border-border rounded-xl text-foreground font-medium focus-visible:ring-primary"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Descrição / Observações</Label>
                    <Input
                      placeholder="Ex: Acompanha ponteiro e talhadeira"
                      value={form.descricao}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          descricao: e.target.value,
                        }))
                      }
                      className="h-12 bg-background/80 border-border rounded-xl text-foreground focus-visible:ring-primary"
                    />
                  </div>
                </div>

                {/* MODALIDADE DE COBRANÇA (CARD DESTAQUE) */}
                <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-xl bg-primary/15 flex items-center justify-center text-primary">
                        <Clock className="h-4 w-4" />
                      </div>
                      <div>
                        <Label className="text-sm font-bold text-foreground cursor-pointer">
                          Cobrança de Diária de 24h
                        </Label>
                        <p className="text-[11px] text-muted-foreground">
                          {form.cobranha_24h
                            ? "Vence em 24h exatas. Atrasos cobram hora proporcional."
                            : "Marcar se a cobrança for por 24h corridas (ideal para equipamentos elétricos)."}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={form.cobranha_24h}
                      onCheckedChange={(checked) =>
                        setForm((prev) => ({
                          ...prev,
                          cobranha_24h: checked,
                        }))
                      }
                    />
                  </div>
                </div>

                {/* VALORES E ESTOQUE (GRID) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Diária (R$)</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
                        className="h-12 pl-9 bg-background/80 border-border rounded-xl font-bold text-foreground focus-visible:ring-primary"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Mensal (R$)</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
                        className="h-12 pl-9 bg-background/80 border-border rounded-xl font-bold text-foreground focus-visible:ring-primary"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Estoque</Label>
                    <div className="relative">
                      <Layers className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="number"
                        value={form.quantidade_disponivel}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            quantidade_disponivel: e.target.value,
                          }))
                        }
                        className="h-12 pl-9 bg-background/80 border-border rounded-xl font-bold text-foreground focus-visible:ring-primary"
                      />
                    </div>
                  </div>
                </div>

              </div>

              {/* FOOTER DO MODAL */}
              <div className="px-6 py-4 border-t border-border/60 bg-muted/20 flex items-center justify-end gap-3">
                <Button variant="outline" onClick={closeModal} className="rounded-xl h-11 px-5 border-border">
                  Cancelar
                </Button>

                <ActionGuard fallbackLabel="Salvar bloqueado">
                  <Button onClick={handleSave} disabled={saving} className="rounded-xl h-11 px-6 shadow-lg shadow-primary/20 font-semibold">
                    {saving ? "Salvando..." : "Salvar Equipamento"}
                  </Button>
                </ActionGuard>
              </div>

            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}