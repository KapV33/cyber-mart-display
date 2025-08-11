import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

// Loads theme settings from site_settings and applies CSS variables at runtime
export default function ThemeLoader() {
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "theme")
        .maybeSingle();
      const vars = (data as any)?.value?.cssVars as Record<string, string> | undefined;
      if (vars) {
        const root = document.documentElement;
        Object.entries(vars).forEach(([k, v]) => {
          if (v && typeof v === "string") {
            root.style.setProperty(`--${k}`, v);
          }
        });
      }
    };
    load();
  }, []);

  return null;
}
