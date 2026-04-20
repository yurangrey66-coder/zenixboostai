import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Zap, Shield } from "lucide-react";
import zenixLogo from "@/assets/zenix-logo.png";
import { toast } from "sonner";

const ADMIN_EMAIL = "yurangrey66@gmail.com";
const ADMIN_CODE = "1417600";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [needsCode, setNeedsCode] = useState(false);
  const [adminCode, setAdminCode] = useState("");

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Se for o email admin, pedir código antes de autenticar
    if (email.trim().toLowerCase() === ADMIN_EMAIL) {
      if (!needsCode) {
        setNeedsCode(true);
        setLoading(false);
        return;
      }
      if (adminCode.trim() !== ADMIN_CODE) {
        toast.error("Código de administrador inválido");
        setLoading(false);
        return;
      }
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error("Erro ao entrar", { description: error.message });
      return;
    }

    if (email.trim().toLowerCase() === ADMIN_EMAIL) {
      sessionStorage.setItem("zenix_admin_unlock", "1");
      toast.success("Painel executivo desbloqueado");
      // Hard redirect garante que o beforeLoad lê o sessionStorage já gravado
      window.location.href = "/admin";
    } else {
      toast.success("Bem-vindo de volta!");
      window.location.href = "/app";
    }
  };

  const handleSignup = async (e: FormEvent) => {
    e.preventDefault();

    if (email.trim().toLowerCase() === ADMIN_EMAIL) {
      toast.error("Este e-mail é reservado ao painel executivo");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/app`,
        data: { full_name: fullName, phone },
      },
    });
    setLoading(false);
    if (error) {
      toast.error("Erro ao criar conta", { description: error.message });
      return;
    }
    toast.success("Conta criada! 2 créditos grátis adicionados 🎁");
    navigate({ to: "/app" });
  };

  return (
    <div className="min-h-screen grid place-items-center px-4 py-10">
      <div className="w-full max-w-md">
        <a href="/" className="flex items-center gap-3 justify-center mb-8">
          <img src={zenixLogo} alt="ZENIX BOOST" className="size-12 rounded-xl object-cover glow-neon-sm" />
          <div>
            <div className="font-display font-bold text-xl leading-none">ZENIX <span className="text-neon">BOOST</span></div>
            <div className="text-xs text-muted-foreground tracking-widest mt-1">MARKETING COM IA</div>
          </div>
        </a>

        <div className="rounded-2xl border border-border bg-gradient-card p-6">
          <Tabs defaultValue="login" onValueChange={() => { setNeedsCode(false); setAdminCode(""); }}>
            <TabsList className="grid grid-cols-2 mb-6">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Criar conta</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email" type="email" required value={email}
                    onChange={(e) => { setEmail(e.target.value); setNeedsCode(false); setAdminCode(""); }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-pass">Senha</Label>
                  <Input id="login-pass" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>

                {needsCode && (
                  <div className="space-y-2 rounded-xl border border-neon bg-accent/40 p-3 glow-neon-sm">
                    <Label htmlFor="admin-code" className="flex items-center gap-2 text-neon">
                      <Shield className="size-4" /> Código de administrador
                    </Label>
                    <Input
                      id="admin-code" type="password" inputMode="numeric" required
                      placeholder="Digite o código" value={adminCode}
                      onChange={(e) => setAdminCode(e.target.value)}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Detectámos um e-mail administrativo. O código é exigido para abrir o painel executivo.
                    </p>
                  </div>
                )}

                <Button type="submit" disabled={loading} className="w-full bg-gradient-neon text-neon-foreground">
                  {loading ? "Entrando..." : needsCode ? "Abrir painel executivo" : "Entrar"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="su-name">Nome completo</Label>
                  <Input id="su-name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="su-phone">Telefone</Label>
                  <Input id="su-phone" type="tel" placeholder="+258 ..." value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="su-email">Email</Label>
                  <Input id="su-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="su-pass">Senha</Label>
                  <Input id="su-pass" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <div className="rounded-lg bg-accent/40 border border-neon/40 p-2 text-xs text-center">
                  🎁 Ganhe <span className="text-neon font-bold">2 créditos grátis</span> ao criar conta
                </div>
                <Button type="submit" disabled={loading} className="w-full bg-gradient-neon text-neon-foreground">
                  {loading ? "Criando..." : "Criar conta"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Ao criar conta, você concorda com os termos do Zenix Boost.
        </p>
      </div>
    </div>
  );
}
