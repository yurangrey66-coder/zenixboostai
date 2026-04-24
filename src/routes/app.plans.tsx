import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { buildWhatsAppUrl } from "@/lib/constants";
import { Sparkles, MessageCircle, CheckCircle2, Gift } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/plans")({
  component: PackagesPage,
});

type Pkg = {
  id: string;
  name: string;
  credits: number;
  bonus_credits: number;
  price_mt: number;
  sort_order: number;
};

function PackagesPage() {
  const { user, profile, refreshProfile } = useAuth();
  const [packages, setPackages] = useState<Pkg[]>([]);
  const [requesting, setRequesting] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("credit_packages")
      .select("*")
      .eq("active", true)
      .order("sort_order")
      .then(({ data }) => setPackages((data as Pkg[]) ?? []));
  }, []);

  const requestPackage = async (pkg: Pkg) => {
    if (!user) return;
    setRequesting(pkg.id);
    const { error } = await supabase.from("payments").insert({
      user_id: user.id,
      package_id: pkg.id,
      amount_mt: pkg.price_mt,
      method: "whatsapp",
      notes: `Pacote ${pkg.name}`,
    });
    setRequesting(null);
    if (error) return toast.error("Erro", { description: error.message });

    toast.success("Solicitação registada!", { description: "Confirme o pagamento via WhatsApp." });
    const total = pkg.credits + pkg.bonus_credits;
    const nome = profile?.full_name?.trim() || "(sem nome)";
    const telefone = profile?.phone?.trim() || "(sem telefone)";
    const email = user.email || "(sem email)";
    const bonusInfo = pkg.bonus_credits > 0 ? ` (${pkg.credits} + ${pkg.bonus_credits} bónus)` : "";
    const msg =
      `Olá ZENIX BOOST, quero atualizar/comprar o pacote de créditos abaixo:\n\n` +
      `📦 Pacote: ${pkg.name}\n` +
      `✨ Créditos: ${total}${bonusInfo}\n` +
      `💰 Valor: ${pkg.price_mt} MT\n\n` +
      `👤 Nome: ${nome}\n` +
      `📧 Email: ${email}\n` +
      `📱 Telefone: ${telefone}`;
    window.open(buildWhatsAppUrl(msg), "_blank");
    await refreshProfile();
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold">Pacotes de créditos</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Saldo atual: <span className="text-neon font-semibold">{profile?.credits ?? 0} créditos</span>
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {packages.map((p) => {
          const featured = p.id === "pack_10";
          const total = p.credits + p.bonus_credits;
          return (
            <div
              key={p.id}
              className={`relative rounded-2xl p-5 border ${
                featured ? "border-neon bg-gradient-card glow-neon-sm" : "border-border bg-card"
              }`}
            >
              {featured && (
                <div className="absolute -top-3 left-5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gradient-neon text-neon-foreground">
                  MAIS POPULAR
                </div>
              )}
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-neon" />
                <h3 className="font-display font-bold text-lg">{p.credits} créditos</h3>
              </div>
              {p.bonus_credits > 0 && (
                <div className="mt-1 inline-flex items-center gap-1 text-xs text-neon">
                  <Gift className="size-3" /> +{p.bonus_credits} bónus = {total} totais
                </div>
              )}
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-3xl font-display font-bold">{p.price_mt}</span>
                <span className="text-muted-foreground">MT</span>
              </div>

              <ul className="mt-4 space-y-1.5 text-xs">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-3.5 text-neon" /> Sem expiração
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-3.5 text-neon" /> Todos os estilos
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="size-3.5 text-neon" /> Auto Boost incluído
                </li>
              </ul>

              <Button
                onClick={() => requestPackage(p)}
                disabled={requesting === p.id}
                className="w-full mt-5 bg-gradient-neon text-neon-foreground"
                size="sm"
              >
                <MessageCircle className="size-4 mr-2" />
                {requesting === p.id ? "Enviando..." : "Comprar"}
              </Button>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-border bg-gradient-card p-5 text-sm">
        <p className="font-semibold mb-1">Como funciona o pagamento?</p>
        <ol className="list-decimal list-inside text-muted-foreground space-y-1">
          <li>Clique em "Comprar" no pacote desejado.</li>
          <li>Faça o pagamento via M-Pesa ou e-Mola e envie o comprovativo no WhatsApp.</li>
          <li>Após confirmação pelo administrador, os créditos são liberados automaticamente — sem expiração.</li>
        </ol>
      </div>
    </div>
  );
}
