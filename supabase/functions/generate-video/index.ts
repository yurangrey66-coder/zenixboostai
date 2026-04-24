import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VIDEO_CREDIT_COST = 5;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { ad_id, duration, motion_prompt } = await req.json();
    if (!ad_id || ![5, 10].includes(Number(duration))) {
      return new Response(JSON.stringify({ error: "Parâmetros inválidos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate ad ownership
    const { data: ad } = await supabase
      .from("ads")
      .select("*")
      .eq("id", ad_id)
      .eq("user_id", user.id)
      .single();
    if (!ad || !ad.image_url) {
      return new Response(JSON.stringify({ error: "Anúncio não encontrado ou sem imagem" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (ad.video_url) {
      return new Response(JSON.stringify({ error: "Este anúncio já tem vídeo" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check profile/credits
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();
    if (!profile || profile.status === "blocked") {
      return new Response(JSON.stringify({ error: "Conta bloqueada" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (profile.credits < VIDEO_CREDIT_COST) {
      return new Response(
        JSON.stringify({ error: `Créditos insuficientes. Vídeo custa ${VIDEO_CREDIT_COST} créditos.` }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Consume credits (one per credit, single reason)
    for (let i = 0; i < VIDEO_CREDIT_COST; i++) {
      const { data: ok } = await supabase.rpc("consume_credit", {
        _user_id: user.id,
        _reason: `Geração de vídeo (${duration}s)`,
        _ad_id: ad_id,
      });
      if (!ok) {
        return new Response(JSON.stringify({ error: "Falha ao consumir créditos" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Build motion prompt
    const basePrompt = motion_prompt?.trim() ||
      `Cinematic advertisement video of "${ad.title}". Smooth slow camera movement (gentle zoom-in or pan), subtle motion of the subject, professional product showcase style, dynamic lighting, high quality 4K, ${duration} seconds.`;

    // Call Lovable AI video generation gateway
    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/videos/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: basePrompt,
        starting_frame: ad.image_url,
        duration: Number(duration),
        resolution: "1080p",
        aspect_ratio: "16:9",
      }),
    });

    if (!aiRes.ok) {
      const t = await aiRes.text();
      console.error("AI video error", aiRes.status, t);
      // Refund credits on AI failure
      await supabase.rpc("admin_adjust_credits", {
        _user_id: user.id,
        _delta: VIDEO_CREDIT_COST,
        _reason: "Reembolso vídeo (falha)",
      }).catch(() => {});
      if (aiRes.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite atingido. Tenta novamente em alguns minutos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos da IA esgotados." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Falha na geração de vídeo" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiRes.json();
    const videoUrl: string | undefined =
      aiData.url ||
      aiData.video_url ||
      aiData.data?.[0]?.url ||
      aiData.data?.[0]?.video_url;

    if (!videoUrl) {
      console.error("No video URL in response", aiData);
      await supabase.rpc("admin_adjust_credits", {
        _user_id: user.id,
        _delta: VIDEO_CREDIT_COST,
        _reason: "Reembolso vídeo (sem URL)",
      }).catch(() => {});
      return new Response(JSON.stringify({ error: "Resposta inválida da IA de vídeo" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Save video URL on the ad
    await supabase
      .from("ads")
      .update({ video_url: videoUrl, video_duration: Number(duration) })
      .eq("id", ad_id)
      .eq("user_id", user.id);

    return new Response(JSON.stringify({ video_url: videoUrl, duration }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
