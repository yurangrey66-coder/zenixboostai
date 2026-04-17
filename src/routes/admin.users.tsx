import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/users")({
  component: AdminUsers,
});

type Row = {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  credits: number;
  current_plan: string | null;
  plan_expires_at: string | null;
  status: string;
  created_at: string;
};

function AdminUsers() {
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    setRows((data as Row[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const block = async (user_id: string) => {
    await supabase.from("profiles").update({ status: "blocked", credits: 0, plan_expires_at: null, current_plan: null }).eq("user_id", user_id);
    toast.success("Usuário bloqueado");
    load();
  };

  const filtered = rows.filter((r) =>
    !q || r.full_name?.toLowerCase().includes(q.toLowerCase()) || r.phone?.includes(q)
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold">Usuários</h1>
          <p className="text-muted-foreground text-sm">{filtered.length} resultado(s)</p>
        </div>
        <Input placeholder="Buscar por nome/telefone..." value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
      </div>

      <div className="rounded-2xl border border-border bg-gradient-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left">Nome</th>
                <th className="px-4 py-3 text-left">Telefone</th>
                <th className="px-4 py-3 text-left">Plano</th>
                <th className="px-4 py-3 text-right">Créditos</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {loading && (<tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Carregando...</td></tr>)}
              {!loading && filtered.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="px-4 py-3">{r.full_name ?? "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs">{r.phone ?? "—"}</td>
                  <td className="px-4 py-3">{r.current_plan ?? "—"}</td>
                  <td className="px-4 py-3 text-right font-display font-bold text-neon">{r.credits}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block size-2 rounded-full ${
                      r.status === "active" ? "bg-success" : r.status === "expiring" ? "bg-warning" : "bg-destructive"
                    }`} />
                    <span className="ml-2 text-xs">{r.status}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {r.status !== "blocked" && (
                      <Button size="sm" variant="ghost" onClick={() => block(r.user_id)}>Bloquear</Button>
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
