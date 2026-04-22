import { useAuth } from "@/hooks/use-auth";
import { buildWhatsAppUrl } from "@/lib/constants";
import { AlertTriangle, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function StatusBanner() {
  const { profile, user } = useAuth();
  if (!profile) return null;

  // Mensagem personalizada com dados do perfil (atualiza automaticamente quando o usuário muda)
  const nome = profile.full_name?.trim() || "(sem nome)";
  const telefone = profile.phone?.trim() || "(sem telefone)";
  const email = user?.email || "(sem email)";
  const buyMsg =
    `Olá ZENIX BOOST, quero comprar um pacote de créditos.\n\n` +
    `👤 Nome: ${nome}\n` +
    `📧 Email: ${email}\n` +
    `📱 Telefone: ${telefone}`;

  if (profile.status === "blocked") {
    const reason = profile.credits === 0
      ? "Você está sem créditos."
      : "Sua conta foi bloqueada pelo administrador.";
    return (
      <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 md:p-5 flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex items-start gap-3 flex-1">
          <AlertTriangle className="size-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-destructive">Conta bloqueada</div>
            <div className="text-sm text-muted-foreground">
              {reason} Compre um pacote de créditos para continuar.
            </div>
          </div>
        </div>
        <Button asChild variant="default" size="sm" className="bg-gradient-neon text-neon-foreground">
          <a href={buildWhatsAppUrl(buyMsg)} target="_blank" rel="noopener">
            <MessageCircle className="size-4 mr-2" /> Comprar créditos
          </a>
        </Button>
      </div>
    );
  }

  if (profile.credits > 0 && profile.credits <= 2) {
    return (
      <div className="rounded-2xl border border-warning/40 bg-warning/10 p-4 flex items-center gap-3">
        <AlertTriangle className="size-5 text-warning shrink-0" />
        <div className="text-sm flex-1">
          <span className="font-medium text-warning">Saldo baixo: {profile.credits} crédito(s).</span>{" "}
          <span className="text-muted-foreground">Recarregue para não parar.</span>
        </div>
        <Button asChild variant="outline" size="sm">
          <a href={buildWhatsAppUrl(buyMsg)} target="_blank" rel="noopener">Recarregar</a>
        </Button>
      </div>
    );
  }

  return null;
}
