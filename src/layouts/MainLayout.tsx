import { Link, NavLink } from "react-router-dom";
import { ReactNode, useEffect, useState } from "react";
import { ShoppingCart } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { supabase } from "@/integrations/supabase/client";

const fallbackCategories = ["CVV","Accounts","Databases","Guides","Tools"] as const;

export default function MainLayout({ children }: { children: ReactNode }) {
  const { items } = useCart();
  const [navCategories, setNavCategories] = useState<string[]>([...fallbackCategories]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("site_settings").select("value").eq("key", "nav_categories").maybeSingle();
      const list = (data as any)?.value?.list;
      if (Array.isArray(list) && list.length > 0) setNavCategories(list);
    })();
  }, []);

  return (
    <div className="min-h-screen text-foreground bg-gradient-primary">
      <header className="border-b">
        <div className="mx-auto max-w-7xl px-4 py-4 flex items-center justify-between">
          <Link to="/" className="text-xl md:text-2xl font-bold tracking-tight font-display hover-scale">
            Blatnoy
          </Link>
          <nav className="hidden md:flex gap-4" aria-label="Product categories">
            {navCategories.map((c) => (
              <NavLink
                key={c}
                to={`/category/${encodeURIComponent(c)}`}
                className={({ isActive }) =>
                  `px-3 py-2 rounded-md transition-colors ${isActive ? "bg-accent text-accent-foreground" : "hover:bg-accent hover:text-accent-foreground"}`
                }
              >
                {c}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/checkout" className="inline-flex items-center gap-1 hover:underline" aria-label={`Cart (${items.length})`}>
              <ShoppingCart size={18} />
              <span>({items.length})</span>
            </Link>
            <Link to="/profile" className="hover:underline">Profile</Link>
          </div>
        </div>
      </header>
      <div className="h-1 bg-gradient-secondary" aria-hidden="true" />
      <main className="mx-auto max-w-7xl px-4 py-6">
        {children}
      </main>
      <footer className="border-t py-6 text-center text-sm text-muted-foreground bg-gradient-secondary">
        © {new Date().getFullYear()} Blatnoy
      </footer>
    </div>
  );
}
