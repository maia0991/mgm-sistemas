import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Eye, EyeOff, Lock, Mail, Loader2 } from "lucide-react";

const logoUrl =
  "https://i.postimg.cc/pTkknv67/Gemini-Generated-Image-lpkm7ilpkm7ilpkm-(1).png";

interface LoginPageProps {
  adminMode?: boolean;
}

export default function LoginPage({
  adminMode: initialAdminMode = false,
}: LoginPageProps) {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [adminMode, setAdminMode] = useState(initialAdminMode);

  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Ativação do Modo Admin pressionando o Logo
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

  // Ativação do Modo Admin via teclado (Ctrl + Shift + A)
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

  // Lógica de Login integrada com Supabase
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
      // VERIFICA BLOQUEIO DA LOCADORA
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

  // Redirecionamento de Esqueceu a Senha pelo WhatsApp do Desenvolvedor
  function handleForgotPassword() {
    const numero = "5599984132226";
    const mensagem = encodeURIComponent(
      `Olá! Esqueci minha senha do MGM Sistemas. Meu e-mail é: ${email || "[não informado]"}`
    );
    window.open(`https://wa.me/${numero}?text=${mensagem}`, "_blank");
  }

  // Redirecionamento de Cadastro pelo WhatsApp do Desenvolvedor
  function handleRegister() {
    const numero = "5599984132226";
    const mensagem = encodeURIComponent(
      "Olá! Gostaria de criar uma conta/solicitar acesso ao MGM Sistemas para minha locadora."
    );
    window.open(`https://wa.me/${numero}?text=${mensagem}`, "_blank");
  }

  return (
    <div className="min-h-screen bg-[#070B14] text-slate-100 flex flex-col justify-center items-center p-6 relative overflow-hidden font-sans">
      {/* EFEITO GLOW NEON DE FUNDO */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/10 blur-[120px] pointer-events-none rounded-full" />

      {/* CABEÇALHO DO LOGIN COM A LOGO */}
      <div className="flex flex-col items-center mb-8 relative z-10 text-center">
        <div
          onMouseDown={handleLogoDown}
          onMouseUp={handleLogoUp}
          onMouseLeave={handleLogoUp}
          onTouchStart={handleLogoDown}
          onTouchEnd={handleLogoUp}
          className="mb-4 relative cursor-pointer select-none"
          title="Mantenha pressionado para modo Admin"
        >
          <div className="absolute inset-0 bg-blue-500/30 blur-xl rounded-full" />
          <img
            src={logoUrl}
            alt="MGM Sistemas"
            className="w-16 h-16 rounded-2xl object-cover relative z-10 border border-slate-700/80 shadow-2xl transition-transform active:scale-95"
          />
        </div>

        <h1 className="text-3xl font-black text-white tracking-tight">
          {adminMode ? "Painel Administrativo" : "Bem-vindo"}
        </h1>

        <p
          className={
            adminMode
              ? "text-sm font-semibold text-blue-400 mt-1"
              : "text-sm text-slate-400 mt-1 font-medium"
          }
        >
          {adminMode
            ? "Acesso restrito do Administrador"
            : "Entre com suas credenciais para acessar sua conta"}
        </p>

        {adminMode && (
          <button
            type="button"
            onClick={() => setAdminMode(false)}
            className="mt-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            ← Voltar para login da locadora
          </button>
        )}
      </div>

      {/* CARD DO FORMULÁRIO DE LOGIN */}
      <div className="w-full max-w-md bg-[#0D1322]/90 border border-slate-800/80 rounded-3xl p-8 shadow-2xl backdrop-blur-xl relative z-10">
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-white">Login</h2>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          {/* CAMPO EMAIL */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
              E-mail
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <Input
                type="email"
                placeholder="seu@mgm.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className="bg-[#080D1A] border-slate-800/80 text-white pl-10 h-12 rounded-xl focus:border-blue-500 text-sm"
              />
            </div>
          </div>

          {/* CAMPO SENHA + LINK ESQUECEU A SENHA */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Senha
              </label>
              {!adminMode && (
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Esqueceu sua senha?
                </button>
              )}
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="bg-[#080D1A] border-slate-800/80 text-white pl-10 pr-10 h-12 rounded-xl focus:border-blue-500 text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* BOTÃO PRINCIPAL DE LOGIN */}
          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-600/25 transition-all mt-2"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : adminMode ? (
              "Entrar como Administrador"
            ) : (
              "Entrar"
            )}
          </Button>
        </form>

        {/* LINK REGISTRE-SE REDIRECIONADO PARA O WHATSAPP */}
        {!adminMode && (
          <div className="mt-6 text-center text-xs text-slate-400">
            Não tem uma conta?{" "}
            <button
              type="button"
              onClick={handleRegister}
              className="text-blue-400 hover:text-blue-300 font-bold ml-1 transition-colors underline cursor-pointer"
            >
              Registre-se aqui
            </button>
          </div>
        )}
      </div>

      {/* LINK VOLTAR À LANDING PAGE */}
      <div className="mt-8 relative z-10 text-center">
        <Link
          to="/"
          className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors inline-flex items-center gap-1"
        >
          Quer saber mais sobre o MGM Sistemas? Acesse aqui 🚀
        </Link>
      </div>
    </div>
  );
}