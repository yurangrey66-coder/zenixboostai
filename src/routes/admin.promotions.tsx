import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Megaphone, Trash2, Eye, EyeOff } from "lucide-react";

export const Route = createFileRoute("/admin/promotions")({
  component: AdminPromotions,
});

type Promotion = {
  id: string;
  title: string;
  message: string;
  link: string | null;
  active: boolean;
  created_at: string;
};

function AdminPromotions() {
  const { user } = useAuth();
  const [items, setItems] = useState<Promotion[]>([]);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [link, setLink] = useState("");
  const [sending, setSending] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("promotions")
      .select("id,title,message,link,active,created_at")
      .order("created_at", { ascending: false });
    setItems((data as Promotion[]) ?? []);
  };

  useEffect(() => {
    load();
  }, []);

  const send = async () => {
    if (!user) return;
    if (!title.trim() || !message.trim()) {
      return toast.error("Preencha título e mensagem");
    }
    setSending(true);
    const { error } = await supabase.from("promotions").insert({
      title: title.trim(),
      message: message.trim(),
      link: link.trim() || null,
      created_by: user.id,
    });
    setSending(false);
    if (error) return toast.error("Falha ao enviar", { description: error.message });
    toast.success("Promoção enviada para todos os usuários");
    setTitle("");
    setMessage("");
    setLink("");
    load();
  };

  const toggle = async (p: Promotion) => {
    await supabase.from("promotions").update({ active: !p.active }).eq("id", p.id);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Apagar esta promoção?")) return;
    await supabase.from("promotions").delete().eq("id", id);
    load();
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold">Promoções</h1>
        <p className="text-muted-foreground text-sm">
          Envie avisos e promoções para todos os usuários do app
        </p>
      </div>

      {/* Composer */}
      <section className="rounded-2xl border border-border bg-gradient-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Megaphone className="size-4 text-neon" />
          <h2 className="font-display font-semibold">Nova promoção</h2>
        </div>
        <div className="space-y-3">
          <div>
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: 50% off em todos os pacotes!"
              maxLength={120}
            />
          </div>
          <div>
            <Label htmlFor="msg">Mensagem</Label>
            <Textarea
              id="msg"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Descreva a promoção ou aviso..."
              rows={4}
              maxLength={1000}
            />
          </div>
          <div>
            <Label htmlFor="link">Link (opcional)</Label>
            <Input
              id="link"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://..."
            />
          </div>
          <Button
            onClick={send}
            disabled={sending}
            className="bg-gradient-neon text-neon-foreground"
          >
            {sending ? "Enviando..." : "Enviar para todos os usuários"}
          </Button>
        </div>
      </section>

      {/* Lista */}
      <section className="space-y-3">
        <h2 className="font-display font-semibold">Promoções enviadas ({items.length})</h2>
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground">
            Nenhuma promoção enviada ainda.
          </div>
        ) : (
          <ul className="space-y-2">
            {items.map((p) => (
              <li
                key={p.id}
                className="rounded-xl border border-border bg-gradient-card p-4 flex items-start gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`size-2 rounded-full ${p.active ? "bg-success" : "bg-muted-foreground"}`}
                    />
                    <h3 className="font-semibold truncate">{p.title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                    {p.message}
                  </p>
                  <div className="text-[10px] text-muted-foreground mt-1">
                    {new Date(p.created_at).toLocaleString("pt-PT")}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => toggle(p)}
                    title={p.active ? "Desativar" : "Ativar"}
                  >
                    {p.active ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4 text-success" />
                    )}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => remove(p.id)}
                    title="Apagar"
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
