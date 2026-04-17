import { useAuth } from "@/hooks/use-auth";
import { buildWhatsAppUrl } from "@/lib/constants";
import { AlertTriangle, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function StatusBanner() {
  const { profile } = useAuth();
  if (!profile) return null;

  if (profile.status === "blocked") {
    const reason = !profile.plan_expires_at || new Date(profile.plan_expires_at) < new Date()
      ? "Seu plano expirou."
      : "Você está sem créditos.";
    return (
      <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 md:p-5 flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex items-start gap-3 flex-1">
          <AlertTriangle className="size-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-destructive">Conta bloqueada</div>
            <div className="text-sm text-muted-foreground">
              {reason} Atualize seu plano para continuar criando anúncios.
            </div>
          </div>
        </div>
        <Button asChild variant="default" size="sm" className="bg-gradient-neon text-neon-foreground">
          <a href={buildWhatsAppUrl()} target="_blank" rel="noopener">
            <MessageCircle className="size-4 mr-2" /> Renovar
          </a>
        </Button>
      </div>
    );
  }

  if (profile.status === "expiring") {
    return (
      <div className="rounded-2xl border border-warning/40 bg-warning/10 p-4 flex items-center gap-3">
        <AlertTriangle className="size-5 text-warning shrink-0" />
        <div className="text-sm flex-1">
          <span className="font-medium text-warning">Plano expirando em breve.</span>{" "}
          <span className="text-muted-foreground">Renove para não perder o acesso.</span>
        </div>
        <Button asChild variant="outline" size="sm">
          <a href={buildWhatsAppUrl()} target="_blank" rel="noopener">Renovar</a>
        </Button>
      </div>
    );
  }

  return null;
}
