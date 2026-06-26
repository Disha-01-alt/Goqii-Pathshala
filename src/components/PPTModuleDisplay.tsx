import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, Presentation, ExternalLink, Clock, Video } from "lucide-react";
import { ModuleTimer, useModuleTimeTracking } from "./gamification/ModuleTimer";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import VideoGenerationProgress from "./VideoGenerationProgress";

interface PPTModuleDisplayProps {
  module: {
    title: string;
    fileUrl: string;
    fileName?: string;
  };
  savedModuleId?: string;
  timeLimitMinutes?: number;
}

export default function PPTModuleDisplay({ module, savedModuleId, timeLimitMinutes }: PPTModuleDisplayProps) {
  // Time tracking for modules with time limits
  const { isTimeUp, handleTimeUp, hasTimeLimit } = useModuleTimeTracking(savedModuleId, timeLimitMinutes);
  const { isAdmin, isSME, isSMEExpert } = useUserRole();
  const canConvert = isAdmin || isSME || isSMEExpert;
  const [speakerNotes, setSpeakerNotes] = useState<any[]>([]);
  const [showVideo, setShowVideo] = useState(false);

  useEffect(() => {
    if (!savedModuleId || !canConvert) return;
    supabase
      .from("modules")
      .select("slides")
      .eq("id", savedModuleId)
      .maybeSingle()
      .then(({ data }) => {
        const notes = (data?.slides as any)?.speakerNotes;
        if (Array.isArray(notes)) setSpeakerNotes(notes);
      });
  }, [savedModuleId, canConvert]);

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = module.fileUrl;
    link.download = module.fileName || "presentation.pptx";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenInNewTab = () => {
    window.open(module.fileUrl, "_blank");
  };

  // Use Microsoft Office Online viewer for PPTX files
  const getEmbedUrl = () => {
    const encodedUrl = encodeURIComponent(module.fileUrl);
    return `https://view.officeapps.live.com/op/embed.aspx?src=${encodedUrl}`;
  };

  return (
    <div className="w-full">
      {/* Module Timer for time-limited modules */}
      {hasTimeLimit && timeLimitMinutes && (
        <div className="mb-4">
          <ModuleTimer
            timeLimitMinutes={timeLimitMinutes}
            onTimeUp={handleTimeUp}
            showPauseButton={true}
          />
        </div>
      )}

      {/* Time's up overlay */}
      {isTimeUp && (
        <Card className="fixed inset-0 z-50 flex items-center justify-center bg-background/95">
          <div className="text-center p-8">
            <Clock className="w-20 h-20 mx-auto text-destructive mb-6" />
            <h2 className="text-3xl font-bold mb-4">Time's Up!</h2>
            <p className="text-lg text-muted-foreground mb-6">
              The time limit for this module has expired.
            </p>
          </div>
        </Card>
      )}

      {/* Header - compact */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-lg font-bold text-foreground">{module.title}</h1>
            {hasTimeLimit && timeLimitMinutes && (
              <Badge variant="outline" className="gap-1 text-xs">
                <Clock className="h-3 w-3" />
                {timeLimitMinutes} min
              </Badge>
            )}
          </div>
          {module.fileName && (
            <p className="text-xs text-muted-foreground">{module.fileName}</p>
          )}
        </div>
        
        {/* Controls */}
        <div className="flex items-center gap-2">
          {canConvert && savedModuleId && speakerNotes.length > 0 && (
            <Button
              variant="default"
              size="sm"
              onClick={() => setShowVideo((v) => !v)}
              title={`Generate narrated MP4 from ${speakerNotes.length} slides with speaker notes`}
            >
              <Video className="mr-1.5 h-3.5 w-3.5" />
              {showVideo ? "Hide Video Panel" : "Convert to Video"}
            </Button>
          )}
          {isAdmin && (
            <>
              <Button variant="outline" size="sm" onClick={handleOpenInNewTab}>
                <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                Open
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="mr-1.5 h-3.5 w-3.5" />
                Download
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Convert to Video panel */}
      {showVideo && savedModuleId && (
        <div className="mb-3">
          <VideoGenerationProgress
            moduleId={savedModuleId}
            scenes={speakerNotes}
            endpoint="uploaded"
          />
        </div>
      )}

      {/* Presentation Viewer - controlled sizing */}
      <Card className="overflow-hidden">
        <CardContent className="p-0 flex justify-center bg-muted/50">
          <div 
            className="relative w-full"
            style={{ 
              maxWidth: "75%",
              aspectRatio: "4/3"
            }}
          >
            <iframe
              src={getEmbedUrl()}
              className="absolute inset-0 w-full h-full border-0"
              title={module.title}
              allowFullScreen
              style={{
                minHeight: "520px",
                maxHeight: "620px"
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Fallback Message - compact */}
      <div className="mt-3 p-3 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-2">
          <Presentation className="h-4 w-4 text-muted-foreground shrink-0" />
          <p className="text-xs text-muted-foreground">
            {isAdmin 
              ? "If the presentation doesn't load, download it to view locally."
              : "If the presentation doesn't load, please contact an administrator."}
          </p>
        </div>
      </div>
    </div>
  );
}