import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Clock, FileText, BookOpen, CheckCircle, Lightbulb, Quote } from "lucide-react";
import { ModuleTimer, useModuleTimeTracking } from "./gamification/ModuleTimer";
import { useFullscreen } from "@/hooks/useFullscreen";
import FullscreenButton from "@/components/FullscreenButton";

interface DocumentSection {
  title: string;
  content: string;
  bulletPoints?: string[];
  imageUrl?: string;
  imageSuggestion?: string;
}

interface Definition {
  term: string;
  definition: string;
}

interface DocumentModuleDisplayProps {
  module: {
    title: string;
    description?: string;
    sections?: DocumentSection[];
    definitions?: Definition[];
    learning_objectives?: string[];
    key_points?: string[];
    recap?: string;
    summary?: string;
    content_summary?: {
      overview?: string;
      keyTakeaways?: string[];
    };
  };
  savedModuleId?: string;
  timeLimitMinutes?: number;
  onModuleComplete?: () => void;
}

export default function DocumentModuleDisplay({ 
  module, 
  savedModuleId, 
  timeLimitMinutes,
  onModuleComplete 
}: DocumentModuleDisplayProps) {
  const [scrollProgress, setScrollProgress] = useState(0);
  const { isTimeUp, handleTimeUp, hasTimeLimit } = useModuleTimeTracking(savedModuleId, timeLimitMinutes);
  const containerRef = useRef<HTMLDivElement>(null);
  const { isFullscreen, toggleFullscreen } = useFullscreen(containerRef as React.RefObject<HTMLElement>);

  const sections = module.sections || [];
  const definitions = module.definitions || [];
  const learningObjectives = module.learning_objectives || [];
  const keyPoints = module.key_points || module.content_summary?.keyTakeaways || [];

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const scrollPercentage = (element.scrollTop / (element.scrollHeight - element.clientHeight)) * 100;
    setScrollProgress(Math.min(100, Math.max(0, scrollPercentage)));
    
    if (scrollPercentage >= 95 && onModuleComplete) {
      onModuleComplete();
    }
  };

  if (sections.length === 0 && definitions.length === 0 && !module.content_summary?.overview) {
    return (
      <div className="text-center py-16">
        <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">{module.title}</h2>
        <p className="text-muted-foreground">No document content available.</p>
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
          <FullscreenButton isFullscreen={isFullscreen} onToggle={toggleFullscreen} />
        </div>
        <Progress value={scrollProgress} className="h-1" />
      </div>

      {/* Document Content */}
      <div 
        className={`overflow-y-auto pr-2 space-y-6 ${isFullscreen ? "flex-1" : "max-h-[70vh]"}`}
        onScroll={handleScroll}
      >
        {(module.description || module.content_summary?.overview) && (
          <Card className="bg-muted/30">
            <CardContent className="p-4">
              <p className="text-muted-foreground leading-relaxed">
                {module.description || module.content_summary?.overview}
              </p>
            </CardContent>
          </Card>
        )}

        {learningObjectives.length > 0 && (
          <Card className="border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-primary">Learning Objectives</h3>
              </div>
              <ul className="space-y-2">
                {learningObjectives.map((objective, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                    <span>{objective}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {definitions.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Key Terms</h3>
              </div>
              <Accordion type="multiple" className="w-full">
                {definitions.map((def, idx) => (
                  <AccordionItem key={idx} value={`def-${idx}`}>
                    <AccordionTrigger className="text-sm font-medium">{def.term}</AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground">{def.definition}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        )}

        {sections.map((section, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <h3 className="font-semibold text-lg mb-3">{section.title}</h3>
              {section.imageUrl && (
                <div className="w-full aspect-video rounded-lg overflow-hidden mb-4">
                  <img src={section.imageUrl} alt={section.title} className="w-full h-full object-cover" />
                </div>
              )}
              <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed mb-4">{section.content}</p>
              {section.bulletPoints && section.bulletPoints.length > 0 && (
                <ul className="space-y-1.5 ml-4">
                  {section.bulletPoints.map((point, pIdx) => (
                    <li key={pIdx} className="flex items-start gap-2 text-sm">
                      <span className="text-primary mt-1">•</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        ))}

        {keyPoints.length > 0 && (
          <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Quote className="h-5 w-5 text-amber-600" />
                <h3 className="font-semibold text-amber-800 dark:text-amber-200">Key Takeaways</h3>
              </div>
              <ul className="space-y-2">
                {keyPoints.map((point, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-amber-900 dark:text-amber-100">
                    <span className="text-amber-600 mt-1">→</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {(module.recap || module.summary) && (
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4">
              <h3 className="font-semibold text-primary mb-2">Summary</h3>
              <p className="text-sm text-muted-foreground">{module.recap || module.summary}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
