import { useState } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { Building2, UserCog, Settings as SettingsIcon } from "lucide-react";

const configSections = [
  { to: "/perfil-empresa", label: "Perfil da Empresa", desc: "CNPJ, endereço, telefone e dados que aparecem no contrato", icon: Building2 },
  { to: "/usuarios", label: "Usuários", desc: "Gerencie os acessos de clientes e administradores", icon: UserCog },
];

export default function ConfiguracoesPage() {
  return (
    <Layout>
      <div className="animate-fade-in space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Configurações</h1>
          <p className="text-muted-foreground">Gerencie as configurações do sistema</p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {configSections.map((section) => (
            <Link key={section.to} to={section.to}>
              <div className="rounded-[30px] border border-border bg-card p-6 transition-all hover:border-primary/30 hover:shadow-md cursor-pointer">
                <div className="flex items-start gap-4">
                  <div className="rounded-2xl bg-primary/10 p-3">
                    <section.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{section.label}</p>
                    <p className="text-sm text-muted-foreground mt-1">{section.desc}</p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </Layout>
  );
}
