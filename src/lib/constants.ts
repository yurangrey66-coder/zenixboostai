export const WHATSAPP_NUMBER = "258856119614";
export const WHATSAPP_MESSAGE = "Olá ZENIX BOOST, quero comprar um pacote de créditos.";

export const buildWhatsAppUrl = (msg: string = WHATSAPP_MESSAGE) =>
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;

export const AD_STYLES = [
  { id: "classic", label: "Clássico", emoji: "✨" },
  { id: "promotional", label: "Promocional", emoji: "🎯" },
  { id: "nature", label: "Natureza", emoji: "🌿" },
  { id: "3d_realistic", label: "3D Realista", emoji: "🎨" },
  { id: "3d_blur", label: "Realista Desfocado", emoji: "🌀" },
  { id: "luxury", label: "Luxo", emoji: "👑" },
  { id: "4k_ultra", label: "4K Ultra Realista", emoji: "💎" },
  { id: "4k_simples", label: "4K Simples", emoji: "🖼️" },
  { id: "minimalist", label: "Minimalista", emoji: "⚪" },
  { id: "neon", label: "Neon", emoji: "💡" },
  { id: "vintage", label: "Vintage", emoji: "📻" },
  { id: "pop_art", label: "Pop Art", emoji: "🎭" },
  { id: "watercolor", label: "Aquarela", emoji: "🎨" },
  { id: "flat_design", label: "Flat Design", emoji: "🟦" },
  { id: "gradient", label: "Gradiente", emoji: "🌈" },
] as const;

export type AdStyleId = (typeof AD_STYLES)[number]["id"];

export const AD_LANGUAGES = [
  { id: "pt", label: "Português (PT-PT)", flag: "🇵🇹" },
  { id: "en", label: "Inglês", flag: "🇬🇧" },
] as const;

export type AdLanguage = (typeof AD_LANGUAGES)[number]["id"];

export const ADMIN_EMAIL = "yurangrey66@gmail.com";
export const ADMIN_CODE = "1417600";
