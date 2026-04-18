import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Bot, Sparkles, Clock, Zap } from "lucide-react";
import { toast } from "sonner";
import { AD_STYLES } from "@/lib/constants";

export const Route = createFileRoute("/app/auto-boost")({
  component: AutoBoostPage,
});

type Settings = {
  enabled: boolean;
  preferred_style: string;
  base_theme: string;
  last_run_at: string | null;
  total_generated: number;
};

function AutoBoostPage() {
  const { user, profile } = useAuth();
  const [settings, setSettings] = useState<Settings>({
    enabled: false,
    preferred_style: "promotional",
    base_theme: "Produto em destaque",
    last_run_at: null,
    total_generated: 0,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const blocked = profile?.status === "blocked";

  useEffect(() => {
    if (!user) return;
    supabase.from("auto_boost_settings").select("*").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => {
        if (data) setSettings(data as Settings);
        setLoading(false);
      });
  }, [user]);

  const save = async (updates: Partial<Settings>) => {
    if (!user) return;
    setSaving(true);
    const next = { ...settings, ...updates };
    setSettings(next);
    const { error } = await (supabase.from("auto_boost_settings") as any).upsert({
      user_id: user.id,
      enabled: next.enabled,
      preferred_style: next.preferred_style,
      base_theme: next.base_theme,
    }, { onConflict: "user_id" });
    setSaving(false);
    if (error) toast.error("Erro ao salvar");
    else toast.success(updates.enabled !== undefined ? (updates.enabled ? "AUTO BOOST ativado 🚀" : "AUTO BOOST pausado") : "Salvo");
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Carregando...</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="size-12 rounded-2xl bg-gradient-neon grid place-items-center glow-neon-sm">
          <Bot className="size-6 text-neon-foreground" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold">AUTO BOOST</h1>
          <p className="text-sm text-muted-foreground">A IA cria anúncios automaticamente para você, 24h por dia.</p>
        </div>
      </div>

      {blocked && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
          🔴 Sua conta está bloqueada. Renove o plano para ativar o AUTO BOOST.
        </div>
      )}

      <div className="rounded-2xl border border-border bg-gradient-card p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-base font-semibold">Modo automático</Label>
            <p className="text-xs text-muted-foreground mt-0.5">Gera 1 anúncio por hora enquanto tiver créditos</p>
          </div>
          <Switch
            checked={settings.enabled}
            disabled={blocked || saving}
            onCheckedChange={(v) => save({ enabled: v })}
          />
        </div>

        <div className="space-y-2">
          <Label>Tema base dos anúncios</Label>
          <Input
            value={settings.base_theme}
            onChange={(e) => setSettings({ ...settings, base_theme: e.target.value })}
            onBlur={() => save({ base_theme: settings.base_theme })}
            placeholder="Ex: Loja de roupas masculinas em Maputo"
            disabled={blocked}
          />
          <p className="text-xs text-muted-foreground">A IA usará isso como referência para criar variações.</p>
        </div>

        <div className="space-y-2">
          <Label>Estilo preferido</Label>
          <div className="grid grid-cols-2 gap-2">
            {AD_STYLES.map((s) => (
              <button
                key={s.id}
                disabled={blocked}
                onClick={() => save({ preferred_style: s.id })}
                className={`text-left p-3 rounded-lg border text-sm transition-colors ${
                  settings.preferred_style === s.id
                    ? "border-neon bg-accent text-neon"
                    : "border-border hover:border-muted-foreground"
                }`}
              >
                <div className="font-medium">{s.label}</div>
                <div className="text-xs text-muted-foreground capitalize">{s.tier}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Sparkles className="size-3" /> Gerados
          </div>
          <div className="font-display font-bold text-2xl text-neon">{settings.total_generated}</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Clock className="size-3" /> Última execução
          </div>
          <div className="text-sm font-medium">
            {settings.last_run_at ? new Date(settings.last_run_at).toLocaleString("pt-PT") : "—"}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-neon/30 bg-accent/40 p-4 text-xs text-muted-foreground space-y-1">
        <p className="flex items-center gap-2 text-neon font-medium"><Zap className="size-3" /> Como funciona</p>
        <p>• A IA verifica seu plano a cada 5 minutos</p>
        <p>• Se ativo, gera 1 anúncio por hora consumindo 2 créditos</p>
        <p>• Para automaticamente quando os créditos ou o plano acabam</p>
      </div>
    </div>
  );
}
