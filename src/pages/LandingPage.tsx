import { Link } from "react-router-dom";
import ThemeToggle from "@/components/ThemeToggle";
import {
  Building2,
  FileText,
  DollarSign,
  BarChart3,
  Shield,
  Smartphone,
  Package,
  CalendarCheck,
  CheckCircle,
  ArrowRight,
  MessageCircle,
  ClipboardCheck,
  Wallet,
  Zap,
} from "lucide-react";

const logoUrl =
  "https://i.postimg.cc/pTkknv67/Gemini-Generated-Image-lpkm7ilpkm7ilpkm-(1).png";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary selection:text-white relative overflow-hidden transition-colors duration-300">
      {/* EFEITO DE LUZ NEON DE FUNDO (GLOW) */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] bg-gradient-to-b from-primary/15 via-primary/5 to-transparent blur-3xl pointer-events-none" />

      {/* HEADER / NAVBAR */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <img
              src={logoUrl}
              alt="MGM Sistemas"
              className="h-12 w-12 rounded-full object-cover border border-border shadow-md"
            />

            <div>
              <h1 className="text-lg font-black tracking-wider text-foreground leading-tight">
                MGM <span className="text-primary">Sistemas</span>
              </h1>
              <p className="text-[11px] text-muted-foreground font-medium">
                Gestão para locadoras e Matcon
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />

            <a
              href="https://wa.me/5599984132226"
              target="_blank"
              rel="noreferrer"
              className="hidden rounded-full border border-border bg-card/60 px-5 py-2 text-xs font-semibold text-foreground transition hover:bg-accent backdrop-blur-sm md:inline-flex items-center gap-2"
            >
              <MessageCircle className="h-4 w-4 text-emerald-500" />
              Falar no WhatsApp
            </a>

            <Link
              to="/login"
              className="rounded-full bg-primary px-6 py-2.5 text-xs font-bold text-primary-foreground shadow-lg shadow-primary/20 transition hover:bg-primary/90"
            >
              Fazer Login
            </Link>
          </div>
        </div>
      </header>

      {/* HERO SECTION CENTRALIZADO */}
      <section className="relative z-10 mx-auto max-w-5xl px-6 pt-12 pb-20 text-center">
        {/* BADGE SUPERIOR */}
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-primary backdrop-blur-sm">
          <Zap className="h-3.5 w-3.5" />
          Sistema para locadora grátis por 7 dias, sem cartão
        </div>

        {/* TÍTULO PRINCIPAL DE ALTO IMPACTO */}
        <h2 className="text-4xl font-black tracking-tight text-foreground sm:text-5xl md:text-6xl md:leading-[1.12]">
          Controle sua locadora de andaimes e equipamentos{" "}
          <span className="bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-500 dark:from-blue-400 dark:via-cyan-400 dark:to-blue-500 bg-clip-text text-transparent">
            em um só lugar
          </span>
        </h2>

        {/* SUBTÍTULO COM SUAS REGRAS DE PLANO E TESTE */}
        <p className="mx-auto mt-6 max-w-3xl text-base font-normal leading-relaxed text-muted-foreground sm:text-lg">
          Cadastre frota, locatários, contratos e financeiro e teste a operação de verdade. 
          depois do teste, assine por apenas <strong className="text-foreground font-bold">R$ 49,90 por mês</strong>.
        </p>

        {/* BOTÕES DE AÇÃO */}
        <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            to="/login"
            className="group flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-8 text-base font-black text-primary-foreground shadow-xl shadow-primary/25 transition hover:bg-primary/90 sm:w-auto"
          >
            Criar conta grátis →
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Link>

          <a
            href="https://wa.me/5599984132226"
            target="_blank"
            rel="noreferrer"
            className="flex h-13 w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card/60 px-8 text-base font-bold text-foreground backdrop-blur-sm transition hover:bg-accent sm:w-auto"
          >
            <MessageCircle className="h-5 w-5 text-emerald-500" />
            Chamar no WhatsApp
          </a>
        </div>

        {/* REFORÇO DE GARANTIA / TESTE */}
        <p className="mt-4 text-xs font-semibold text-muted-foreground">
          7 dias grátis no sistema completo • Sem cartão de crédito • Apenas R$ 49,90/mês
        </p>

        {/* CHECKLISTS RÁPIDOS */}
        <div className="mx-auto mt-10 grid max-w-3xl grid-cols-2 gap-3 text-xs font-medium text-muted-foreground sm:grid-cols-4">
          <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card/40 p-2.5">
            <CheckCircle className="h-4 w-4 shrink-0 text-primary" />
            <span>Celular e Computador</span>
          </div>
          <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card/40 p-2.5">
            <CheckCircle className="h-4 w-4 shrink-0 text-primary" />
            <span>Contratos Automáticos</span>
          </div>
          <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card/40 p-2.5">
            <CheckCircle className="h-4 w-4 shrink-0 text-primary" />
            <span>Financeiro Completo</span>
          </div>
          <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card/40 p-2.5">
            <CheckCircle className="h-4 w-4 shrink-0 text-primary" />
            <span>Ideal para Equipamentos</span>
          </div>
        </div>

        {/* MOCKUP DO PAINEL DO SISTEMA */}
        <div className="relative mx-auto mt-14 max-w-5xl rounded-2xl border border-border bg-card p-2 shadow-2xl backdrop-blur-xl">
          <div className="overflow-hidden rounded-xl border border-border bg-secondary/30">
            {/* Topbar Simulada do Navegador */}
            <div className="flex h-10 items-center justify-between border-b border-border bg-muted px-4">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-rose-500/80" />
                <div className="h-3 w-3 rounded-full bg-amber-500/80" />
                <div className="h-3 w-3 rounded-full bg-emerald-500/80" />
                <span className="ml-2 hidden font-mono text-[11px] text-muted-foreground sm:inline">
                  app.tecmgm.com.br
                </span>
              </div>
              <div className="flex items-center gap-2">
                <img
                  src={logoUrl}
                  alt="MGM"
                  className="h-5 w-5 rounded-full object-cover"
                />
                <span className="rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                  Painel da Locadora
                </span>
              </div>
            </div>

            {/* Quadro de Recursos da Interface */}
            <div className="p-6 text-left md:p-8">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-border bg-card p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs font-bold uppercase text-muted-foreground">
                      Financeiro
                    </span>
                    <DollarSign className="h-5 w-5 text-primary" />
                  </div>
                  <p className="text-2xl font-black text-foreground">Completo</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">Entradas, saídas e saldos</p>
                </div>

                <div className="rounded-2xl border border-border bg-card p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs font-bold uppercase text-muted-foreground">
                      Estoque
                    </span>
                    <Package className="h-5 w-5 text-cyan-500" />
                  </div>
                  <p className="text-2xl font-black text-foreground">Atualizado</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">Disponibilidade em tempo real</p>
                </div>

                <div className="rounded-2xl border border-border bg-card p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs font-bold uppercase text-muted-foreground">
                      Contratos
                    </span>
                    <FileText className="h-5 w-5 text-emerald-500" />
                  </div>
                  <p className="text-2xl font-black text-foreground">Automáticos</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">Impressão A4 e Térmica</p>
                </div>

                <div className="rounded-2xl border border-border bg-card p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs font-bold uppercase text-muted-foreground">
                      Relatórios
                    </span>
                    <BarChart3 className="h-5 w-5 text-indigo-500" />
                  </div>
                  <p className="text-2xl font-black text-foreground">Práticos</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">Decisões rápidas de gestão</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SEÇÃO DE RECURSOS DO SISTEMA */}
      <section className="relative z-10 border-y border-border bg-card/40 py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-14 max-w-2xl">
            <span className="text-xs font-bold uppercase tracking-widest text-primary">
              Recursos do sistema
            </span>
            <h2 className="mt-2 text-3xl font-black text-foreground md:text-4xl">
              Tudo que sua locadora precisa para trabalhar com mais controle
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Feature
              icon={FileText}
              title="Contratos e comprovantes"
              text="Gere contratos profissionais e comprovantes simples com dados do cliente, itens, valores e datas em formato A4 ou Térmico (80mm)."
            />
            <Feature
              icon={Wallet}
              title="Financeiro completo"
              text="Controle contas a pagar, contas a receber, sangrias, histórico de locações e saldo em caixa em tempo real."
            />
            <Feature
              icon={Package}
              title="Controle de equipamentos"
              text="Veja produtos cadastrados, estoque disponível e equipamentos alugados com mais segurança e precisão."
            />
            <Feature
              icon={CalendarCheck}
              title="Dias não cobrados"
              text="Cadastre feriados, domingos ou datas especiais que não devem entrar no cálculo da cobrança das diárias."
            />
            <Feature
              icon={ClipboardCheck}
              title="Fotos antes e depois da locação"
              text="Anexe fotos dos equipamentos no momento da entrega ou devolução pela edição do contrato de locação."
            />
            <Feature
              icon={BarChart3}
              title="Relatórios de gestão"
              text="Acompanhe métricas financeiras e de frota fundamentais para a tomada de decisão e crescimento da sua empresa."
            />
          </div>
        </div>
      </section>

      {/* SEÇÃO DIFERENCIAIS */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 py-20">
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="rounded-3xl border border-border bg-card p-8 md:p-10">
            <Building2 className="mb-5 h-12 w-12 text-primary" />
            <h2 className="text-2xl font-black text-foreground md:text-3xl">
              Feito para Materiais de Construção e Locadoras
            </h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              O MGM Sistemas foi pensado para simplificar o dia a dia de quem
              trabalha com aluguel de equipamentos, com telas simples,
              organização por módulos e acesso instantâneo na nuvem.
            </p>
          </div>

          <div className="rounded-3xl border border-primary/20 bg-primary text-primary-foreground p-8 md:p-10">
            <Smartphone className="mb-5 h-12 w-12" />
            <h2 className="text-2xl font-black md:text-3xl">
              Funciona no celular, tablet e computador
            </h2>
            <p className="mt-4 opacity-90 leading-relaxed">
              Acesse de qualquer lugar, sem precisar instalar servidor. Ideal
              para atendimento rápido de balcão, conferência de locações e controle diário.
            </p>
          </div>
        </div>
      </section>

      {/* CALL TO ACTION FINAL */}
      <section className="relative z-10 border-t border-border bg-card/30 py-20">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <Shield className="mx-auto mb-5 h-12 w-12 text-primary" />
          <h2 className="text-3xl font-black text-foreground md:text-4xl">
            Pronto para testar por 7 dias grátis?
          </h2>
          <p className="mt-4 text-muted-foreground">
            Aproveite 7 dias para usar todas as funcionalidades sem pagar nada. Depois, apenas R$ 49,90 por mês.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              to="/login"
              className="rounded-full bg-primary px-8 py-4 font-bold text-primary-foreground shadow-lg shadow-primary/20 transition hover:bg-primary/90"
            >
              Iniciar Teste Grátis
            </Link>

            <a
              href="https://wa.me/5599984132226"
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-border bg-card px-8 py-4 font-bold text-foreground transition hover:bg-accent"
            >
              Falar no WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-border py-8 text-muted-foreground">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 text-center md:flex-row md:text-left">
          <div className="flex items-center gap-3">
            <img
              src={logoUrl}
              alt="MGM Sistemas"
              className="h-10 w-10 rounded-full object-cover border border-border"
            />
            <div>
              <p className="font-black text-foreground">MGM Sistemas</p>
              <p className="text-xs text-muted-foreground">
                Tecnologia para locadoras modernas
              </p>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} MGM Sistemas. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}

function Feature({
  icon: Icon,
  title,
  text,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-3xl border border-border bg-card p-6 transition duration-300 hover:-translate-y-1 hover:shadow-xl">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="text-lg font-bold text-foreground">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
    </div>
  );
}