import { useState, useEffect, useCallback } from "react";
import { Clock, AlertTriangle, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ModuleTimerProps {
  timeLimitMinutes: number;
  onTimeUp?: () => void;
  isPaused?: boolean;
  showPauseButton?: boolean;
  className?: string;
}

export function ModuleTimer({
  timeLimitMinutes,
  onTimeUp,
  isPaused: externalPaused = false,
  showPauseButton = true,
  className,
}: ModuleTimerProps) {
  const totalSeconds = timeLimitMinutes * 60;
  const [remainingSeconds, setRemainingSeconds] = useState(totalSeconds);
  const [isPaused, setIsPaused] = useState(externalPaused);

  useEffect(() => {
    if (isPaused || externalPaused) return;

    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onTimeUp?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPaused, externalPaused, onTimeUp]);

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }, []);

  const percentRemaining = (remainingSeconds / totalSeconds) * 100;
  const isWarning = remainingSeconds <= 300; // 5 minutes
  const isCritical = remainingSeconds <= 60; // 1 minute

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-2 rounded-xl border transition-all",
        isCritical
          ? "bg-destructive/10 border-destructive text-destructive animate-pulse"
          : isWarning
          ? "bg-amber-500/10 border-amber-500 text-amber-600"
          : "bg-muted/50 border-border text-foreground",
        className
      )}
    >
      {isCritical ? (
        <AlertTriangle className="h-5 w-5" />
      ) : (
        <Clock className="h-5 w-5" />
      )}

      <div className="flex-1">
        <div className="flex items-center justify-between">
          <span className="font-mono text-lg font-bold">
            {formatTime(remainingSeconds)}
          </span>
          <span className="text-xs text-muted-foreground">
            {Math.round(percentRemaining)}% remaining
          </span>
        </div>
        <div className="h-1.5 bg-muted rounded-full mt-1 overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-1000",
              isCritical
                ? "bg-destructive"
                : isWarning
                ? "bg-amber-500"
                : "bg-primary"
            )}
            style={{ width: `${percentRemaining}%` }}
          />
        </div>
      </div>

      {showPauseButton && !externalPaused && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setIsPaused(!isPaused)}
        >
          {isPaused ? (
            <Play className="h-4 w-4" />
          ) : (
            <Pause className="h-4 w-4" />
          )}
        </Button>
      )}
    </div>
  );
}

// Hook for module time tracking
export function useModuleTimeTracking(moduleId: string | undefined, timeLimitMinutes: number | undefined) {
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const [timeSpentSeconds, setTimeSpentSeconds] = useState(0);
  const [isTimeUp, setIsTimeUp] = useState(false);

  useEffect(() => {
    if (!moduleId) return;
    
    // Set start time when component mounts
    setStartedAt(new Date());

    // Track time spent
    const interval = setInterval(() => {
      setTimeSpentSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [moduleId]);

  const handleTimeUp = useCallback(() => {
    setIsTimeUp(true);
  }, []);

  const totalSeconds = timeLimitMinutes ? timeLimitMinutes * 60 : undefined;

  return {
    startedAt,
    timeSpentSeconds,
    isTimeUp,
    handleTimeUp,
    totalSeconds,
    hasTimeLimit: !!timeLimitMinutes,
  };
}
