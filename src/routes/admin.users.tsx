import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Minus, Lock, Unlock, Pencil, Trash2 } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/admin/users")({
  component: AdminUsers,
});

type Row = {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  credits: number;
  status: "active" | "expiring" | "blocked";
  created_at: string;
};

function AdminUsers() {
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("id,user_id,full_name,phone,credits,status,created_at")
      .order("created_at", { ascending: false });
    setRows((data as Row[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // Realtime: atualiza lista quando perfis mudam
    const ch = supabase
      .channel("admin-profiles")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const adjustCredits = async (user_id: string, delta: number, reason: string) => {
    const { error } = await supabase.rpc("admin_adjust_credits", {
      _user_id: user_id, _delta: delta, _reason: reason,
    });
    if (error) toast.error(error.message);
    else toast.success(`Créditos ${delta > 0 ? "+" : ""}${delta}`);
  };

  const setStatus = async (user_id: string, status: "active" | "blocked") => {
    const { error } = await supabase.rpc("admin_set_user_status", {
      _user_id: user_id, _status: status,
    });
    if (error) toast.error(error.message);
    else toast.success(status === "blocked" ? "Usuário bloqueado" : "Usuário desbloqueado");
  };

  const deleteUser = async (user_id: string, name: string) => {
    const { error } = await supabase.functions.invoke("admin-delete-user", {
      body: { user_id },
    });
    if (error) return toast.error("Falha ao apagar conta", { description: error.message });
    toast.success(`Conta de ${name || "usuário"} apagada`, {
      description: "O email pode ser usado novamente para novo cadastro",
    });
    setRows((rs) => rs.filter((r) => r.user_id !== user_id));
  };

  const filtered = rows.filter((r) =>
    !q || r.full_name?.toLowerCase().includes(q.toLowerCase()) || r.phone?.includes(q)
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold">Usuários</h1>
          <p className="text-muted-foreground text-sm">{filtered.length} resultado(s) · atualização em tempo real</p>
        </div>
        <Input placeholder="Buscar por nome/telefone..." value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
      </div>

      <div className="rounded-2xl border border-border bg-gradient-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left">Usuário</th>
                <th className="px-4 py-3 text-left">Telefone</th>
                <th className="px-4 py-3 text-right">Créditos</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading && (<tr><td colSpan={5} className="text-center py-8 text-muted-foreground">Carregando...</td></tr>)}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">Nenhum usuário encontrado</td></tr>
              )}
              {!loading && filtered.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="px-4 py-3">{r.full_name || "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs">{r.phone || "—"}</td>
                  <td className="px-4 py-3 text-right font-display font-bold text-neon">{r.credits}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block size-2 rounded-full ${
                      r.status === "active" ? "bg-success" : r.status === "expiring" ? "bg-warning" : "bg-destructive"
                    }`} />
                    <span className="ml-2 text-xs">{r.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <Button size="icon" variant="ghost" title="+5 créditos"
                        onClick={() => adjustCredits(r.user_id, 5, "Bónus admin")}>
                        <Plus className="size-3.5 text-success" />
                      </Button>
                      <Button size="icon" variant="ghost" title="-1 crédito"
                        onClick={() => adjustCredits(r.user_id, -1, "Ajuste admin")}>
                        <Minus className="size-3.5 text-warning" />
                      </Button>
                      <CreditsDialog userId={r.user_id} userName={r.full_name || r.phone || ""} />
                      {r.status === "blocked" ? (
                        <Button size="icon" variant="ghost" title="Desbloquear"
                          onClick={() => setStatus(r.user_id, "active")}>
                          <Unlock className="size-3.5 text-success" />
                        </Button>
                      ) : (
                        <Button size="icon" variant="ghost" title="Bloquear"
                          onClick={() => setStatus(r.user_id, "blocked")}>
                          <Lock className="size-3.5 text-destructive" />
                        </Button>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="icon" variant="ghost" title="Apagar conta">
                            <Trash2 className="size-3.5 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Apagar conta de {r.full_name || r.phone || "usuário"}?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Todos os dados (anúncios, pagamentos, créditos, histórico) serão apagados permanentemente.
                              O email ficará liberado para um novo cadastro. Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteUser(r.user_id, r.full_name || r.phone || "")}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Apagar permanentemente
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
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

function CreditsDialog({ userId, userName }: { userId: string; userName: string }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("10");
  const [reason, setReason] = useState("");

  const apply = async () => {
    const n = parseInt(amount, 10);
    if (Number.isNaN(n) || n === 0) return toast.error("Quantidade inválida");
    const { error } = await supabase.rpc("admin_adjust_credits", {
      _user_id: userId, _delta: n, _reason: reason || "Ajuste manual",
    });
    if (error) toast.error(error.message);
    else { toast.success(`${n > 0 ? "+" : ""}${n} créditos aplicados`); setOpen(false); setReason(""); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" title="Definir créditos">
          <Pencil className="size-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajustar créditos — {userName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Quantidade (use negativo para remover)</Label>
            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Motivo (opcional)</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex: Bónus de fidelidade" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={apply} className="bg-gradient-neon text-neon-foreground">Aplicar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
