import { useEffect, useMemo, useState } from "react";
import { Copy, ExternalLink, FileText, CheckCircle, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type Fatura = {
  id: string;
  valor: number | string;
  descricao?: string | null;
  status: "pendente" | "pago" | "cancelado" | "vencido";
  link_pagamento?: string | null;
  qr_code?: string | null;
  qr_code_base64?: string | null;
  data_vencimento?: string | null;
  data_pagamento?: string | null;
  created_at?: string | null;
};

export default function MinhasFaturas() {
  const { locadoraId } = useAuth();

  const [faturas, setFaturas] = useState<Fatura[]>([]);
  const [loading, setLoading] = useState(true);
  const [faturaSelecionada, setFaturaSelecionada] = useState<Fatura | null>(null);

  useEffect(() => {
    void fetchFaturas();
  }, [locadoraId]);

  async function fetchFaturas() {
    if (!locadoraId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await (supabase as any)
        .from("cobrancas_locadoras")
        .select("*")
        .eq("locadora_id", locadoraId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Erro ao carregar faturas:", error);
        toast.error("Erro ao carregar faturas");
        return;
      }

      const lista = ((data as Fatura[]) || [])
  .filter(Boolean)
  .filter((f) => f.status === "pendente" || f.status === "pago");
      setFaturas(lista);
      setFaturaSelecionada(lista.find((f) => f.status === "pendente") || lista[0] || null);
    } finally {
      setLoading(false);
    }
  }

  const pendentes = useMemo(
    () => faturas.filter((f) => f.status === "pendente" || f.status === "vencido"),
    [faturas]
  );

  function getStatusClass(status: Fatura["status"]) {
    if (status === "pago") return "bg-green-500/20 text-green-600";
    if (status === "pendente") return "bg-yellow-500/20 text-yellow-600";
    if (status === "vencido") return "bg-red-500/20 text-red-600";
    return "bg-muted text-muted-foreground";
  }

  function getStatusLabel(status: Fatura["status"]) {
    if (status === "pago") return "Pago";
    if (status === "pendente") return "Pendente";
    if (status === "vencido") return "Vencido";
    return "Cancelado";
  }

  async function copiar(texto?: string | null) {
    if (!texto) {
      toast.error("Nada para copiar");
      return;
    }

    await navigator.clipboard.writeText(texto);
    toast.success("Pix copiado!");
  }

  return (
    <Layout>
      <div className="animate-fade-in space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Minhas Faturas</h1>
          <p className="text-muted-foreground">
            Acompanhe seus pagamentos e regularize sua mensalidade.
          </p>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
          <div className="rounded-[30px] border border-border bg-card p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Faturas</h2>
                <p className="text-sm text-muted-foreground">
                  {pendentes.length > 0
                    ? `${pendentes.length} fatura(s) pendente(s)`
                    : "Nenhuma fatura pendente no momento"}
                </p>
              </div>

              <Button variant="outline" className="rounded-[30px]" onClick={fetchFaturas}>
                Atualizar
              </Button>
            </div>

            {loading ? (
              <p className="text-muted-foreground">Carregando...</p>
            ) : faturas.length === 0 ? (
              <div className="rounded-2xl border border-border bg-secondary p-6 text-center">
                <CheckCircle className="mx-auto mb-3 h-10 w-10 text-green-500" />
                <p className="font-semibold">Nenhuma fatura cadastrada.</p>
                <p className="text-sm text-muted-foreground">
                  Quando houver cobrança, ela aparecerá aqui.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {faturas.map((fatura) => (
                  <button
                    key={fatura.id}
                    type="button"
                    onClick={() => setFaturaSelecionada(fatura)}
                    className={`w-full rounded-2xl border p-4 text-left transition hover:border-primary/40 ${
                      faturaSelecionada?.id === fatura.id
                        ? "border-primary bg-primary/5"
                        : "border-border bg-secondary/50"
                    }`}
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-semibold">
                          {fatura.descricao || "Mensalidade MGM Sistemas"}
                        </p>

                        <p className="text-sm text-muted-foreground">
                          Vencimento: {fatura.data_vencimento || "—"}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <p className="font-bold">
                          R$ {Number(fatura.valor || 0).toFixed(2)}
                        </p>

                        <Badge className={getStatusClass(fatura.status)}>
                          {getStatusLabel(fatura.status)}
                        </Badge>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-[30px] border border-border bg-card p-6">
            {!faturaSelecionada ? (
              <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
                <FileText className="mb-3 h-12 w-12 text-muted-foreground" />
                <p className="font-semibold">Selecione uma fatura</p>
                <p className="text-sm text-muted-foreground">
                  Os dados de pagamento aparecerão aqui.
                </p>
              </div>
            ) : faturaSelecionada.status === "pago" ? (
              <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
                <CheckCircle className="mb-3 h-14 w-14 text-green-500" />
                <h2 className="text-xl font-bold">Fatura paga</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Pagamento confirmado em {faturaSelecionada.data_pagamento || "—"}.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                <div>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    <h2 className="text-xl font-bold">Pagamento Pix</h2>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    Valor: R$ {Number(faturaSelecionada.valor || 0).toFixed(2)}
                  </p>
                </div>

                {faturaSelecionada.qr_code_base64 ? (
                  <div className="flex justify-center rounded-2xl bg-white p-4">
                    <img
                      src={`data:image/png;base64,${faturaSelecionada.qr_code_base64}`}
                      alt="QR Code Pix"
                      className="h-64 w-64"
                    />
                  </div>
                ) : (
                  <div className="flex h-64 items-center justify-center rounded-2xl border border-border bg-secondary text-center text-sm text-muted-foreground">
                    QR Code ainda não gerado para esta fatura.
                  </div>
                )}

                {faturaSelecionada.qr_code && (
                  <div className="rounded-2xl border border-border bg-secondary p-4">
                    <p className="mb-2 text-xs font-semibold">Pix copia e cola</p>
                    <p className="line-clamp-4 break-all text-xs text-muted-foreground">
                      {faturaSelecionada.qr_code}
                    </p>
                  </div>
                )}

                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    className="rounded-[30px]"
                    onClick={() => copiar(faturaSelecionada.qr_code)}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copiar Pix
                  </Button>

                  {faturaSelecionada.link_pagamento && (
                    <Button
                      variant="outline"
                      className="rounded-[30px]"
                      onClick={() =>
                        window.open(faturaSelecionada.link_pagamento || "", "_blank")
                      }
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Abrir pagamento
                    </Button>
                  )}
                </div>

                <p className="text-xs text-muted-foreground">
                  Após o pagamento ser aprovado, a liberação da conta acontece automaticamente.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}