import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, Eye, ShoppingCart, Target, ChevronRight, Zap } from "lucide-react";
import { BalanceCard } from "@/components/ui/BalanceCard";
import { BottomNav } from "@/components/layout/BottomNav";
import { ContentAd, StickyFooterAd, NativeAd } from "@/components/common/AdBanner";
import { useAdManager } from "@/contexts/AdManagerContext";
import { useAuth } from "@/contexts/AuthContext";
import { WalletAPI, StatsAPI } from "@/lib/api";

const DashboardPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentVariant, showInterstitial } = useAdManager();

  const { data: balanceData } = useQuery({
    queryKey: ["balance"],
    queryFn: WalletAPI.balance,
  });

  const { data: statsData } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: StatsAPI.dashboard,
  });

  const { data: leaderboardData } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: () => StatsAPI.leaderboard(3),
  });

  const { data: performanceData } = useQuery({
    queryKey: ["performance", "7d"],
    queryFn: () => StatsAPI.performance("7d"),
  });

  React.useEffect(() => {
    if (currentVariant === 'A') {
      showInterstitial('app_open');
    }
  }, [currentVariant, showInterstitial]);

  const balance = balanceData?.ngnBalance ?? 0;
  const stats = statsData;
  const leaderboard = leaderboardData ?? [];
  const performance = performanceData?.points ?? [];
  
  const weeklyData = performance.length > 0 
    ? performance.map((p) => ({ day: new Date(p.date).toLocaleDateString("en", { weekday: "short" }), clicks: p.clicks }))
    : [
        { day: "Mon", clicks: 0 }, { day: "Tue", clicks: 0 }, { day: "Wed", clicks: 0 },
        { day: "Thu", clicks: 0 }, { day: "Fri", clicks: 0 }, { day: "Sat", clicks: 0 }, { day: "Sun", clicks: 0 },
      ];
  const maxClicks = Math.max(...weeklyData.map((d) => d.clicks), 1);

  const statsCards = [
    { label: "Total Clicks", value: stats?.totalClicks?.toLocaleString() ?? "0", change: "+0%", icon: Eye, color: "primary" },
    { label: "Conversions", value: stats?.totalConversions?.toLocaleString() ?? "0", change: "+0%", icon: ShoppingCart, color: "success" },
    { label: "Conv. Rate", value: `${stats?.conversionRate?.toFixed(1) ?? 0}%`, change: "+0%", icon: Target, color: "accent" },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="px-4 pt-6 pb-4 gradient-hero">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-muted-foreground text-sm">Welcome back,</p>
            <h1 className="text-xl font-bold font-display text-foreground">{user?.name?.split(" ")[0] ?? "User"} 👋</h1>
          </div>
          <button className="relative p-2 rounded-full bg-card shadow-sm" onClick={() => navigate("/notifications")}>
            <Zap className="h-5 w-5 text-accent" />
          </button>
        </div>

        {/* Balance Cards */}
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          <div className="min-w-[280px]">
            <BalanceCard currency="NGN" balance={balance} trend={0} isActive />
          </div>
          <div className="min-w-[280px]">
            <BalanceCard currency="USD" balance={(balance / (balanceData?.fxRate ?? 1)).toFixed(2)} trend={0} />
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="px-4 py-4">
        <div className="grid grid-cols-3 gap-3">
          {statsCards.map((stat) => (
            <div
              key={stat.label}
              className="bg-card rounded-xl p-3 shadow-card animate-fade-in"
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${
                stat.color === "primary" ? "bg-primary/10 text-primary" :
                stat.color === "success" ? "bg-success/10 text-success" :
                "bg-accent/10 text-accent"
              }`}>
                <stat.icon className="h-4 w-4" />
              </div>
              <p className="text-lg font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className="text-xs text-success font-medium mt-1">{stat.change}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Native Ad - A/B Tested */}
      {currentVariant === 'B' && (
        <NativeAd />
      )}

      {/* Weekly Performance Chart */}
      <div className="px-4 py-4">
        <div className="bg-card rounded-xl p-4 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground">Weekly Clicks</h2>
            <span className="text-xs text-muted-foreground">Last 7 days</span>
          </div>
          <div className="flex items-end justify-between h-32 gap-2">
            {weeklyData.map((data, index) => {
              const height = (data.clicks / maxClicks) * 100;
              return (
                <div key={data.day} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full relative" style={{ height: `${height}%` }}>
                    <div
                      className="w-full h-full rounded-t-md gradient-primary animate-fade-up"
                      style={{ animationDelay: `${index * 50}ms` }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground">{data.day}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Top Products - using recent transactions for demo */}
      <div className="px-4 py-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-foreground">Top Performers</h2>
          <button className="text-sm text-primary font-medium flex items-center" onClick={() => navigate("/marketplace")}>
            View all <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3">
          {(statsData?.recentTransactions?.slice(0, 3) ?? []).length > 0 ? (
            statsData?.recentTransactions?.slice(0, 3).map((tx, index) => (
              <div
                key={tx._id}
                className="flex items-center gap-3 bg-card rounded-xl p-3 shadow-card animate-slide-in-right"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center text-primary-foreground font-bold">
                  #{index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{tx.description}</p>
                  <p className="text-sm text-muted-foreground">{tx.type}</p>
                </div>
                <div className="text-right">
                  <p className={`font-bold ${tx.direction === 'credit' ? 'text-success' : 'text-destructive'}`}>
                    {tx.direction === 'credit' ? '+' : '-'}₦{tx.amount.toLocaleString()}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No transactions yet</p>
              <button onClick={() => navigate("/marketplace")} className="text-primary hover:underline text-sm">
                Start promoting products
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Leaderboard */}
      <div className="px-4 py-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-foreground">Top Affiliates</h2>
          <button className="text-sm text-primary font-medium flex items-center" onClick={() => navigate("/leaderboard")}>
            View all <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="bg-card rounded-xl p-4 shadow-card">
          <div className="space-y-3">
            {leaderboard.length > 0 ? (
              leaderboard.map((entry) => (
                <div key={entry.rank} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    entry.rank === 1 ? "gradient-gold text-accent-foreground" :
                    entry.rank === 2 ? "bg-muted text-muted-foreground" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {entry.rank}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{entry.user?.name ?? "Anonymous"}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-success">₦{entry.earnings.toLocaleString()}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-4">No leaderboard data yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Goal Tracker */}
      <div className="px-4 py-4">
        <div className="bg-card rounded-xl p-4 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground">Monthly Goal</h2>
            <span className="text-sm text-muted-foreground">₦500,000</span>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium text-foreground">₦472,500 / ₦500,000</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div className="gradient-primary h-2 rounded-full" style={{ width: "94.5%" }}></div>
            </div>
            <p className="text-xs text-muted-foreground text-center">27,500 to go!</p>
          </div>
        </div>
      </div>

      {/* Ad Section */}
      <div className="px-4 py-4">
        <div className="flex justify-center">
          <ContentAd />
        </div>
      </div>

      {/* Quick Action */}
      <div className="px-4 py-4">
        <button
          onClick={() => navigate("/marketplace")}
          className="w-full flex items-center justify-between p-4 rounded-xl gradient-gold text-accent-foreground shadow-lg"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-accent-foreground/10 flex items-center justify-center">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div className="text-left">
              <p className="font-semibold">Find New Products</p>
              <p className="text-sm opacity-80">Explore high-commission offers</p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <BottomNav />
      <StickyFooterAd />
    </div>
  );
};

export default DashboardPage;
