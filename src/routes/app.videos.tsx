import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Film, Sparkles, Download, Play, Loader2, Image as ImageIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/app/videos")({
  component: VideosPage,
});

const VIDEO_CREDIT_COST = 5;

type Ad = {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  video_url: string | null;
  video_duration: number | null;
  created_at: string;
};

function VideosPage() {
  const { user, profile, refreshProfile } = useAuth();
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Ad | null>(null);
  const [duration, setDuration] = useState<5 | 10>(5);
  const [generating, setGenerating] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("ads")
      .select("id,title,description,image_url,video_url,video_duration,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setAds((data as Ad[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [user]);

  const generate = async () => {
    if (!selected) return;
    if (!profile || profile.status === "blocked") {
      toast.error("Conta bloqueada");
      return;
    }
    if (profile.credits < VIDEO_CREDIT_COST) {
      toast.error(`Sem créditos. Vídeo custa ${VIDEO_CREDIT_COST} créditos.`);
      return;
    }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-video", {
        body: { ad_id: selected.id, duration },
      });
      if (error) {
        toast.error("Falha ao gerar vídeo", { description: error.message });
        return;
      }
      if (data?.error) {
        toast.error(data.error);
        return;
      }
      toast.success("Vídeo gerado com sucesso!");
      setSelected(null);
      await Promise.all([load(), refreshProfile()]);
    } finally {
      setGenerating(false);
    }
  };

  const downloadVideo = async (ad: Ad) => {
    if (!ad.video_url) return;
    try {
      const res = await fetch(ad.video_url);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${ad.title.replace(/[^a-z0-9]+/gi, "_").toLowerCase() || "video"}.mp4`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Download iniciado");
    } catch {
      toast.error("Falha ao baixar vídeo");
    }
  };

  const adsWithVideo = ads.filter((a) => a.video_url);
  const adsWithoutVideo = ads.filter((a) => !a.video_url && a.image_url);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold flex items-center gap-2">
            <Film className="size-7 text-neon" /> Vídeos
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Transforma os teus anúncios em vídeos cinematográficos com IA
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent border border-neon glow-neon-sm">
          <Sparkles className="size-4 text-neon" />
          <span className="text-sm font-medium">
            {VIDEO_CREDIT_COST} créditos/vídeo
          </span>
        </div>
      </div>

      {/* Vídeos gerados */}
      {adsWithVideo.length > 0 && (
        <section>
          <h2 className="font-display font-semibold text-lg mb-3">Os teus vídeos</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {adsWithVideo.map((ad) => (
              <div
                key={ad.id}
                className="rounded-2xl overflow-hidden border border-border bg-gradient-card"
              >
                <div className="aspect-video bg-black relative">
                  <video
                    src={ad.video_url!}
                    poster={ad.image_url ?? undefined}
                    controls
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gradient-neon text-neon-foreground">
                    🎬 {ad.video_duration ?? 5}s
                  </div>
                </div>
                <div className="p-4 space-y-2">
                  <h3 className="font-display font-semibold truncate">{ad.title}</h3>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => downloadVideo(ad)}
                  >
                    <Download className="size-3.5 mr-1.5" /> Baixar vídeo
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Anúncios sem vídeo */}
      <section>
        <h2 className="font-display font-semibold text-lg mb-3">
          Anúncios disponíveis para virar vídeo
        </h2>
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando...</div>
        ) : adsWithoutVideo.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-12 text-center">
            <ImageIcon className="size-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground mb-4">
              {ads.length === 0
                ? "Cria primeiro um anúncio para depois transformá-lo em vídeo."
                : "Todos os teus anúncios já têm vídeo."}
            </p>
            <Button asChild className="bg-gradient-neon text-neon-foreground">
              <Link to="/app/create">+ Criar anúncio</Link>
            </Button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {adsWithoutVideo.map((ad) => (
              <div
                key={ad.id}
                className="rounded-2xl overflow-hidden border border-border bg-gradient-card group"
              >
                <div className="aspect-video bg-muted relative">
                  <img
                    src={ad.image_url!}
                    alt={ad.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-4 space-y-2">
                  <h3 className="font-display font-semibold truncate">{ad.title}</h3>
                  <Button
                    size="sm"
                    className="w-full bg-gradient-neon text-neon-foreground"
                    onClick={() => {
                      setSelected(ad);
                      setDuration(5);
                    }}
                  >
                    <Film className="size-3.5 mr-1.5" /> Gerar vídeo
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Modal de geração */}
      <Dialog
        open={!!selected}
        onOpenChange={(o) => {
          if (!o && !generating) setSelected(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Gerar vídeo do anúncio</DialogTitle>
            <DialogDescription>
              A IA irá animar a imagem do teu anúncio com movimento cinematográfico.
            </DialogDescription>
          </DialogHeader>

          {selected && (
            <div className="space-y-4">
              <div className="rounded-xl overflow-hidden border border-border">
                <img
                  src={selected.image_url!}
                  alt={selected.title}
                  className="w-full aspect-video object-cover"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Duração</label>
                <div className="grid grid-cols-2 gap-2">
                  {[5, 10].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDuration(d as 5 | 10)}
                      disabled={generating}
                      className={`p-3 rounded-xl border-2 text-sm font-medium transition-colors ${
                        duration === d
                          ? "border-neon bg-accent text-neon"
                          : "border-border bg-card text-muted-foreground hover:border-muted-foreground"
                      }`}
                    >
                      {d} segundos
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between text-sm bg-accent/50 rounded-lg p-3">
                <span className="text-muted-foreground">Custo:</span>
                <span className="font-bold text-neon">{VIDEO_CREDIT_COST} créditos</span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Saldo atual:</span>
                <span>{profile?.credits ?? 0} créditos</span>
              </div>

              <Button
                onClick={generate}
                disabled={generating || (profile?.credits ?? 0) < VIDEO_CREDIT_COST}
                className="w-full bg-gradient-neon text-neon-foreground"
              >
                {generating ? (
                  <>
                    <Loader2 className="size-4 mr-2 animate-spin" /> A gerar vídeo (~30-90s)...
                  </>
                ) : (
                  <>
                    <Play className="size-4 mr-2" /> Gerar agora
                  </>
                )}
              </Button>

              {(profile?.credits ?? 0) < VIDEO_CREDIT_COST && (
                <Button asChild variant="outline" className="w-full">
                  <Link to="/app/plans">Comprar créditos</Link>
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
