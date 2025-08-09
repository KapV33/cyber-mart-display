import { Link, NavLink } from "react-router-dom";
import { ReactNode } from "react";

const categories = ["cat1","cat2","cat3","cat4","cat5","cat6","cat7"] as const;

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted text-foreground">
      <header className="border-b">
        <div className="mx-auto max-w-7xl px-4 py-4 flex items-center justify-between">
          <Link to="/" className="text-xl md:text-2xl font-bold tracking-tight font-display hover-scale">
            Blatnoy
          </Link>
          <nav className="hidden md:flex gap-4" aria-label="Product categories">
            {categories.map((c) => (
              <NavLink
                key={c}
                to={`/category/${c}`}
                className={({ isActive }) =>
                  `px-3 py-2 rounded-md transition-colors ${isActive ? "bg-accent text-accent-foreground" : "hover:bg-accent hover:text-accent-foreground"}`
                }
              >
                {c}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/checkout" className="hover:underline">Cart</Link>
            <Link to="/profile" className="hover:underline">Profile</Link>
            <Link to="/admin" className="hover:underline">Admin</Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">
        {children}
      </main>
      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Blatnoy
      </footer>
    </div>
  );
}
