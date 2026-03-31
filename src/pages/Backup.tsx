import Layout from "@/components/Layout";
import { HardDrive } from "lucide-react";

export default function BackupPage() {
  return (
    <Layout>
      <div className="animate-fade-in space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Backup</h1>
          <p className="text-muted-foreground">Gerenciamento de backups do sistema</p>
        </div>
        <div className="rounded-[30px] border border-border bg-card p-12 text-center space-y-4">
          <div className="flex justify-center">
            <div className="rounded-2xl bg-primary/10 p-4">
              <HardDrive className="h-10 w-10 text-primary" />
            </div>
          </div>
          <h2 className="text-xl font-semibold text-foreground">Em Breve</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            A funcionalidade de backup está em desenvolvimento. Em breve você poderá exportar e restaurar seus dados.
          </p>
        </div>
      </div>
    </Layout>
  );
}
