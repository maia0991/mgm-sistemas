import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/calculos";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface Locadora {
  id: string;
  nome: string;
  responsavel: string;
  plano: string;
  ativo: boolean;
  data_vencimento: string | null;
}

export default function AdminPagamentosPage() {
  const [locadoras, setLocadoras] = useState<Locadora[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    supabase.from("locadoras").select("*").order("data_vencimento", { ascending: true }).then(({ data }) => {
      setLocadoras(data || []);
    });
  }, []);

  const hoje = new Date().toISOString().split("T")[0];

  const filtered = locadoras.filter((l) =>
    l.nome.toLowerCase().includes(search.toLowerCase())
  );

  const vencidas = filtered.filter((l) => l.data_vencimento && l.data_vencimento < hoje && l.ativo);
  const emDia = filtered.filter((l) => !l.data_vencimento || l.data_vencimento >= hoje || !l.ativo);

  return (
    <Layout>
      <div className="animate-fade-in space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Controle de Pagamentos</h1>
          <p className="text-muted-foreground">Monitore os vencimentos das locadoras</p>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-3 h-4 w-4 text-muted-foreground" />
          <Input className="rounded-[30px] pl-10" placeholder="Buscar locadora..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {vencidas.length > 0 && (
          <div className="rounded-[30px] border border-destructive/30 bg-destructive/5 p-6 space-y-3">
            <h2 className="text-lg font-semibold text-destructive">Pagamentos Vencidos ({vencidas.length})</h2>
            {vencidas.map((l) => (
              <div key={l.id} className="flex items-center justify-between rounded-2xl bg-card p-4">
                <div>
                  <p className="font-medium text-foreground">{l.nome}</p>
                  <p className="text-sm text-muted-foreground">{l.responsavel} • Plano: {l.plano}</p>
                </div>
                <div className="text-right">
                  <Badge className="bg-destructive/20 text-destructive">Vencido</Badge>
                  <p className="text-xs text-destructive mt-1">{l.data_vencimento}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="rounded-[30px] border border-border bg-card p-6 space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Todas as Locadoras ({emDia.length})</h2>
          {emDia.map((l) => (
            <div key={l.id} className="flex items-center justify-between rounded-2xl bg-secondary p-4">
              <div>
                <p className="font-medium text-foreground">{l.nome}</p>
                <p className="text-sm text-muted-foreground">{l.responsavel} • Plano: {l.plano}</p>
              </div>
              <div className="text-right">
                <Badge className={l.ativo ? "bg-success/20 text-success" : "bg-muted text-muted-foreground"}>
                  {l.ativo ? "Em dia" : "Bloqueada"}
                </Badge>
                {l.data_vencimento && <p className="text-xs text-muted-foreground mt-1">Vence: {l.data_vencimento}</p>}
              </div>
            </div>
          ))}
          {emDia.length === 0 && <p className="text-center text-muted-foreground py-4">Nenhuma locadora encontrada.</p>}
        </div>
      </div>
    </Layout>
  );
}
