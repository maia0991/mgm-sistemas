import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Perfil, Cliente, AppRole } from "@/types";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, UserPlus, Trash2, Shield, Users as UsersIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface PerfilComRole extends Perfil {
  role?: AppRole;
}

export default function UsuariosPage() {
  const [perfis, setPerfis] = useState<PerfilComRole[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", nome: "", role: "cliente" as AppRole, cliente_id: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    const [p, c, r] = await Promise.all([
      supabase.from("perfis").select("*"),
      supabase.from("clientes").select("*").eq("ativo", true).order("nome_completo"),
      supabase.from("user_roles").select("*"),
    ]);

    const roles = r.data || [];
    const perfisWithRole = (p.data || []).map((perfil) => {
      const userRole = roles.find((ur) => ur.user_id === perfil.user_id);
      return { ...perfil, role: userRole?.role as AppRole | undefined };
    });

    setPerfis(perfisWithRole);
    setClientes(c.data || []);
  }

  async function handleCreate() {
    if (!form.email || !form.password || !form.nome) {
      toast.error("Preencha email, senha e nome");
      return;
    }
    if (form.password.length < 6) {
      toast.error("Senha deve ter no mínimo 6 caracteres");
      return;
    }

    setLoading(true);
    try {
      // Create user via Supabase auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: { nome: form.nome },
          emailRedirectTo: window.location.origin,
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Erro ao criar usuário");

      // Assign role
      const { error: roleError } = await supabase.from("user_roles").insert({
        user_id: authData.user.id,
        role: form.role,
      });
      if (roleError) throw roleError;

      // If cliente, link to cliente record
      if (form.role === "cliente" && form.cliente_id) {
        await supabase.from("perfis").update({ cliente_id: form.cliente_id }).eq("user_id", authData.user.id);
      }

      toast.success("Usuário criado com sucesso!");
      setForm({ email: "", password: "", nome: "", role: "cliente", cliente_id: "" });
      setOpen(false);
      fetchData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao criar usuário";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout>
      <div className="animate-fade-in space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Usuários</h1>
            <p className="text-muted-foreground">Gerencie acessos ao sistema</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-[30px] gap-2"><UserPlus className="h-4 w-4" /> Novo Usuário</Button>
            </DialogTrigger>
            <DialogContent className="rounded-[30px] border-border bg-card sm:max-w-lg">
              <DialogHeader><DialogTitle className="text-foreground">Criar Novo Usuário</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label className="text-foreground">Nome</Label><Input className="rounded-[30px]" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
                <div><Label className="text-foreground">Email</Label><Input className="rounded-[30px]" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                <div><Label className="text-foreground">Senha</Label><Input className="rounded-[30px]" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Mínimo 6 caracteres" /></div>
                <div>
                  <Label className="text-foreground">Tipo de Acesso</Label>
                  <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as AppRole })}>
                    <SelectTrigger className="rounded-[30px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Administrador</SelectItem>
                      <SelectItem value="cliente">Cliente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {form.role === "cliente" && (
                  <div>
                    <Label className="text-foreground">Vincular ao Cliente</Label>
                    <Select value={form.cliente_id} onValueChange={(v) => setForm({ ...form, cliente_id: v })}>
                      <SelectTrigger className="rounded-[30px]"><SelectValue placeholder="Selecione o cliente..." /></SelectTrigger>
                      <SelectContent>
                        {clientes.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.nome_completo}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <Button className="w-full rounded-[30px]" onClick={handleCreate} disabled={loading}>
                  {loading ? "Criando..." : "Criar Usuário"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-3">
          {perfis.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-[30px] border border-border bg-card p-5 transition-all hover:border-primary/30">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary">
                  {p.role === "admin" ? <Shield className="h-5 w-5 text-primary" /> : <UsersIcon className="h-5 w-5 text-muted-foreground" />}
                </div>
                <div>
                  <p className="font-semibold text-foreground">{p.nome || p.email}</p>
                  <p className="text-sm text-muted-foreground">{p.email}</p>
                </div>
              </div>
              <Badge className={p.role === "admin" ? "bg-primary/20 text-primary" : "bg-secondary text-secondary-foreground"}>
                {p.role === "admin" ? "Admin" : "Cliente"}
              </Badge>
            </div>
          ))}
          {perfis.length === 0 && <p className="text-center text-muted-foreground py-8">Nenhum usuário cadastrado.</p>}
        </div>
      </div>
    </Layout>
  );
}
