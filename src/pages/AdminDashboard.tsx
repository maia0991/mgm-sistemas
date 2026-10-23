import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import StatCard from "@/components/StatCard";
import Layout from "@/components/Layout";
import { Building2, DollarSign, AlertTriangle, CheckCircle, KeyRound, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface Locadora {
  id: string;
  nome: string;
  cnpj: string | null;
  responsavel: string | null;
  ativo: boolean;
  plano: string;
  data_vencimento: string | null;
  created_at: string;
}

export default function AdminDashboard() {
  const navigate = useNavigate();

  const [locadoras, setLocadoras] = useState<Locadora[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingAccess, setCheckingAccess] = useState(true);

  // Estados para o modal de alterar a senha do próprio Admin
  const [openAdminPasswordModal, setOpenAdminPasswordModal] = useState(false);
  const [senhaAntiga, setSenhaAntiga] = useState("");
  const [adminNovaSenha, setAdminNovaSenha] = useState("");
  const [savingAdminPassword, setSavingAdminPassword] = useState(false);

  useEffect(() => {
    void checkAccessAndLoad();
  }, []);

  async function checkAccessAndLoad() {
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();

      if (authError || !authData.user) {
        navigate("/login", { replace: true });
        return;
      }

      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", authData.user.id)
        .maybeSingle();

      if (roleError) {
        console.error("Erro ao validar acesso:", roleError);
        toast.error("Erro ao validar acesso");
        navigate("/", { replace: true });
        return;
      }

      if (roleData?.role !== "admin") {
        toast.error("Acesso restrito ao administrador");
        navigate("/", { replace: true });
        return;
      }

      await fetchLocadoras();
    } catch (error) {
      console.error("Erro ao validar acesso:", error);
      toast.error("Erro ao validar acesso");
      navigate("/", { replace: true });
    } finally {
      setCheckingAccess(false);
    }
  }

  async function fetchLocadoras() {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("locadoras")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Erro ao carregar locadoras:", error);
        toast.error("Erro ao carregar locadoras");
        return;
      }

      setLocadoras((data as Locadora[]) || []);
    } catch (error) {
      console.error("Erro inesperado ao carregar dashboard:", error);
      toast.error("Erro inesperado ao carregar dashboard");
    } finally {
      setLoading(false);
    }
  }

  async function alterarSenhaAdminProprio() {
    if (!senhaAntiga) {
      toast.error("Informe a sua senha antiga");
      return;
    }
    if (!adminNovaSenha.trim() || adminNovaSenha.trim().length < 6) {
      toast.error("A nova senha deve ter pelo menos 6 caracteres");
      return;
    }

    try {
      setSavingAdminPassword(true);

      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user?.email) {
        throw new Error("Não foi possível identificar o utilizador logado");
      }

      const email = userData.user.email;

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: senhaAntiga,
      });

      if (signInError) {
        toast.error("A senha antiga está incorreta");
        setSavingAdminPassword(false);
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: adminNovaSenha.trim(),
      });

      if (updateError) {
        throw updateError;
      }

      toast.success("A sua senha de administrador foi alterada com sucesso!");
      setOpenAdminPasswordModal(false);
      setSenhaAntiga("");
      setAdminNovaSenha("");
    } catch (error: any) {
      console.error("Erro ao alterar senha do admin:", error);
      toast.error(error.message || "Erro ao alterar senha");
    } finally {
      setSavingAdminPassword(false);
    }
  }

  const ativas = locadoras.filter((l) => l.ativo);
  const bloqueadas = locadoras.filter((l) => !l.ativo);
  const hoje = new Date().toISOString().split("T")[0];

  const vencidas = locadoras.filter(
    (l) => l.ativo && l.data_vencimento && l.data_vencimento < hoje
  );

  if (checkingAccess) {
    return (
      <Layout>
        <p className="p-8 text-muted-foreground">Validando acesso...</p>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="animate-fade-in space-y-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Painel Administrativo
            </h1>
            <p className="mt-1 text-muted-foreground">
              Gerencie todas as locadoras clientes do MGM Sistemas
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setSenhaAntiga("");
              setAdminNovaSenha("");
              setOpenAdminPasswordModal(true);
            }}
          >
            <KeyRound className="mr-2 h-4 w-4" />
            Alterar Minha Senha
          </Button>
        </div>

        {/* Quadros com cliques direcionando corretamente para /admin-locadoras com os filtros */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div
            onClick={() => navigate("/admin-locadoras?filtro=todos")}
            className="cursor-pointer transition-transform hover:scale-[1.02]"
          >
            <StatCard
              title="Total de Locadoras"
              value={String(locadoras.length)}
              icon={Building2}
              variant="primary"
            />
          </div>
          <div
            onClick={() => navigate("/admin-locadoras?filtro=em_dia")}
            className="cursor-pointer transition-transform hover:scale-[1.02]"
          >
            <StatCard
              title="Ativas"
              value={String(ativas.length)}
              icon={CheckCircle}
              variant="success"
            />
          </div>
          <div
            onClick={() => navigate("/admin-locadoras?filtro=bloqueadas")}
            className="cursor-pointer transition-transform hover:scale-[1.02]"
          >
            <StatCard
              title="Bloqueadas"
              value={String(bloqueadas.length)}
              icon={AlertTriangle}
              variant="warning"
            />
          </div>
          <div
            onClick={() => navigate("/admin-locadoras?filtro=vencidas")}
            className="cursor-pointer transition-transform hover:scale-[1.02]"
          >
            <StatCard
              title="Vencidas"
              value={String(vencidas.length)}
              icon={DollarSign}
              variant="default"
            />
          </div>
        </div>

        {vencidas.length > 0 && (
          <div className="rounded-[30px] border border-destructive/30 bg-destructive/5 p-6">
            <h2 className="mb-4 text-lg font-semibold text-destructive">
              ⚠️ Locadoras com Pagamento Vencido
            </h2>

            <div className="space-y-3">
              {vencidas.map((l) => (
                <div
                  key={l.id}
                  className="flex items-center justify-between rounded-2xl bg-card p-4"
                >
                  <div>
                    <p className="font-medium text-foreground">{l.nome}</p>
                    <p className="text-sm text-muted-foreground">
                      {l.responsavel || "Sem responsável"} • Venceu: {l.data_vencimento}
                    </p>
                  </div>

                  <Badge className="bg-destructive/20 text-destructive">
                    Vencido
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-[30px] border border-border bg-card p-6">
          <h2 className="mb-4 text-lg font-semibold text-foreground">
            Locadoras Recentes
          </h2>

          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : locadoras.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma locadora cadastrada.
            </p>
          ) : (
            <div className="space-y-3">
              {locadoras.slice(0, 10).map((l) => (
                <div
                  key={l.id}
                  className="flex items-center justify-between rounded-2xl bg-secondary p-4"
                >
                  <div>
                    <p className="font-medium text-foreground">{l.nome}</p>
                    <p className="text-sm text-muted-foreground">
                      {l.cnpj || "Sem CNPJ"} • {l.responsavel || "Sem responsável"}
                    </p>
                  </div>

                  <Badge
                    className={
                      l.ativo
                        ? "bg-success/20 text-success"
                        : "bg-destructive/20 text-destructive"
                    }
                  >
                    {l.ativo ? "Ativa" : "Bloqueada"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal de Alterar a Senha do Próprio Admin */}
        {openAdminPasswordModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-2xl">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold">Alterar a Minha Senha</h2>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setOpenAdminPasswordModal(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Senha Antiga (Atual)</Label>
                  <Input
                    type="password"
                    placeholder="Digite sua senha atual"
                    value={senhaAntiga}
                    onChange={(e) => setSenhaAntiga(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Nova Senha</Label>
                  <Input
                    type="password"
                    placeholder="Mínimo de 6 caracteres"
                    value={adminNovaSenha}
                    onChange={(e) => setAdminNovaSenha(e.target.value)}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOpenAdminPasswordModal(false)}
                  >
                    Cancelar
                  </Button>

                  <Button
                    type="button"
                    onClick={alterarSenhaAdminProprio}
                    disabled={savingAdminPassword}
                  >
                    {savingAdminPassword ? "Salvando..." : "Atualizar Senha"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}