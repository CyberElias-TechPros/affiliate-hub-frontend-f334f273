import * as React from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Mail, Lock, ArrowRight, CheckCircle2, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CustomInput } from "@/components/ui/CustomInput";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

type AuthMode = "login" | "signup";

const AuthPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, signup, socialLogin, isAuthenticated, user } = useAuth();

  const [mode, setMode] = React.useState<AuthMode>("login");
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = React.useState(false);
  const [showSuccess, setShowSuccess] = React.useState(false);

  const referralCode = searchParams.get("ref") || undefined;

  React.useEffect(() => {
    if (isAuthenticated && user) {
      navigate(user.onboardingComplete ? "/dashboard" : "/onboarding", { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (mode === "signup" && !name.trim()) e.name = "Full name is required";
    if (!/^\S+@\S+\.\S+$/.test(email)) e.email = "Enter a valid email";
    if (password.length < 6) e.password = "Min 6 characters";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsLoading(true);
    try {
      if (mode === "signup") {
        const u = await signup({ name, email, password, referralCode });
        setShowSuccess(true);
        setTimeout(() => navigate(u.onboardingComplete ? "/dashboard" : "/onboarding"), 1200);
      } else {
        const u = await login(email, password);
        toast.success(`Welcome back, ${u.name.split(" ")[0]}`);
        navigate(u.onboardingComplete ? "/dashboard" : "/onboarding");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocial = async (provider: "google" | "apple") => {
    // Demo: synthesize an email — in production wire real OAuth.
    const fakeEmail = `${provider}_${Date.now()}@demo.com`;
    setIsLoading(true);
    try {
      const u = await socialLogin(provider, fakeEmail, `${provider} user`);
      navigate(u.onboardingComplete ? "/dashboard" : "/onboarding");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Social auth failed");
    } finally {
      setIsLoading(false);
    }
  };

  if (showSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-hero p-4">
        <div className="text-center animate-scale-in">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full gradient-primary mb-6">
            <CheckCircle2 className="h-10 w-10 text-primary-foreground animate-check-bounce" />
          </div>
          <h1 className="text-2xl font-bold font-display text-foreground mb-2">
            Welcome to Affiliate Hub!
          </h1>
          <p className="text-muted-foreground">Setting up your account...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col gradient-hero">
      <div className="pt-12 pb-8 px-6 text-center">
        <Link to="/" className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-primary shadow-glow mb-6">
          <span className="text-2xl font-bold text-primary-foreground">A</span>
        </Link>
        <h1 className="text-3xl font-bold font-display text-foreground mb-2">
          {mode === "login" ? "Welcome back" : "Create account"}
        </h1>
        <p className="text-muted-foreground">
          {mode === "login"
            ? "Sign in to access your affiliate dashboard"
            : "Start earning with top affiliate products"}
        </p>
        {referralCode && mode === "signup" && (
          <p className="text-xs text-success mt-2">🎁 Referral code applied: {referralCode}</p>
        )}
      </div>

      <div className="px-6 mb-6">
        <div className="flex p-1.5 bg-muted rounded-xl">
          <button
            onClick={() => setMode("login")}
            className={`flex-1 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
              mode === "login" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            Login
          </button>
          <button
            onClick={() => setMode("signup")}
            className={`flex-1 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
              mode === "signup" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            Sign Up
          </button>
        </div>
      </div>

      <div className="flex-1 px-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <CustomInput
              label="Full Name"
              placeholder="Enter your full name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={errors.name}
              icon={<UserIcon className="h-5 w-5" />}
              autoComplete="name"
            />
          )}
          <CustomInput
            label="Email"
            placeholder="you@example.com"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
            icon={<Mail className="h-5 w-5" />}
            autoComplete="email"
          />
          <CustomInput
            label="Password"
            placeholder={mode === "signup" ? "Create a password" : "Enter your password"}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
            icon={<Lock className="h-5 w-5" />}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
          />

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 mt-6 gradient-primary text-primary-foreground font-semibold rounded-xl shadow-glow hover:opacity-90 transition-all duration-200"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                <span>Please wait...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span>{mode === "login" ? "Sign In" : "Create Account"}</span>
                <ArrowRight className="h-5 w-5" />
              </div>
            )}
          </Button>
        </form>

        <div className="mt-8">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-3 text-muted-foreground">Or continue with</span>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <Button type="button" variant="outline" onClick={() => handleSocial("google")} className="h-12 rounded-xl">
              Google
            </Button>
            <Button type="button" variant="outline" onClick={() => handleSocial("apple")} className="h-12 rounded-xl">
              Apple
            </Button>
          </div>
        </div>
      </div>

      <div className="py-6 px-6 text-center">
        <p className="text-xs text-muted-foreground">
          By continuing, you agree to our{" "}
          <Link to="/terms" className="text-primary hover:underline">Terms</Link> &{" "}
          <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
        </p>
      </div>
    </div>
  );
};

export default AuthPage;
