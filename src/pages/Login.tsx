import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface LoginPageProps {
  adminMode?: boolean;
}

export default function LoginPage({
  adminMode: initialAdminMode = false,
}: LoginPageProps) {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [adminMode, setAdminMode] = useState(initialAdminMode);

  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleLogoDown = useCallback(() => {
    pressTimer.current = setTimeout(() => {
      setAdminMode(true);

      toast.success("Modo administrativo ativado", {
        duration: 2000,
      });
    }, 5000);
  }, []);

  const handleLogoUp = useCallback(() => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
    }
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "a") {
        e.preventDefault();

        setAdminMode(true);

        toast.success("Modo administrativo ativado", {
          duration: 2000,
        });
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    if (!email || !password) {
      toast.error("Preencha todos os campos");
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error(error);
        toast.error("Email ou senha incorretos");
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error("Usuário não encontrado");
        return;
      }

      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      if (roleError) {
        console.error(roleError);

        toast.error("Erro ao carregar permissões do usuário");

        await supabase.auth.signOut();
        return;
      }

      if (!roleData?.role) {
        toast.error("Usuário sem permissão cadastrada");

        await supabase.auth.signOut();
        return;
      }

      // =========================
      // LOGIN ADMIN
      // =========================
      if (adminMode) {
        if (roleData.role !== "admin") {
          toast.error("Esta conta não possui acesso administrativo");

          await supabase.auth.signOut();
          return;
        }

        localStorage.setItem("mgm_trusted_device", "true");

        toast.success("Login administrativo realizado!");

        navigate("/admin-dashboard", {
          replace: true,
        });

        return;
      }

      // =========================
      // BLOQUEIA ADMIN NO LOGIN NORMAL
      // =========================
      if (roleData.role === "admin") {
        toast.error("Use o modo administrativo para esta conta");

        await supabase.auth.signOut();
        return;
      }

      // =========================
      // VERIFICA PERFIL
      // =========================
      const { data: perfilData, error: perfilError } = await supabase
        .from("perfis")
        .select("locadora_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (perfilError) {
        console.error(perfilError);

        toast.error("Erro ao carregar perfil");

        await supabase.auth.signOut();
        return;
      }

      if (!perfilData?.locadora_id) {
        toast.error("Usuário sem locadora vinculada");

        await supabase.auth.signOut();
        return;
      }

      // =========================
      // VERIFICA BLOQUEIO
      // =========================
      const { data: locadora, error: locadoraError } = await supabase
        .from("locadoras")
        .select("ativo, data_vencimento")
        .eq("id", perfilData.locadora_id)
        .maybeSingle();

      if (locadoraError) {
        console.error(locadoraError);

        toast.error("Erro ao carregar locadora");

        await supabase.auth.signOut();
        return;
      }

      if (!locadora?.ativo) {
        toast.error("Sua locadora está bloqueada.");

        await supabase.auth.signOut();
        return;
      }

      toast.success("Login realizado com sucesso!");

      setTimeout(() => {
        navigate("/app", {
          replace: true,
        });
      }, 100);

    } catch (error) {
      console.error(error);

      toast.error("Erro inesperado ao fazer login");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md rounded-[30px] border border-border bg-card p-8 shadow-2xl">

        <div className="mb-8 text-center">
          <div
            onMouseDown={handleLogoDown}
            onMouseUp={handleLogoUp}
            onMouseLeave={handleLogoUp}
            onTouchStart={handleLogoDown}
            onTouchEnd={handleLogoUp}
            className="mx-auto mb-4 flex h-16 w-16 cursor-pointer items-center justify-center overflow-hidden rounded-2xl gradient-primary"
          >
            <img
              src="/apple-touch-icon.png"
              alt="MGM Sistemas"
              className="h-full w-full object-cover"
            />
          </div>

          <h1 className="text-2xl font-bold text-foreground">
            {adminMode ? "Painel Administrativo" : "MGM Sistemas"}
          </h1>

          <p
            className={
              adminMode
                ? "mt-1 text-sm font-semibold text-primary"
                : "mt-1 text-sm text-muted-foreground"
            }
          >
            {adminMode
              ? "Acesso do Administrador"
              : "Acesso da Locadora"}
          </p>

          {adminMode && (
            <button
              type="button"
              onClick={() => setAdminMode(false)}
              className="mt-3 text-xs text-muted-foreground transition hover:text-primary"
            >
              Voltar para login da locadora
            </button>
          )}
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-2">
            <Label>Email</Label>

            <Input
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
            <Label>Senha</Label>

            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="h-11 w-full rounded-[30px]"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : adminMode ? (
              "Entrar como Administrador"
            ) : (
              "Entrar"
            )}
          </Button>

          {!adminMode && (
            <button
              type="button"
              className="w-full text-center text-sm text-muted-foreground transition hover:text-primary"
              onClick={() => {
                const numero = "5599984132226";

                const mensagem = encodeURIComponent(
                  `Esqueci minha senha. Meu email é: ${email}`
                );

                window.open(
                  `https://wa.me/${numero}?text=${mensagem}`,
                  "_blank"
                );
              }}
            >
              Esqueceu a senha?
            </button>
          )}
        </form>
      </div>
    </div>
  );
}