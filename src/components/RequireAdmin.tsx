import { ReactNode, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

export default function RequireAdmin({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session?.user) return navigate("/admin/login", { replace: true });
      // defer role check to avoid deadlocks
      setTimeout(async () => {
        if (!active) return;
        const { data } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .eq("role", "admin")
          .maybeSingle();
        if (!data) navigate("/admin/login", { replace: true });
        else setReady(true);
      }, 0);
    });
    // also check current session on mount
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) return navigate("/admin/login", { replace: true });
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (!data) navigate("/admin/login", { replace: true });
      else setReady(true);
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  if (!ready) return null;
  return <>{children}</>;
}
