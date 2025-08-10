import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import Papa from "papaparse";

export default function Admin() {
  useEffect(() => {
    document.title = "Admin | Blatnoy";
  }, []);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const onChooseFile = () => fileInputRef.current?.click();
  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const text = await file.text();
      const result = Papa.parse<Record<string, string>>(text, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h) => h.trim().toLowerCase(),
      });

      if (result.errors && result.errors.length > 0) {
        throw new Error(`CSV parse error: ${result.errors[0].message}`);
      }

      const rows = (result.data || [])
        .map((row) => {
          const toNull = (v?: string) => {
            const s = (v ?? "").trim();
            return s === "" ? null : s;
          };
          const get = (r: Record<string, string>, keys: string[]) => {
            for (const k of keys) {
              const val = r[k];
              if (val !== undefined && String(val).trim() !== "") return String(val).trim();
            }
            return "";
          };
          const priceVal = Number(String(get(row, ["price"]).replace(/[^0-9.\-]/g, "")));
          return {
            category: String(get(row, ["category"]) ?? "").trim(),
            head1: toNull(get(row, ["head1", "bin"])),
            head2: toNull(get(row, ["head2", "country"])),
            head3: toNull(get(row, ["head3", "type"])),
            head4: toNull(get(row, ["head4", "name"])),
            head5: toNull(get(row, ["head5", "exp"])),
            head6: toNull(get(row, ["head6", "city"])),
            head7: toNull(get(row, ["head7", "state"])),
            head8: toNull(get(row, ["head8", "zip"])),
            head9: toNull(get(row, ["head9", "base"])),
            price: isNaN(priceVal) ? 0 : priceVal,
          };
        })
        .filter((r) => r.category && typeof r.price === "number");

      if (rows.length === 0) {
        throw new Error("No valid rows found. Make sure CSV has headers: category, head1..head9, price");
      }

      const chunkSize = 500;
      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        const { error } = await supabase.from("shop_products").insert(chunk);
        if (error) throw error;
      }

      toast({ title: "Import complete", description: `${rows.length} products imported.` });
    } catch (err: any) {
      toast({ title: "Import failed", description: err.message ?? "Unknown error" });
    } finally {
      setUploading(false);
      e.currentTarget.value = ""; // allow re-selecting same file
    }
  };

  return (
    <section aria-labelledby="admin-heading" className="space-y-6 animate-fade-in">
      <h1 id="admin-heading" className="text-2xl font-semibold">Admin Panel</h1>
      <p className="text-muted-foreground">Settings, users, tickets, wallets, and CSV import UI will be added next.</p>

      <div className="space-y-2">
        <h2 className="text-xl font-semibold">CSV Import</h2>
        <p className="text-sm text-muted-foreground">Upload your shop_products CSV to import products for all categories.</p>
        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            id="csv-upload"
            type="file"
            accept=".csv"
            className="hidden"
            onChange={onFileChange}
          />
          <Button onClick={onChooseFile} aria-label="Upload CSV file" disabled={uploading}>{uploading ? "Uploading…" : "Upload CSV"}</Button>
          <a className="story-link relative text-sm" href="/csv/shop_products_template.csv" download>Download template</a>
        </div>
      </div>
    </section>
  );
}
