import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { StatusBanner } from "@/components/StatusBanner";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Megaphone, TrendingUp, Eye, Plus, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/app/")({
  component: Dashboard,
});

function Dashboard() {
  const { profile, user } = useAuth();
  const [stats, setStats] = useState({ ads: 0, views: 0, boosted: 0 });

  useEffect(() => {
    if (!user) return;
    supabase
      .from("ads")
      .select("id, views, is_boosted")
      .eq("user_id", user.id)
      .then(({ data }) => {
        if (!data) return;
        setStats({
          ads: data.length,
          views: data.reduce((s, a) => s + (a.views ?? 0), 0),
          boosted: data.filter((a) => a.is_boosted).length,
        });
      });
  }, [user]);

  const planLabel = {
    daily: "Diário",
    weekly: "Semanal",
    monthly: "Mensal",
  }[profile?.current_plan ?? ""] ?? "Sem plano";

  const expiresIn = profile?.plan_expires_at
    ? Math.max(0, Math.ceil((new Date(profile.plan_expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold">
          Olá, {profile?.full_name?.split(" ")[0] ?? "criador"} 👋
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Bem-vindo ao seu painel Zenix Boost.</p>
      </div>

      <StatusBanner />

      {/* Quick stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Sparkles} label="Saldo" value={profile?.credits ?? 0} suffix="créditos" highlight />
        <StatCard icon={TrendingUp} label="Plano" value={planLabel} suffix={expiresIn ? `${expiresIn}d restantes` : ""} />
        <StatCard icon={Megaphone} label="Anúncios" value={stats.ads} />
        <StatCard icon={Eye} label="Visualizações" value={stats.views} />
      </div>

      {/* CTA cards */}
      <div className="grid md:grid-cols-2 gap-4">
        <Link
          to="/app/create"
          className="rounded-2xl border border-neon bg-gradient-card p-6 glow-neon-sm hover:opacity-95 transition"
        >
          <div className="size-12 rounded-xl bg-gradient-neon grid place-items-center mb-4">
            <Plus className="size-6 text-neon-foreground" strokeWidth={2.5} />
          </div>
          <h3 className="font-display font-bold text-xl">Criar novo anúncio</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Gere um anúncio visual com IA em segundos.
          </p>
        </Link>

        <Link
          to="/app/plans"
          className="rounded-2xl border border-border bg-gradient-card p-6 hover:border-neon transition"
        >
          <div className="size-12 rounded-xl bg-accent text-neon grid place-items-center mb-4">
            <Rocket className="size-6" />
          </div>
          <h3 className="font-display font-bold text-xl">Atualizar plano</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Adquira mais créditos e desbloqueie estilos premium.
          </p>
        </Link>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon, label, value, suffix, highlight,
}: { icon: any; label: string; value: number | string; suffix?: string; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl p-4 border ${highlight ? "border-neon glow-neon-sm" : "border-border"} bg-gradient-card`}>
      <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider">
        <Icon className={`size-3.5 ${highlight ? "text-neon" : ""}`} />
        {label}
      </div>
      <div className={`mt-2 font-display font-bold text-2xl ${highlight ? "text-neon" : ""}`}>{value}</div>
      {suffix && <div className="text-xs text-muted-foreground mt-0.5">{suffix}</div>}
    </div>
  );
}
