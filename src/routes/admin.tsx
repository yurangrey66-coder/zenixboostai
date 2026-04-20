import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { AppShell } from "@/components/layout/AppShell";
import { supabase } from "@/integrations/supabase/client";

const ADMIN_EMAIL = "yurangrey66@gmail.com";

export const Route = createFileRoute("/admin")({
  beforeLoad: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) throw redirect({ to: "/auth" });
    if ((session.user.email ?? "").toLowerCase() !== ADMIN_EMAIL) {
      throw redirect({ to: "/app" });
    }

    const { data: hasAdminRole, error } = await supabase.rpc("has_role", {
      _user_id: session.user.id,
      _role: "admin",
    });

    if (error || !hasAdminRole) {
      throw redirect({ to: "/app" });
    }
  },
  component: AdminLayout,
});

function AdminLayout() {
  const { loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="size-8 rounded-full border-2 border-neon border-t-transparent animate-spin" />
      </div>
    );
  }
  return (
    <AppShell mode="admin">
      <Outlet />
    </AppShell>
  );
}
