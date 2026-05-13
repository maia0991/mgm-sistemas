import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Building2,
  Copy,
  ExternalLink,
  RefreshCw,
  X,
} from "lucide-react";

interface LocadoraPagamento {
  id: string;
  nome: string;
  ativo: boolean;
  bloqueio_parcial?: boolean | null;
  plano?: string | null;
  data_vencimento?: string | null;
  email?: string | null;
  telefone?: string | null;
}

interface CobrancaLocadora {
  id: string;
  locadora_id: string;
  valor: number | string;
  descricao?: string | null;
  status: "pendente" | "pago" | "cancelado" | "vencido";
  mercado_pago_id?: string | null;
  link_pagamento?: string | null;
  qr_code?: string | null;
  qr_code_base64?: string | null;
  data_vencimento?: string | null;
  data_pagamento?: string | null;
  created_at?: string | null;
}

export default function AdminPagamentosPage() {
  const navigate = useNavigate();

  const [locadoras, setLocadoras] = useState<LocadoraPagamento[]>([]);
  const [cobrancas, setCobrancas] = useState<CobrancaLocadora[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [checkingAccess, setCheckingAccess] = useState(true);

  const [openModal, setOpenModal] = useState(false);
  const [locadoraSelecionada, setLocadoraSelecionada] =
    useState<LocadoraPagamento | null>(null);

  const [valor, setValor] = useState("99.90");
  const [descricao, setDescricao] = useState("Mensalidade MGM Sistemas");
  const [dataVencimento, setDataVencimento] = useState("");
  const [creatingPayment, setCreatingPayment] = useState(false);

  useEffect(() => {
    void checkAccessAndLoad();
  }, []);

  async function checkAccessAndLoad() {
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();

      if (authError || !authData.user) {
        navigate("/login", { replace: true });
        return;
      }

      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", authData.user.id)
        .maybeSingle();

      if (roleError || roleData?.role !== "admin") {
        toast.error("Acesso restrito ao administrador");
        navigate("/", { replace: true });
        return;
      }

      await fetchPagamentos();
    } catch (error) {
      console.error("Erro ao validar acesso:", error);
      toast.error("Erro ao validar acesso");
      navigate("/", { replace: true });
    } finally {
      setCheckingAccess(false);
    }
  }

  async function fetchPagamentos() {
    try {
      setLoading(true);

      const [locadorasRes, cobrancasRes] = await Promise.all([
        supabase
          .from("locadoras")
          .select(
            "id, nome, ativo, bloqueio_parcial, plano, data_vencimento, email, telefone"
          )
          .order("nome"),

        (supabase as any)
          .from("cobrancas_locadoras")
          .select("*")
          .order("created_at", { ascending: false }),
      ]);

      if (locadorasRes.error) {
        console.error("Erro ao carregar locadoras:", locadorasRes.error);
        toast.error("Erro ao carregar pagamentos");
        return;
      }

      if (cobrancasRes.error) {
        console.error("Erro ao carregar cobranças:", cobrancasRes.error);
        toast.error("Erro ao carregar cobranças");
        return;
      }

      setLocadoras((locadorasRes.data as LocadoraPagamento[]) || []);
      setCobrancas((cobrancasRes.data as CobrancaLocadora[]) || []);
    } catch (error) {
      console.error("Erro inesperado:", error);
      toast.error("Erro inesperado ao carregar pagamentos");
    } finally {
      setLoading(false);
    }
  }

  function abrirModalCobranca(locadora: LocadoraPagamento) {
    setLocadoraSelecionada(locadora);
    setValor("99.90");
    setDescricao(`Mensalidade MGM Sistemas - ${locadora.nome}`);

    const vencimento = new Date();
    vencimento.setDate(vencimento.getDate() + 3);
    setDataVencimento(vencimento.toISOString().split("T")[0]);

    setOpenModal(true);
  }

  function fecharModal() {
    if (creatingPayment) return;

    setOpenModal(false);
    setLocadoraSelecionada(null);
    setValor("99.90");
    setDescricao("Mensalidade MGM Sistemas");
    setDataVencimento("");
  }

  async function gerarCobrancaPix() {
    if (!locadoraSelecionada) return;

    const valorNumber = Number(valor);

    if (!valorNumber || valorNumber <= 0) {
      toast.error("Informe um valor válido");
      return;
    }

    if (!locadoraSelecionada.email) {
      toast.error("A locadora precisa ter email cadastrado para gerar Pix");
      return;
    }

    let cobrancaIdCriada: string | null = null;

    try {
      setCreatingPayment(true);

      const { data: cobrancaCriada, error: insertError } = await (supabase as any)
        .from("cobrancas_locadoras")
        .insert({
          locadora_id: locadoraSelecionada.id,
          valor: valorNumber,
          descricao: descricao || "Mensalidade MGM Sistemas",
          status: "pendente",
          data_vencimento: dataVencimento || null,
        })
        .select()
        .single();

      if (insertError || !cobrancaCriada) {
        console.error("Erro ao criar cobrança:", insertError);
        toast.error("Erro ao criar cobrança");
        return;
      }

      cobrancaIdCriada = cobrancaCriada.id;

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(
            new Error(
              "Tempo limite excedido. Verifique o token do Mercado Pago e a Edge Function."
            )
          );
        }, 20000);
      });

      const invokePromise = supabase.functions.invoke("create-payment", {
        body: {
          cobranca_id: cobrancaCriada.id,
          email: locadoraSelecionada.email,
        },
      });

      const result: any = await Promise.race([invokePromise, timeoutPromise]);

      const data = result?.data;
      const error = result?.error;

      if (error) {
        console.error("Erro ao gerar Pix:", error);
        toast.error("Erro ao gerar Pix no Mercado Pago");

        await (supabase as any)
          .from("cobrancas_locadoras")
          .update({
            status: "cancelado",
            updated_at: new Date().toISOString(),
          })
          .eq("id", cobrancaCriada.id);

        return;
      }

      if (data?.error) {
        console.error("Erro Mercado Pago:", data);
        toast.error(data.error || "Erro ao gerar Pix");

        await (supabase as any)
          .from("cobrancas_locadoras")
          .update({
            status: "cancelado",
            updated_at: new Date().toISOString(),
          })
          .eq("id", cobrancaCriada.id);

        return;
      }

      toast.success("Cobrança Pix gerada com sucesso!");

      setOpenModal(false);
      setLocadoraSelecionada(null);
      setValor("99.90");
      setDescricao("Mensalidade MGM Sistemas");
      setDataVencimento("");

      await fetchPagamentos();
    } catch (error) {
      console.error("Erro inesperado ao gerar cobrança:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Erro inesperado ao gerar cobrança"
      );

      if (cobrancaIdCriada) {
        await (supabase as any)
          .from("cobrancas_locadoras")
          .update({
            status: "cancelado",
            updated_at: new Date().toISOString(),
          })
          .eq("id", cobrancaIdCriada);
      }

      await fetchPagamentos();
    } finally {
      setCreatingPayment(false);
    }
  }

  function calcularVencimentoDia20ProximoMes() {
    const hoje = new Date();

    const proximoMes = new Date(
      hoje.getFullYear(),
      hoje.getMonth() + 1,
      20
    );

    return proximoMes.toISOString().split("T")[0];
  }

  async function marcarComoPago(locadora: LocadoraPagamento) {
    try {
      const novaDataVencimento = calcularVencimentoDia20ProximoMes();

      const { error: locadoraError } = await supabase
        .from("locadoras")
        .update({
          ativo: true,
          bloqueio_parcial: false,
          data_vencimento: novaDataVencimento,
        })
        .eq("id", locadora.id);

      if (locadoraError) {
        console.error("Erro ao dar baixa:", locadoraError);
        toast.error("Erro ao dar baixa");
        return;
      }

      const { error: cobrancaError } = await (supabase as any)
        .from("cobrancas_locadoras")
        .update({
          status: "pago",
          data_pagamento: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("locadora_id", locadora.id)
        .eq("status", "pendente");

      if (cobrancaError) {
        console.error("Erro ao baixar cobrança:", cobrancaError);
        toast.error("Locadora liberada, mas erro ao fechar cobrança");
        await fetchPagamentos();
        return;
      }

      toast.success(
        `Pagamento confirmado! Próximo vencimento: ${new Date(
          novaDataVencimento + "T12:00:00"
        ).toLocaleDateString("pt-BR")}`
      );

      await fetchPagamentos();
    } catch (err) {
      console.error(err);
      toast.error("Erro inesperado");
    }
  }

  async function cancelarCobranca(cobranca: CobrancaLocadora) {
    const confirmou = window.confirm("Deseja cancelar esta cobrança?");

    if (!confirmou) return;

    try {
      const { error } = await (supabase as any)
        .from("cobrancas_locadoras")
        .update({
          status: "cancelado",
          updated_at: new Date().toISOString(),
        })
        .eq("id", cobranca.id);

      if (error) {
        console.error("Erro ao cancelar cobrança:", error);
        toast.error("Erro ao cancelar cobrança");
        return;
      }

      toast.success("Cobrança cancelada");
      await fetchPagamentos();
    } catch (error) {
      console.error(error);
      toast.error("Erro inesperado ao cancelar");
    }
  }

  async function copiarTexto(texto?: string | null) {
    if (!texto) {
      toast.error("Nada para copiar");
      return;
    }

    await navigator.clipboard.writeText(texto);
    toast.success("Copiado!");
  }

  const hoje = new Date().toISOString().split("T")[0];

  const filtered = useMemo(() => {
    const term = search.toLowerCase();

    return locadoras.filter((l) => {
      return (
        l.nome.toLowerCase().includes(term) ||
        String(l.plano || "").toLowerCase().includes(term) ||
        String(l.email || "").toLowerCase().includes(term)
      );
    });
  }, [locadoras, search]);

  const totalLocadoras = locadoras.length;

  const vencidas = locadoras.filter(
    (l) => l.data_vencimento && l.data_vencimento < hoje
  ).length;

  const bloqueadas = locadoras.filter((l) => !l.ativo).length;

  const emDia = locadoras.filter((l) => {
    if (!l.ativo) return false;
    if (!l.data_vencimento) return false;
    return l.data_vencimento >= hoje;
  }).length;

  const cobrancasPendentes = cobrancas.filter(
    (c) => c.status === "pendente"
  ).length;

  function getStatusPagamento(locadora: LocadoraPagamento) {
    if (!locadora.ativo) {
      return {
        label: "Bloqueada",
        className: "bg-destructive/20 text-destructive",
      };
    }

    if (!locadora.data_vencimento) {
      return {
        label: "Sem vencimento",
        className: "bg-muted text-muted-foreground",
      };
    }

    if (locadora.data_vencimento < hoje) {
      return {
        label: "Vencido",
        className: "bg-destructive/20 text-destructive",
      };
    }

    const diff =
      (new Date(locadora.data_vencimento + "T00:00:00").getTime() -
        new Date(hoje + "T00:00:00").getTime()) /
      (1000 * 60 * 60 * 24);

    if (diff <= 5) {
      return {
        label: "Vencendo",
        className: "bg-yellow-500/20 text-yellow-600",
      };
    }

    return {
      label: "Em dia",
      className: "bg-success/20 text-success",
    };
  }

  function getCobrancaDaLocadora(locadoraId: string) {
    return cobrancas.find(
      (c) => c.locadora_id === locadoraId && c.status === "pendente"
    );
  }

  function getStatusCobranca(cobranca?: CobrancaLocadora | null) {
    if (!cobranca) {
      return {
        label: "Sem cobrança",
        className: "bg-muted text-muted-foreground",
      };
    }

    if (cobranca.status === "pago") {
      return {
        label: "Pago",
        className: "bg-success/20 text-success",
      };
    }

    if (cobranca.status === "cancelado") {
      return {
        label: "Cancelado",
        className: "bg-muted text-muted-foreground",
      };
    }

    if (cobranca.status === "vencido") {
      return {
        label: "Vencido",
        className: "bg-destructive/20 text-destructive",
      };
    }

    return {
      label: "Pix pendente",
      className: "bg-yellow-500/20 text-yellow-600",
    };
  }

  if (checkingAccess) {
    return (
      <Layout>
        <p className="p-8 text-muted-foreground">Validando acesso...</p>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="animate-fade-in space-y-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Pagamentos</h1>
            <p className="text-muted-foreground">
              Controle mensalidades, Pix automático e liberação das locadoras
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={fetchPagamentos}
            disabled={loading}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Atualizar
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-[25px] border border-border bg-card p-5">
            <Building2 className="mb-3 h-7 w-7 text-primary" />
            <p className="text-sm text-muted-foreground">Locadoras</p>
            <p className="text-2xl font-black">{totalLocadoras}</p>
          </div>

          <div className="rounded-[25px] border border-green-500/20 bg-card p-5">
            <CheckCircle className="mb-3 h-7 w-7 text-green-500" />
            <p className="text-sm text-muted-foreground">Em dia</p>
            <p className="text-2xl font-black">{emDia}</p>
          </div>

          <div className="rounded-[25px] border border-yellow-500/20 bg-card p-5">
            <DollarSign className="mb-3 h-7 w-7 text-yellow-500" />
            <p className="text-sm text-muted-foreground">Pix pendentes</p>
            <p className="text-2xl font-black">{cobrancasPendentes}</p>
          </div>

          <div className="rounded-[25px] border border-red-500/20 bg-card p-5">
            <AlertTriangle className="mb-3 h-7 w-7 text-red-500" />
            <p className="text-sm text-muted-foreground">Vencidas</p>
            <p className="text-2xl font-black">{vencidas}</p>
          </div>

          <div className="rounded-[25px] border border-destructive/20 bg-card p-5">
            <AlertTriangle className="mb-3 h-7 w-7 text-destructive" />
            <p className="text-sm text-muted-foreground">Bloqueadas</p>
            <p className="text-2xl font-black">{bloqueadas}</p>
          </div>
        </div>

        <Input
          className="rounded-[30px]"
          placeholder="Buscar por locadora, plano ou email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="rounded-[30px] border border-border bg-card p-6">
          {loading ? (
            <p className="text-muted-foreground">Carregando...</p>
          ) : filtered.length === 0 ? (
            <p className="text-muted-foreground">
              Nenhuma locadora encontrada.
            </p>
          ) : (
            <div className="space-y-4">
              {filtered.map((l) => {
                const status = getStatusPagamento(l);
                const cobranca = getCobrancaDaLocadora(l.id);
                const statusCobranca = getStatusCobranca(cobranca);

                return (
                  <div
                    key={l.id}
                    className="rounded-[25px] border border-border bg-secondary/50 p-5"
                  >
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="space-y-2">
                        <p className="text-lg font-bold">{l.nome}</p>

                        <p className="text-sm text-muted-foreground">
                          Plano: {l.plano || "—"} • Vencimento:{" "}
                          {l.data_vencimento || "—"}
                        </p>

                        <p className="text-sm text-muted-foreground">
                          Email: {l.email || "—"} • Telefone:{" "}
                          {l.telefone || "—"}
                        </p>

                        <div className="flex flex-wrap gap-2">
                          <Badge className={status.className}>
                            {status.label}
                          </Badge>

                          <Badge className={statusCobranca.className}>
                            {statusCobranca.label}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          onClick={() => abrirModalCobranca(l)}
                          disabled={creatingPayment}
                        >
                          <DollarSign className="mr-2 h-4 w-4" />
                          Gerar Pix
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => marcarComoPago(l)}
                          disabled={creatingPayment}
                        >
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Baixa manual
                        </Button>
                      </div>
                    </div>

                    {cobranca && (
                      <div className="mt-4 rounded-2xl border border-border bg-background p-4">
                        <div className="grid gap-4 lg:grid-cols-[160px_1fr]">
                          <div className="flex items-center justify-center rounded-2xl bg-white p-3">
                            {cobranca.qr_code_base64 ? (
                              <img
                                src={`data:image/png;base64,${cobranca.qr_code_base64}`}
                                alt="QR Code Pix"
                                className="h-32 w-32"
                              />
                            ) : (
                              <div className="flex h-32 w-32 items-center justify-center text-center text-xs text-muted-foreground">
                                Sem QR Code
                              </div>
                            )}
                          </div>

                          <div className="space-y-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge className={statusCobranca.className}>
                                {statusCobranca.label}
                              </Badge>

                              <p className="text-sm text-muted-foreground">
                                Valor: R$ {Number(cobranca.valor).toFixed(2)} •
                                Venc.: {cobranca.data_vencimento || "—"}
                              </p>
                            </div>

                            {cobranca.qr_code && (
                              <div className="rounded-xl border border-border bg-secondary p-3">
                                <p className="mb-2 text-xs font-semibold">
                                  Pix copia e cola
                                </p>

                                <p className="line-clamp-2 break-all text-xs text-muted-foreground">
                                  {cobranca.qr_code}
                                </p>
                              </div>
                            )}

                            <div className="flex flex-wrap gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => copiarTexto(cobranca.qr_code)}
                              >
                                <Copy className="mr-2 h-4 w-4" />
                                Copiar Pix
                              </Button>

                              {cobranca.link_pagamento && (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    window.open(
                                      cobranca.link_pagamento || "",
                                      "_blank"
                                    )
                                  }
                                >
                                  <ExternalLink className="mr-2 h-4 w-4" />
                                  Abrir pagamento
                                </Button>
                              )}

                              <Button
                                type="button"
                                size="sm"
                                variant="destructive"
                                onClick={() => cancelarCobranca(cobranca)}
                              >
                                <X className="mr-2 h-4 w-4" />
                                Cancelar
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {openModal && locadoraSelecionada && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-lg rounded-[30px] border border-border bg-card p-6 shadow-2xl">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">Gerar cobrança Pix</h2>
                  <p className="text-sm text-muted-foreground">
                    {locadoraSelecionada.nome}
                  </p>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={fecharModal}
                  disabled={creatingPayment}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Valor</label>
                  <Input
                    className="mt-2 rounded-[30px]"
                    type="number"
                    step="0.01"
                    value={valor}
                    onChange={(e) => setValor(e.target.value)}
                    disabled={creatingPayment}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Descrição</label>
                  <Input
                    className="mt-2 rounded-[30px]"
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    disabled={creatingPayment}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">
                    Vencimento da cobrança
                  </label>
                  <Input
                    className="mt-2 rounded-[30px]"
                    type="date"
                    value={dataVencimento}
                    onChange={(e) => setDataVencimento(e.target.value)}
                    disabled={creatingPayment}
                  />
                </div>

                <div className="rounded-2xl border border-border bg-secondary p-4 text-sm text-muted-foreground">
                  Após o pagamento ser aprovado pelo Mercado Pago, o webhook
                  libera automaticamente a locadora e define o vencimento para o
                  dia 20 do próximo mês.
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={fecharModal}
                    disabled={creatingPayment}
                  >
                    Cancelar
                  </Button>

                  <Button
                    type="button"
                    onClick={gerarCobrancaPix}
                    disabled={creatingPayment || !locadoraSelecionada}
                  >
                    {creatingPayment ? "Gerando..." : "Gerar Pix"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}