import * as React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CustomInput } from "@/components/ui/CustomInput";
import { CountryDropdown } from "@/components/ui/CountryDropdown";
import { AuthAPI } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const niches = [
  { id: "tech", label: "Technology", emoji: "💻" },
  { id: "health", label: "Health & Fitness", emoji: "💪" },
  { id: "finance", label: "Finance", emoji: "💰" },
  { id: "beauty", label: "Beauty", emoji: "✨" },
  { id: "education", label: "Education", emoji: "📚" },
  { id: "lifestyle", label: "Lifestyle", emoji: "🏠" },
];

const OnboardingPage = () => {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [step, setStep] = React.useState(1);
  const [country, setCountry] = React.useState("NG");
  const [selectedNiches, setSelectedNiches] = React.useState<string[]>([]);
  const [whatsapp, setWhatsapp] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const toggleNiche = (id: string) => {
    setSelectedNiches((prev) =>
      prev.includes(id) ? prev.filter((n) => n !== id) : [...prev, id]
    );
  };

  const handleComplete = async () => {
    setIsSubmitting(true);
    try {
      const { user } = await AuthAPI.completeOnboarding({
        country,
        niches: selectedNiches,
        niche: selectedNiches[0],
        whatsapp,
      });
      setUser(user);
      toast.success("You're all set!");
      navigate("/dashboard");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Could not save preferences");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col gradient-hero">
      <div className="px-6 pt-6">
        <div className="flex gap-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                s <= step ? "gradient-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>
        <p className="text-sm text-muted-foreground mt-3">Step {step} of 3</p>
      </div>

      <div className="flex-1 px-6 py-8">
        {step === 1 && (
          <div className="animate-fade-in">
            <h1 className="text-2xl font-bold font-display text-foreground mb-2">
              Where are you based?
            </h1>
            <p className="text-muted-foreground mb-8">
              We'll show you products and payouts relevant to your region.
            </p>
            <CountryDropdown value={country} onChange={setCountry} label="Select your country" />
          </div>
        )}

        {step === 2 && (
          <div className="animate-fade-in">
            <h1 className="text-2xl font-bold font-display text-foreground mb-2">
              Pick your niches
            </h1>
            <p className="text-muted-foreground mb-8">
              Select the categories you want to promote. You can change this later.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {niches.map((niche) => {
                const isSelected = selectedNiches.includes(niche.id);
                return (
                  <button
                    key={niche.id}
                    onClick={() => toggleNiche(niche.id)}
                    className={`relative flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200 ${
                      isSelected ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/30"
                    }`}
                  >
                    <span className="text-2xl">{niche.emoji}</span>
                    <span className="font-medium text-sm text-left">{niche.label}</span>
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full gradient-primary flex items-center justify-center">
                        <Check className="h-3 w-3 text-primary-foreground" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="animate-fade-in">
            <h1 className="text-2xl font-bold font-display text-foreground mb-2">
              Connect WhatsApp
            </h1>
            <p className="text-muted-foreground mb-8">
              We'll send important notifications about your sales to WhatsApp.
            </p>
            <CustomInput
              label="WhatsApp Number"
              placeholder="+234 801 234 5678"
              type="tel"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
            />
          </div>
        )}
      </div>

      <div className="px-6 pb-8">
        <div className="flex gap-3">
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep(step - 1)} className="flex-1 h-12 rounded-xl">
              Back
            </Button>
          )}
          <Button
            onClick={() => (step < 3 ? setStep(step + 1) : handleComplete())}
            disabled={(step === 2 && selectedNiches.length === 0) || isSubmitting}
            className="flex-1 h-12 gradient-primary text-primary-foreground font-semibold rounded-xl shadow-glow hover:opacity-90 transition-all duration-200"
          >
            <span>{isSubmitting ? "Saving..." : step === 3 ? "Get Started" : "Continue"}</span>
            {!isSubmitting && <ArrowRight className="h-5 w-5 ml-2" />}
          </Button>
        </div>
        {step === 3 && (
          <button
            onClick={handleComplete}
            className="w-full mt-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip for now
          </button>
        )}
      </div>
    </div>
  );
};

export default OnboardingPage;
