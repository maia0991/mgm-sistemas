import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Lock, Mail, Loader2 } from "lucide-react";

interface LoginPageProps {
  adminMode?: boolean;
}

export default function LoginPage({ adminMode: initialAdminMode = false }: LoginPageProps) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [adminMode, setAdminMode] = useState(initialAdminMode);

  // Long press on logo (5 seconds)
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleLogoDown = useCallback(() => {
    pressTimer.current = setTimeout(() => {
      setAdminMode(true);
      toast.success("Modo administrativo ativado", { duration: 2000 });
    }, 5000);
  }, []);
  const handleLogoUp = useCallback(() => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
  }, []);

  // Keyboard shortcut: Ctrl+Shift+A
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey && e.shiftKey && e.key === "A") {
        e.preventDefault();
        setAdminMode(true);
        toast.success("Modo administrativo ativado", { duration: 2000 });
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) { toast.error("Preencha todos os campos"); return; }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) {
      toast.error("Email ou senha incorretos");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .limit(1)
        .single();

      if (adminMode && roleData?.role === "admin") {
        localStorage.setItem("mgm_trusted_device", "true");
        navigate("/admin-dashboard");
      } else if (roleData?.role === "admin" && !adminMode) {
        await supabase.auth.signOut();
        toast.error("Acesso não autorizado neste portal");
      } else if (roleData?.role === "cliente") {
        if (adminMode) {
          await supabase.auth.signOut();
          toast.error("Esta conta não possui acesso administrativo");
        } else {
          // Check if locadora is active
          const { data: perfilData } = await supabase.from("perfis").select("locadora_id").eq("user_id", user.id).single();
          if (perfilData?.locadora_id) {
            const { data: locadora } = await supabase.from("locadoras").select("ativo").eq("id", perfilData.locadora_id).single();
            if (locadora && !locadora.ativo) {
              await supabase.auth.signOut();
              toast.error("Seu acesso está bloqueado. Entre em contato com a MGM Sistemas.");
              return;
            }
          }
          navigate("/");
        }
      } else {
        navigate("/");
      }
    }
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!email) { toast.error("Informe o email"); return; }
    setLoading(true);
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    toast.success("Email de recuperação enviado!");
    setMode("login");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className={`w-full max-w-md animate-fade-in rounded-[30px] border bg-card p-8 shadow-2xl transition-all duration-500 ${
        adminMode ? "border-primary/60 shadow-[0_0_30px_-5px_hsl(210_100%_52%/0.3)]" : "border-border"
      }`}>
        <div className="mb-8 text-center">
          <div
            className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl cursor-pointer select-none transition-all duration-300 ${
              adminMode ? "gradient-primary ring-2 ring-primary/50 ring-offset-2 ring-offset-card" : "gradient-primary"
            }`}
            onMouseDown={handleLogoDown}
            onMouseUp={handleLogoUp}
            onMouseLeave={handleLogoUp}
            onTouchStart={handleLogoDown}
            onTouchEnd={handleLogoUp}
          >
            <span className="text-xl font-bold text-primary-foreground">M</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">MGM Sistemas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "forgot"
              ? "Recuperar senha"
              : adminMode
                ? "Acesso Master MGM"
                : "Acesso da Locadora"}
          </p>
          {adminMode && (
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
              Modo Gestão
            </div>
          )}
        </div>

        {mode === "login" ? (
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label className="text-foreground">Email</Label>
              <div className="relative">
                <Mail className="absolute left-4 top-3 h-4 w-4 text-muted-foreground" />
                <Input className="rounded-[30px] pl-10" type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-4 top-3 h-4 w-4 text-muted-foreground" />
                <Input className="rounded-[30px] pl-10" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
            </div>
            <Button className={`w-full rounded-[30px] h-11 transition-all ${adminMode ? "shadow-[0_0_20px_-5px_hsl(210_100%_52%/0.4)]" : ""}`} type="submit" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : adminMode ? "Acessar Painel" : "Entrar"}
            </Button>
            <button
              type="button"
              className="w-full text-center text-sm text-muted-foreground hover:text-primary transition-colors"
              onClick={() => setMode("forgot")}
            >
              Esqueceu a senha?
            </button>
          </form>
        ) : (
          <form onSubmit={handleForgotPassword} className="space-y-5">
            <div className="space-y-2">
              <Label className="text-foreground">Email</Label>
              <div className="relative">
                <Mail className="absolute left-4 top-3 h-4 w-4 text-muted-foreground" />
                <Input className="rounded-[30px] pl-10" type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>
            <Button className="w-full rounded-[30px] h-11" type="submit" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar link de recuperação"}
            </Button>
            <button type="button" className="w-full text-center text-sm text-muted-foreground hover:text-primary transition-colors" onClick={() => setMode("login")}>
              Voltar ao login
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
