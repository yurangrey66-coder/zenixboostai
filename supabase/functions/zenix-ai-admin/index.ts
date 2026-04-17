import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response("Unauthorized", { status: 401, headers: corsHeaders });

    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response("Unauthorized", { status: 401, headers: corsHeaders });

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
    if (!roles?.some((r) => r.role === "admin")) return new Response("Forbidden", { status: 403, headers: corsHeaders });

    const { messages } = await req.json();

    // Snapshot of DB context
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const [users, ads, payToday, payPending, blocked] = await Promise.all([
      supabase.from("profiles").select("status, credits"),
      supabase.from("ads").select("id, views, is_boosted"),
      supabase.from("payments").select("amount_mt").eq("status", "approved").gte("approved_at", today.toISOString()),
      supabase.from("payments").select("id, plan_id, amount_mt, created_at, profiles!payments_user_id_fkey(full_name, phone)").eq("status", "pending").limit(20),
      supabase.from("profiles").select("full_name, phone, status, plan_expires_at").eq("status", "blocked").limit(10),
    ]);

    const ctx = {
      total_usuarios: users.data?.length ?? 0,
      ativos: users.data?.filter((u) => u.status === "active").length ?? 0,
      bloqueados: users.data?.filter((u) => u.status === "blocked").length ?? 0,
      total_anuncios: ads.data?.length ?? 0,
      anuncios_em_boost: ads.data?.filter((a) => a.is_boosted).length ?? 0,
      receita_hoje_MT: payToday.data?.reduce((s, p) => s + p.amount_mt, 0) ?? 0,
      pagamentos_hoje: payToday.data?.length ?? 0,
      pagamentos_pendentes: payPending.data ?? [],
      usuarios_bloqueados_amostra: blocked.data ?? [],
    };

    const systemPrompt = `Você é o ZENIX AI Admin, assistente da plataforma Zenix Boost (anúncios + IA em Moçambique).
Responda sempre em português de Portugal/Moçambique, conciso, com emojis quando útil.
Use markdown para listas e relatórios.
Dados reais do app neste momento (JSON):
${JSON.stringify(ctx, null, 2)}

Sugira ações sempre que detectar problemas (ex: muitos pagamentos pendentes, muitos bloqueados, baixa receita).`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        stream: true,
      }),
    });

    if (!aiRes.ok) {
      if (aiRes.status === 429) return new Response(JSON.stringify({ error: "Rate limit" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiRes.status === 402) return new Response(JSON.stringify({ error: "Payment required" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ error: "AI error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(aiRes.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
