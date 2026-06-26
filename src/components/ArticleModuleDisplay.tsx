import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Clock, BookOpen, ChevronDown, ChevronUp } from "lucide-react";
import { ModuleTimer, useModuleTimeTracking } from "./gamification/ModuleTimer";
import { useFullscreen } from "@/hooks/useFullscreen";
import FullscreenButton from "@/components/FullscreenButton";

interface ArticleSection {
  title: string;
  content: string;
  imageUrl?: string;
  imageSuggestion?: string;
  callout?: {
    type: string;
    content: string;
  };
}

interface ArticleModuleDisplayProps {
  module: {
    title: string;
    description?: string;
    heroImageUrl?: string;
    heroImageSuggestion?: string;
    sections?: ArticleSection[];
    summary?: string;
    readingTimeMinutes?: number;
  };
  savedModuleId?: string;
  timeLimitMinutes?: number;
  onModuleComplete?: () => void;
}

export default function ArticleModuleDisplay({ 
  module, 
  savedModuleId, 
  timeLimitMinutes,
  onModuleComplete 
}: ArticleModuleDisplayProps) {
  const [expandedSections, setExpandedSections] = useState<Record<number, boolean>>({});
  const [scrollProgress, setScrollProgress] = useState(0);
  const { isTimeUp, handleTimeUp, hasTimeLimit } = useModuleTimeTracking(savedModuleId, timeLimitMinutes);
  const containerRef = useRef<HTMLDivElement>(null);
  const { isFullscreen, toggleFullscreen } = useFullscreen(containerRef as React.RefObject<HTMLElement>);

  const sections = module.sections || [];

  const toggleSection = (index: number) => {
    setExpandedSections(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const scrollPercentage = (element.scrollTop / (element.scrollHeight - element.clientHeight)) * 100;
    setScrollProgress(Math.min(100, Math.max(0, scrollPercentage)));
    if (scrollPercentage >= 95 && onModuleComplete) {
      onModuleComplete();
    }
  };

  const renderCallout = (callout: { type: string; content: string }) => {
    const calloutStyles: Record<string, string> = {
      tip: "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200",
      warning: "bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200",
      info: "bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200",
      note: "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300",
    };
    return (
      <div className={`p-4 rounded-lg border-l-4 ${calloutStyles[callout.type] || calloutStyles.note}`}>
        <p className="text-sm font-medium capitalize mb-1">{callout.type}</p>
        <p className="text-sm">{callout.content}</p>
      </div>
    );
  };

  if (sections.length === 0) {
    return (
      <div className="text-center py-16">
        <BookOpen className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">{module.title}</h2>
        <p className="text-muted-foreground">No article content available.</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`w-full ${isFullscreen ? "bg-background p-6 flex flex-col h-screen overflow-hidden" : ""}`}>
      {hasTimeLimit && timeLimitMinutes && !isFullscreen && (
        <div className="mb-4">
          <ModuleTimer timeLimitMinutes={timeLimitMinutes} onTimeUp={handleTimeUp} showPauseButton={true} />
        </div>
      )}

      {isTimeUp && (
        <Card className="fixed inset-0 z-50 flex items-center justify-center bg-background/95">
          <div className="text-center p-8">
            <Clock className="w-20 h-20 mx-auto text-destructive mb-6" />
            <h2 className="text-3xl font-bold mb-4">Time's Up!</h2>
            <p className="text-lg text-muted-foreground mb-6">The time limit for this module has expired.</p>
          </div>
        </Card>
      )}

      {/* Reading Progress */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm pb-2 mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-foreground">{module.title}</h1>
            {hasTimeLimit && timeLimitMinutes && (
              <Badge variant="outline" className="gap-1 text-xs">
                <Clock className="h-3 w-3" />
                {timeLimitMinutes} min
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {module.readingTimeMinutes && (
              <Badge variant="secondary" className="text-xs">~{module.readingTimeMinutes} min read</Badge>
            )}
            <FullscreenButton isFullscreen={isFullscreen} onToggle={toggleFullscreen} />
          </div>
        </div>
        <Progress value={scrollProgress} className="h-1" />
      </div>

      {/* Article Content */}
      <div 
        className={`overflow-y-auto pr-2 space-y-6 ${isFullscreen ? "flex-1" : "max-h-[70vh]"}`}
        onScroll={handleScroll}
      >
        {module.heroImageUrl && (
          <div className="w-full aspect-video rounded-lg overflow-hidden mb-6">
            <img src={module.heroImageUrl} alt={module.title} className="w-full h-full object-cover" />
          </div>
        )}

        {module.description && (
          <p className="text-lg text-muted-foreground leading-relaxed">{module.description}</p>
        )}

        {sections.map((section, index) => (
          <Card key={index} className="overflow-hidden">
            <button
              onClick={() => toggleSection(index)}
              className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-muted/50 transition-colors"
            >
              <h3 className="font-semibold text-foreground">{section.title}</h3>
              {expandedSections[index] ? (
                <ChevronUp className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              )}
            </button>
            
            {(expandedSections[index] !== false) && (
              <CardContent className="pt-0 pb-4">
                {section.imageUrl && (
                  <div className="w-full aspect-video rounded-lg overflow-hidden mb-4">
                    <img src={section.imageUrl} alt={section.title} className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">{section.content}</p>
                </div>
                {section.callout && (
                  <div className="mt-4">{renderCallout(section.callout)}</div>
                )}
              </CardContent>
            )}
          </Card>
        ))}

        {module.summary && (
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4">
              <h3 className="font-semibold text-primary mb-2">Summary</h3>
              <p className="text-sm text-muted-foreground">{module.summary}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
