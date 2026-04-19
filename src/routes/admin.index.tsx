import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, DollarSign, Megaphone, Rocket, TrendingUp, Sparkles, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const [stats, setStats] = useState({
    users: 0,
    activeUsers: 0,
    blockedUsers: 0,
    noCreditUsers: 0,
    newToday: 0,
    revenue: 0,
    todayRevenue: 0,
    ads: 0,
    boosted: 0,
    pendingPayments: 0,
  });
  const [alerts, setAlerts] = useState<string[]>([]);

  const load = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [profiles, payments, todayPayments, ads, pending, newUsers] = await Promise.all([
      supabase.from("profiles").select("status,credits", { count: "exact" }),
      supabase.from("payments").select("amount_mt").eq("status", "approved"),
      supabase.from("payments").select("amount_mt").eq("status", "approved").gte("approved_at", today.toISOString()),
      supabase.from("ads").select("is_boosted", { count: "exact" }),
      supabase.from("payments").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", today.toISOString()),
    ]);

    setStats({
      users: profiles.count ?? 0,
      activeUsers: profiles.data?.filter((p) => p.status === "active").length ?? 0,
      blockedUsers: profiles.data?.filter((p) => p.status === "blocked").length ?? 0,
      noCreditUsers: profiles.data?.filter((p) => p.credits === 0).length ?? 0,
      newToday: newUsers.count ?? 0,
      revenue: payments.data?.reduce((s, p) => s + p.amount_mt, 0) ?? 0,
      todayRevenue: todayPayments.data?.reduce((s, p) => s + p.amount_mt, 0) ?? 0,
      ads: ads.count ?? 0,
      boosted: ads.data?.filter((a) => a.is_boosted).length ?? 0,
      pendingPayments: pending.count ?? 0,
    });

    const newAlerts: string[] = [];
    if ((pending.count ?? 0) > 0) newAlerts.push(`💳 ${pending.count} pagamento(s) pendente(s) de aprovação`);
    const noCred = profiles.data?.filter((p) => p.credits === 0).length ?? 0;
    if (noCred > 0) newAlerts.push(`⚠️ ${noCred} usuário(s) ficaram sem créditos`);
    setAlerts(newAlerts);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("admin-dashboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "payments" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "ads" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold">Painel executivo</h1>
        <p className="text-muted-foreground text-sm mt-1">Visão geral em tempo real · Zenix Boost</p>
      </div>

      {alerts.length > 0 && (
        <div className="rounded-2xl border border-warning/40 bg-warning/10 p-4 space-y-1">
          <div className="flex items-center gap-2 text-warning font-semibold text-sm">
            <AlertCircle className="size-4" /> Alertas automáticos
          </div>
          {alerts.map((a, i) => <p key={i} className="text-sm">{a}</p>)}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat icon={TrendingUp} label="Receita total" value={`${stats.revenue} MT`} highlight />
        <Stat icon={DollarSign} label="Hoje" value={`${stats.todayRevenue} MT`} />
        <Stat icon={Users} label="Usuários" value={stats.users} hint={`+${stats.newToday} hoje`} />
        <Stat icon={Megaphone} label="Anúncios" value={stats.ads} hint={`${stats.boosted} em boost`} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-border bg-gradient-card p-5">
          <h3 className="font-display font-semibold flex items-center gap-2">
            <Sparkles className="size-4 text-neon" /> Status dos usuários
          </h3>
          <div className="mt-4 space-y-2">
            <Row label="🟢 Ativos" value={stats.activeUsers} />
            <Row label="📉 Sem créditos" value={stats.noCreditUsers} />
            <Row label="🔴 Bloqueados" value={stats.blockedUsers} />
            <Row label="💳 Pagamentos pendentes" value={stats.pendingPayments} />
          </div>
        </div>
        <div className="rounded-2xl border border-neon bg-gradient-card p-5 glow-neon-sm">
          <h3 className="font-display font-semibold flex items-center gap-2">
            <Rocket className="size-4 text-neon" /> Boost ativo
          </h3>
          <p className="text-3xl font-display font-bold mt-3 text-neon">{stats.boosted}</p>
          <p className="text-sm text-muted-foreground">anúncios sendo impulsionados agora</p>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, hint, highlight }: any) {
  return (
    <div className={`rounded-2xl p-4 border ${highlight ? "border-neon glow-neon-sm" : "border-border"} bg-gradient-card`}>
      <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wider">
        <Icon className={`size-3.5 ${highlight ? "text-neon" : ""}`} />
        {label}
      </div>
      <div className={`mt-2 font-display font-bold text-2xl ${highlight ? "text-neon" : ""}`}>{value}</div>
      {hint && <div className="text-xs text-muted-foreground mt-0.5">{hint}</div>}
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between text-sm py-2 border-b border-border last:border-0">
      <span>{label}</span>
      <span className="font-display font-bold">{value}</span>
    </div>
  );
}
