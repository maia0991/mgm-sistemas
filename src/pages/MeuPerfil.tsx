import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Cliente } from "@/types";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowLeft, LogOut, User } from "lucide-react";
import { toast } from "sonner";

export default function MeuPerfilPage() {
  const { perfil, signOut } = useAuth();
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCliente() {
      if (!perfil?.cliente_id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const { data, error } = await supabase
          .from("clientes")
          .select("*")
          .eq("id", perfil.cliente_id)
          .maybeSingle();

        if (error) {
          console.error("Erro ao buscar cliente:", error);
          toast.error("Erro ao carregar perfil");
          return;
        }

        setCliente((data as Cliente | null) ?? null);
      } catch (error) {
        console.error("Erro inesperado ao carregar perfil:", error);
        toast.error("Erro inesperado ao carregar perfil");
      } finally {
        setLoading(false);
      }
    }

    fetchCliente();
  }, [perfil]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="gradient-primary flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold text-primary-foreground">
              M
            </div>
            <span className="text-lg font-bold text-foreground">MGM Sistemas</span>
          </div>

          <Button
            variant="ghost"
            className="rounded-[30px] gap-2 text-sm text-destructive"
            onClick={signOut}
          >
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl p-6 space-y-6 animate-fade-in">
        <Link
          to="/meus-alugueis"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Link>

        <h1 className="text-3xl font-bold text-foreground">Meu Perfil</h1>

        <div className="rounded-[30px] border border-border bg-card p-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <User className="h-8 w-8 text-primary" />
            </div>

            <div>
              <p className="text-xl font-bold text-foreground">
                {perfil?.nome || "—"}
              </p>
              <p className="text-sm text-muted-foreground">{perfil?.email || "—"}</p>
            </div>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : cliente ? (
            <div className="space-y-3 border-t border-border pt-4">
              <h2 className="font-semibold text-foreground">Dados Cadastrais</h2>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Nome Completo</p>
                  <p className="font-medium text-foreground">
                    {cliente.nome_completo}
                  </p>
                </div>

                <div>
                  <p className="text-muted-foreground">CPF/CNPJ</p>
                  <p className="font-medium text-foreground">
                    {cliente.cpf_cnpj || "—"}
                  </p>
                </div>

                <div>
                  <p className="text-muted-foreground">WhatsApp</p>
                  <p className="font-medium text-foreground">
                    {cliente.whatsapp || "—"}
                  </p>
                </div>

                <div>
                  <p className="text-muted-foreground">Endereço da Obra</p>
                  <p className="font-medium text-foreground">
                    {cliente.endereco_obra || "—"}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhum cadastro vinculado.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}