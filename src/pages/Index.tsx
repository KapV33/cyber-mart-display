import { useEffect } from "react";

const Index = () => {
  useEffect(() => {
    document.title = "Blatnoy | Crypto Marketplace";
  }, []);

  return (
    <section aria-labelledby="home-heading" className="min-h-[70vh] flex items-center justify-center bg-background animate-enter">
      <div className="text-center space-y-4">
        <h1 id="home-heading" className="text-4xl md:text-5xl font-bold font-display tracking-tight">Blatnoy</h1>
        <p className="text-lg md:text-xl text-muted-foreground animate-fade-in">Crypto-only marketplace. Choose a category to begin.</p>
        <nav className="flex gap-3 justify-center flex-wrap" aria-label="Browse categories">
          {Array.from({ length: 7 }).map((_, i) => (
            <a key={i} href={`/category/cat${i + 1}`} className="story-link relative px-1">
              cat{i + 1}
            </a>
          ))}
        </nav>
      </div>
    </section>
  );
};

export default Index;
