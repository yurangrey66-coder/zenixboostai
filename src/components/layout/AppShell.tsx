import { Link, useLocation } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { LayoutDashboard, Megaphone, CreditCard, Settings, LogOut, Shield, Sparkles, Bot, Menu, User, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationsBell } from "@/components/NotificationsBell";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import zenixLogo from "@/assets/zenix-logo.png";

const userNav = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard },
  { to: "/app/ads", label: "Meus Anúncios", icon: Megaphone },
  { to: "/app/create", label: "Criar Anúncio", icon: Sparkles },
  { to: "/app/auto-boost", label: "Auto Boost", icon: Bot },
  { to: "/app/plans", label: "Planos", icon: CreditCard },
];

const adminNav = [
  { to: "/admin", label: "Painel", icon: LayoutDashboard },
  { to: "/admin/users", label: "Usuários", icon: Shield },
  { to: "/admin/payments", label: "Pagamentos", icon: CreditCard },
  { to: "/admin/ads", label: "Anúncios", icon: Megaphone },
  { to: "/admin/promotions", label: "Promoções", icon: Megaphone },
  { to: "/admin/zenix-ai", label: "ZENIX AI", icon: Sparkles },
  { to: "/admin/settings", label: "Configurações", icon: Settings },
];

export function AppShell({ children, mode = "user" }: { children: ReactNode; mode?: "user" | "admin" }) {
  const { profile, isAdmin, signOut, user } = useAuth();
  const location = useLocation();
  const nav = mode === "admin" ? adminNav : userNav;

  const statusColor = {
    active: "text-success",
    expiring: "text-warning",
    blocked: "text-destructive",
  }[profile?.status ?? "blocked"];

  const statusLabel = {
    active: "🟢 Ativo",
    expiring: "🟡 Expirando",
    blocked: "🔴 Bloqueado",
  }[profile?.status ?? "blocked"];

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Sidebar (desktop) */}
      <aside className="hidden md:flex md:w-64 md:flex-col border-r border-border bg-sidebar">
        <div className="p-6 border-b border-sidebar-border">
          <Link to="/app" className="flex items-center gap-3">
            <img src={zenixLogo} alt="ZENIX BOOST" className="size-10 rounded-xl object-cover glow-neon-sm" />
            <div>
              <div className="font-display font-bold text-lg leading-none">ZENIX</div>
              <div className="text-xs text-muted-foreground tracking-widest">BOOST</div>
            </div>
          </Link>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {nav.map((item) => {
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  active
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
                )}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            );
          })}

          {isAdmin && mode === "user" && user?.email === "yurangrey66@gmail.com" && (
            <Link
              to="/admin"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-neon hover:bg-accent mt-4"
            >
              <Shield className="size-4" />
              Painel Admin
            </Link>
          )}
          {/* Admin não entra no app de usuário */}
        </nav>

        <div className="p-3 border-t border-sidebar-border space-y-2">
          <div className="px-3 py-2 text-xs">
            <div className="text-muted-foreground truncate">{user?.email}</div>
            <div className={cn("font-medium mt-1", statusColor)}>{statusLabel}</div>
          </div>
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={signOut}>
            <LogOut className="size-4 mr-2" /> Sair
          </Button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-background/85 backdrop-blur border-b border-border">
          <div className="flex items-center justify-between px-4 md:px-6 h-16">
            <div className="md:hidden flex items-center gap-2">
              <img src={zenixLogo} alt="ZENIX BOOST" className="size-8 rounded-lg object-cover" />
              <span className="font-display font-bold">ZENIX</span>
            </div>

            <div className="flex items-center gap-3 ml-auto">
              {mode === "user" && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent border border-neon glow-neon-sm">
                  <Sparkles className="size-4 text-neon" />
                  <span className="text-sm font-medium">
                    Saldo: <span className="font-display font-bold text-neon">{profile?.credits ?? 0}</span> créditos
                  </span>
                </div>
              )}
              {mode === "admin" && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent border border-neon glow-neon-sm">
                  <Shield className="size-4 text-neon" />
                  <span className="text-sm font-medium text-neon">PAINEL EXECUTIVO</span>
                </div>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Menu da conta">
                    <Menu className="size-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="truncate">{user?.email ?? "Conta"}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/app/account" className="flex items-center gap-2 cursor-pointer">
                      <User className="size-4" /> Editar conta
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/app/account" className="flex items-center gap-2 cursor-pointer">
                      <Settings className="size-4" /> Configurações
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/app/account" className="flex items-center gap-2 cursor-pointer">
                      <KeyRound className="size-4" /> Esqueci a senha
                    </Link>
                  </DropdownMenuItem>
                  {isAdmin && user?.email === "yurangrey66@gmail.com" && (
                    <DropdownMenuItem asChild>
                      <Link to="/admin" className="flex items-center gap-2 cursor-pointer text-neon">
                        <Shield className="size-4" /> Painel executivo
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut} className="text-destructive cursor-pointer">
                    <LogOut className="size-4 mr-2" /> Sair da conta
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <div className="flex-1 p-4 md:p-6 pb-24 md:pb-6">{children}</div>

        {/* Bottom nav (mobile) */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-sidebar border-t border-border">
          <div className="grid grid-cols-4">
            {nav.slice(0, 4).map((item) => {
              const active = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex flex-col items-center gap-1 py-3 text-[10px] font-medium",
                    active ? "text-neon" : "text-muted-foreground"
                  )}
                >
                  <item.icon className="size-5" />
                  {item.label.split(" ")[0]}
                </Link>
              );
            })}
          </div>
        </nav>
      </main>
    </div>
  );
}
