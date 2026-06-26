import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { 
  Trophy, 
  Medal, 
  Crown, 
  Flame, 
  Zap, 
  Star, 
  Target, 
  Brain, 
  Timer,
  Sunrise,
  Clock,
  Award,
  CheckCircle
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AchievementCardProps {
  name: string;
  description: string | null;
  icon: string;
  color: string;
  earned?: boolean;
  earnedAt?: string;
  xpReward?: number;
  size?: "sm" | "md";
  className?: string;
}

const iconMap: Record<string, React.ComponentType<any>> = {
  trophy: Trophy,
  medal: Medal,
  crown: Crown,
  flame: Flame,
  zap: Zap,
  star: Star,
  target: Target,
  brain: Brain,
  timer: Timer,
  sunrise: Sunrise,
  clock: Clock,
  award: Award,
  "check-circle": CheckCircle,
};

export function AchievementCard({
  name,
  description,
  icon,
  color,
  earned = false,
  earnedAt,
  xpReward,
  size = "md",
  className,
}: AchievementCardProps) {
  const IconComponent = iconMap[icon] || Award;

  const sizeConfig = {
    sm: {
      container: "w-14 h-14",
      icon: "h-6 w-6",
      padding: "p-3",
    },
    md: {
      container: "w-20 h-20",
      icon: "h-8 w-8",
      padding: "p-4",
    },
  };

  const config = sizeConfig[size];

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <motion.div
          initial={earned ? { scale: 0.8, opacity: 0 } : {}}
          animate={earned ? { scale: 1, opacity: 1 } : {}}
          whileHover={{ scale: earned ? 1.1 : 1.02 }}
          className={cn(
            "relative flex flex-col items-center justify-center rounded-xl transition-all cursor-pointer",
            config.container,
            config.padding,
            earned
              ? "bg-gradient-to-br shadow-lg"
              : "bg-muted/50 opacity-40 grayscale",
            className
          )}
          style={{
            background: earned
              ? `linear-gradient(135deg, ${color}20, ${color}40)`
              : undefined,
            borderColor: earned ? color : undefined,
            border: earned ? `2px solid ${color}30` : "2px solid transparent",
          }}
        >
          <IconComponent
            className={cn(config.icon)}
            style={{ color: earned ? color : "currentColor" }}
          />
          
          {/* Sparkle effect for earned badges */}
          {earned && (
            <motion.div
              className="absolute inset-0 rounded-xl pointer-events-none"
              animate={{
                boxShadow: [
                  `0 0 0 0 ${color}00`,
                  `0 0 20px 5px ${color}40`,
                  `0 0 0 0 ${color}00`,
                ],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          )}
        </motion.div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-[200px]">
        <div className="text-sm">
          <p className="font-semibold flex items-center gap-1">
            {earned && "✨"} {name}
          </p>
          {description && (
            <p className="text-muted-foreground mt-1">{description}</p>
          )}
          {xpReward && xpReward > 0 && (
            <p className="text-[hsl(270,70%,60%)] mt-1">+{xpReward} XP</p>
          )}
          {earned && earnedAt && (
            <p className="text-xs text-muted-foreground mt-2">
              Earned {new Date(earnedAt).toLocaleDateString()}
            </p>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
