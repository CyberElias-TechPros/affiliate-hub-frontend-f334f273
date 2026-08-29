import * as React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Heart, Share2, Check, Copy, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ProductAPI, AffiliateAPI, getErrorMessage } from "@/lib/api";
import { useQuery, useMutation } from "@tanstack/react-query";

const ProductDetailPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [isSaved, setIsSaved] = React.useState(() => {
    try {
      return JSON.parse(localStorage.getItem("ah_saved_products") || "[]").includes(id);
    } catch {
      return false;
    }
  });
  const [linkCopied, setLinkCopied] = React.useState(false);

  const { data: product, isLoading, error, refetch } = useQuery({
    queryKey: ["product", id],
    queryFn: () => ProductAPI.detail(id!),
    enabled: !!id,
    retry: false,
  });

  const generateMutation = useMutation({
    mutationFn: () => AffiliateAPI.generate(id!),
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const affiliateLink = generateMutation.data?.link?.url || "";

  // Keep the generated link in sync with the product route (browser navigation
  // between two product detail pages reuses this component instance).
  React.useEffect(() => {
    if (!id) return;
    generateMutation.reset();
    generateMutation.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  React.useEffect(() => {
    try {
      const saved: string[] = JSON.parse(localStorage.getItem("ah_saved_products") || "[]");
      if (isSaved && !saved.includes(id!)) localStorage.setItem("ah_saved_products", JSON.stringify([...saved, id!]));
      if (!isSaved && saved.includes(id!)) localStorage.setItem("ah_saved_products", JSON.stringify(saved.filter((s) => s !== id)));
    } catch {
      /* ignore */
    }
  }, [isSaved, id]);

  const handleCopyLink = () => {
    if (!affiliateLink) return;
    navigator.clipboard.writeText(affiliateLink);
    setLinkCopied(true);
    toast.success("Link copied to clipboard!");
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const handleShareWhatsApp = () => {
    if (!affiliateLink) return;
    const message = encodeURIComponent(`Check out this amazing product! ${affiliateLink}`);
    window.open(`https://wa.me/?text=${message}`, "_blank");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="aspect-[4/3] bg-muted rounded-xl animate-pulse" />
        <div className="mt-4 space-y-2">
          <div className="h-6 bg-muted rounded w-3/4 animate-pulse" />
          <div className="h-4 bg-muted rounded w-1/2 animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-background p-4">
        <Button onClick={() => navigate(-1)} variant="outline" className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 text-center">
          <p className="text-destructive font-medium">Product not found</p>
          <Button onClick={() => refetch()} variant="outline" className="mt-4">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  const images = [product.image, ...(product.gallery || [])].filter(Boolean);

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-full hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSaved(!isSaved)}
              className={`p-2 rounded-full transition-colors ${
                isSaved ? "bg-destructive/10 text-destructive" : "hover:bg-muted"
              }`}
            >
              <Heart className={`h-5 w-5 ${isSaved && "fill-current"}`} />
            </button>
            <button onClick={handleShareWhatsApp} className="p-2 rounded-full hover:bg-muted">
              <Share2 className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="relative">
        <div className="aspect-[4/3] overflow-hidden">
          <img src={images[0]} alt={product.title} className="w-full h-full object-cover" />
        </div>
        <div className="absolute top-4 left-4 px-3 py-1.5 rounded-full gradient-primary text-primary-foreground font-bold text-sm shadow-glow">
          {product.commission}% Commission
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        <div>
          <span className="text-sm text-muted-foreground font-medium">{product.category}</span>
          <h1 className="text-xl font-bold font-display text-foreground mt-1">{product.title}</h1>
          <div className="flex items-baseline gap-3 mt-3">
            <span className="text-2xl font-bold text-foreground">₦{product.price.toLocaleString()}</span>
            <span className="text-sm text-success font-semibold">
              Earn ₦{product.commissionAmount.toLocaleString()}
            </span>
          </div>
        </div>

        <div>
          <h2 className="font-semibold text-foreground mb-2">About this product</h2>
          <p className="text-muted-foreground leading-relaxed">{product.description}</p>
        </div>

        {product.whyPromote && product.whyPromote.length > 0 && (
          <div className="bg-success/5 border border-success/20 rounded-xl p-4">
            <h2 className="font-semibold text-foreground mb-3">Why promote this?</h2>
            <ul className="space-y-2">
              {product.whyPromote.map((point, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <Check className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">{point}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="bg-card rounded-xl shadow-card p-4 space-y-4">
          <h2 className="font-semibold text-foreground">Your Affiliate Toolkit</h2>
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Your unique link</label>
            <div className="flex gap-2">
              <div className="flex-1 px-3 py-2.5 bg-muted rounded-lg text-sm text-foreground truncate">
                {affiliateLink || (
                  <span className="flex items-center gap-2 text-muted-foreground">
                    {generateMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {generateMutation.isPending
                      ? "Generating your link..."
                      : generateMutation.isError
                      ? "Could not generate link"
                      : "Link ready"}
                  </span>
                )}
              </div>
              {generateMutation.isError && (
                <Button
                  onClick={() => generateMutation.mutate()}
                  disabled={generateMutation.isPending}
                  variant="outline"
                  className="px-4 rounded-lg font-medium"
                >
                  {generateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Retry"}
                </Button>
              )}
              <Button
                onClick={handleCopyLink}
                disabled={!affiliateLink}
                className={`px-4 rounded-lg font-medium transition-all ${
                  linkCopied
                    ? "bg-success text-success-foreground"
                    : "gradient-primary text-primary-foreground"
                }`}
              >
                {linkCopied ? <><Check className="h-4 w-4 mr-1" /> Copied!</> : <><Copy className="h-4 w-4 mr-1" /> Copy</>}
              </Button>
            </div>
          </div>
          <Button
            onClick={handleShareWhatsApp}
            disabled={!affiliateLink}
            className="w-full h-12 bg-success hover:bg-success/90 text-success-foreground font-semibold rounded-xl"
          >
            Share to WhatsApp
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailPage;
