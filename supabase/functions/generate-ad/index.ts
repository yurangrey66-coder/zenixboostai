import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const stylePrompts: Record<string, string> = {
  classic: "clean classic advertising photo, professional lighting, simple composition",
  promotional: "vibrant promotional ad, bold colors, marketing banner style, eye-catching",
  nature: "natural outdoor scene, organic, soft natural lighting, earthy tones",
  "3d_realistic": "hyper realistic 3D render, octane render, studio lighting, cinematic",
  "3d_blur": "realistic 3D render with shallow depth of field, blurred background, bokeh",
  luxury: "luxury premium aesthetic, gold accents, elegant, high-end product photography",
  "4k_ultra": "ultra realistic 4K photography, photorealistic, sharp details, professional camera, NOT cartoon",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "No auth" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { title, description, style } = await req.json();

    // Check profile + plan + style allowed
    const { data: profile } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
    if (!profile || profile.status === "blocked") {
      return new Response(JSON.stringify({ error: "Conta bloqueada ou sem plano" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (profile.credits < 2) {
      return new Response(JSON.stringify({ error: "Créditos insuficientes" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: plan } = await supabase.from("plans").select("allowed_styles").eq("id", profile.current_plan).single();
    if (!plan?.allowed_styles?.includes(style)) {
      return new Response(JSON.stringify({ error: "Estilo bloqueado para seu plano" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Consume 1 credit for ad creation
    const { data: ok1 } = await supabase.rpc("consume_credit", { _user_id: user.id, _reason: "Criar anúncio" });
    if (!ok1) return new Response(JSON.stringify({ error: "Sem créditos" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Generate image via Lovable AI
    const prompt = `${stylePrompts[style] ?? ""}. ${title}. ${description ?? ""}`.trim();
    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{ role: "user", content: `Generate advertisement image: ${prompt}` }],
        modalities: ["image", "text"],
      }),
    });

    if (!aiRes.ok) {
      const t = await aiRes.text();
      console.error("AI error", aiRes.status, t);
      if (aiRes.status === 429) return new Response(JSON.stringify({ error: "Limite de geração atingido. Tente novamente em alguns minutos." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiRes.status === 402) return new Response(JSON.stringify({ error: "Créditos da IA esgotados." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ error: "Falha na IA" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiData = await aiRes.json();
    const imageUrl = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    // Consume 1 more credit for generation
    await supabase.rpc("consume_credit", { _user_id: user.id, _reason: "Geração de imagem" });

    // Save ad
    const { data: ad, error: adError } = await supabase.from("ads").insert({
      user_id: user.id,
      title, description, style,
      image_url: imageUrl,
      prompt,
    }).select().single();

    if (adError) return new Response(JSON.stringify({ error: adError.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    return new Response(JSON.stringify({ ad }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
