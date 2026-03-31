import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DiaNaoCobrado } from "@/types";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, Calendar } from "lucide-react";
import { formatDate } from "@/lib/calculos";

export default function FeriadosPage() {
  const [feriados, setFeriados] = useState<DiaNaoCobrado[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nome: "", data: "", tipo: "feriado" });

  useEffect(() => { fetchFeriados(); }, []);

  async function fetchFeriados() {
    const { data } = await supabase.from("dias_nao_cobrados").select("*").eq("ativo", true).order("data", { ascending: true });
    setFeriados(data || []);
  }

  async function handleSave() {
    if (!form.nome.trim() || !form.data) { toast.error("Nome e data são obrigatórios"); return; }
    await supabase.from("dias_nao_cobrados").insert(form);
    toast.success("Feriado cadastrado!");
    setForm({ nome: "", data: "", tipo: "feriado" });
    setOpen(false);
    fetchFeriados();
  }

  async function handleDelete(id: string) {
    await supabase.from("dias_nao_cobrados").update({ ativo: false }).eq("id", id);
    toast.success("Feriado removido!");
    fetchFeriados();
  }

  return (
    <Layout>
      <div className="animate-fade-in space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Feriados</h1>
            <p className="text-muted-foreground">Dias não cobrados nas locações</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-[30px] gap-2"><Plus className="h-4 w-4" /> Novo Feriado</Button>
            </DialogTrigger>
            <DialogContent className="rounded-[30px] border-border bg-card sm:max-w-md">
              <DialogHeader><DialogTitle className="text-foreground">Novo Feriado</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label className="text-foreground">Nome</Label><Input className="rounded-[30px]" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Natal" /></div>
                <div><Label className="text-foreground">Data</Label><Input className="rounded-[30px]" type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} /></div>
                <div><Label className="text-foreground">Tipo</Label><Input className="rounded-[30px]" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} placeholder="feriado, municipal, etc." /></div>
                <Button className="w-full rounded-[30px]" onClick={handleSave}>Cadastrar</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-3">
          {feriados.map((f) => (
            <div key={f.id} className="flex items-center justify-between rounded-[30px] border border-border bg-card p-5">
              <div className="flex items-center gap-4">
                <div className="rounded-2xl bg-warning/10 p-2.5"><Calendar className="h-5 w-5 text-warning" /></div>
                <div>
                  <p className="font-semibold text-foreground">{f.nome}</p>
                  <p className="text-sm text-muted-foreground">{formatDate(f.data)} • {f.tipo}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="rounded-full text-destructive" onClick={() => handleDelete(f.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
          {feriados.length === 0 && <p className="text-center text-muted-foreground py-8">Nenhum feriado cadastrado.</p>}
        </div>
      </div>
    </Layout>
  );
}
