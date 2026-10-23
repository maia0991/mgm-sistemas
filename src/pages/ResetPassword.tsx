import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { KeyRound, Lock } from "lucide-react";

export default function ResetPasswordPage() {
  const [senhaAntiga, setSenhaAntiga] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!senhaAntiga.trim() || !novaSenha.trim() || !confirmarSenha.trim()) {
      toast.error("Preencha todos os campos");
      return;
    }

    if (novaSenha !== confirmarSenha) {
      toast.error("A nova senha e a confirmação não coincidem");
      return;
    }

    if (novaSenha.length < 4) {
      toast.error("A nova senha deve ter pelo menos 4 caracteres");
      return;
    }

    try {
      setSaving(true);

      // 1. Pega o usuário logado atualmente no Auth
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !user.email) {
        throw new Error("Usuário não autenticado");
      }

      // 2. Busca o registro na tabela 'usuarios' usando o e-mail do usuário logado
      let { data: usuarioDb, error: fetchError } = await supabase
        .from("usuarios")
        .select("*")
        .ilike("email", user.email.trim())
        .maybeSingle();

      if (fetchError) {
        console.error("Erro ao buscar na tabela usuarios:", fetchError);
      }

      // 3. Valida a senha antiga se o usuário existir na tabela 'usuarios'
      if (usuarioDb && usuarioDb.senha_hash) {
        if (usuarioDb.senha_hash !== senhaAntiga) {
          toast.error("A senha antiga está incorreta!");
          setSaving(false);
          return;
        }
      }

      // 4. Se o usuário existir na tabela 'usuarios', atualiza a coluna 'senha_hash' para o Master ver
      if (usuarioDb) {
        await supabase
          .from("usuarios")
          .update({ senha_hash: novaSenha })
          .eq("id", usuarioDb.id);
      }

      // 5. Atualiza a senha no Supabase Auth para efetivar o login com a nova senha
      const { error: updateAuthError } = await supabase.auth.updateUser({
        password: novaSenha,
      });

      if (updateAuthError) throw updateAuthError;

      toast.success("Senha alterada com sucesso!");
      setSenhaAntiga("");
      setNovaSenha("");
      setConfirmarSenha("");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erro ao alterar a senha");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Layout>
      <div className="animate-fade-in max-w-2xl space-y-6">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-primary/10 p-3">
            <KeyRound className="h-6 w-6 text-primary" />
          </div>

          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Alterar Senha
            </h1>
            <p className="text-muted-foreground">
              Digite sua senha antiga e defina uma nova senha de acesso
            </p>
          </div>
        </div>

        <div className="rounded-[30px] border border-border bg-card p-6 space-y-4">
          <div>
            <Label className="text-foreground">Senha Antiga *</Label>
            <Input
              type="password"
              className="rounded-[30px]"
              placeholder="Digite sua senha atual"
              value={senhaAntiga}
              onChange={(e) => setSenhaAntiga(e.target.value)}
            />
          </div>

          <div>
            <Label className="text-foreground">Nova Senha *</Label>
            <Input
              type="password"
              className="rounded-[30px]"
              placeholder="Digite a nova senha"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
            />
          </div>

          <div>
            <Label className="text-foreground">Confirmar Nova Senha *</Label>
            <Input
              type="password"
              className="rounded-[30px]"
              placeholder="Confirme a nova senha"
              value={confirmarSenha}
              onChange={(e) => setConfirmarSenha(e.target.value)}
            />
          </div>

          <Button
            className="w-full rounded-[30px] h-12 gap-2"
            onClick={handleSave}
            disabled={saving}
          >
            <Lock className="h-4 w-4" />
            {saving ? "Salvando..." : "Atualizar Senha"}
          </Button>
        </div>
      </div>
    </Layout>
  );
}