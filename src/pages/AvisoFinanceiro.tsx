import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  MessageCircle,
  CreditCard,
  Copy,
  ExternalLink,
 X,
  QrCode,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const PIX_KEY = "mgmsistemas@gmail.com";
const WHATSAPP_NUMBER = "5599984132226";

type CobrancaPendente = {
  id: string;
  valor: number | string;
  status: string;
  link_pagamento?: string | null;
  qr_code?: string | null;
  qr_code_base64?: string | null;
  data_vencimento?: string | null;
};

export default function AvisoFinanceiro() {
  const {
    role,
    statusFinanceiro,
    diasParaVencimento,
    loading,
    locadoraId,
  } = useAuth();

  const [cobranca, setCobranca] = useState<CobrancaPendente | null>(null);
  const [openPix, setOpenPix] = useState(false);

  useEffect(() => {
    async function fetchCobranca() {
      if (!locadoraId) return;

      const { data, error } = await (supabase as any)
        .from("cobrancas_locadoras")
        .select(
          "id, valor, status, link_pagamento, qr_code, qr_code_base64, data_vencimento"
        )
        .eq("locadora_id", locadoraId)
        .eq("status", "pendente")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Erro ao buscar cobrança pendente:", error);
        return;
      }

      setCobranca((data as CobrancaPendente) || null);
    }

    void fetchCobranca();
  }, [locadoraId]);

  const whatsappLink = useMemo(() => {
    const texto =
      "Olá! Quero regularizar o pagamento da minha locadora no MGM Sistemas.";
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(texto)}`;
  }, []);

  if (loading) return null;
  if (role !== "locadora" && role !== "cliente") return null;

  const mostrarAviso =
    statusFinanceiro === "warning" ||
    statusFinanceiro === "expired" ||
    statusFinanceiro === "blocked" ||
    !!cobranca;

  if (!mostrarAviso) return null;

  const isWarning = statusFinanceiro === "warning";
  const isExpired = statusFinanceiro === "expired";
  const isBlocked = statusFinanceiro === "blocked";

  let titulo = "Cobrança disponível";
  let mensagem = "Existe uma cobrança pendente disponível para pagamento.";
  let boxClass = "border-primary/30 bg-primary/10";
  let titleClass = "text-primary";
  let textClass = "text-primary";
  let buttonVariant: "default" | "destructive" | "outline" = "default";

  if (isWarning) {
    titulo = "Aviso de vencimento próximo";
    mensagem =
      diasParaVencimento === 0
        ? "Sua fatura vence hoje. Faça o pagamento para evitar bloqueio da conta."
        : `Faltam ${diasParaVencimento} dia${
            diasParaVencimento === 1 ? "" : "s"
          } para vencer sua fatura. Faça o pagamento para evitar bloqueio da conta.`;
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
      "Sua conta está bloqueada por falta de pagamento. Regularize para liberar o acesso completo.";
    boxClass = "border-destructive/40 bg-destructive/15";
    titleClass = "text-destructive";
    textClass = "text-destructive";
    buttonVariant = "destructive";
  }

  async function copiar(texto?: string | null) {
    if (!texto) {
      toast.error("Nada para copiar");
      return;
    }

    await navigator.clipboard.writeText(texto);
    toast.success("Copiado!");
  }

  function pagarAgora() {
    if (cobranca?.link_pagamento) {
      window.open(cobranca.link_pagamento, "_blank");
      return;
    }

    if (cobranca?.qr_code || cobranca?.qr_code_base64) {
      setOpenPix(true);
      return;
    }

    window.open(whatsappLink, "_blank");
  }

  return (
    <>
      <div className="px-6 pt-24">
        <div className={`rounded-[30px] border p-5 shadow-sm ${boxClass}`}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className={`h-5 w-5 ${titleClass}`} />
                <h2 className={`text-base font-bold ${titleClass}`}>
                  {titulo}
                </h2>
              </div>

              <p className={`text-sm ${textClass}`}>{mensagem}</p>

              <div className="space-y-1 text-sm">
                {cobranca ? (
                  <>
                    <p className={textClass}>
                      <span className="font-semibold">Valor:</span> R${" "}
                      {Number(cobranca.valor).toFixed(2)}
                    </p>

                    <p className={textClass}>
                      <span className="font-semibold">Vencimento:</span>{" "}
                      {cobranca.data_vencimento || "—"}
                    </p>

                    <p className={textClass}>
                      Após o pagamento, a liberação acontece automaticamente.
                    </p>
                  </>
                ) : (
                  <>
                    <p className={textClass}>
                      <span className="font-semibold">Chave Pix:</span>{" "}
                      {PIX_KEY}
                    </p>

                    <p className={textClass}>
                      <span className="font-semibold">Contato:</span> +55 99
                      98413-2226
                    </p>
                  </>
                )}

                <p className={textClass}>
                  Evite bloqueio da conta mantendo o pagamento em dia.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              {cobranca && (
                <Button
                  type="button"
                  variant={buttonVariant}
                  className="rounded-[30px]"
                  onClick={pagarAgora}
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  Pagar agora
                </Button>
              )}

              {cobranca?.qr_code && (
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-[30px]"
                  onClick={() => copiar(cobranca.qr_code)}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copiar Pix
                </Button>
              )}

              <Button asChild variant="outline" className="rounded-[30px]">
                <a href={whatsappLink} target="_blank" rel="noreferrer">
                  <MessageCircle className="mr-2 h-4 w-4" />
                  WhatsApp
                </a>
              </Button>

              {!cobranca && (
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-[30px]"
                  onClick={() => copiar(PIX_KEY)}
                >
                  <QrCode className="mr-2 h-4 w-4" />
                  Copiar chave Pix
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {openPix && cobranca && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-[30px] border border-border bg-card p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Pagamento Pix</h2>
                <p className="text-sm text-muted-foreground">
                  Valor: R$ {Number(cobranca.valor).toFixed(2)}
                </p>
              </div>

              <Button type="button" variant="ghost" onClick={() => setOpenPix(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {cobranca.qr_code_base64 && (
              <div className="mb-4 flex justify-center rounded-2xl bg-white p-4">
                <img
                  src={`data:image/png;base64,${cobranca.qr_code_base64}`}
                  alt="QR Code Pix"
                  className="h-56 w-56"
                />
              </div>
            )}

            {cobranca.qr_code && (
              <div className="rounded-2xl border border-border bg-secondary p-3">
                <p className="mb-2 text-xs font-semibold">Pix copia e cola</p>
                <p className="line-clamp-3 break-all text-xs text-muted-foreground">
                  {cobranca.qr_code}
                </p>
              </div>
            )}

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                className="rounded-[30px]"
                onClick={() => copiar(cobranca.qr_code)}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copiar Pix
              </Button>

              {cobranca.link_pagamento && (
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-[30px]"
                  onClick={() => window.open(cobranca.link_pagamento || "", "_blank")}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Abrir link
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}