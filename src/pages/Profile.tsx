import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";

export default function Profile() {
  const [balance, setBalance] = useState<number | null>(null);
  const [email, setEmail] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    document.title = "Profile | Blatnoy";
  }, []);

  useEffect(() => {
    const sub = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session?.user) navigate("/auth", { replace: true });
    });
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) return navigate("/auth", { replace: true });
      setEmail(session.user.email ?? "");
      const { data, error } = await supabase
        .from("user_wallets")
        .select("balance")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (error) toast({ title: "Error", description: error.message });
      setBalance(data?.balance ?? 0);
      setLoading(false);
    });
    return () => sub.data.subscription.unsubscribe();
  }, [navigate, toast]);

  const formatted = useMemo(() => (balance === null ? "-" : `$${Number(balance).toFixed(2)}`), [balance]);

  const logout = async () => {
    await supabase.auth.signOut();
    navigate("/", { replace: true });
  };

  return (
    <section aria-labelledby="profile-heading" className="space-y-4">
      <h1 id="profile-heading" className="text-2xl font-semibold">Your profile</h1>
      <div className="grid gap-2">
        <div><span className="text-muted-foreground">Email:</span> {email}</div>
        <div><span className="text-muted-foreground">Wallet balance:</span> {formatted}</div>
      </div>
      <div className="flex gap-2">
        <Button onClick={() => navigate("/checkout")}>Go to Checkout</Button>
        <Button variant="outline" onClick={logout}>Logout</Button>
      </div>
      <article className="text-sm text-muted-foreground">
        Historic data (sales, deposits, tickets) will appear here in next step.
      </article>
    </section>
  );
}
