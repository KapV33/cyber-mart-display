import { useEffect, useState } from "react";
import { useCart } from "@/context/CartContext";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

export default function Checkout() {
  const { items, total, remove, clear } = useCart();
  const [balance, setBalance] = useState<number>(0);
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Checkout | Blatnoy";
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("user_wallets")
        .select("balance")
        .eq("user_id", user.id)
        .maybeSingle();
      setBalance(Number((data as any)?.balance ?? 0));
    })();
  }, []);

  return (
    <section aria-labelledby="checkout-heading" className="space-y-4">
      <h1 id="checkout-heading" className="text-2xl font-semibold">Checkout</h1>
      <div className="space-y-2">
        {items.length === 0 ? (
          <p className="text-muted-foreground">Your cart is empty.</p>
        ) : (
          items.map((it) => (
            <div key={it.id} className="flex items-center justify-between border rounded-md p-3">
              <div>
                <div className="font-medium">{it.title ?? it.id}</div>
                <div className="text-sm text-muted-foreground">Qty: {it.quantity}</div>
              </div>
              <div className="flex items-center gap-3">
                <div>${(it.price * it.quantity).toFixed(2)}</div>
                <Button variant="outline" size="sm" onClick={() => remove(it.id)}>Remove</Button>
              </div>
            </div>
          ))
        )}
      </div>
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="text-lg font-semibold">Total: ${total.toFixed(2)}</div>
          <div className="text-sm text-muted-foreground">Wallet balance: ${balance.toFixed(2)}</div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={clear}>Clear</Button>
          <Button
            disabled={items.length === 0 || processing || total > balance}
            onClick={async () => {
              setProcessing(true);
              try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) { navigate("/auth"); return; }
                const { error } = await supabase.rpc("update_wallet_balance", {
                  p_user_id: user.id,
                  p_amount: -Number(total.toFixed(2)),
                  p_transaction_type: "purchase",
                  p_description: `Checkout ${items.length} items`,
                });
                if (error) throw error;
                toast({ title: "Payment successful", description: `Paid $${total.toFixed(2)} from wallet.` });
                setBalance((b) => b - total);
                clear();
              } catch (e: any) {
                toast({ title: "Payment failed", description: e.message ?? "Try again", variant: "destructive" });
              } finally {
                setProcessing(false);
              }
            }}
          >
            {processing ? "Processing..." : "Pay with Wallet"}
          </Button>
        </div>
      </div>
    </section>
  );
}
