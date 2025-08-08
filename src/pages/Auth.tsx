import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    document.title = isLogin ? "Login | Blatnoy" : "Sign Up | Blatnoy";
  }, [isLogin]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        // Ensure profile & wallet exist without touching auth schema
        setTimeout(async () => {
          await supabase.rpc("ensure_user_profile_and_wallet");
          navigate("/profile", { replace: true });
        }, 0);
      }
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) navigate("/profile", { replace: true });
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast({ title: "Welcome back" });
      } else {
        const redirectUrl = `${window.location.origin}/`;
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: redirectUrl },
        });
        if (error) throw error;
        toast({ title: "Check your email to confirm" });
      }
    } catch (err: any) {
      toast({ title: "Auth error", description: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section aria-labelledby="auth-heading" className="max-w-md mx-auto">
      <h1 id="auth-heading" className="text-2xl font-semibold mb-4">{isLogin ? "Login" : "Create account"}</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <Button type="submit" disabled={loading} className="w-full">{loading ? "Please wait…" : isLogin ? "Login" : "Sign up"}</Button>
      </form>
      <Button variant="link" className="mt-2 px-0" onClick={() => setIsLogin((v) => !v)}>
        {isLogin ? "Need an account? Sign up" : "Already have an account? Login"}
      </Button>
    </section>
  );
}
