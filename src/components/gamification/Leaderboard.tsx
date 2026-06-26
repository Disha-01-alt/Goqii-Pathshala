import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getLevelTitle } from "@/hooks/useGamification";
import { cn } from "@/lib/utils";
import { Trophy, Medal, Award, User } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface LeaderboardEntry {
  user_id: string;
  total_xp: number;
  current_level: number;
  xp_this_week: number;
  profile?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface LeaderboardProps {
  limit?: number;
  className?: string;
}

export function Leaderboard({ limit = 5, className }: LeaderboardProps) {
  const { user } = useAuth();

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["leaderboard", limit],
    queryFn: async (): Promise<LeaderboardEntry[]> => {
      // Get user_xp with profiles - but since we can't join auth.users, 
      // we'll need to fetch profiles separately
      const { data: xpData, error: xpError } = await supabase
        .from("user_xp")
        .select("*")
        .order("xp_this_week", { ascending: false })
        .limit(limit);

      if (xpError) {
        console.error("Error fetching leaderboard:", xpError);
        return [];
      }

      if (!xpData || xpData.length === 0) return [];

      // Fetch profiles for these users
      const userIds = xpData.map(entry => entry.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", userIds);

      const profileMap = new Map(
        profiles?.map(p => [p.id, { full_name: p.full_name, avatar_url: p.avatar_url }]) || []
      );

      return xpData.map(entry => ({
        ...entry,
        profile: profileMap.get(entry.user_id) || { full_name: null, avatar_url: null }
      }));
    },
  });

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Award className="h-5 w-5 text-amber-600" />;
      default:
        return (
          <span className="w-5 h-5 flex items-center justify-center text-sm font-medium text-muted-foreground">
            {rank}
          </span>
        );
    }
  };

  if (isLoading) {
    return (
      <div className={cn("space-y-3", className)}>
        {[...Array(limit)].map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className={cn("text-center py-6", className)}>
        <Trophy className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No learners yet this week</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {entries.map((entry, index) => {
        const isCurrentUser = entry.user_id === user?.id;
        const rank = index + 1;

        return (
          <div
            key={entry.user_id}
            className={cn(
              "flex items-center gap-3 p-2 rounded-lg transition-colors",
              isCurrentUser
                ? "bg-primary/10 border border-primary/20"
                : "hover:bg-muted/50"
            )}
          >
            {/* Rank */}
            <div className="flex-shrink-0">{getRankIcon(rank)}</div>

            {/* Avatar */}
            <div className="flex-shrink-0">
              {entry.profile?.avatar_url ? (
                <img
                  src={entry.profile.avatar_url}
                  alt=""
                  className="h-8 w-8 rounded-full object-cover"
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
            </div>

            {/* Name & Level */}
            <div className="flex-1 min-w-0">
              <p className={cn(
                "text-sm font-medium truncate",
                isCurrentUser && "text-primary"
              )}>
                {entry.profile?.full_name || "Anonymous"}
                {isCurrentUser && " (You)"}
              </p>
              <p className="text-xs text-muted-foreground">
                Level {entry.current_level} • {getLevelTitle(entry.current_level)}
              </p>
            </div>

            {/* XP this week */}
            <div className="flex-shrink-0 text-right">
              <p className="text-sm font-semibold text-[hsl(270,70%,60%)]">
                {entry.xp_this_week.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">XP this week</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
