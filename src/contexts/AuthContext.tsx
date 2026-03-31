import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Perfil, AppRole } from "@/types";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  perfil: Perfil | null;
  role: AppRole | null;
  locadoraId: string | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  perfil: null,
  role: null,
  locadoraId: null,
  loading: true,
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

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          setTimeout(() => fetchUserData(session.user.id), 0);
        } else {
          setPerfil(null);
          setRole(null);
          setLocadoraId(null);
          setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchUserData(userId: string) {
    try {
      const [perfilRes, roleRes] = await Promise.all([
        supabase.from("perfis").select("*").eq("user_id", userId).single(),
        supabase.from("user_roles").select("role").eq("user_id", userId).limit(1).single(),
      ]);

      setPerfil(perfilRes.data);
      setRole((roleRes.data?.role as AppRole) ?? null);
      setLocadoraId(perfilRes.data?.locadora_id ?? null);
    } catch {
      // If no role found, user has no role yet
    } finally {
      setLoading(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setPerfil(null);
    setRole(null);
    setLocadoraId(null);
  }

  return (
    <AuthContext.Provider value={{ session, user, perfil, role, locadoraId, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
