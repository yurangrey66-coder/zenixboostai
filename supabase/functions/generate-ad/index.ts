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
  "3d_blur": "realistic photo with shallow depth of field, blurred background, bokeh, sharp product",
  luxury: "luxury premium aesthetic, gold accents, elegant, high-end product photography",
  "4k_ultra": "ultra realistic 4K photography, photorealistic, sharp details, professional camera, NOT cartoon",
  "4k_simples": "IMPORTANT: Keep the original background of the reference image EXACTLY as it is — do not replace, blur or modify the background. Only enhance the subject/product to ultra-sharp 4K quality with rich, vivid color saturation, crisp details and clarity. No new scene, no studio backdrop, preserve original surroundings.",
  minimalist: "minimalist advertisement, clean white or solid background, total focus on the product, lots of negative space, modern Apple-like aesthetic",
  neon: "vibrant neon lights aesthetic, futuristic cyberpunk vibe, glowing accents in pink, cyan and electric green, dark moody background",
  vintage: "retro vintage advertisement, sepia and warm tones, film grain texture, old paper, nostalgic 70s/80s aesthetic",
  pop_art: "pop art comic book style, bold vivid colors, halftone dots, thick outlines, Roy Lichtenstein and Andy Warhol inspired",
  watercolor: "soft watercolor illustration, artistic brush strokes, gentle pastel washes, hand-painted look, paper texture",
  flat_design: "flat vector illustration, simple geometric shapes, solid bold colors, no gradients, no shadows, clean modern infographic style",
  gradient: "modern smooth gradient background, vibrant blended colors (purple, pink, blue, orange), glassmorphism, contemporary design",
};

const langInstruction = (lang: string) =>
  lang === "en"
    ? "All visible text in the image (headline, slogan, call-to-action) MUST be written in correct, natural English. No spelling errors. Marketing tone."
    : "Todo o texto visível na imagem (título, slogan, chamada para ação) DEVE estar em Português de Portugal (PT-PT) correto, sem erros ortográficos, com tom de marketing profissional. NUNCA usar Português do Brasil.";

const characterInstruction = (lang: string) =>
  lang === "en"
    ? `VERY IMPORTANT — SMART CHARACTER SELECTION:
First, ANALYZE the product (title + description + reference image if provided) and infer the correct target audience BEFORE choosing the character. Apply these rules strictly:

1. GENDER:
   - Female-oriented products (women's clothing, makeup, female cosmetics, bras, dresses, female perfumes, women's accessories, etc.) → use a FEMALE character.
   - Male-oriented products (men's clothing, beard products, men's perfumes, male accessories, etc.) → use a MALE character.
   - Unisex/neutral products → choose freely (vary across generations).

2. AGE GROUP:
   - Adult products (alcohol, professional gear, adult cosmetics, cars, business, luxury) → use an ADULT (woman ~25–45 if female; man ~25–45 if male).
   - Teen products (school items, teen fashion, gaming, sneakers, snacks) → use a TEEN/ADOLESCENT (~14–18).
   - Children's products (toys, kids clothes, baby items, candy) → use a CHILD (~6–12) or a parent with child if appropriate.
   - Senior products (medical, comfort wear, classic items) → use an older person.

3. VARIETY: Vary appearance every generation — different ethnicities, skin tones, hair colors and styles, outfits, poses and facial expressions. Never repeat the same face.

4. The character must interact naturally with, wear, hold or represent the product. Look like a real, expressive brand ambassador. Integrate harmoniously with the chosen visual style; do not break the aesthetic.`
    : `MUITO IMPORTANTE — ESCOLHA INTELIGENTE DA PERSONAGEM:
Primeiro, ANALISA o produto (título + descrição + imagem de referência se fornecida) e infere o público-alvo correto ANTES de escolher a personagem. Aplica estas regras de forma rigorosa:

1. GÉNERO:
   - Produtos femininos (roupa feminina, maquilhagem, cosméticos femininos, sutiãs, vestidos, perfumes femininos, acessórios femininos, etc.) → usa uma personagem FEMININA.
   - Produtos masculinos (roupa masculina, produtos de barba, perfumes masculinos, acessórios masculinos, etc.) → usa uma personagem MASCULINA.
   - Produtos unissexo/neutros → escolhe livremente (varia entre gerações).

2. FAIXA ETÁRIA:
   - Produtos adultos (bebidas alcoólicas, equipamento profissional, cosméticos adultos, carros, negócios, luxo) → usa um ADULTO (senhora ~25–45 se feminino; senhor ~25–45 se masculino).
   - Produtos para adolescentes (material escolar, moda jovem, gaming, ténis, snacks) → usa um ADOLESCENTE/TEEN (~14–18 — menina ou rapaz consoante o género).
   - Produtos para crianças (brinquedos, roupa infantil, artigos de bebé, doces) → usa uma CRIANÇA (~6–12) ou pai/mãe com criança se fizer sentido.
   - Produtos para idosos (medicinais, conforto, clássicos) → usa uma pessoa mais velha.

3. VARIEDADE: Varia a aparência em cada geração — diferentes etnias, tons de pele, cores e penteados de cabelo, roupas, poses e expressões faciais. NUNCA repitas a mesma cara.

4. A personagem deve interagir de forma natural com, vestir, segurar ou representar o produto. Deve parecer uma embaixadora ou embaixador real e expressivo da marca. Integra-a harmoniosamente com o estilo visual escolhido; não quebres a estética.`;

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

    const { title, description, style, language, referenceImage, characterEnabled } = await req.json();
    const lang = language === "en" ? "en" : "pt";

    const { data: profile } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
    if (!profile || profile.status === "blocked") {
      return new Response(JSON.stringify({ error: "Conta bloqueada" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (profile.credits < 2) {
      return new Response(JSON.stringify({ error: "Créditos insuficientes" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Consume 1 credit for ad creation
    const { data: ok1 } = await supabase.rpc("consume_credit", { _user_id: user.id, _reason: "Criar anúncio" });
    if (!ok1) return new Response(JSON.stringify({ error: "Sem créditos" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const characterPart = characterEnabled ? ` ${characterInstruction(lang)}` : "";
    const basePrompt = `${stylePrompts[style] ?? ""}. ${title}. ${description ?? ""}.${characterPart} ${langInstruction(lang)}`.trim();

    const userContent = referenceImage
      ? [
          {
            type: "text",
            text: `Use the provided image as the main product/subject reference. Create a professional advertisement based on this product. ${basePrompt}`,
          },
          { type: "image_url", image_url: { url: referenceImage } },
        ]
      : `Generate advertisement image: ${basePrompt}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{ role: "user", content: userContent }],
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

    await supabase.rpc("consume_credit", { _user_id: user.id, _reason: "Geração de imagem" });

    const { data: ad, error: adError } = await supabase.from("ads").insert({
      user_id: user.id,
      title, description, style,
      image_url: imageUrl,
      prompt: basePrompt,
      language: lang,
    }).select().single();

    if (adError) return new Response(JSON.stringify({ error: adError.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    return new Response(JSON.stringify({ ad }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
