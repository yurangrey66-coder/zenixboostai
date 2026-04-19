import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Lock, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { AD_STYLES, AD_LANGUAGES, buildWhatsAppUrl } from "@/lib/constants";
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
  const [language, setLanguage] = useState<"pt" | "en">("pt");
  const [loading, setLoading] = useState(false);

  const blocked = !profile || profile.status === "blocked" || profile.credits < 2;

  const generate = async () => {
    if (!user) return;
    if (blocked) return toast.error("Sem créditos suficientes");
    if (!title.trim()) return toast.error("Informe o título");

    setLoading(true);
    const { data, error } = await supabase.functions.invoke("generate-ad", {
      body: { title, description, style, language },
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

  if (!profile || profile.status === "blocked") {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <StatusBanner />
        <div className="rounded-2xl border border-border bg-gradient-card p-8 text-center">
          <Lock className="size-10 text-muted-foreground mx-auto mb-3" />
          <h2 className="font-display font-bold text-xl">Sem créditos</h2>
          <p className="text-muted-foreground text-sm mt-2">
            Você precisa de créditos para criar anúncios. Compre um pacote a partir de 10 MT.
          </p>
          <Button asChild className="mt-5 bg-gradient-neon text-neon-foreground">
            <a href={buildWhatsAppUrl()} target="_blank" rel="noopener">Comprar créditos via WhatsApp</a>
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
          <Label>Idioma do texto do anúncio</Label>
          <div className="grid grid-cols-2 gap-2">
            {AD_LANGUAGES.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => setLanguage(l.id)}
                className={cn(
                  "rounded-xl border p-3 text-sm font-medium transition flex items-center gap-2 justify-center",
                  language === l.id
                    ? "border-neon bg-accent text-neon glow-neon-sm"
                    : "border-border bg-card hover:border-neon/50"
                )}
              >
                <span className="text-base">{l.flag}</span> {l.label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Em português usamos PT-PT (Portugal), com ortografia e marketing profissional.
          </p>
        </div>

        <div className="space-y-2">
          <Label>Estilo visual</Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {AD_STYLES.map((s) => (
              <button
                type="button"
                key={s.id}
                onClick={() => setStyle(s.id)}
                className={cn(
                  "relative rounded-xl border p-3 text-left text-sm transition",
                  style === s.id
                    ? "border-neon bg-accent text-neon glow-neon-sm"
                    : "border-border bg-card hover:border-neon/50"
                )}
              >
                <div className="text-lg">{s.emoji}</div>
                <div className="font-medium mt-1">{s.label}</div>
              </button>
            ))}
          </div>
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
