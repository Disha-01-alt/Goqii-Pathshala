import { Button } from "@/components/ui/button";
import { Maximize, Minimize } from "lucide-react";

interface FullscreenButtonProps {
  isFullscreen: boolean;
  onToggle: () => void;
  className?: string;
  variant?: "ghost" | "outline" | "default";
  size?: "icon" | "sm" | "default";
}

export default function FullscreenButton({ 
  isFullscreen, 
  onToggle, 
  className = "",
  variant = "outline",
  size = "icon"
}: FullscreenButtonProps) {
  return (
    <Button variant={variant} size={size} onClick={onToggle} className={className} title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}>
      {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
    </Button>
  );
}
