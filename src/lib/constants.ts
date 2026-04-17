export const WHATSAPP_NUMBER = "258856119614";
export const WHATSAPP_MESSAGE = "Olá ZENIX BOOST, quero atualizar o meu plano no aplicativo.";

export const buildWhatsAppUrl = (msg: string = WHATSAPP_MESSAGE) =>
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;

export const AD_STYLES = [
  { id: "classic", label: "Clássico", tier: "basic", emoji: "✨" },
  { id: "promotional", label: "Promocional", tier: "basic", emoji: "🎯" },
  { id: "nature", label: "Natureza", tier: "basic", emoji: "🌿" },
  { id: "3d_realistic", label: "3D Realista", tier: "intermediate", emoji: "🎨" },
  { id: "3d_blur", label: "3D Fundo Desfocado", tier: "intermediate", emoji: "🌀" },
  { id: "luxury", label: "Luxo", tier: "premium", emoji: "👑" },
  { id: "4k_ultra", label: "4K Ultra Realista", tier: "premium", emoji: "💎" },
] as const;

export type AdStyleId = (typeof AD_STYLES)[number]["id"];
