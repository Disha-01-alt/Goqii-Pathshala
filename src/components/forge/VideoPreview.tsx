import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Video, Clock, PlayCircle } from "lucide-react";

interface VideoScene {
  sceneNumber: number;
  sceneTitle?: string;
  narration: string;
  visualDescription?: string;
}

interface VideoContent {
  title?: string;
  totalDuration?: string;
  scenes?: VideoScene[];
}

interface VideoPreviewProps {
  content: VideoContent | any;
}

export default function VideoPreview({ content }: VideoPreviewProps) {
  if (!content || (typeof content === 'object' && Object.keys(content).length === 0)) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No video script generated yet
      </div>
    );
  }

  // Handle string content
  if (typeof content === 'string') {
    return (
      <ScrollArea className="h-[400px] pr-4">
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <div className="whitespace-pre-wrap">{content}</div>
        </div>
      </ScrollArea>
    );
  }

  return (
    <ScrollArea className="h-[400px] pr-4">
      <div className="space-y-4">
        {/* Video Header */}
        <div className="flex items-center justify-between border-b pb-4">
          <div className="flex items-center gap-3">
            <Video className="h-6 w-6 text-primary" />
            <div>
              <h2 className="font-bold text-lg">{content.title || "Video Script"}</h2>
              <p className="text-sm text-muted-foreground">
                {content.scenes?.length || 0} scenes
              </p>
            </div>
          </div>
          {content.totalDuration && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{content.totalDuration}</span>
            </div>
          )}
        </div>

        {/* Scenes */}
        {content.scenes?.map((scene: VideoScene, idx: number) => (
          <Card key={idx} className="overflow-hidden">
            <CardContent className="p-0">
              <div className="flex">
                {/* Scene Number */}
                <div className="bg-primary text-primary-foreground w-16 flex flex-col items-center justify-center p-3">
                  <PlayCircle className="h-5 w-5 mb-1" />
                  <span className="text-xs font-bold">
                    Scene {scene.sceneNumber || idx + 1}
                  </span>
                </div>

                {/* Scene Content */}
                <div className="flex-1 p-4 space-y-3">
                  {scene.sceneTitle && (
                    <h3 className="font-semibold">{scene.sceneTitle}</h3>
                  )}

                  {/* Narration */}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      NARRATION
                    </p>
                    <p className="text-sm bg-muted/50 p-3 rounded-lg italic">
                      "{scene.narration}"
                    </p>
                  </div>

                  {/* Visual Description */}
                  {scene.visualDescription && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">
                        VISUAL
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {scene.visualDescription}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
}
