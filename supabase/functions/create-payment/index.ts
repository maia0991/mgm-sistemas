import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { cobranca_id, email } = await req.json();

    if (!cobranca_id || !email) {
      return new Response(
        JSON.stringify({ error: "cobranca_id e email são obrigatórios" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const mpToken = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN");

    if (!supabaseUrl) {
      return new Response(JSON.stringify({ error: "SUPABASE_URL ausente" }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    if (!serviceKey) {
      return new Response(
        JSON.stringify({ error: "SUPABASE_SERVICE_ROLE_KEY ausente" }),
        { status: 500, headers: corsHeaders }
      );
    }

    if (!mpToken) {
      return new Response(
        JSON.stringify({ error: "MERCADO_PAGO_ACCESS_TOKEN ausente" }),
        { status: 500, headers: corsHeaders }
      );
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: cobranca, error: cobrancaError } = await supabase
      .from("cobrancas_locadoras")
      .select("*")
      .eq("id", cobranca_id)
      .single();

    if (cobrancaError || !cobranca) {
      return new Response(
        JSON.stringify({
          error: "Cobrança não encontrada",
          details: cobrancaError,
        }),
        { status: 404, headers: corsHeaders }
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const response = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${mpToken}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": cobranca.id,
      },
      body: JSON.stringify({
        transaction_amount: Number(cobranca.valor),
        description: cobranca.descricao || "Mensalidade MGM Sistemas",
        payment_method_id: "pix",
        payer: {
          email,
        },
        external_reference: cobranca.id,
        notification_url:
          "https://nlkknqofbtlgpclyffxx.supabase.co/functions/v1/payment-webhook",
      }),
    });

    clearTimeout(timeout);

    const payment = await response.json();

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          error: "Mercado Pago recusou a cobrança",
          details: payment,
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    const qrCode =
      payment?.point_of_interaction?.transaction_data?.qr_code || null;

    const qrCodeBase64 =
      payment?.point_of_interaction?.transaction_data?.qr_code_base64 || null;

    const ticketUrl =
      payment?.point_of_interaction?.transaction_data?.ticket_url || null;

    const { error: updateError } = await supabase
      .from("cobrancas_locadoras")
      .update({
        mercado_pago_id: String(payment.id),
        link_pagamento: ticketUrl,
        qr_code: qrCode,
        qr_code_base64: qrCodeBase64,
        status: "pendente",
        updated_at: new Date().toISOString(),
      })
      .eq("id", cobranca.id);

    if (updateError) {
      return new Response(
        JSON.stringify({
          error: "Erro ao salvar QR Code no banco",
          details: updateError,
        }),
        { status: 500, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        payment_id: payment.id,
        link_pagamento: ticketUrl,
        qr_code: qrCode,
        qr_code_base64: qrCodeBase64,
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error:
          error instanceof Error
            ? error.message
            : "Erro inesperado na função create-payment",
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});