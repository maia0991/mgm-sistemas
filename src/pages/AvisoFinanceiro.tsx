import { useMemo } from "react";
import { AlertTriangle, MessageCircle, Pix } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

const PIX_KEY = "mgmsistemas@gmail.com";
const WHATSAPP_NUMBER = "5599984132226";

export default function AvisoFinanceiro() {
  const { role, statusFinanceiro, diasParaVencimento, loading } = useAuth();

  const whatsappLink = useMemo(() => {
    const texto =
      "Olá! Quero regularizar o pagamento da minha locadora no MGM Sistemas.";
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(texto)}`;
  }, []);

  if (loading) return null;
  if (role !== "cliente") return null;

  const mostrarAviso =
    statusFinanceiro === "warning" ||
    statusFinanceiro === "expired" ||
    statusFinanceiro === "blocked";

  if (!mostrarAviso) return null;

  const isWarning = statusFinanceiro === "warning";
  const isExpired = statusFinanceiro === "expired";
  const isBlocked = statusFinanceiro === "blocked";

  let titulo = "";
  let mensagem = "";
  let boxClass = "";
  let titleClass = "";
  let textClass = "";
  let buttonVariant: "default" | "destructive" | "outline" = "default";

  if (isWarning) {
    titulo = "Aviso de vencimento próximo";
    mensagem =
      diasParaVencimento === 0
        ? "Sua fatura vence hoje. Faça o pagamento para evitar bloqueio da conta."
        : `Faltam ${diasParaVencimento} dia${diasParaVencimento === 1 ? "" : "s"} para vencer sua fatura. Faça o pagamento para evitar bloqueio da conta.`;
    boxClass = "border-yellow-500/30 bg-yellow-500/10";
    titleClass = "text-yellow-700";
    textClass = "text-yellow-700";
    buttonVariant = "default";
  }

  if (isExpired) {
    titulo = "Fatura vencida";
    mensagem =
      "Sua fatura está vencida. Regularize o pagamento o quanto antes para evitar bloqueio da conta.";
    boxClass = "border-destructive/30 bg-destructive/10";
    titleClass = "text-destructive";
    textClass = "text-destructive";
    buttonVariant = "destructive";
  }

  if (isBlocked) {
    titulo = "Conta bloqueada por inadimplência";
    mensagem =
      "Sua conta está bloqueada por falta de pagamento. Entre em contato para regularizar e liberar o acesso completo.";
    boxClass = "border-destructive/40 bg-destructive/15";
    titleClass = "text-destructive";
    textClass = "text-destructive";
    buttonVariant = "destructive";
  }

  return (
    <div className="px-6 pt-24">
      <div className={`rounded-[30px] border p-5 shadow-sm ${boxClass}`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className={`h-5 w-5 ${titleClass}`} />
              <h2 className={`text-base font-bold ${titleClass}`}>{titulo}</h2>
            </div>

            <p className={`text-sm ${textClass}`}>{mensagem}</p>

            <div className="space-y-1 text-sm">
              <p className={textClass}>
                <span className="font-semibold">Chave Pix:</span> {PIX_KEY}
              </p>
              <p className={textClass}>
                <span className="font-semibold">Contato:</span> +55 99 98413-2226
              </p>
              <p className={textClass}>
                Evite bloqueio da conta mantendo o pagamento em dia.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button asChild variant={buttonVariant} className="rounded-[30px]">
              <a
                href={whatsappLink}
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                WhatsApp
              </a>
            </Button>

            <Button
              type="button"
              variant="outline"
              className="rounded-[30px]"
              onClick={() => navigator.clipboard.writeText(PIX_KEY)}
            >
              <Pix className="mr-2 h-4 w-4" />
              Copiar chave Pix
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}