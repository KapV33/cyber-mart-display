import { useEffect } from "react";
import { useCart } from "@/context/CartContext";
import { Button } from "@/components/ui/button";

export default function Checkout() {
  const { items, total, remove, clear } = useCart();

  useEffect(() => {
    document.title = "Checkout | Blatnoy";
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
        <div className="text-lg font-semibold">Total: ${total.toFixed(2)}</div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={clear}>Clear</Button>
          <Button disabled={items.length === 0}>Pay with Wallet (coming next)</Button>
        </div>
      </div>
    </section>
  );
}
