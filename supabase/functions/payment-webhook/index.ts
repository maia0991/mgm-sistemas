import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const body = await req.json();

    const paymentId =
      body?.data?.id || body?.id || body?.resource?.split("/").pop();

    if (!paymentId) {
      return new Response("payment id ausente", { status: 400 });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const mpToken = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN")!;

    const supabase = createClient(supabaseUrl, serviceKey);

    const mpRes = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        headers: {
          Authorization: `Bearer ${mpToken}`,
        },
      }
    );

    const payment = await mpRes.json();

    if (!mpRes.ok) {
      return new Response(JSON.stringify(payment), { status: 400 });
    }

    const cobrancaId = payment.external_reference;

    if (!cobrancaId) {
      return new Response("external_reference ausente", { status: 400 });
    }

    const { data: cobranca, error: cobrancaError } = await supabase
      .from("cobrancas_locadoras")
      .select("*")
      .eq("id", cobrancaId)
      .single();

    if (cobrancaError || !cobranca) {
      return new Response("cobrança não encontrada", { status: 404 });
    }

    if (payment.status === "approved") {
      const hoje = new Date();
      const novoVencimento = new Date();

      if (cobranca.data_vencimento) {
        const vencimentoAtual = new Date(cobranca.data_vencimento + "T12:00:00");

        if (vencimentoAtual > hoje) {
          novoVencimento.setTime(vencimentoAtual.getTime());
        }
      }

      novoVencimento.setDate(novoVencimento.getDate() + 30);

      const dataVencimentoFormatada =
        novoVencimento.toISOString().split("T")[0];

      await supabase
        .from("cobrancas_locadoras")
        .update({
          status: "pago",
          data_pagamento: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", cobrancaId);

      await supabase
        .from("locadoras")
        .update({
          ativo: true,
          bloqueio_parcial: false,
          data_vencimento: dataVencimentoFormatada,
        })
        .eq("id", cobranca.locadora_id);
    }

    return new Response("ok", { status: 200 });
  } catch (error) {
    return new Response(String(error), { status: 500 });
  }
});