import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Eye, ShoppingCart, Target, TrendingUp, Trophy } from "lucide-react";
import { BottomNav } from "@/components/layout/BottomNav";
import { StatsAPI } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

const StatsPage = () => {
  const { user } = useAuth();

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: StatsAPI.dashboard,
  });

  const { data: performanceData, isLoading: perfLoading } = useQuery({
    queryKey: ["performance", "7d"],
    queryFn: () => StatsAPI.performance("7d"),
  });

  const { data: leaderboardData, isLoading: lbLoading } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: () => StatsAPI.leaderboard(10),
  });

  const stats = statsData;
  const performance = performanceData?.points ?? [];
  const leaderboard = leaderboardData ?? [];

  const chartData = performance.length > 0 
    ? performance.map((p) => ({ 
        day: new Date(p.date).toLocaleDateString("en", { weekday: "short" }), 
        clicks: p.clicks, 
        conversions: p.conversions 
      }))
    : [
        { day: "Mon", clicks: 0, conversions: 0 },
        { day: "Tue", clicks: 0, conversions: 0 },
        { day: "Wed", clicks: 0, conversions: 0 },
        { day: "Thu", clicks: 0, conversions: 0 },
        { day: "Fri", clicks: 0, conversions: 0 },
        { day: "Sat", clicks: 0, conversions: 0 },
        { day: "Sun", clicks: 0, conversions: 0 },
      ];

  const maxClicks = Math.max(...chartData.map((d) => d.clicks), 1);
  const maxSales = Math.max(...chartData.map((d) => d.conversions), 1);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-2xl font-bold font-display text-foreground">Performance</h1>
        <p className="text-muted-foreground">Track your affiliate stats</p>
      </div>

      {/* Stats Overview */}
      <div className="px-4 py-2">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card rounded-xl p-4 shadow-card">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Eye className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm text-muted-foreground">Total Clicks</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stats?.totalClicks?.toLocaleString() ?? "0"}</p>
            <p className="text-xs text-muted-foreground">All time</p>
          </div>
          <div className="bg-card rounded-xl p-4 shadow-card">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
                <ShoppingCart className="h-4 w-4 text-success" />
              </div>
              <span className="text-sm text-muted-foreground">Conversions</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stats?.totalConversions?.toLocaleString() ?? "0"}</p>
            <p className="text-xs text-muted-foreground">All time</p>
          </div>
          <div className="bg-card rounded-xl p-4 shadow-card">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                <Target className="h-4 w-4 text-accent" />
              </div>
              <span className="text-sm text-muted-foreground">Conv. Rate</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stats?.conversionRate?.toFixed(1) ?? "0"}%</p>
            <p className="text-xs text-muted-foreground">All time</p>
          </div>
          <div className="bg-card rounded-xl p-4 shadow-card">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-warning" />
              </div>
              <span className="text-sm text-muted-foreground">Earnings</span>
            </div>
            <p className="text-2xl font-bold text-foreground">₦{stats?.totalEarnings?.toLocaleString() ?? "0"}</p>
            <p className="text-xs text-muted-foreground">All time</p>
          </div>
        </div>
      </div>

      {/* Weekly Chart */}
      <div className="px-4 py-4">
        <div className="bg-card rounded-xl p-4 shadow-card">
          <h2 className="font-semibold text-foreground mb-4">Weekly Performance</h2>
          
          <div className="flex gap-4 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full gradient-primary" />
              <span className="text-sm text-muted-foreground">Clicks</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-success" />
              <span className="text-sm text-muted-foreground">Sales</span>
            </div>
          </div>

          <div className="flex items-end justify-between h-40 gap-2">
            {chartData.map((data, index) => {
              const clickHeight = (data.clicks / maxClicks) * 100;
              const saleHeight = (data.conversions / maxSales) * 100;
              return (
                <div key={data.day} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full flex gap-0.5 items-end" style={{ height: "120px" }}>
                    <div
                      className="flex-1 rounded-t-sm gradient-primary animate-fade-up"
                      style={{ height: `${clickHeight}%`, animationDelay: `${index * 50}ms` }}
                    />
                    <div
                      className="flex-1 rounded-t-sm bg-success animate-fade-up"
                      style={{ height: `${saleHeight}%`, animationDelay: `${index * 50 + 25}ms` }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground">{data.day}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="px-4 py-4">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="h-5 w-5 text-accent" />
          <h2 className="font-semibold text-foreground">Top Affiliates</h2>
        </div>
        <div className="bg-card rounded-xl shadow-card overflow-hidden">
          {lbLoading ? (
            <div className="p-4 text-center text-muted-foreground">Loading...</div>
          ) : leaderboard.length > 0 ? (
            leaderboard.map((entry) => {
              const isCurrentUser = entry.user?._id === user?._id;
              return (
                <div
                  key={entry.rank}
                  className={`flex items-center gap-3 p-4 border-b border-border last:border-0 ${
                    isCurrentUser ? "bg-primary/5" : ""
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                    entry.rank === 1 ? "gradient-gold text-accent-foreground" :
                    entry.rank === 2 ? "bg-muted-foreground/20 text-muted-foreground" :
                    entry.rank === 3 ? "bg-warning/20 text-warning" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {entry.rank}
                  </div>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm ${
                    isCurrentUser ? "gradient-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}>
                    {entry.user?.name?.charAt(0) ?? "?"}
                  </div>
                  <div className="flex-1">
                    <p className={`font-medium ${isCurrentUser ? "text-primary" : "text-foreground"}`}>
                      {entry.user?.name ?? "Anonymous"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-foreground">₦{entry.earnings.toLocaleString()}</p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-4 text-center text-muted-foreground">No leaderboard data yet</div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default StatsPage;
