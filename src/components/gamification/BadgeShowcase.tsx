import { AchievementCard } from "./AchievementCard";
import { cn } from "@/lib/utils";

interface Badge {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  category: string;
  xp_reward: number;
}

interface UserBadge {
  id: string;
  badge_id: string;
  earned_at: string;
  badge?: Badge;
}

interface BadgeShowcaseProps {
  allBadges: Badge[];
  userBadges: UserBadge[];
  maxDisplay?: number;
  showAll?: boolean;
  className?: string;
}

export function BadgeShowcase({
  allBadges,
  userBadges,
  maxDisplay = 6,
  showAll = false,
  className,
}: BadgeShowcaseProps) {
  const earnedBadgeIds = new Set(userBadges.map((ub) => ub.badge_id));

  // Sort: earned badges first, then by category
  const sortedBadges = [...allBadges].sort((a, b) => {
    const aEarned = earnedBadgeIds.has(a.id);
    const bEarned = earnedBadgeIds.has(b.id);
    if (aEarned && !bEarned) return -1;
    if (!aEarned && bEarned) return 1;
    return a.category.localeCompare(b.category);
  });

  const displayBadges = showAll ? sortedBadges : sortedBadges.slice(0, maxDisplay);
  const earnedCount = userBadges.length;
  const totalCount = allBadges.length;

  return (
    <div className={cn("space-y-3", className)}>
      {/* Header with count */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-muted-foreground">Achievements</h4>
        <span className="text-xs text-muted-foreground">
          {earnedCount}/{totalCount} earned
        </span>
      </div>

      {/* Badge grid */}
      <div className="flex flex-wrap gap-2 justify-center">
        {displayBadges.map((badge) => {
          const userBadge = userBadges.find((ub) => ub.badge_id === badge.id);
          return (
            <AchievementCard
              key={badge.id}
              name={badge.name}
              description={badge.description}
              icon={badge.icon}
              color={badge.color}
              earned={!!userBadge}
              earnedAt={userBadge?.earned_at}
              xpReward={badge.xp_reward}
              size="sm"
            />
          );
        })}
      </div>

      {/* Show more indicator */}
      {!showAll && allBadges.length > maxDisplay && (
        <p className="text-xs text-center text-muted-foreground">
          +{allBadges.length - maxDisplay} more badges to unlock
        </p>
      )}
    </div>
  );
}
