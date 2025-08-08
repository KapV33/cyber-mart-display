export default function Admin() {
  return (
    <section aria-labelledby="admin-heading" className="space-y-4">
      <h1 id="admin-heading" className="text-2xl font-semibold">Admin Panel</h1>
      <p className="text-muted-foreground">Settings, users, tickets, wallets, and CSV import UI will be added next.</p>
      <ul className="list-disc pl-6 text-sm">
        <li>CSV Template: <a className="underline" href="/csv/shop_products_template.csv" download>Download</a></li>
      </ul>
    </section>
  );
}
