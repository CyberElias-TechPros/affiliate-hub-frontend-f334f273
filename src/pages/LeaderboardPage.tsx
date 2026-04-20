import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Trophy, Loader2, Medal } from "lucide-react";
import { BottomNav } from "@/components/layout/BottomNav";
import { StatsAPI } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

const LeaderboardPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: () => StatsAPI.leaderboard(20),
  });

  const leaderboard = data ?? [];
  const currentUserRank = leaderboard.find((e) => e.user?._id === user?._id)?.rank;

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
          <h1 className="text-lg font-semibold font-display">Leaderboard</h1>
        </div>
      </div>

      {/* Top 3 */}
      <div className="px-4 py-6">
        <div className="flex items-end justify-center gap-4">
          {/* 2nd Place */}
          {leaderboard[1] && (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-muted-foreground/20 flex items-center justify-center mx-auto mb-2">
                <Medal className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="font-medium text-foreground truncate max-w-[80px]">
                {leaderboard[1].user?.name ?? "Anonymous"}
              </p>
              <p className="text-sm font-bold text-muted-foreground">
                ₦{leaderboard[1].earnings.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">#2</p>
            </div>
          )}

          {/* 1st Place */}
          {leaderboard[0] && (
            <div className="text-center -mt-4">
              <div className="w-20 h-20 rounded-full gradient-gold flex items-center justify-center mx-auto mb-2 shadow-lg">
                <Trophy className="h-10 w-10 text-accent-foreground" />
              </div>
              <p className="font-medium text-foreground truncate max-w-[100px]">
                {leaderboard[0].user?.name ?? "Anonymous"}
              </p>
              <p className="text-sm font-bold text-accent">
                ₦{leaderboard[0].earnings.toLocaleString()}
              </p>
              <p className="text-xs text-accent">#1</p>
            </div>
          )}

          {/* 3rd Place */}
          {leaderboard[2] && (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-warning/20 flex items-center justify-center mx-auto mb-2">
                <Medal className="h-8 w-8 text-warning" />
              </div>
              <p className="font-medium text-foreground truncate max-w-[80px]">
                {leaderboard[2].user?.name ?? "Anonymous"}
              </p>
              <p className="text-sm font-bold text-warning">
                ₦{leaderboard[2].earnings.toLocaleString()}
              </p>
              <p className="text-xs text-warning">#3</p>
            </div>
          )}
        </div>
      </div>

      {/* Current User Rank */}
      {currentUserRank && currentUserRank > 3 && (
        <div className="px-4 py-2">
          <div className="bg-primary/10 rounded-xl p-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center font-bold text-sm text-primary-foreground">
              {currentUserRank}
            </div>
            <div className="flex-1">
              <p className="font-medium text-primary">Your Rank</p>
            </div>
            <p className="font-bold text-primary">
              #{currentUserRank}
            </p>
          </div>
        </div>
      )}

      {/* Full Leaderboard */}
      <div className="px-4 py-4">
        <div className="bg-card rounded-xl shadow-card overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
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
                    entry.rank === 1
                      ? "gradient-gold text-accent-foreground"
                      : entry.rank === 2
                      ? "bg-muted-foreground/20 text-muted-foreground"
                      : entry.rank === 3
                      ? "bg-warning/20 text-warning"
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {entry.rank}
                  </div>
                  <div className="flex-1">
                    <p className={`font-medium ${isCurrentUser ? "text-primary" : "text-foreground"}`}>
                      {entry.user?.name ?? "Anonymous"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-foreground">
                      ₦{entry.earnings.toLocaleString()}
                    </p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No leaderboard data yet</p>
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default LeaderboardPage;