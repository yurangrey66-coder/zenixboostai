import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Zap, Sparkles, Rocket, ShieldCheck, Crown, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildWhatsAppUrl } from "@/lib/constants";
import zenixLogo from "@/assets/zenix-logo.png";

export const Route = createFileRoute("/")({
  component: Landing,
});

const plans = [
  { name: "Diário", price: 15, credits: 3, days: 1, perks: ["Estilos básicos", "3 gerações", "24h de acesso"] },
  { name: "Semanal", price: 45, credits: 15, days: 7, perks: ["Estilos 3D", "15 gerações", "7 dias de acesso"], featured: true },
  { name: "Mensal", price: 95, credits: 60, days: 30, perks: ["Todos os estilos (Luxo, 4K)", "60 gerações", "30 dias"] },
];

function Landing() {
  return (
    <div className="min-h-screen">
      {/* Nav */}
      <header className="sticky top-0 z-30 backdrop-blur-md bg-background/70 border-b border-border">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={zenixLogo} alt="ZENIX BOOST" className="size-10 rounded-xl object-cover glow-neon-sm" />
            <span className="font-display font-bold text-lg">ZENIX <span className="text-neon">BOOST</span></span>
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm"><Link to="/auth">Entrar</Link></Button>
            <Button asChild size="sm" className="bg-gradient-neon text-neon-foreground hover:opacity-90">
              <Link to="/auth">Criar conta</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: "var(--gradient-hero)" }} />
        <div className="relative max-w-5xl mx-auto px-4 pt-20 pb-24 md:pt-32 md:pb-32 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-neon bg-accent text-xs font-medium mb-6">
            <span className="size-1.5 rounded-full bg-neon animate-pulse" />
            Marketing digital com IA · Moçambique
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-display font-bold tracking-tight">
            Anúncios <span className="text-gradient-neon">inteligentes</span><br />
            que vendem por você
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
            Crie campanhas visuais geradas por inteligência artificial em segundos.
            Estilos profissionais — do clássico ao 4K ultra realista.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild size="lg" className="bg-gradient-neon text-neon-foreground hover:opacity-90 glow-neon-sm">
              <Link to="/auth"><Rocket className="size-4 mr-2" /> Começar agora</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href={buildWhatsAppUrl()} target="_blank" rel="noopener">
                <MessageCircle className="size-4 mr-2" /> Falar no WhatsApp
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 py-20 grid md:grid-cols-3 gap-6">
        {[
          { icon: Sparkles, title: "IA generativa", desc: "7 estilos visuais profissionais. Do clássico ao 4K realista." },
          { icon: Rocket, title: "Boost de visibilidade", desc: "Aumente o alcance dos seus anúncios em poucos cliques." },
          { icon: ShieldCheck, title: "Pagamento M-Pesa / e-Mola", desc: "Confirmação rápida via WhatsApp. Sem complicação." },
        ].map((f) => (
          <div key={f.title} className="rounded-2xl bg-gradient-card border border-border p-6">
            <div className="size-11 rounded-xl bg-accent text-neon grid place-items-center mb-4">
              <f.icon className="size-5" />
            </div>
            <h3 className="font-display font-semibold text-lg">{f.title}</h3>
            <p className="text-sm text-muted-foreground mt-1">{f.desc}</p>
          </div>
        ))}
      </section>

      {/* Plans */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-display font-bold">Planos simples, resultados reais</h2>
          <p className="text-muted-foreground mt-2">Escolha o plano que cabe no seu bolso.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {plans.map((p) => (
            <div
              key={p.name}
              className={`relative rounded-2xl p-6 border ${
                p.featured ? "border-neon bg-gradient-card glow-neon-sm" : "border-border bg-card"
              }`}
            >
              {p.featured && (
                <div className="absolute -top-3 left-6 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider bg-gradient-neon text-neon-foreground">
                  POPULAR
                </div>
              )}
              <div className="flex items-center gap-2">
                {p.name === "Mensal" && <Crown className="size-4 text-neon" />}
                <h3 className="font-display font-bold text-xl">{p.name}</h3>
              </div>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-display font-bold">{p.price}</span>
                <span className="text-muted-foreground">MT</span>
              </div>
              <div className="text-sm text-muted-foreground">{p.credits} gerações · {p.days}d</div>
              <ul className="mt-5 space-y-2 text-sm">
                {p.perks.map((perk) => (
                  <li key={perk} className="flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-neon" /> {perk}
                  </li>
                ))}
              </ul>
              <Button asChild className="w-full mt-6 bg-gradient-neon text-neon-foreground">
                <Link to="/auth">Assinar</Link>
              </Button>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Zenix Boost · Moçambique
      </footer>
    </div>
  );
}
