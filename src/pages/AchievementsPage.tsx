import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Trophy, Flame, Loader2, Lock } from "lucide-react";
import { BottomNav } from "@/components/layout/BottomNav";
import { AchievementAPI } from "@/lib/api";

const AchievementsPage = () => {
  const navigate = useNavigate();

  const { data: achievementsData, isLoading: achLoading } = useQuery({
    queryKey: ["achievements"],
    queryFn: AchievementAPI.list,
  });

  const { data: streakData, isLoading: streakLoading } = useQuery({
    queryKey: ["streak"],
    queryFn: AchievementAPI.streak,
  });

  const achievements = achievementsData?.items ?? [];
  const streak = streakData;
  const isLoading = achLoading || streakLoading;

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
          <h1 className="text-lg font-semibold font-display">Achievements</h1>
        </div>
      </div>

      {/* Streak Section */}
      <div className="px-4 py-4">
        <div className="bg-card rounded-xl p-6 shadow-card">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full gradient-gold flex items-center justify-center">
              <Flame className="h-8 w-8 text-accent-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Current Streak</p>
              <p className="text-3xl font-bold text-foreground">
                {streak?.current ?? 0} days
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-muted-foreground">Longest Streak</p>
              <p className="font-bold text-foreground">{streak?.longest ?? 0} days</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-muted-foreground">Last Active</p>
              <p className="font-bold text-foreground">
                {streak?.lastActiveDate
                  ? new Date(streak.lastActiveDate).toLocaleDateString()
                  : "Never"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Achievements Section */}
      <div className="px-4 py-4">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="h-5 w-5 text-accent" />
          <h2 className="font-semibold text-foreground">Badges</h2>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : achievements.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {achievements.map((achievement) => {
              const progress = achievement.target > 0 
                ? (achievement.progress / achievement.target) * 100 
                : 0;
              
              return (
                <div
                  key={achievement.code}
                  className={`p-4 rounded-xl shadow-card ${
                    achievement.unlocked
                      ? "gradient-gold"
                      : "bg-card"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {achievement.unlocked ? (
                      <Trophy className="h-5 w-5 text-accent-foreground" />
                    ) : (
                      <Lock className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <p className={`font-medium ${
                    achievement.unlocked 
                      ? "text-accent-foreground" 
                      : "text-foreground"
                  }`}>
                    {achievement.title}
                  </p>
                  <p className={`text-sm ${
                    achievement.unlocked 
                      ? "text-accent-foreground/80" 
                      : "text-muted-foreground"
                  }`}>
                    {achievement.description}
                  </p>
                  {!achievement.unlocked && (
                    <div className="mt-3">
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="h-2 rounded-full bg-primary"
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {achievement.progress} / {achievement.target}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No achievements yet</p>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default AchievementsPage;