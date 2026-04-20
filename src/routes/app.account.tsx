import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { User, Lock, Mail, LogOut, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/app/account")({
  component: AccountPage,
});

function AccountPage() {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [sendingReset, setSendingReset] = useState(false);

  useEffect(() => {
    setFullName(profile?.full_name ?? "");
    setPhone(profile?.phone ?? "");
    setResetEmail(user?.email ?? "");
  }, [profile, user]);

  const saveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName, phone })
      .eq("user_id", user.id);
    setSavingProfile(false);
    if (error) return toast.error("Falha ao salvar", { description: error.message });
    toast.success("Perfil atualizado");
    await refreshProfile();
  };

  const changePassword = async () => {
    if (newPassword.length < 6) return toast.error("Senha deve ter ao menos 6 caracteres");
    if (newPassword !== confirmPassword) return toast.error("As senhas não coincidem");
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (error) return toast.error("Falha ao alterar senha", { description: error.message });
    toast.success("Senha alterada com sucesso");
    setNewPassword("");
    setConfirmPassword("");
  };

  const sendResetEmail = async () => {
    if (!resetEmail) return toast.error("Informe um email");
    setSendingReset(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/auth`,
    });
    setSendingReset(false);
    if (error) return toast.error("Falha ao enviar", { description: error.message });
    toast.success("Email de recuperação enviado", {
      description: "Verifique sua caixa de entrada",
    });
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate({ to: "/app" })}>
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold">Minha conta</h1>
          <p className="text-muted-foreground text-sm mt-1">{user?.email}</p>
        </div>
      </div>

      {/* Editar perfil */}
      <section className="rounded-2xl border border-border bg-gradient-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <User className="size-4 text-neon" />
          <h2 className="font-display font-semibold">Editar perfil</h2>
        </div>
        <div className="space-y-3">
          <div>
            <Label htmlFor="name">Nome completo</Label>
            <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Seu nome" />
          </div>
          <div>
            <Label htmlFor="phone">Telefone</Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+258..." />
          </div>
          <Button onClick={saveProfile} disabled={savingProfile} className="bg-gradient-neon text-neon-foreground">
            {savingProfile ? "Salvando..." : "Salvar alterações"}
          </Button>
        </div>
      </section>

      {/* Alterar senha */}
      <section className="rounded-2xl border border-border bg-gradient-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Lock className="size-4 text-neon" />
          <h2 className="font-display font-semibold">Alterar senha</h2>
        </div>
        <div className="space-y-3">
          <div>
            <Label htmlFor="newpw">Nova senha</Label>
            <Input id="newpw" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Mín. 6 caracteres" />
          </div>
          <div>
            <Label htmlFor="confirmpw">Confirmar nova senha</Label>
            <Input id="confirmpw" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repita a senha" />
          </div>
          <Button onClick={changePassword} disabled={savingPassword} variant="outline">
            {savingPassword ? "Alterando..." : "Alterar senha"}
          </Button>
        </div>
      </section>

      {/* Esqueci senha */}
      <section className="rounded-2xl border border-border bg-gradient-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Mail className="size-4 text-neon" />
          <h2 className="font-display font-semibold">Esqueci a senha</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Enviaremos um link de recuperação para o email informado.
        </p>
        <div className="space-y-3">
          <div>
            <Label htmlFor="reset">Email</Label>
            <Input id="reset" type="email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} placeholder="seu@email.com" />
          </div>
          <Button onClick={sendResetEmail} disabled={sendingReset} variant="outline">
            {sendingReset ? "Enviando..." : "Enviar link de recuperação"}
          </Button>
        </div>
      </section>

      {/* Sair */}
      <section className="rounded-2xl border border-destructive/40 bg-destructive/5 p-5">
        <Button variant="destructive" onClick={signOut} className="w-full">
          <LogOut className="size-4 mr-2" /> Sair da conta
        </Button>
      </section>
    </div>
  );
}
