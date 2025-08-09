import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { useNavigate, Link } from "react-router-dom";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Admin Login | Blatnoy";
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Clean any previous auth and sign out just in case
      try { await supabase.auth.signOut({ scope: 'global' }); } catch {}
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      // Check admin role
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id;
      if (!uid) throw new Error("No session established");
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", uid)
        .eq("role", "admin")
        .maybeSingle();
      if (!data) {
        await supabase.auth.signOut({ scope: 'global' });
        toast({ title: "Access denied", description: "Admin role required." });
        return;
      }
      toast({ title: "Welcome, admin" });
      navigate("/admin", { replace: true });
    } catch (err: any) {
      toast({ title: "Login error", description: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section aria-labelledby="admin-login-heading" className="max-w-md mx-auto animate-fade-in">
      <h1 id="admin-login-heading" className="text-2xl font-semibold mb-4">Admin Login</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <Input type="email" placeholder="Admin email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <Button type="submit" disabled={loading} className="w-full">{loading ? "Please wait…" : "Login"}</Button>
      </form>
      <p className="text-sm text-muted-foreground mt-2">Not an admin? <Link to="/auth" className="underline">User login</Link></p>
    </section>
  );
}
