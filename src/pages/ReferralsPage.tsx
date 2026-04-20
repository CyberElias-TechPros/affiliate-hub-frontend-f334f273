import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Users, Loader2, Copy, Check, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/layout/BottomNav";
import { ReferralAPI } from "@/lib/api";
import { toast } from "sonner";

const ReferralsPage = () => {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["referrals"],
    queryFn: ReferralAPI.me,
  });

  const referral = data;
  const referrals = referral?.referrals ?? [];
  const stats = referral?.stats;
  const referralCode = referral?.code ?? "";

  const copyCode = () => {
    navigator.clipboard.writeText(referralCode);
    toast.success("Referral code copied!");
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background border-b border-border">
        <div className="flex items-center gap-3 px-4 py-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-full hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold font-display">Referrals</h1>
        </div>
      </div>

      {/* Referral Code Card */}
      <div className="px-4 py-4">
        <div className="bg-card rounded-xl p-6 shadow-card">
          <div className="flex items-center gap-2 mb-4">
            <Gift className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-foreground">Your Referral Code</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            Share your code to earn 10% bonus on your referee's first qualified sale
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 p-3 bg-muted rounded-lg font-mono text-lg font-bold text-foreground">
              {referralCode}
            </code>
            <Button variant="outline" size="icon" onClick={copyCode}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="px-4 py-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-card rounded-xl p-4 shadow-card text-center">
            <p className="text-2xl font-bold text-foreground">{stats?.total ?? 0}</p>
            <p className="text-xs text-muted-foreground">Referred</p>
          </div>
          <div className="bg-card rounded-xl p-4 shadow-card text-center">
            <p className="text-2xl font-bold text-foreground">{stats?.qualified ?? 0}</p>
            <p className="text-xs text-muted-foreground">Qualified</p>
          </div>
          <div className="bg-card rounded-xl p-4 shadow-card text-center">
            <p className="text-2xl font-bold text-success">
              ₦{(stats?.earned ?? 0).toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">Earned</p>
          </div>
        </div>
      </div>

      {/* Referral List */}
      <div className="px-4 py-4">
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-foreground">Your Referrals</h2>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : referrals.length > 0 ? (
          <div className="space-y-3">
            {referrals.map((ref) => (
              <div
                key={ref._id}
                className="flex items-center gap-3 bg-card rounded-xl p-4 shadow-card"
              >
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <Users className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-foreground">
                    {ref.referred?.name ?? "Anonymous"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {ref.referred?.email ?? ""}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    ref.status === "qualified"
                      ? "bg-success/10 text-success"
                      : ref.status === "rewarded"
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {ref.status}
                  </span>
                  {ref.rewardAmount > 0 && (
                    <p className="text-sm font-bold text-success mt-1">
                      +₦{ref.rewardAmount.toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No referrals yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Share your code to invite friends
            </p>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default ReferralsPage;