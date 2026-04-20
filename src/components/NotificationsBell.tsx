import { useEffect, useState } from "react";
import { Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type Promotion = {
  id: string;
  title: string;
  message: string;
  link: string | null;
  created_at: string;
};

export function NotificationsBell() {
  const { user } = useAuth();
  const [items, setItems] = useState<Promotion[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);

  const load = async () => {
    if (!user) return;
    const [{ data: promos }, { data: reads }] = await Promise.all([
      supabase
        .from("promotions")
        .select("id,title,message,link,created_at")
        .eq("active", true)
        .order("created_at", { ascending: false })
        .limit(30),
      supabase.from("promotion_reads").select("promotion_id").eq("user_id", user.id),
    ]);
    setItems((promos as Promotion[]) ?? []);
    setReadIds(new Set((reads ?? []).map((r: { promotion_id: string }) => r.promotion_id)));
  };

  useEffect(() => {
    load();
    if (!user) return;
    const ch = supabase
      .channel("promotions-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "promotions" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const unread = items.filter((p) => !readIds.has(p.id));
  const unreadCount = unread.length;

  const markAllRead = async () => {
    if (!user || unread.length === 0) return;
    const rows = unread.map((p) => ({ user_id: user.id, promotion_id: p.id }));
    await supabase.from("promotion_reads").upsert(rows, { onConflict: "user_id,promotion_id" });
    setReadIds(new Set([...readIds, ...unread.map((p) => p.id)]));
  };

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) markAllRead();
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notificações">
          <Mail className="size-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold grid place-items-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <div>
            <div className="font-display font-semibold text-sm">Promoções & avisos</div>
            <div className="text-[11px] text-muted-foreground">
              {items.length} mensagem(s)
            </div>
          </div>
        </div>
        <ScrollArea className="max-h-80">
          {items.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              Nenhuma promoção no momento.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((p) => {
                const isUnread = !readIds.has(p.id);
                return (
                  <li
                    key={p.id}
                    className={cn(
                      "px-4 py-3 text-sm",
                      isUnread && "bg-accent/40",
                    )}
                  >
                    <div className="flex items-start gap-2">
                      {isUnread && (
                        <span className="mt-1.5 size-2 rounded-full bg-destructive shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold truncate">{p.title}</div>
                        <p className="text-muted-foreground text-xs mt-0.5 whitespace-pre-wrap">
                          {p.message}
                        </p>
                        {p.link && (
                          <a
                            href={p.link}
                            target="_blank"
                            rel="noreferrer"
                            className="text-neon text-xs mt-1 inline-block underline"
                          >
                            Saber mais
                          </a>
                        )}
                        <div className="text-[10px] text-muted-foreground mt-1">
                          {new Date(p.created_at).toLocaleString("pt-PT")}
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
