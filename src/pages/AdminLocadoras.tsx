import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Search, Pencil, Ban, CheckCircle, Building2 } from "lucide-react";

interface Locadora {
  id: string;
  nome: string;
  cnpj: string;
  responsavel: string;
  telefone: string;
  email: string;
  endereco: string;
  plano: string;
  ativo: boolean;
  data_vencimento: string | null;
  notas: string;
  created_at: string;
}

const emptyForm = {
  nome: "", cnpj: "", responsavel: "", telefone: "", email: "", endereco: "", plano: "basico", data_vencimento: "", notas: "",
};

export default function AdminLocadorasPage() {
  const [locadoras, setLocadoras] = useState<Locadora[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [senhaLocadora, setSenhaLocadora] = useState("");

  useEffect(() => { fetchLocadoras(); }, []);

  async function fetchLocadoras() {
    const { data } = await supabase.from("locadoras").select("*").order("nome");
    setLocadoras(data || []);
  }

  function resetForm() { setForm(emptyForm); setEditingId(null); setSenhaLocadora(""); }

  async function handleSave() {
    if (!form.nome.trim()) { toast.error("Nome é obrigatório"); return; }

    if (editingId) {
      await supabase.from("locadoras").update({
        nome: form.nome, cnpj: form.cnpj, responsavel: form.responsavel,
        telefone: form.telefone, email: form.email, endereco: form.endereco,
        plano: form.plano, data_vencimento: form.data_vencimento || null, notas: form.notas,
      }).eq("id", editingId);
      toast.success("Locadora atualizada!");
    } else {
      if (!form.email.trim() || !senhaLocadora.trim()) {
        toast.error("Email e senha são obrigatórios para criar acesso");
        return;
      }

      // Create locadora record
      const { data: locadora, error: locErr } = await supabase.from("locadoras").insert({
        nome: form.nome, cnpj: form.cnpj, responsavel: form.responsavel,
        telefone: form.telefone, email: form.email, endereco: form.endereco,
        plano: form.plano, data_vencimento: form.data_vencimento || null, notas: form.notas,
      }).select().single();

      if (locErr || !locadora) { toast.error("Erro ao criar locadora"); return; }

      // Create user account via edge function
      const { error: authErr } = await supabase.functions.invoke("create-locadora-user", {
        body: { email: form.email, password: senhaLocadora, nome: form.nome, locadora_id: locadora.id },
      });

      if (authErr) {
        toast.error("Locadora criada mas erro ao criar acesso: " + authErr.message);
      } else {
        toast.success(`Locadora "${form.nome}" criada com acesso!`);
      }
    }

    resetForm();
    setOpen(false);
    fetchLocadoras();
  }

  async function toggleAtivo(loc: Locadora) {
    await supabase.from("locadoras").update({ ativo: !loc.ativo }).eq("id", loc.id);
    toast.success(loc.ativo ? "Locadora bloqueada!" : "Locadora desbloqueada!");
    fetchLocadoras();
  }

  function handleEdit(l: Locadora) {
    setForm({
      nome: l.nome, cnpj: l.cnpj || "", responsavel: l.responsavel || "",
      telefone: l.telefone || "", email: l.email || "", endereco: l.endereco || "",
      plano: l.plano, data_vencimento: l.data_vencimento || "", notas: l.notas || "",
    });
    setEditingId(l.id);
    setOpen(true);
  }

  const filtered = locadoras.filter((l) =>
    l.nome.toLowerCase().includes(search.toLowerCase()) ||
    (l.cnpj || "").includes(search)
  );

  return (
    <Layout>
      <div className="animate-fade-in space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Locadoras</h1>
            <p className="text-muted-foreground">Gerencie as empresas clientes do MGM Sistemas</p>
          </div>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="rounded-[30px] gap-2"><Plus className="h-4 w-4" /> Nova Locadora</Button>
            </DialogTrigger>
            <DialogContent className="rounded-[30px] border-border bg-card sm:max-w-lg max-h-[90vh] overflow-auto">
              <DialogHeader><DialogTitle className="text-foreground">{editingId ? "Editar" : "Nova"} Locadora</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label className="text-foreground">Nome da Empresa *</Label><Input className="rounded-[30px]" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label className="text-foreground">CNPJ</Label><Input className="rounded-[30px]" value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} /></div>
                  <div><Label className="text-foreground">Responsável</Label><Input className="rounded-[30px]" value={form.responsavel} onChange={(e) => setForm({ ...form, responsavel: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label className="text-foreground">Telefone</Label><Input className="rounded-[30px]" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} /></div>
                  <div><Label className="text-foreground">Email *</Label><Input className="rounded-[30px]" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                </div>
                <div><Label className="text-foreground">Endereço</Label><Input className="rounded-[30px]" value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label className="text-foreground">Plano</Label><Input className="rounded-[30px]" value={form.plano} onChange={(e) => setForm({ ...form, plano: e.target.value })} /></div>
                  <div><Label className="text-foreground">Vencimento</Label><Input className="rounded-[30px]" type="date" value={form.data_vencimento} onChange={(e) => setForm({ ...form, data_vencimento: e.target.value })} /></div>
                </div>
                {!editingId && (
                  <div className="border-t border-border pt-4">
                    <Label className="text-foreground font-semibold">Senha de Acesso *</Label>
                    <Input className="rounded-[30px] mt-1" type="password" placeholder="Senha para a locadora acessar o sistema" value={senhaLocadora} onChange={(e) => setSenhaLocadora(e.target.value)} />
                  </div>
                )}
                <div><Label className="text-foreground">Observações</Label><Input className="rounded-[30px]" value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} /></div>
                <Button className="w-full rounded-[30px]" onClick={handleSave}>{editingId ? "Atualizar" : "Cadastrar"}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-3 h-4 w-4 text-muted-foreground" />
          <Input className="rounded-[30px] pl-10" placeholder="Buscar locadora..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        <div className="space-y-3">
          {filtered.map((l) => (
            <div key={l.id} className="rounded-[30px] border border-border bg-card p-5 transition-all hover:border-primary/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="rounded-2xl bg-primary/10 p-2.5"><Building2 className="h-5 w-5 text-primary" /></div>
                  <div>
                    <div className="flex items-center gap-3">
                      <p className="font-semibold text-foreground">{l.nome}</p>
                      <Badge className={l.ativo ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"}>
                        {l.ativo ? "Ativa" : "Bloqueada"}
                      </Badge>
                      {l.plano && <Badge variant="outline" className="text-xs">{l.plano}</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">{l.cnpj || "Sem CNPJ"} • {l.responsavel || "—"} • {l.telefone || "—"}</p>
                    {l.data_vencimento && (
                      <p className={`text-xs ${l.data_vencimento < new Date().toISOString().split("T")[0] ? "text-destructive" : "text-muted-foreground"}`}>
                        Vencimento: {l.data_vencimento}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="icon" className="rounded-full" onClick={() => handleEdit(l)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className={`rounded-full ${l.ativo ? "text-destructive" : "text-success"}`} onClick={() => toggleAtivo(l)}>
                    {l.ativo ? <Ban className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">Nenhuma locadora encontrada.</p>}
        </div>
      </div>
    </Layout>
  );
}
