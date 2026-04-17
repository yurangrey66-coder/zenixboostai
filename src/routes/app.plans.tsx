import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { buildWhatsAppUrl } from "@/lib/constants";
import { Crown, MessageCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/plans")({
  component: PlansPage,
});

type Plan = {
  id: "daily" | "weekly" | "monthly";
  name: string;
  price_mt: number;
  credits: number;
  duration_days: number;
  allowed_styles: string[];
};

function PlansPage() {
  const { user, profile, refreshProfile } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [requesting, setRequesting] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("plans")
      .select("*")
      .eq("active", true)
      .order("price_mt")
      .then(({ data }) => setPlans((data as Plan[]) ?? []));
  }, []);

  const requestPlan = async (plan: Plan) => {
    if (!user) return;
    setRequesting(plan.id);
    const { error } = await supabase.from("payments").insert({
      user_id: user.id,
      plan_id: plan.id,
      amount_mt: plan.price_mt,
      method: "whatsapp",
      notes: "Solicitação via app",
    });
    setRequesting(null);
    if (error) return toast.error("Erro", { description: error.message });

    toast.success("Solicitação registrada!", { description: "Confirme o pagamento via WhatsApp." });
    const msg = `Olá ZENIX BOOST, quero o plano ${plan.name} (${plan.price_mt} MT). Email: ${user.email}`;
    window.open(buildWhatsAppUrl(msg), "_blank");
    await refreshProfile();
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold">Planos</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Plano atual: <span className="text-neon font-semibold">
            {profile?.current_plan ? plans.find((p) => p.id === profile.current_plan)?.name ?? "—" : "Nenhum"}
          </span>
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-5">
        {plans.map((p) => {
          const featured = p.id === "weekly";
          return (
            <div
              key={p.id}
              className={`relative rounded-2xl p-6 border ${
                featured ? "border-neon bg-gradient-card glow-neon-sm" : "border-border bg-card"
              }`}
            >
              {featured && (
                <div className="absolute -top-3 left-6 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gradient-neon text-neon-foreground">
                  POPULAR
                </div>
              )}
              <div className="flex items-center gap-2">
                {p.id === "monthly" && <Crown className="size-4 text-neon" />}
                <h3 className="font-display font-bold text-xl">{p.name}</h3>
              </div>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-display font-bold">{p.price_mt}</span>
                <span className="text-muted-foreground">MT</span>
              </div>
              <div className="text-sm text-muted-foreground">
                {p.credits} gerações · {p.duration_days} {p.duration_days === 1 ? "dia" : "dias"}
              </div>

              <ul className="mt-5 space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-neon" /> {p.allowed_styles.length} estilos visuais
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-neon" /> Boost incluído
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-neon" /> Suporte WhatsApp
                </li>
              </ul>

              <Button
                onClick={() => requestPlan(p)}
                disabled={requesting === p.id}
                className="w-full mt-6 bg-gradient-neon text-neon-foreground"
              >
                <MessageCircle className="size-4 mr-2" />
                {requesting === p.id ? "Enviando..." : "Solicitar via WhatsApp"}
              </Button>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-border bg-gradient-card p-5 text-sm">
        <p className="font-semibold mb-1">Como funciona o pagamento?</p>
        <ol className="list-decimal list-inside text-muted-foreground space-y-1">
          <li>Clique em "Solicitar via WhatsApp" do plano desejado.</li>
          <li>Faça o pagamento via M-Pesa ou e-Mola e envie o comprovativo no WhatsApp.</li>
          <li>Após confirmação pelo administrador, seus créditos são liberados automaticamente.</li>
        </ol>
      </div>
    </div>
  );
}
