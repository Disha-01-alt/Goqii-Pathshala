import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";

interface XPMeterProps {
  currentXP: number;
  xpProgress: number;
  currentLevel: number;
  levelTitle: string;
  xpToNextLevel: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function XPMeter({
  currentXP,
  xpProgress,
  currentLevel,
  levelTitle,
  xpToNextLevel,
  size = "md",
  className,
}: XPMeterProps) {
  const sizeConfig = {
    sm: {
      container: "w-24 h-24",
      ring: 80,
      stroke: 6,
      levelText: "text-lg",
      xpText: "text-xs",
    },
    md: {
      container: "w-32 h-32",
      ring: 110,
      stroke: 8,
      levelText: "text-2xl",
      xpText: "text-sm",
    },
    lg: {
      container: "w-40 h-40",
      ring: 140,
      stroke: 10,
      levelText: "text-3xl",
      xpText: "text-base",
    },
  };

  const config = sizeConfig[size];
  const radius = (config.ring - config.stroke) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (xpProgress / 100) * circumference;

  return (
    <div className={cn("relative flex flex-col items-center", className)}>
      <div className={cn("relative", config.container)}>
        {/* Background circle */}
        <svg className="w-full h-full -rotate-90" viewBox={`0 0 ${config.ring} ${config.ring}`}>
          <circle
            cx={config.ring / 2}
            cy={config.ring / 2}
            r={radius}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth={config.stroke}
          />
          {/* Progress circle */}
          <motion.circle
            cx={config.ring / 2}
            cy={config.ring / 2}
            r={radius}
            fill="none"
            stroke="url(#xpGradient)"
            strokeWidth={config.stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
          <defs>
            <linearGradient id="xpGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="hsl(270, 70%, 60%)" />
              <stop offset="100%" stopColor="hsl(300, 70%, 60%)" />
            </linearGradient>
          </defs>
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="flex items-center gap-1"
          >
            <Sparkles className="h-4 w-4 text-[hsl(270,70%,60%)]" />
            <span className={cn("font-bold text-[hsl(270,70%,60%)]", config.levelText)}>
              {currentLevel}
            </span>
          </motion.div>
          <span className="text-xs text-muted-foreground font-medium">{levelTitle}</span>
        </div>
      </div>

      {/* XP Text */}
      <div className="mt-2 text-center">
        <p className={cn("font-semibold text-foreground", config.xpText)}>
          {currentXP.toLocaleString()} XP
        </p>
        <p className="text-xs text-muted-foreground">
          {xpToNextLevel > 0 ? `${xpToNextLevel} XP to next level` : "Max Level!"}
        </p>
      </div>
    </div>
  );
}
