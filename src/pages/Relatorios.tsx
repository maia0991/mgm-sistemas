import Layout from "@/components/Layout";
import { BarChart3, Construction } from "lucide-react";

export default function RelatoriosPage() {
  return (
    <Layout>
      <div className="animate-fade-in space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Relatórios</h1>
          <p className="text-muted-foreground">Relatórios e análises do sistema</p>
        </div>
        <div className="rounded-[30px] border border-border bg-card p-12 text-center space-y-4">
          <div className="flex justify-center">
            <div className="rounded-2xl bg-primary/10 p-4">
              <BarChart3 className="h-10 w-10 text-primary" />
            </div>
          </div>
          <h2 className="text-xl font-semibold text-foreground">Em Breve</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            A funcionalidade de relatórios está em desenvolvimento. Em breve você poderá gerar relatórios de faturamento, equipamentos mais alugados e desempenho mensal.
          </p>
        </div>
      </div>
    </Layout>
  );
}
