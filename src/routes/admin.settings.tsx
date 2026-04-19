import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { ADMIN_CODE } from "@/lib/constants";
import { AlertTriangle, Trash2, Package } from "lucide-react";

export const Route = createFileRoute("/admin/settings")({
  component: AdminSettings,
});

type Pkg = {
  id: string;
  name: string;
  credits: number;
  bonus_credits: number;
  price_mt: number;
  active: boolean;
  sort_order: number;
};

function AdminSettings() {
  const [packages, setPackages] = useState<Pkg[]>([]);
  const navigate = useNavigate();
  const [resetCode, setResetCode] = useState("");
  const [resetConfirm, setResetConfirm] = useState("");
  const [resetting, setResetting] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("credit_packages").select("*").order("sort_order");
    setPackages((data as Pkg[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const update = async (id: string, patch: Partial<Pkg>) => {
    const { error } = await (supabase.from("credit_packages") as any).update(patch).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Pacote atualizado"); load(); }
  };

  const runResetHard = async () => {
    if (resetCode !== ADMIN_CODE) {
      toast.error("Código inválido");
      return;
    }
    if (resetConfirm.trim().toUpperCase() !== "RESET HARD") {
      toast.error("Digite exactamente: RESET HARD");
      return;
    }
    setResetting(true);
    const { error } = await supabase.rpc("admin_reset_hard");
    setResetting(false);
    if (error) {
      toast.error("Falhou: " + error.message);
      return;
    }
    toast.success("Sistema apagado. Saindo...");
    sessionStorage.removeItem("zenix_admin_unlock");
    await supabase.auth.signOut();
    setTimeout(() => navigate({ to: "/auth" }), 800);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold">Configurações</h1>
        <p className="text-muted-foreground text-sm">Pacotes de créditos e operações críticas</p>
      </div>

      <section className="space-y-3">
        <h2 className="font-display font-semibold text-lg flex items-center gap-2">
          <Package className="size-4 text-neon" /> Pacotes de créditos
        </h2>
        {packages.map((p) => (
          <div key={p.id} className="rounded-2xl border border-border bg-gradient-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-base">{p.name}</h3>
              <Button
                size="sm"
                variant={p.active ? "outline" : "default"}
                onClick={() => update(p.id, { active: !p.active })}
              >
                {p.active ? "Ativo" : "Inativo"}
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <NumField label="Preço (MT)" defaultValue={p.price_mt} onSave={(v) => update(p.id, { price_mt: v })} />
              <NumField label="Créditos" defaultValue={p.credits} onSave={(v) => update(p.id, { credits: v })} />
              <NumField label="Bónus" defaultValue={p.bonus_credits} onSave={(v) => update(p.id, { bonus_credits: v })} />
            </div>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-destructive/40 bg-destructive/5 p-5 space-y-4">
        <div>
          <h2 className="font-display font-bold text-lg flex items-center gap-2 text-destructive">
            <AlertTriangle className="size-5" /> Zona de perigo — Reset Hard
          </h2>
          <p className="text-xs text-muted-foreground mt-2">
            Apaga TODOS os usuários (inclusive admin), créditos, anúncios, pagamentos e configurações.
            O app volta ao estado inicial. Esta ação é <strong>irreversível</strong>.
          </p>
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="w-full">
              <Trash2 className="size-4 mr-2" /> Iniciar Reset Hard
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="size-5" /> Apagar TUDO?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Confirme com o código administrativo e digite <strong>RESET HARD</strong>.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="space-y-4 py-3">
              <div className="space-y-2">
                <Label>Código administrador</Label>
                <Input type="password" inputMode="numeric"
                  value={resetCode} onChange={(e) => setResetCode(e.target.value)}
                  placeholder="Código de 7 dígitos" />
              </div>
              <div className="space-y-2">
                <Label>Digite exactamente: <span className="text-destructive font-bold">RESET HARD</span></Label>
                <Input value={resetConfirm} onChange={(e) => setResetConfirm(e.target.value)} placeholder="RESET HARD" />
              </div>
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => { setResetCode(""); setResetConfirm(""); }}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={runResetHard}
                disabled={resetting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {resetting ? "Apagando..." : "APAGAR TUDO"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </section>
    </div>
  );
}

function NumField({ label, defaultValue, onSave }: { label: string; defaultValue: number; onSave: (v: number) => void }) {
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
