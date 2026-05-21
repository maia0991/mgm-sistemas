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
} from "lucide-react";

const logoUrl =
  "https://i.postimg.cc/pTkknv67/Gemini-Generated-Image-lpkm7ilpkm7ilpkm-(1).png";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <img
              src={logoUrl}
              alt="MGM Sistemas"
              className="h-14 w-14 rounded-full object-cover"
            />

            <div>
              <h1 className="text-xl font-black">MGM Sistemas</h1>
              <p className="text-xs text-muted-foreground">
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
              className="hidden rounded-[30px] border border-border px-5 py-2 text-sm font-semibold md:inline-flex"
            >
              Falar no WhatsApp
            </a>

            <Link
              to="/login"
              className="rounded-[30px] bg-primary px-5 py-2 text-sm font-semibold text-white"
            >
              Login de Usuário
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <div className="mb-5 inline-flex rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">
              Sistema 100% online para locadoras
            </div>

            <h2 className="text-4xl font-black leading-tight md:text-6xl">
              Controle sua locadora de andaimes e equipamentos em um só lugar
            </h2>

            <p className="mt-6 max-w-xl text-lg text-muted-foreground">
              Organize contratos, clientes, produtos, financeiro, contas a pagar,
              contas a receber, devoluções, estoque, comprovantes e relatórios
              com rapidez e segurança.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-[30px] bg-primary px-7 py-4 font-bold text-white"
              >
                Acessar Sistema
                <ArrowRight className="h-5 w-5" />
              </Link>

              <a
                href="https://wa.me/5599984132226"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-[30px] border border-border px-7 py-4 font-bold"
              >
                <MessageCircle className="h-5 w-5" />
                Chamar no WhatsApp
              </a>
            </div>

            <div className="mt-8 grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
              <p className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-primary" />
                Acesso pelo celular e computador
              </p>
              <p className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-primary" />
                Contratos automáticos
              </p>
              <p className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-primary" />
                Controle financeiro completo
              </p>
              <p className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-primary" />
                Ideal para locadoras de equipamentos
              </p>
            </div>
          </div>

          <div className="rounded-[40px] border border-border bg-card p-6 shadow-2xl">
            <div className="rounded-[30px] bg-secondary p-5">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Painel</p>
                  <h3 className="text-2xl font-black">Visão da Locadora</h3>
                </div>

                <img
                  src={logoUrl}
                  alt="MGM Sistemas"
                  className="h-12 w-12 rounded-full object-cover"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl bg-background p-5">
                  <DollarSign className="mb-3 h-8 w-8 text-primary" />
                  <p className="text-sm text-muted-foreground">Financeiro</p>
                  <p className="text-2xl font-black">Completo</p>
                </div>

                <div className="rounded-3xl bg-background p-5">
                  <Package className="mb-3 h-8 w-8 text-primary" />
                  <p className="text-sm text-muted-foreground">Estoque</p>
                  <p className="text-2xl font-black">Atualizado</p>
                </div>

                <div className="rounded-3xl bg-background p-5">
                  <FileText className="mb-3 h-8 w-8 text-primary" />
                  <p className="text-sm text-muted-foreground">Contratos</p>
                  <p className="text-2xl font-black">Automáticos</p>
                </div>

                <div className="rounded-3xl bg-background p-5">
                  <BarChart3 className="mb-3 h-8 w-8 text-primary" />
                  <p className="text-sm text-muted-foreground">Relatórios</p>
                  <p className="text-2xl font-black">Práticos</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-card/40 py-16">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-10 max-w-2xl">
            <p className="font-bold text-primary">Recursos do sistema</p>
            <h2 className="mt-2 text-3xl font-black md:text-4xl">
              Tudo que sua locadora precisa para trabalhar com mais controle
            </h2>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            <Feature
              icon={FileText}
              title="Contratos e comprovantes"
              text="Gere contratos profissionais e comprovantes simples com dados do cliente, itens, valores e datas."
            />
            <Feature
              icon={Wallet}
              title="Financeiro completo"
              text="Controle contas a pagar, contas a receber, sangrias, histórico de locações e saldo em caixa."
            />
            <Feature
              icon={Package}
              title="Controle de equipamentos"
              text="Veja produtos cadastrados, estoque disponível e equipamentos alugados com mais segurança."
            />
            <Feature
              icon={CalendarCheck}
              title="Dias não cobrados"
              text="Cadastre feriados, domingos ou datas especiais que não devem entrar na cobrança."
            />
            <Feature
              icon={ClipboardCheck}
              title="Fotos antes e depois da locação"
              text="Anexe fotos dos equipamentos no momento da entrega ou depois, pela edição da locação."
            />
            <Feature
              icon={BarChart3}
              title="Relatórios"
              text="Acompanhe informações importantes para tomada de decisão e crescimento da empresa."
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid gap-10 lg:grid-cols-2">
          <div className="rounded-[40px] border border-border bg-card p-8">
            <Building2 className="mb-5 h-12 w-12 text-primary" />
            <h2 className="text-3xl font-black">
              Feito para Materiais de construção e locadoras 
            </h2>
            <p className="mt-4 text-muted-foreground">
              O MGM Sistemas foi pensado para simplificar o dia a dia de quem
              trabalha com aluguel de equipamentos, com telas simples,
              organização por módulos e acesso na nuvem.
            </p>
          </div>

          <div className="rounded-[40px] border border-border bg-primary p-8 text-white">
            <Smartphone className="mb-5 h-12 w-12" />
            <h2 className="text-3xl font-black">
              Funciona no celular, tablet e computador
            </h2>
            <p className="mt-4 text-white/80">
              Acesse de qualquer lugar, sem precisar instalar servidor. Ideal
              para atendimento rápido, conferência de locações e controle diário.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-card py-16">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <Shield className="mx-auto mb-5 h-12 w-12 text-primary" />
          <h2 className="text-3xl font-black md:text-4xl">
            Pronto para profissionalizar sua locadora?
          </h2>
          <p className="mt-4 text-muted-foreground">
            Entre em contato e veja como o MGM Sistemas pode ajudar sua empresa
            a controlar locações com mais organização e segurança.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              to="/login"
              className="rounded-[30px] bg-primary px-7 py-4 font-bold text-white"
            >
              Entrar no Sistema
            </Link>

            <a
              href="https://wa.me/5599984132226"
              target="_blank"
              rel="noreferrer"
              className="rounded-[30px] border border-border px-7 py-4 font-bold"
            >
              Falar no WhatsApp
            </a>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 text-center md:flex-row md:text-left">
          <div className="flex items-center gap-3">
            <img
              src={logoUrl}
              alt="MGM Sistemas"
              className="h-10 w-10 rounded-full object-cover"
            />
            <div>
              <p className="font-black">MGM Sistemas</p>
              <p className="text-sm text-muted-foreground">
                Tecnologia para locadoras modernas
              </p>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
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
    <div className="rounded-[30px] border border-border bg-background p-6 transition hover:-translate-y-1 hover:shadow-xl">
      <Icon className="mb-4 h-10 w-10 text-primary" />
      <h3 className="text-lg font-black">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}