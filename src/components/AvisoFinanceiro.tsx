import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AlertTriangle, XCircle, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AvisoFinanceiro() {
  const { statusFinanceiro, diasParaVencimento, role } = useAuth();
  const [fechado, setFechado] = useState(false);

  if (role === "admin") return null;
  if (!statusFinanceiro || statusFinanceiro === "ok") return null;
  if (fechado && statusFinanceiro === "warning") return null;

  const titulo =
    statusFinanceiro === "warning"
      ? "Atenção ao vencimento"
      : statusFinanceiro === "expired"
      ? "Plano vencido"
      : "Acesso bloqueado";

  const mensagem =
    statusFinanceiro === "warning"
      ? `Seu plano vence em ${diasParaVencimento ?? 0} dia(s). Regularize para evitar bloqueio do sistema.`
      : statusFinanceiro === "expired"
      ? "Seu plano está vencido. Entre em contato com a MGM Sistemas para regularização."
      : "Sua locadora está bloqueada. Entre em contato com a MGM Sistemas para liberar o acesso.";

  const Icone =
    statusFinanceiro === "warning"
      ? AlertTriangle
      : statusFinanceiro === "expired"
      ? XCircle
      : ShieldAlert;

  const classeBorda =
    statusFinanceiro === "warning"
      ? "border-yellow-500/30"
      : "border-destructive/30";

  const classeFundo =
    statusFinanceiro === "warning"
      ? "bg-yellow-500/10"
      : "bg-destructive/10";

  const classeTexto =
    statusFinanceiro === "warning"
      ? "text-yellow-400"
      : "text-destructive";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
      <div
        className={`w-full max-w-lg rounded-[30px] border ${classeBorda} ${classeFundo} bg-card p-8 shadow-2xl`}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`rounded-2xl p-3 ${classeFundo}`}>
              <Icone className={`h-6 w-6 ${classeTexto}`} />
            </div>

            <div>
              <h2 className={`text-xl font-bold ${classeTexto}`}>{titulo}</h2>
              <p className="text-sm text-muted-foreground">
                Aviso financeiro da sua locadora
              </p>
            </div>
          </div>

          {statusFinanceiro === "warning" && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setFechado(true)}
            >
              <XCircle className="h-5 w-5" />
            </Button>
          )}
        </div>

        <div className="space-y-4">
          <p className="text-base text-foreground">{mensagem}</p>

          <div className="rounded-2xl border border-border bg-background/50 p-4">
            <p className="text-sm text-muted-foreground">
              Em caso de dúvidas, entre em contato com a equipe da MGM Sistemas.
            </p>
          </div>

          <div className="flex justify-end">
            {statusFinanceiro === "warning" ? (
              <Button type="button" onClick={() => setFechado(true)}>
                Entendi
              </Button>
            ) : (
              <Button type="button" disabled>
                Regularização necessária
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}