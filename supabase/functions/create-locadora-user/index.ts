// @ts-nocheck
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let createdUserId: string | null = null;
  let createdLocadoraId: string | null = null;
  let createdPerfilId: string | null = null;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Variáveis de ambiente não configuradas" }),
        { status: 500, headers: corsHeaders }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const body = await req.json();

    const nome = String(body.nome ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "").trim();
    const telefone = body.telefone ? String(body.telefone).trim() : null;
    const plano = body.plano ? String(body.plano).trim() : null;
    const data_vencimento = body.data_vencimento
      ? String(body.data_vencimento).trim()
      : null;

    if (!nome || !email || !password) {
      return new Response(
        JSON.stringify({ error: "nome, email e password são obrigatórios" }),
        { status: 400, headers: corsHeaders }
      );
    }

    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: "A senha deve ter no mínimo 6 caracteres" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: "E-mail inválido" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const { data: usersData, error: usersError } =
      await supabase.auth.admin.listUsers();

    if (usersError) {
      console.error("Erro ao listar usuários:", usersError);
      return new Response(
        JSON.stringify({ error: "Erro ao validar usuários existentes" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const users = usersData?.users || [];

    const userExists = users.some(
      (user: any) => user.email?.toLowerCase() === email
    );

    if (userExists) {
      return new Response(
        JSON.stringify({
          error: "A user with this email address has already been registered",
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    const { data: existingLocadora, error: existingLocadoraError } =
      await supabase
        .from("locadoras")
        .select("id")
        .eq("email", email)
        .maybeSingle();

    if (existingLocadoraError) {
      console.error(
        "Erro ao verificar locadora existente:",
        existingLocadoraError
      );
      return new Response(
        JSON.stringify({ error: "Erro ao verificar locadora existente" }),
        { status: 400, headers: corsHeaders }
      );
    }

    if (existingLocadora) {
      return new Response(
        JSON.stringify({ error: "Já existe uma locadora com esse e-mail" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const { data: userData, error: userError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { nome },
      });

    if (userError || !userData?.user?.id) {
      console.error("Erro ao criar usuário:", userError);
      return new Response(
        JSON.stringify({ error: userError?.message || "Erro ao criar usuário" }),
        { status: 400, headers: corsHeaders }
      );
    }

    createdUserId = userData.user.id;

    const { data: locadoraData, error: locadoraError } = await supabase
      .from("locadoras")
      .insert({
        nome,
        email,
        telefone,
        plano,
        data_vencimento,
        ativo: true,
        bloqueio_total: false,
        bloqueio_parcial: false,
      })
      .select("id, nome, email")
      .single();

    if (locadoraError || !locadoraData?.id) {
      console.error("Erro ao criar locadora:", locadoraError);

      if (createdUserId) {
        await supabase.auth.admin.deleteUser(createdUserId);
      }

      return new Response(
        JSON.stringify({
          error: locadoraError?.message || "Erro ao criar locadora",
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    createdLocadoraId = locadoraData.id;
    createdPerfilId = crypto.randomUUID();

    const { error: perfilError } = await supabase.from("perfis").insert({
      id: createdPerfilId,
      user_id: createdUserId,
      locadora_id: createdLocadoraId,
      nome,
      email,
    });

    if (perfilError) {
      console.error("Erro ao criar perfil:", perfilError);

      if (createdLocadoraId) {
        await supabase.from("locadoras").delete().eq("id", createdLocadoraId);
      }

      if (createdUserId) {
        await supabase.auth.admin.deleteUser(createdUserId);
      }

      return new Response(
        JSON.stringify({
          error: perfilError.message || "Erro ao criar perfil",
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    const { error: roleError } = await supabase.from("user_roles").insert({
      user_id: createdUserId,
      role: "locadora",
    });

    if (roleError) {
      console.error("Erro ao criar role:", roleError);

      if (createdPerfilId) {
        await supabase.from("perfis").delete().eq("id", createdPerfilId);
      }

      if (createdLocadoraId) {
        await supabase.from("locadoras").delete().eq("id", createdLocadoraId);
      }

      if (createdUserId) {
        await supabase.auth.admin.deleteUser(createdUserId);
      }

      return new Response(
        JSON.stringify({
          error: roleError.message || "Erro ao criar role do usuário",
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        user_id: createdUserId,
        locadora_id: createdLocadoraId,
        perfil_id: createdPerfilId,
        message: "Locadora cadastrada com sucesso",
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err) {
    console.error("Erro interno na function:", err);

    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Erro interno",
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});