import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Megaphone, Eye, Rocket, Trash2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { AD_STYLES } from "@/lib/constants";

export const Route = createFileRoute("/app/ads")({
  component: MyAds,
});

type Ad = {
  id: string;
  title: string;
  description: string | null;
  style: string;
  image_url: string | null;
  status: string;
  views: number;
  is_boosted: boolean;
  created_at: string;
};

function MyAds() {
  const { user, profile, refreshProfile } = useAuth();
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("ads")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setAds((data as Ad[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [user]);

  const boost = async (id: string) => {
    if (!profile || profile.status === "blocked" || profile.credits < 1) {
      toast.error("Sem saldo ou plano expirado");
      return;
    }
    const { error } = await supabase.functions.invoke("boost-ad", { body: { ad_id: id } });
    if (error) return toast.error("Falha ao impulsionar", { description: error.message });
    toast.success("Anúncio impulsionado por 24h!");
    await Promise.all([load(), refreshProfile()]);
  };

  const remove = async (id: string) => {
    if (!confirm("Remover este anúncio?")) return;
    await supabase.from("ads").delete().eq("id", id);
    setAds((a) => a.filter((ad) => ad.id !== id));
  };

  const download = async (ad: Ad) => {
    if (!ad.image_url) {
      toast.error("Este anúncio não tem imagem para baixar");
      return;
    }
    try {
      const res = await fetch(ad.image_url);
      const blob = await res.blob();
      const ext = (blob.type.split("/")[1] ?? "png").split(";")[0];
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${ad.title.replace(/[^a-z0-9]+/gi, "_").toLowerCase() || "anuncio"}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Download iniciado");
    } catch {
      toast.error("Falha ao baixar imagem");
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold">Meus anúncios</h1>
          <p className="text-muted-foreground text-sm mt-1">{ads.length} anúncio(s) criado(s)</p>
        </div>
        <Button asChild className="bg-gradient-neon text-neon-foreground">
          <Link to="/app/create">+ Novo</Link>
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando...</div>
      ) : ads.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <Megaphone className="size-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground mb-4">Você ainda não criou anúncios.</p>
          <Button asChild className="bg-gradient-neon text-neon-foreground">
            <Link to="/app/create">Criar primeiro anúncio</Link>
          </Button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ads.map((ad) => {
            const styleLabel = AD_STYLES.find((s) => s.id === ad.style)?.label ?? ad.style;
            return (
              <div key={ad.id} className="rounded-2xl overflow-hidden border border-border bg-gradient-card">
                <div className="aspect-video bg-muted relative">
                  {ad.image_url ? (
                    <img src={ad.image_url} alt={ad.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full grid place-items-center text-muted-foreground text-sm">Sem imagem</div>
                  )}
                  {ad.is_boosted && (
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gradient-neon text-neon-foreground">
                      ⚡ BOOST
                    </div>
                  )}
                </div>
                <div className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display font-semibold truncate flex-1">{ad.title}</h3>
                    <span className="text-[10px] text-muted-foreground uppercase">{styleLabel}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Eye className="size-3" /> {ad.views}</span>
                    <span className={ad.status === "active" ? "text-success" : "text-muted-foreground"}>● {ad.status}</span>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      disabled={ad.is_boosted || profile?.status === "blocked"}
                      onClick={() => boost(ad.id)}
                    >
                      <Rocket className="size-3.5 mr-1.5" /> Boost
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(ad.id)}>
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
