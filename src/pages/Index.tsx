// Update this page (the content is just a fallback if you fail to update the page)

const Index = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-3">
        <h1 className="text-4xl font-bold">Blatnoy</h1>
        <p className="text-xl text-muted-foreground">Crypto-only marketplace. Choose a category to begin.</p>
        <div className="flex gap-3 justify-center flex-wrap">
          {Array.from({ length: 7 }).map((_, i) => (
            <a key={i} href={`/category/cat${i + 1}`} className="underline">cat{i + 1}</a>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Index;
