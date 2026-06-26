import { motion } from "framer-motion";
import { Flame, Snowflake } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface StreakBadgeProps {
  currentStreak: number;
  longestStreak: number;
  freezeAvailable?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function StreakBadge({
  currentStreak,
  longestStreak,
  freezeAvailable = false,
  size = "md",
  className,
}: StreakBadgeProps) {
  const sizeConfig = {
    sm: { icon: "h-5 w-5", text: "text-lg", container: "p-2" },
    md: { icon: "h-7 w-7", text: "text-2xl", container: "p-3" },
    lg: { icon: "h-9 w-9", text: "text-3xl", container: "p-4" },
  };

  const config = sizeConfig[size];

  // Determine flame color based on streak
  const getFlameColor = () => {
    if (currentStreak >= 30) return "text-amber-400";
    if (currentStreak >= 7) return "text-orange-500";
    if (currentStreak >= 3) return "text-orange-400";
    return "text-orange-300";
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            "relative flex flex-col items-center gap-1 rounded-xl bg-gradient-to-br from-orange-500/10 to-amber-500/10 border border-orange-500/20",
            config.container,
            className
          )}
        >
          {/* Animated flame */}
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
              rotate: [0, 5, -5, 0],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <Flame className={cn(config.icon, getFlameColor())} />
          </motion.div>

          {/* Streak count */}
          <span className={cn("font-bold", config.text, getFlameColor())}>
            {currentStreak}
          </span>

          <span className="text-xs text-muted-foreground">day streak</span>

          {/* Freeze indicator */}
          {freezeAvailable && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 bg-cyan-500 rounded-full p-1"
            >
              <Snowflake className="h-3 w-3 text-white" />
            </motion.div>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <div className="text-sm">
          <p className="font-semibold">🔥 {currentStreak} Day Streak!</p>
          <p className="text-muted-foreground">Longest: {longestStreak} days</p>
          {freezeAvailable && (
            <p className="text-cyan-400 mt-1">❄️ Streak freeze available</p>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
