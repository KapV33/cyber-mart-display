import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { useCart } from "@/context/CartContext";

export default function Category() {
  const { cat } = useParams();
  const { add } = useCart();
  const [search, setSearch] = useState("");

  useEffect(() => {
    document.title = `${cat} | Blatnoy`;
  }, [cat]);

const { data, isLoading } = useQuery({
  queryKey: ["shop_products", cat],
  queryFn: async () => {
    const { data, error } = await (supabase
      .from("shop_products") as any)
      .select('id, "Category", "BIN", "Country", "Type", "Name", "EXP", "City", "State", "ZIP", "Base", price')
      .eq("Category", cat);
    if (error) throw error;
    return data ?? [];
  },
});

const products = data ?? [];
const filtered = useMemo(() => {
  const q = search.trim().toLowerCase();
  if (!q) return products;
  return products.filter((p: any) => {
    const fields = [p.BIN, p.Country, p.Type, p.Name, p.EXP, p.City, p.State, p.ZIP, p.Base, String(p.price)];
    return fields.some((v) => String(v ?? "").toLowerCase().includes(q));
  });
}, [products, search]);

  return (
    <section aria-labelledby="category-heading">
      <h1 id="category-heading" className="text-2xl font-semibold mb-4">{cat}</h1>
      <div className="mb-4">
        <label htmlFor="category-search" className="sr-only">Search</label>
        <Input
          id="category-search"
          placeholder={`Search in ${cat}`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label={`Search products in ${cat}`}
        />
      </div>
      <Table>
        <TableCaption>Browse products in {cat}</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>BIN</TableHead>
            <TableHead>Country</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>EXP</TableHead>
            <TableHead>City</TableHead>
            <TableHead>State</TableHead>
            <TableHead>ZIP</TableHead>
            <TableHead>Base</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Add to cart</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow><TableCell colSpan={11}>Loading…</TableCell></TableRow>
          ) : data && data.length > 0 ? (
            data.map((p) => (
              <TableRow key={p.id}>
                <TableCell>{p.BIN}</TableCell>
                <TableCell>{p.Country}</TableCell>
                <TableCell>{p.Type}</TableCell>
                <TableCell>{p.Name}</TableCell>
                <TableCell>{p.EXP}</TableCell>
                <TableCell>{p.City}</TableCell>
                <TableCell>{p.State}</TableCell>
                <TableCell>{p.ZIP}</TableCell>
                <TableCell>{p.Base}</TableCell>
                <TableCell>{Number(p.price).toFixed(2)}</TableCell>
                <TableCell>
                  <Button size="sm" onClick={() => add({ id: p.id, title: p.BIN, price: Number(p.price) })}>
                    Add to cart
                  </Button>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow><TableCell colSpan={11}>No products yet.</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </section>
  );
}
