import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Timer, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuizTimerProps {
  totalSeconds: number;
  onTimeUp: () => void;
  isPaused?: boolean;
  className?: string;
}

export function QuizTimer({
  totalSeconds,
  onTimeUp,
  isPaused = false,
  className,
}: QuizTimerProps) {
  const [remainingSeconds, setRemainingSeconds] = useState(totalSeconds);
  const [hasEnded, setHasEnded] = useState(false);

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }, []);

  useEffect(() => {
    if (isPaused || hasEnded) return;

    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setHasEnded(true);
          onTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPaused, hasEnded, onTimeUp]);

  // Calculate warning states
  const percentRemaining = (remainingSeconds / totalSeconds) * 100;
  const isWarning = percentRemaining <= 25 && percentRemaining > 10;
  const isCritical = percentRemaining <= 10;

  const getColorClass = () => {
    if (isCritical) return "text-destructive";
    if (isWarning) return "text-amber-500";
    return "text-primary";
  };

  const getBgClass = () => {
    if (isCritical) return "bg-destructive/10 border-destructive/30";
    if (isWarning) return "bg-amber-500/10 border-amber-500/30";
    return "bg-primary/10 border-primary/30";
  };

  return (
    <motion.div
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-full border",
        getBgClass(),
        className
      )}
      animate={isCritical ? { scale: [1, 1.05, 1] } : {}}
      transition={isCritical ? { duration: 0.5, repeat: Infinity } : {}}
    >
      <AnimatePresence mode="wait">
        {isCritical ? (
          <motion.div
            key="warning"
            initial={{ rotate: 0 }}
            animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
            transition={{ duration: 0.5, repeat: Infinity }}
          >
            <AlertTriangle className={cn("h-5 w-5", getColorClass())} />
          </motion.div>
        ) : (
          <Timer key="timer" className={cn("h-5 w-5", getColorClass())} />
        )}
      </AnimatePresence>

      <span className={cn("font-mono font-bold text-lg", getColorClass())}>
        {formatTime(remainingSeconds)}
      </span>

      {/* Progress bar */}
      <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
        <motion.div
          className={cn(
            "h-full rounded-full",
            isCritical ? "bg-destructive" : isWarning ? "bg-amber-500" : "bg-primary"
          )}
          initial={{ width: "100%" }}
          animate={{ width: `${percentRemaining}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
    </motion.div>
  );
}

// Hook for quiz timing
export function useQuizTimer(timeLimitMinutes: number | null | undefined) {
  const [startTime] = useState(() => Date.now());
  const [isTimeUp, setIsTimeUp] = useState(false);

  const totalSeconds = timeLimitMinutes ? timeLimitMinutes * 60 : null;

  const handleTimeUp = useCallback(() => {
    setIsTimeUp(true);
  }, []);

  const getTimeSpentSeconds = useCallback(() => {
    return Math.floor((Date.now() - startTime) / 1000);
  }, [startTime]);

  return {
    totalSeconds,
    isTimeUp,
    handleTimeUp,
    getTimeSpentSeconds,
    hasTimeLimit: totalSeconds !== null && totalSeconds > 0,
  };
}
