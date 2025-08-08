import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useCart } from "@/context/CartContext";

export default function Category() {
  const { cat } = useParams();
  const { add } = useCart();

  useEffect(() => {
    document.title = `${cat} | Blatnoy`;
  }, [cat]);

  const { data, isLoading } = useQuery({
    queryKey: ["shop_products", cat],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shop_products")
        .select("id, category, head1, head2, head3, head4, head5, head6, head7, head8, head9, price")
        .eq("category", cat);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <section aria-labelledby="category-heading">
      <h1 id="category-heading" className="text-2xl font-semibold mb-4">{cat}</h1>
      <Table>
        <TableCaption>Browse products in {cat}</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Head1</TableHead>
            <TableHead>Head2</TableHead>
            <TableHead>Head3</TableHead>
            <TableHead>Head4</TableHead>
            <TableHead>Head5</TableHead>
            <TableHead>Head6</TableHead>
            <TableHead>Head7</TableHead>
            <TableHead>Head8</TableHead>
            <TableHead>Head9</TableHead>
            <TableHead>Head10</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow><TableCell colSpan={10}>Loading…</TableCell></TableRow>
          ) : data && data.length > 0 ? (
            data.map((p) => (
              <TableRow key={p.id}>
                <TableCell>{p.head1}</TableCell>
                <TableCell>{p.head2}</TableCell>
                <TableCell>{p.head3}</TableCell>
                <TableCell>{p.head4}</TableCell>
                <TableCell>{p.head5}</TableCell>
                <TableCell>{p.head6}</TableCell>
                <TableCell>{p.head7}</TableCell>
                <TableCell>{p.head8}</TableCell>
                <TableCell>{p.head9}</TableCell>
                <TableCell>
                  <Button size="sm" onClick={() => add({ id: p.id, title: p.head1, price: Number(p.price) })}>
                    Add to cart
                  </Button>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow><TableCell colSpan={10}>No products yet.</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </section>
  );
}
