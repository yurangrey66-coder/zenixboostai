import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Eye, Trash2, Rocket } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/ads")({
  component: AdminAds,
});

type Ad = {
  id: string;
  title: string;
  style: string;
  image_url: string | null;
  views: number;
  is_boosted: boolean;
  status: string;
  created_at: string;
};

function AdminAds() {
  const [ads, setAds] = useState<Ad[]>([]);
  const load = async () => {
    const { data } = await supabase.from("ads").select("*").order("views", { ascending: false });
    setAds((data as Ad[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const toggleBoost = async (id: string, on: boolean) => {
    const expires = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    await supabase.from("ads").update({ is_boosted: on, boost_expires_at: on ? expires : null }).eq("id", id);
    toast.success(on ? "Boost ativado" : "Boost removido");
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Remover anúncio?")) return;
    await supabase.from("ads").delete().eq("id", id);
    load();
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl md:text-3xl font-display font-bold">Anúncios</h1>
        <p className="text-muted-foreground text-sm">Gestão de todos os anúncios</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {ads.map((ad) => (
          <div key={ad.id} className="rounded-2xl overflow-hidden border border-border bg-gradient-card">
            <div className="aspect-video bg-muted relative">
              {ad.image_url
                ? <img src={ad.image_url} alt={ad.title} className="w-full h-full object-cover" />
                : <div className="w-full h-full grid place-items-center text-xs text-muted-foreground">Sem imagem</div>}
              {ad.is_boosted && (
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gradient-neon text-neon-foreground">
                  ⚡ BOOST
                </div>
              )}
            </div>
            <div className="p-4 space-y-2">
              <h3 className="font-display font-semibold truncate">{ad.title}</h3>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Eye className="size-3" /> {ad.views}</span>
                <span className="capitalize">{ad.style}</span>
              </div>
              <div className="flex gap-2 pt-2">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => toggleBoost(ad.id, !ad.is_boosted)}>
                  <Rocket className="size-3.5 mr-1.5" /> {ad.is_boosted ? "Remover" : "Boost"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => remove(ad.id)}>
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          </div>
        ))}
        {ads.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">Nenhum anúncio ainda.</div>
        )}
      </div>
    </div>
  );
}
