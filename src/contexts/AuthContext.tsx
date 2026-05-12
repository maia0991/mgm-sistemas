import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
  useRef,
} from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Perfil, AppRole } from "@/types";

type StatusFinanceiro = "ok" | "warning" | "expired" | "blocked" | null;

type LocadoraAuthData = {
  ativo: boolean;
  data_vencimento: string | null;
  bloqueio_parcial?: boolean | null;
};

interface AuthContextType {
  session: Session | null;
  user: User | null;
  perfil: Perfil | null;
  role: AppRole | null;
  locadoraId: string | null;
  loading: boolean;
  statusFinanceiro: StatusFinanceiro;
  diasParaVencimento: number | null;
  bloqueioParcial: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  perfil: null,
  role: null,
  locadoraId: null,
  loading: true,
  statusFinanceiro: null,
  diasParaVencimento: null,
  bloqueioParcial: false,
  signOut: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [locadoraId, setLocadoraId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFinanceiro, setStatusFinanceiro] =
    useState<StatusFinanceiro>(null);
  const [diasParaVencimento, setDiasParaVencimento] = useState<number | null>(
    null
  );
  const [bloqueioParcial, setBloqueioParcial] = useState(false);

  const mountedRef = useRef(true);

  const clearAuthState = useCallback(() => {
    setSession(null);
    setUser(null);
    setPerfil(null);
    setRole(null);
    setLocadoraId(null);
    setStatusFinanceiro(null);
    setDiasParaVencimento(null);
    setBloqueioParcial(false);
  }, []);

  const fetchUserData = useCallback(async (userId: string) => {
    try {
      setLoading(true);

      setPerfil(null);
      setRole(null);
      setLocadoraId(null);
      setStatusFinanceiro(null);
      setDiasParaVencimento(null);
      setBloqueioParcial(false);

      const [perfilRes, roleRes] = await Promise.all([
        supabase.from("perfis").select("*").eq("user_id", userId).maybeSingle(),
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
          .maybeSingle(),
      ]);

      if (!mountedRef.current) return;

      if (perfilRes.error) {
        console.error("Erro ao buscar perfil:", perfilRes.error.message);
      }

      if (roleRes.error) {
        console.error("Erro ao buscar role:", roleRes.error.message);
      }

      const perfilData = (perfilRes.data as Perfil | null) ?? null;
      const roleData = (roleRes.data?.role as AppRole | null) ?? null;

      if (!roleData) {
        console.warn("Usuário sem permissão cadastrada");
        clearAuthState();
        return;
      }

      if (roleData === "admin") {
        setPerfil(null);
        setRole("admin");
        setLocadoraId(null);
        setStatusFinanceiro(null);
        setDiasParaVencimento(null);
        setBloqueioParcial(false);
        return;
      }

      setPerfil(perfilData);
      setRole(roleData);
      setLocadoraId(perfilData?.locadora_id ?? null);

      if (!perfilData?.locadora_id) {
        console.warn("Usuário não-admin sem locadora vinculada");
        setStatusFinanceiro(null);
        setDiasParaVencimento(null);
        setBloqueioParcial(false);
        return;
      }

      const { data, error: locadoraError } = await supabase
        .from("locadoras")
        .select("ativo, data_vencimento, bloqueio_parcial")
        .eq("id", perfilData.locadora_id)
        .maybeSingle();

      if (!mountedRef.current) return;

      if (locadoraError) {
        console.error(
          "Erro ao buscar dados da locadora:",
          locadoraError.message
        );
        setStatusFinanceiro(null);
        setDiasParaVencimento(null);
        setBloqueioParcial(false);
        return;
      }

      const locadora = (data as LocadoraAuthData | null) ?? null;

      if (!locadora) {
        setStatusFinanceiro(null);
        setDiasParaVencimento(null);
        setBloqueioParcial(false);
        return;
      }

      if (!locadora.ativo) {
        setStatusFinanceiro("blocked");
        setDiasParaVencimento(null);
        setBloqueioParcial(false);

        await supabase.auth.signOut();
        clearAuthState();

        return;
      }

      setBloqueioParcial(!!locadora.bloqueio_parcial);

      if (locadora.data_vencimento) {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        const vencimento = new Date(locadora.data_vencimento + "T00:00:00");
        vencimento.setHours(0, 0, 0, 0);

        const diff = Math.ceil(
          (vencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)
        );

        setDiasParaVencimento(diff);

        if (diff < 0) {
          setStatusFinanceiro("expired");
        } else if (diff <= 5) {
          setStatusFinanceiro("warning");
        } else {
          setStatusFinanceiro("ok");
        }

        return;
      }

      setStatusFinanceiro("ok");
      setDiasParaVencimento(null);
    } catch (error) {
      console.error("Erro ao carregar dados do usuário:", error);

      if (!mountedRef.current) return;

      clearAuthState();
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [clearAuthState]);

  useEffect(() => {
    mountedRef.current = true;

    const loadInitialSession = async () => {
      try {
        setLoading(true);

        const {
          data: { session: currentSession },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error("Erro ao recuperar sessão:", error.message);
        }

        if (!mountedRef.current) return;

        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          await fetchUserData(currentSession.user.id);
        } else {
          clearAuthState();
          setLoading(false);
        }
      } catch (error) {
        console.error("Erro ao recuperar sessão:", error);

        if (!mountedRef.current) return;

        clearAuthState();
        setLoading(false);
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!mountedRef.current) return;

      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (newSession?.user) {
        void fetchUserData(newSession.user.id);
      } else {
        clearAuthState();
        setLoading(false);
      }
    });

    void loadInitialSession();

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, [clearAuthState, fetchUserData]);

  async function signOut() {
    try {
      setLoading(true);
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Erro ao sair:", error);
    } finally {
      clearAuthState();
      setLoading(false);
    }
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        perfil,
        role,
        locadoraId,
        loading,
        statusFinanceiro,
        diasParaVencimento,
        bloqueioParcial,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}