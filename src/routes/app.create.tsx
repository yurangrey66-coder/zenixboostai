import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Lock, Sparkles, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { AD_STYLES, buildWhatsAppUrl } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { StatusBanner } from "@/components/StatusBanner";

export const Route = createFileRoute("/app/create")({
  component: CreateAd,
});

function CreateAd() {
  const { profile, user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [style, setStyle] = useState<string>("classic");
  const [allowedStyles, setAllowedStyles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!profile?.current_plan) return;
    supabase
      .from("plans")
      .select("allowed_styles")
      .eq("id", profile.current_plan)
      .maybeSingle()
      .then(({ data }) => setAllowedStyles((data?.allowed_styles as string[]) ?? []));
  }, [profile?.current_plan]);

  const blocked = !profile || profile.status === "blocked";

  const generate = async () => {
    if (!user) return;
    if (blocked) return toast.error("Conta bloqueada");
    if (!title.trim()) return toast.error("Informe o título");
    if (!allowedStyles.includes(style)) return toast.error("Estilo bloqueado para o seu plano");

    setLoading(true);
    const { data, error } = await supabase.functions.invoke("generate-ad", {
      body: { title, description, style },
    });
    setLoading(false);

    if (error || data?.error) {
      toast.error("Falha na geração", { description: error?.message ?? data?.error });
      return;
    }
    toast.success("Anúncio criado!");
    await refreshProfile();
    navigate({ to: "/app/ads" });
  };

  if (blocked) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <StatusBanner />
        <div className="rounded-2xl border border-border bg-gradient-card p-8 text-center">
          <Lock className="size-10 text-muted-foreground mx-auto mb-3" />
          <h2 className="font-display font-bold text-xl">Acesso bloqueado</h2>
          <p className="text-muted-foreground text-sm mt-2">
            Você precisa de um plano ativo e créditos disponíveis para criar anúncios.
          </p>
          <Button asChild className="mt-5 bg-gradient-neon text-neon-foreground">
            <a href={buildWhatsAppUrl()} target="_blank" rel="noopener">Atualizar plano via WhatsApp</a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold">Criar anúncio</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Custo: <span className="text-neon font-semibold">2 créditos</span> (criação + geração)
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-gradient-card p-6 space-y-5">
        <div className="space-y-2">
          <Label>Título do anúncio</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Promoção de smartphones" />
        </div>
        <div className="space-y-2">
          <Label>Descrição / Prompt visual</Label>
          <Textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descreva o produto e o estilo visual desejado..."
          />
        </div>

        <div className="space-y-2">
          <Label>Estilo visual</Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {AD_STYLES.map((s) => {
              const locked = !allowedStyles.includes(s.id);
              return (
                <button
                  type="button"
                  key={s.id}
                  onClick={() => !locked && setStyle(s.id)}
                  disabled={locked}
                  className={cn(
                    "relative rounded-xl border p-3 text-left text-sm transition",
                    style === s.id && !locked
                      ? "border-neon bg-accent text-neon glow-neon-sm"
                      : "border-border bg-card hover:border-neon/50",
                    locked && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <div className="text-lg">{s.emoji}</div>
                  <div className="font-medium mt-1">{s.label}</div>
                  {locked && (
                    <Lock className="size-3 absolute top-2 right-2 text-muted-foreground" />
                  )}
                </button>
              );
            })}
          </div>
          {allowedStyles.length < AD_STYLES.length && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <AlertTriangle className="size-3" /> Atualize seu plano para desbloquear mais estilos.
            </p>
          )}
        </div>

        <Button
          onClick={generate}
          disabled={loading || profile.credits < 2}
          className="w-full bg-gradient-neon text-neon-foreground"
        >
          <Sparkles className="size-4 mr-2" />
          {loading ? "Gerando..." : `Gerar anúncio (${profile.credits} créditos disponíveis)`}
        </Button>
        {profile.credits < 2 && (
          <p className="text-xs text-warning text-center">Você precisa de pelo menos 2 créditos para criar.</p>
        )}
      </div>
    </div>
  );
}
