import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const stylePrompts: Record<string, string> = {
  classic: "clean classic advertising photo, professional lighting",
  promotional: "vibrant promotional ad, bold colors, marketing banner",
  nature: "natural outdoor scene, organic, soft lighting",
  "3d_realistic": "hyper realistic 3D render, octane, studio lighting",
  "3d_blur": "realistic 3D render, shallow depth of field, bokeh",
  luxury: "luxury premium aesthetic, gold accents, elegant",
  "4k_ultra": "ultra realistic 4K photography, photorealistic, sharp",
};

const langInstruction = (lang: string) =>
  lang === "en"
    ? "All visible text in the image MUST be in correct natural English."
    : "Todo o texto visível DEVE estar em Português de Portugal (PT-PT), sem erros, marketing profissional.";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    await supabase.rpc("auto_refresh_all_statuses");

    const { data: candidates } = await supabase
      .from("auto_boost_settings")
      .select("user_id, preferred_style, base_theme, language, total_generated, last_run_at, profiles!inner(status, credits)")
      .eq("enabled", true);

    const eligible = (candidates ?? []).filter((c: any) =>
      c.profiles.status !== "blocked" && c.profiles.credits >= 2
    );

    const results: any[] = [];
    for (const c of eligible) {
      try {
        const style = c.preferred_style ?? "promotional";
        const lang = c.language === "en" ? "en" : "pt";

        const { data: ok1 } = await supabase.rpc("consume_credit", {
          _user_id: c.user_id, _reason: "AUTO BOOST: criar anúncio",
        });
        if (!ok1) continue;

        const variations = lang === "en"
          ? ["Special offer", "Exclusive deal", "New launch", "Limited edition", "Don't miss"]
          : ["Oferta especial", "Promoção exclusiva", "Lançamento", "Edição limitada", "Imperdível"];
        const variation = variations[c.total_generated % 5];
        const title = `${variation} — ${c.base_theme}`;
        const prompt = `${stylePrompts[style] ?? ""}. ${title}. ${c.base_theme}. ${langInstruction(lang)}`.trim();

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

        if (!aiRes.ok) { results.push({ user: c.user_id, error: "AI failed" }); continue; }
        const aiData = await aiRes.json();
        const imageUrl = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

        await supabase.rpc("consume_credit", { _user_id: c.user_id, _reason: "AUTO BOOST: geração IA" });

        await supabase.from("ads").insert({
          user_id: c.user_id, title, description: c.base_theme, style,
          image_url: imageUrl, prompt, is_boosted: true, language: lang,
          boost_expires_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
        });

        await supabase.from("auto_boost_settings").update({
          last_run_at: new Date().toISOString(),
          total_generated: c.total_generated + 1,
        }).eq("user_id", c.user_id);

        results.push({ user: c.user_id, ok: true, title });
      } catch (e) {
        results.push({ user: c.user_id, error: String(e) });
      }
    }

    await supabase.rpc("auto_refresh_all_statuses");

    return new Response(JSON.stringify({ processed: eligible.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
