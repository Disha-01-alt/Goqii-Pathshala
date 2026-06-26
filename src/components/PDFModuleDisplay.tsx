import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ZoomIn, ZoomOut, Download, Clock, CheckCircle } from "lucide-react";
import { ModuleTimer, useModuleTimeTracking } from "./gamification/ModuleTimer";
import { useUserRole } from "@/hooks/useUserRole";
import { useFullscreen } from "@/hooks/useFullscreen";
import FullscreenButton from "@/components/FullscreenButton";

interface PDFModuleDisplayProps {
  module: {
    title: string;
    fileUrl: string;
    fileName?: string;
  };
  savedModuleId?: string;
  timeLimitMinutes?: number;
  onModuleComplete?: () => void;
}

export default function PDFModuleDisplay({ module, savedModuleId, timeLimitMinutes, onModuleComplete }: PDFModuleDisplayProps) {
  const [zoom, setZoom] = useState(100);
  const [isComplete, setIsComplete] = useState(false);
  const { isAdmin } = useUserRole();
  const { isTimeUp, handleTimeUp, hasTimeLimit } = useModuleTimeTracking(savedModuleId, timeLimitMinutes);
  const containerRef = useRef<HTMLDivElement>(null);
  const { isFullscreen, toggleFullscreen } = useFullscreen(containerRef as React.RefObject<HTMLElement>);

  const handleMarkComplete = () => {
    setIsComplete(true);
    onModuleComplete?.();
  };

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = module.fileUrl;
    link.download = module.fileName || "document.pdf";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div ref={containerRef} className={`${isFullscreen ? "bg-background p-4 flex flex-col h-screen" : "max-w-6xl mx-auto p-4"}`}>
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

      {/* Header */}
      {!isFullscreen && (
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold text-foreground">{module.title}</h1>
              {hasTimeLimit && timeLimitMinutes && (
                <Badge variant="outline" className="gap-1">
                  <Clock className="h-3 w-3" />
                  {timeLimitMinutes} min
                </Badge>
              )}
            </div>
            {module.fileName && (
              <p className="text-sm text-muted-foreground">File: {module.fileName}</p>
            )}
          </div>
        </div>
      )}

      {/* Controls + PDF Viewer */}
      <Card className={`overflow-hidden ${isFullscreen ? "flex-1 flex flex-col" : ""}`}>
        <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/30">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setZoom(Math.max(zoom - 25, 50))} disabled={zoom <= 50}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground w-12 text-center">{zoom}%</span>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setZoom(Math.min(zoom + 25, 200))} disabled={zoom >= 200}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <div className="flex-1" />
          <FullscreenButton isFullscreen={isFullscreen} onToggle={toggleFullscreen} />
          {isAdmin && (
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleDownload}>
              <Download className="h-4 w-4" />
            </Button>
          )}
        </div>
        <CardContent className={`p-0 ${isFullscreen ? "flex-1" : ""}`}>
          <div
            className="relative bg-muted"
            style={{ height: isFullscreen ? "100%" : "calc(100vh - 200px)", overflow: "hidden" }}
          >
            <object
              data={`${module.fileUrl}#toolbar=0&navpanes=0&view=FitH&zoom=${zoom}`}
              type="application/pdf"
              className="w-full h-full"
              aria-label={module.title}
            >
              <iframe
                src={`https://docs.google.com/viewer?url=${encodeURIComponent(module.fileUrl)}&embedded=true`}
                className="w-full h-full border-0"
                title={module.title}
              />
              <div className="flex flex-col items-center justify-center h-full p-6 text-center gap-3">
                <p className="text-sm text-muted-foreground">
                  Your browser blocked the inline PDF preview.
                </p>
                <Button onClick={() => window.open(module.fileUrl, "_blank")}>
                  Open PDF in new tab
                </Button>
              </div>
            </object>
          </div>
        </CardContent>
      </Card>

      {/* Completion Button */}
      {!isFullscreen && (
        <div className="mt-4 flex justify-center">
          <Button
            onClick={handleMarkComplete}
            disabled={isComplete}
            className={isComplete ? "bg-green-600 hover:bg-green-600" : ""}
            size="lg"
          >
            <CheckCircle className="mr-2 h-5 w-5" />
            {isComplete ? "Completed" : "I've Finished Reading"}
          </Button>
        </div>
      )}
    </div>
  );
}
