import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Send, Bot } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/zenix-ai")({
  component: ZenixAI,
});

type Msg = { role: "user" | "assistant"; content: string };

function ZenixAI() {
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "Olá! Sou o ZENIX AI Admin. Posso te ajudar a analisar usuários, pagamentos, anúncios e gerar relatórios. O que precisa?" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);

    let assistantBuffer = "";
    setMessages((m) => [...m, { role: "assistant", content: "" }]);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/zenix-ai-admin`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: next }),
      });

      if (res.status === 429) { toast.error("Muitas requisições. Aguarde."); setLoading(false); return; }
      if (res.status === 402) { toast.error("Créditos da IA esgotados."); setLoading(false); return; }
      if (!res.ok || !res.body) throw new Error("Falha");

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let done = false;
      while (!done) {
        const { done: d, value } = await reader.read();
        if (d) break;
        buf += dec.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, nl);
          buf = buf.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") { done = true; break; }
          try {
            const p = JSON.parse(json);
            const c = p.choices?.[0]?.delta?.content;
            if (c) {
              assistantBuffer += c;
              setMessages((m) => m.map((mm, i) => i === m.length - 1 ? { ...mm, content: assistantBuffer } : mm));
            }
          } catch { buf = line + "\n" + buf; break; }
        }
      }
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto h-[calc(100vh-9rem)] md:h-[calc(100vh-8rem)] flex flex-col">
      <div className="mb-4 flex items-center gap-3">
        <div className="size-10 rounded-xl bg-gradient-neon grid place-items-center glow-neon-sm">
          <Bot className="size-5 text-neon-foreground" />
        </div>
        <div>
          <h1 className="font-display font-bold text-xl">ZENIX AI Admin</h1>
          <p className="text-xs text-muted-foreground">Assistente inteligente conectado à base de dados</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 rounded-2xl border border-border bg-gradient-card p-4 scrollbar-thin">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap ${
              m.role === "user" ? "bg-gradient-neon text-neon-foreground" : "bg-secondary text-foreground"
            }`}>
              {m.content || <span className="text-muted-foreground">...</span>}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div className="mt-3 flex gap-2">
        <Input
          placeholder="Pergunte algo... (ex: relatório de hoje)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          disabled={loading}
        />
        <Button onClick={send} disabled={loading} className="bg-gradient-neon text-neon-foreground">
          <Send className="size-4" />
        </Button>
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        {["Relatório de hoje", "Usuários bloqueados", "Pagamentos pendentes", "Anúncios fracos"].map((s) => (
          <button
            key={s}
            onClick={() => setInput(s)}
            className="text-[11px] px-2 py-1 rounded-full border border-border text-muted-foreground hover:text-neon hover:border-neon"
          >
            <Sparkles className="size-3 inline mr-1" /> {s}
          </button>
        ))}
      </div>
    </div>
  );
}
