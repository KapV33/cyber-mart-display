import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import Papa from "papaparse";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Admin() {
  useEffect(() => {
    document.title = "Admin | Blatnoy";
  }, []);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // Category rename state
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [savingCat, setSavingCat] = useState(false);

  // Theme editor state
  const [primary, setPrimary] = useState("");
  const [secondary, setSecondary] = useState("");
  const [savingTheme, setSavingTheme] = useState(false);

  useEffect(() => {
    // Load categories
    (async () => {
      const { data, error } = await (supabase.from("shop_products") as any).select('"Category"');
      if (!error && data) {
        const names = Array.from(new Set((data as any[]).map((d) => d.Category).filter(Boolean)));
        setCategories(names);
      }
    })();
    // Load current theme
    (async () => {
      const { data } = await supabase.from("site_settings").select("value").eq("key", "theme").maybeSingle();
      const vars = (data as any)?.value?.cssVars ?? {};
      setPrimary(vars.primary ?? "");
      setSecondary(vars.secondary ?? "");
    })();
  }, []);

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
            Category: String(get(row, ["category"]) ?? "").trim(),
            BIN: toNull(get(row, ["bin", "head1"])),
            Country: toNull(get(row, ["country", "head2"])),
            Type: toNull(get(row, ["type", "head3"])),
            Name: toNull(get(row, ["name", "head4"])),
            EXP: toNull(get(row, ["exp", "head5"])),
            City: toNull(get(row, ["city", "head6"])),
            State: toNull(get(row, ["state", "head7"])),
            ZIP: toNull(get(row, ["zip", "head8"])),
            Base: toNull(get(row, ["base", "head9"])),
            price: isNaN(priceVal) ? 0 : priceVal,
          };
        })
        .filter((r) => r.Category && typeof r.price === "number");

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

  const renameCategory = async () => {
    if (!selectedCategory || !newCategoryName) return;
    setSavingCat(true);
    const { error } = await supabase
      .from("shop_products")
      .update({ Category: newCategoryName })
      .eq("Category", selectedCategory);
    if (error) {
      toast({ title: "Rename failed", description: error.message });
    } else {
      toast({ title: "Category renamed", description: `${selectedCategory} → ${newCategoryName}` });
      setCategories((prev) => Array.from(new Set([...prev.filter((c) => c !== selectedCategory), newCategoryName])).sort());
      setSelectedCategory(newCategoryName);
      setNewCategoryName("");
    }
    setSavingCat(false);
  };

  const saveTheme = async () => {
    setSavingTheme(true);
    const value = { cssVars: { primary, secondary } };
    const { error } = await supabase.from("site_settings").upsert({ key: "theme", value });
    if (error) {
      toast({ title: "Save failed", description: error.message });
    } else {
      toast({ title: "Theme saved", description: "Applied to the site" });
      const root = document.documentElement;
      if (primary) root.style.setProperty("--primary", primary);
      if (secondary) root.style.setProperty("--secondary", secondary);
    }
    setSavingTheme(false);
  };

  return (
    <section aria-labelledby="admin-heading" className="space-y-6 animate-fade-in">
      <h1 id="admin-heading" className="text-2xl font-semibold">Admin Panel</h1>
      <p className="text-muted-foreground">Manage products, categories, and theme.</p>

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

      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Category Manager</h2>
        <p className="text-sm text-muted-foreground">Rename a category (updates all products in that category).</p>
        <div className="flex flex-col md:flex-row gap-3 md:items-center">
          <Select onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full md:w-64"><SelectValue placeholder="Select category" /></SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="New category name"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
          />
          <Button onClick={renameCategory} disabled={savingCat || !selectedCategory || !newCategoryName}>
            {savingCat ? "Renaming…" : "Rename"}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Theme Styles</h2>
        <p className="text-sm text-muted-foreground">Edit core colors using HSL values (e.g., 220 13% 18%).</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label htmlFor="primary" className="text-sm">Primary (--primary)</label>
            <Input id="primary" placeholder="e.g. 220 13% 18%" value={primary} onChange={(e) => setPrimary(e.target.value)} />
          </div>
          <div>
            <label htmlFor="secondary" className="text-sm">Secondary (--secondary)</label>
            <Input id="secondary" placeholder="e.g. 35 95% 55%" value={secondary} onChange={(e) => setSecondary(e.target.value)} />
          </div>
        </div>
        <div>
          <Button onClick={saveTheme} disabled={savingTheme}>{savingTheme ? "Saving…" : "Save theme"}</Button>
        </div>
      </div>
    </section>
  );
}
