import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Equipamento } from "@/types";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Search, Pencil, Trash2, Package } from "lucide-react";
import { formatCurrency } from "@/lib/calculos";

export default function EquipamentosPage() {
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ nome: "", categoria: "", descricao: "", valor_diaria: 0, quantidade_total: 0, quantidade_disponivel: 0 });

  useEffect(() => { fetchEquipamentos(); }, []);

  async function fetchEquipamentos() {
    const { data } = await supabase.from("equipamentos").select("*").eq("ativo", true).order("nome");
    setEquipamentos(data || []);
  }

  function resetForm() {
    setForm({ nome: "", categoria: "", descricao: "", valor_diaria: 0, quantidade_total: 0, quantidade_disponivel: 0 });
    setEditingId(null);
  }

  async function handleSave() {
    if (!form.nome.trim()) { toast.error("Nome é obrigatório"); return; }
    const payload = { ...form, quantidade_disponivel: editingId ? form.quantidade_disponivel : form.quantidade_total };
    if (editingId) {
      await supabase.from("equipamentos").update(payload).eq("id", editingId);
      toast.success("Equipamento atualizado!");
    } else {
      await supabase.from("equipamentos").insert(payload);
      toast.success("Equipamento cadastrado!");
    }
    resetForm();
    setOpen(false);
    fetchEquipamentos();
  }

  async function handleDelete(id: string) {
    await supabase.from("equipamentos").update({ ativo: false }).eq("id", id);
    toast.success("Equipamento removido!");
    fetchEquipamentos();
  }

  function handleEdit(e: Equipamento) {
    setForm({ nome: e.nome, categoria: e.categoria || "", descricao: e.descricao || "", valor_diaria: Number(e.valor_diaria), quantidade_total: e.quantidade_total, quantidade_disponivel: e.quantidade_disponivel });
    setEditingId(e.id);
    setOpen(true);
  }

  const filtered = equipamentos.filter((e) =>
    e.nome.toLowerCase().includes(search.toLowerCase()) ||
    (e.categoria || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout>
      <div className="animate-fade-in space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Equipamentos</h1>
            <p className="text-muted-foreground">Gerencie seu estoque</p>
          </div>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="rounded-[30px] gap-2"><Plus className="h-4 w-4" /> Novo Equipamento</Button>
            </DialogTrigger>
            <DialogContent className="rounded-[30px] border-border bg-card sm:max-w-lg">
              <DialogHeader><DialogTitle className="text-foreground">{editingId ? "Editar" : "Novo"} Equipamento</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label className="text-foreground">Nome *</Label><Input className="rounded-[30px]" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label className="text-foreground">Categoria</Label><Input className="rounded-[30px]" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} /></div>
                  <div><Label className="text-foreground">Valor Diária (R$)</Label><Input className="rounded-[30px]" type="number" step="0.01" value={form.valor_diaria} onChange={(e) => setForm({ ...form, valor_diaria: parseFloat(e.target.value) || 0 })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label className="text-foreground">Qtd Total</Label><Input className="rounded-[30px]" type="number" value={form.quantidade_total} onChange={(e) => setForm({ ...form, quantidade_total: parseInt(e.target.value) || 0 })} /></div>
                  {editingId && (
                    <div><Label className="text-foreground">Qtd Disponível</Label><Input className="rounded-[30px]" type="number" value={form.quantidade_disponivel} onChange={(e) => setForm({ ...form, quantidade_disponivel: parseInt(e.target.value) || 0 })} /></div>
                  )}
                </div>
                <div><Label className="text-foreground">Descrição</Label><Input className="rounded-[30px]" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></div>
                <Button className="w-full rounded-[30px]" onClick={handleSave}>{editingId ? "Atualizar" : "Cadastrar"}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-3 h-4 w-4 text-muted-foreground" />
          <Input className="rounded-[30px] pl-10" placeholder="Buscar equipamento..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((e) => (
            <div key={e.id} className="rounded-[30px] border border-border bg-card p-5 transition-all hover:border-primary/30">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-secondary p-2.5"><Package className="h-5 w-5 text-primary" /></div>
                  <div>
                    <p className="font-semibold text-foreground">{e.nome}</p>
                    {e.categoria && <p className="text-xs text-muted-foreground">{e.categoria}</p>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="rounded-full h-8 w-8" onClick={() => handleEdit(e)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 text-destructive" onClick={() => handleDelete(e.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <p className="text-lg font-bold text-primary">{formatCurrency(Number(e.valor_diaria))}<span className="text-xs text-muted-foreground font-normal">/dia</span></p>
                <p className="text-sm text-muted-foreground">{e.quantidade_disponivel}/{e.quantidade_total} disp.</p>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <p className="col-span-full text-center text-muted-foreground py-8">Nenhum equipamento encontrado.</p>}
        </div>
      </div>
    </Layout>
  );
}
