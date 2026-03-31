import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Cliente } from "@/types";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ nome_completo: "", cpf_cnpj: "", whatsapp: "", endereco_obra: "", notas_observacoes: "" });

  useEffect(() => { fetchClientes(); }, []);

  async function fetchClientes() {
    const { data } = await supabase.from("clientes").select("*").eq("ativo", true).order("nome_completo");
    setClientes(data || []);
  }

  function resetForm() {
    setForm({ nome_completo: "", cpf_cnpj: "", whatsapp: "", endereco_obra: "", notas_observacoes: "" });
    setEditingId(null);
  }

  async function handleSave() {
    if (!form.nome_completo.trim()) { toast.error("Nome é obrigatório"); return; }
    if (editingId) {
      await supabase.from("clientes").update(form).eq("id", editingId);
      toast.success("Cliente atualizado!");
    } else {
      await supabase.from("clientes").insert(form);
      toast.success("Cliente cadastrado!");
    }
    resetForm();
    setOpen(false);
    fetchClientes();
  }

  async function handleDelete(id: string) {
    await supabase.from("clientes").update({ ativo: false }).eq("id", id);
    toast.success("Cliente removido!");
    fetchClientes();
  }

  function handleEdit(c: Cliente) {
    setForm({ nome_completo: c.nome_completo, cpf_cnpj: c.cpf_cnpj || "", whatsapp: c.whatsapp || "", endereco_obra: c.endereco_obra || "", notas_observacoes: c.notas_observacoes || "" });
    setEditingId(c.id);
    setOpen(true);
  }

  const filtered = clientes.filter((c) =>
    c.nome_completo.toLowerCase().includes(search.toLowerCase()) ||
    (c.cpf_cnpj || "").includes(search)
  );

  return (
    <Layout>
      <div className="animate-fade-in space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Clientes</h1>
            <p className="text-muted-foreground">Gerencie seus clientes</p>
          </div>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="rounded-[30px] gap-2"><Plus className="h-4 w-4" /> Novo Cliente</Button>
            </DialogTrigger>
            <DialogContent className="rounded-[30px] border-border bg-card sm:max-w-lg">
              <DialogHeader><DialogTitle className="text-foreground">{editingId ? "Editar" : "Novo"} Cliente</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label className="text-foreground">Nome Completo *</Label><Input className="rounded-[30px]" value={form.nome_completo} onChange={(e) => setForm({ ...form, nome_completo: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label className="text-foreground">CPF/CNPJ</Label><Input className="rounded-[30px]" value={form.cpf_cnpj} onChange={(e) => setForm({ ...form, cpf_cnpj: e.target.value })} /></div>
                  <div><Label className="text-foreground">WhatsApp</Label><Input className="rounded-[30px]" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} /></div>
                </div>
                <div><Label className="text-foreground">Endereço da Obra</Label><Input className="rounded-[30px]" value={form.endereco_obra} onChange={(e) => setForm({ ...form, endereco_obra: e.target.value })} /></div>
                <div><Label className="text-foreground">Observações</Label><Input className="rounded-[30px]" value={form.notas_observacoes} onChange={(e) => setForm({ ...form, notas_observacoes: e.target.value })} /></div>
                <Button className="w-full rounded-[30px]" onClick={handleSave}>{editingId ? "Atualizar" : "Cadastrar"}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-3 h-4 w-4 text-muted-foreground" />
          <Input className="rounded-[30px] pl-10" placeholder="Buscar por nome ou CPF/CNPJ..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        <div className="space-y-3">
          {filtered.map((c) => (
            <div key={c.id} className="flex items-center justify-between rounded-[30px] border border-border bg-card p-5 transition-all hover:border-primary/30">
              <div>
                <p className="font-semibold text-foreground">{c.nome_completo}</p>
                <p className="text-sm text-muted-foreground">{c.cpf_cnpj || "Sem CPF/CNPJ"} • {c.whatsapp || "Sem WhatsApp"}</p>
                {c.endereco_obra && <p className="text-xs text-muted-foreground mt-1">{c.endereco_obra}</p>}
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" className="rounded-full" onClick={() => handleEdit(c)}><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="rounded-full text-destructive" onClick={() => handleDelete(c.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">Nenhum cliente encontrado.</p>}
        </div>
      </div>
    </Layout>
  );
}
