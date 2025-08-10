import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";

export default function Admin() {
  useEffect(() => {
    document.title = "Admin | Blatnoy";
  }, []);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const onChooseFile = () => fileInputRef.current?.click();
  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    toast({ title: "CSV selected", description: `${file.name} — ${Math.ceil(file.size / 1024)} KB` });
    e.currentTarget.value = ""; // allow re-selecting same file
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
          <Button onClick={onChooseFile} aria-label="Upload CSV file">Upload CSV</Button>
          <a className="story-link relative text-sm" href="/csv/shop_products_template.csv" download>Download template</a>
        </div>
      </div>
    </section>
  );
}
