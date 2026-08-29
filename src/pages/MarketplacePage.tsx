import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Search, SlidersHorizontal, X, Check } from "lucide-react";
import { ProductCard } from "@/components/ui/ProductCard";
import { CategoryChip } from "@/components/ui/CategoryChip";
import { BottomNav } from "@/components/layout/BottomNav";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ProductAPI } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

const fallbackCategories = [
  { id: "all", label: "All Products" },
  { id: "Digital", label: "Digital" },
  { id: "Tech", label: "Tech" },
  { id: "Beauty", label: "Beauty" },
  { id: "Health", label: "Health" },
];

const sortOptions = [
  { id: "newest", label: "Newest First" },
  { id: "price-low", label: "Price: Low to High" },
  { id: "price-high", label: "Price: High to Low" },
  { id: "commission", label: "Commission: High to Low" },
];

const SAVED_KEY = "ah_saved_products";

const MarketplacePage = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [debouncedQuery, setDebouncedQuery] = React.useState("");
  const [activeCategory, setActiveCategory] = React.useState("all");
  const [savedProducts, setSavedProducts] = React.useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(SAVED_KEY) || "[]");
    } catch {
      return [];
    }
  });
  const [sortBy, setSortBy] = React.useState("newest");
  const [isSortOpen, setIsSortOpen] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const isSearching = !!debouncedQuery.trim();

  // Load real categories from the API (fallback list while loading).
  const { data: categoryData } = useQuery({
    queryKey: ["product-categories"],
    queryFn: ProductAPI.categories,
    staleTime: 5 * 60 * 1000,
  });

  const categories: Array<{ id: string; label: string }> = React.useMemo(() => {
    const fromApi = (categoryData ?? []).map((c) => ({ id: c, label: c }));
    const list = fromApi.length > 0 ? fromApi : fallbackCategories.slice(1);
    return [{ id: "all", label: "All Products" }, ...list];
  }, [categoryData]);

  // Debounce search so we don't hit the API on every keystroke.
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery.trim()), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Keep the selected category valid if the API list differs from the fallback.
  React.useEffect(() => {
    if (activeCategory !== "all" && categoryData && !categoryData.includes(activeCategory)) {
      setActiveCategory("all");
    }
  }, [categoryData, activeCategory]);

  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ["products", activeCategory, sortBy, debouncedQuery, page],
    queryFn: () =>
      ProductAPI.list({
        category: activeCategory === "all" ? undefined : activeCategory,
        sort: sortBy,
        q: debouncedQuery || undefined,
        page,
        limit: 20,
      }),
  });

  const products = data?.items || [];
  const hasMore = products.length < (data?.total ?? 0);

  React.useEffect(() => {
    localStorage.setItem(SAVED_KEY, JSON.stringify(savedProducts));
  }, [savedProducts]);

  React.useEffect(() => {
    setPage(1);
  }, [debouncedQuery, activeCategory, sortBy]);

  const handleSaveProduct = (id: string) => {
    setSavedProducts((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="px-4 py-4">
          <h1 className="text-2xl font-bold font-display text-foreground mb-4">Discover Products</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-12 pl-10 pr-12 rounded-xl border border-input bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-12 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
            <Sheet open={isSortOpen} onOpenChange={setIsSortOpen}>
              <SheetTrigger asChild>
                <button className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-primary/10 text-primary">
                  <SlidersHorizontal className="h-4 w-4" />
                </button>
              </SheetTrigger>
              <SheetContent side="bottom" className="rounded-t-xl">
                <SheetHeader>
                  <SheetTitle>Sort Products</SheetTitle>
                </SheetHeader>
                <div className="mt-4 space-y-2">
                  {sortOptions.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => {
                        setSortBy(option.id);
                        setIsSortOpen(false);
                      }}
                      className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition-colors ${
                        sortBy === option.id ? "bg-primary/10 text-primary" : "hover:bg-muted"
                      }`}
                    >
                      <span className="font-medium">{option.label}</span>
                      {sortBy === option.id && <Check className="h-4 w-4" />}
                    </button>
                  ))}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
        <div className="px-4 pb-4 overflow-x-auto scrollbar-hide">
          <div className="flex gap-2">
            {categories.map((category) => (
              <CategoryChip
                key={category.id}
                label={category.label}
                isActive={activeCategory === category.id}
                onClick={() => setActiveCategory(category.id)}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-3">
        {isLoading &&
          [...Array(5)].map((_, i) => (
            <div key={i} className="h-28 bg-card rounded-xl shadow-card animate-pulse" />
          ))}

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 text-center">
            <p className="text-destructive font-medium">Failed to load products</p>
            <Button onClick={() => window.location.reload()} variant="outline" className="mt-4">
              Retry
            </Button>
          </div>
        )}

        {!isLoading && !error && products.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">No products match your search.</div>
        )}

        {products.map((product, index) => (
          <div key={product._id} className="animate-fade-up" style={{ animationDelay: `${index * 50}ms` }}>
            <ProductCard
              id={product._id}
              title={product.title}
              price={product.price}
              commission={product.commission}
              image={product.image}
              category={product.category}
              isSaved={savedProducts.includes(product._id)}
              onSave={handleSaveProduct}
              onClick={() => navigate(`/product/${product._id}`)}
            />
          </div>
        ))}

        {hasMore && (
          <div className="pt-2">
            <Button
              variant="outline"
              className="w-full h-12 rounded-xl"
              disabled={isFetching}
              onClick={() => setPage((p) => p + 1)}
            >
              {isFetching ? "Loading..." : `Load more (${(data?.total ?? 0) - products.length} remaining)`}
            </Button>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default MarketplacePage;
