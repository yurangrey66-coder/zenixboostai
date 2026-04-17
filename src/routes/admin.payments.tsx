import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/payments")({
  component: AdminPayments,
});

type Row = {
  id: string;
  user_id: string;
  plan_id: string;
  amount_mt: number;
  reference: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  approved_at: string | null;
  profiles?: { full_name: string | null; phone: string | null } | null;
};

function AdminPayments() {
  const [rows, setRows] = useState<Row[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");

  const load = async () => {
    let q = supabase.from("payments").select("*, profiles!payments_user_id_fkey(full_name, phone)").order("created_at", { ascending: false });
    if (filter !== "all") q = q.eq("status", filter);
    const { data } = await q;
    setRows((data as any) ?? []);
  };
  useEffect(() => { load(); }, [filter]);

  const approve = async (id: string) => {
    const { error } = await supabase.rpc("approve_payment", { _payment_id: id });
    if (error) return toast.error("Erro", { description: error.message });
    toast.success("Pagamento aprovado e créditos liberados!");
    load();
  };

  const reject = async (id: string) => {
    await supabase.from("payments").update({ status: "rejected" }).eq("id", id);
    toast.success("Pagamento rejeitado");
    load();
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold">Pagamentos</h1>
          <p className="text-muted-foreground text-sm">Aprovação manual de M-Pesa / e-Mola</p>
        </div>
      </div>

      <div className="flex gap-2">
        {(["pending", "approved", "rejected", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
              filter === f ? "bg-gradient-neon text-neon-foreground border-transparent" : "border-border text-muted-foreground"
            }`}
          >
            {f === "pending" ? "Pendentes" : f === "approved" ? "Aprovados" : f === "rejected" ? "Rejeitados" : "Todos"}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-gradient-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left">Usuário</th>
                <th className="px-4 py-3 text-left">Plano</th>
                <th className="px-4 py-3 text-right">Valor</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Data</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum pagamento.</td></tr>
              )}
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="px-4 py-3">
                    <div>{r.profiles?.full_name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground font-mono">{r.profiles?.phone}</div>
                  </td>
                  <td className="px-4 py-3 capitalize">{r.plan_id}</td>
                  <td className="px-4 py-3 text-right font-display font-bold">{r.amount_mt} MT</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      r.status === "approved" ? "bg-success/20 text-success" :
                      r.status === "pending" ? "bg-warning/20 text-warning" :
                      "bg-destructive/20 text-destructive"
                    }`}>{r.status}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleString("pt-PT")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {r.status === "pending" && (
                      <div className="flex gap-1 justify-end">
                        <Button size="sm" onClick={() => approve(r.id)} className="bg-gradient-neon text-neon-foreground">
                          <Check className="size-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => reject(r.id)}>
                          <X className="size-3.5" />
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
