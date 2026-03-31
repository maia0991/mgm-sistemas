import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { LocacaoComCliente } from "@/types";
import { formatCurrency, formatDate, situacaoLabel, situacaoColor } from "@/lib/calculos";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Printer, LogOut, User } from "lucide-react";

export default function MeusAlugueisPage() {
  const { perfil, signOut } = useAuth();
  const [locacoes, setLocacoes] = useState<LocacaoComCliente[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!perfil?.cliente_id) { setLoading(false); return; }
    supabase
      .from("locacoes")
      .select("*, clientes(*), itens_locacao(*)")
      .eq("cliente_id", perfil.cliente_id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setLocacoes((data as LocacaoComCliente[]) || []);
        setLoading(false);
      });
  }, [perfil]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="gradient-primary flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold text-primary-foreground">M</div>
            <span className="text-lg font-bold text-foreground">MGM Sistemas</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/meu-perfil">
              <Button variant="ghost" className="rounded-[30px] gap-2 text-sm">
                <User className="h-4 w-4" /> Meu Perfil
              </Button>
            </Link>
            <Button variant="ghost" className="rounded-[30px] gap-2 text-sm text-destructive" onClick={signOut}>
              <LogOut className="h-4 w-4" /> Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl p-6 space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Meus Aluguéis</h1>
          <p className="text-muted-foreground">Bem-vindo, {perfil?.nome || "Cliente"}</p>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Carregando...</p>
        ) : !perfil?.cliente_id ? (
          <div className="rounded-[30px] border border-border bg-card p-8 text-center">
            <p className="text-muted-foreground">Sua conta ainda não foi vinculada a um cadastro de cliente. Entre em contato com a MGM Sistemas.</p>
          </div>
        ) : locacoes.length === 0 ? (
          <div className="rounded-[30px] border border-border bg-card p-8 text-center">
            <p className="text-muted-foreground">Nenhuma locação encontrada.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {locacoes.map((l) => (
              <div key={l.id} className="rounded-[30px] border border-border bg-card p-6 transition-all hover:border-primary/30">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <p className="text-lg font-bold text-foreground">Contrato #{l.numero_contrato}</p>
                      <Badge className={situacaoColor(l.situacao)}>{situacaoLabel(l.situacao)}</Badge>
                    </div>
                    <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                      <p>Período: {formatDate(l.data_inicio)} → {formatDate(l.data_previsao_entrega)}</p>
                      <p>Valor: {formatCurrency(Number(l.valor_total_final))}</p>
                      {l.data_devolucao_real && <p>Devolvido em: {formatDate(l.data_devolucao_real)}</p>}
                    </div>
                  </div>
                  {l.situacao === "ativo" && (
                    <Link to={`/locacoes/${l.id}/contrato`}>
                      <Button variant="outline" className="rounded-[30px] gap-2">
                        <Printer className="h-4 w-4" /> 2ª Via
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
