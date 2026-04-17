import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/settings")({
  component: AdminSettings,
});

type Plan = { id: string; name: string; price_mt: number; credits: number; duration_days: number; active: boolean };

function AdminSettings() {
  const [plans, setPlans] = useState<Plan[]>([]);

  const load = async () => {
    const { data } = await supabase.from("plans").select("*").order("price_mt");
    setPlans((data as Plan[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const update = async (id: string, patch: Partial<Plan>) => {
    const { error } = await supabase.from("plans").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Plano atualizado");
    load();
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold">Configurações</h1>
        <p className="text-muted-foreground text-sm">Gerir planos e preços</p>
      </div>

      <div className="space-y-3">
        {plans.map((p) => (
          <div key={p.id} className="rounded-2xl border border-border bg-gradient-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-lg">{p.name}</h3>
              <Button
                size="sm"
                variant={p.active ? "outline" : "default"}
                onClick={() => update(p.id, { active: !p.active })}
              >
                {p.active ? "Ativo" : "Inativo"}
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Preço (MT)" defaultValue={p.price_mt} onSave={(v) => update(p.id, { price_mt: v })} />
              <Field label="Créditos" defaultValue={p.credits} onSave={(v) => update(p.id, { credits: v })} />
              <Field label="Duração (dias)" defaultValue={p.duration_days} onSave={(v) => update(p.id, { duration_days: v })} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Field({ label, defaultValue, onSave }: { label: string; defaultValue: number; onSave: (v: number) => void }) {
  const [v, setV] = useState(defaultValue);
  useEffect(() => setV(defaultValue), [defaultValue]);
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="flex gap-1">
        <Input type="number" value={v} onChange={(e) => setV(Number(e.target.value))} className="text-sm" />
        {v !== defaultValue && (
          <Button size="sm" onClick={() => onSave(v)} className="bg-gradient-neon text-neon-foreground">OK</Button>
        )}
      </div>
    </div>
  );
}
