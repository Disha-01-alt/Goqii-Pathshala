import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Video, PlayCircle, Clock } from "lucide-react";

interface VideoScene {
  sceneNumber?: number;
  sceneTitle?: string;
  narration: string;
  visualDescription?: string;
}

interface VideoScriptDisplayProps {
  title: string;
  scenes: VideoScene[];
  totalDuration?: number | string;
}

export default function VideoScriptDisplay({ title, scenes, totalDuration }: VideoScriptDisplayProps) {
  if (!scenes || scenes.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No video script content available
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between border-b pb-4 mb-4">
          <div className="flex items-center gap-3">
            <Video className="h-6 w-6 text-primary" />
            <div>
              <h2 className="font-bold text-lg">{title}</h2>
              <p className="text-sm text-muted-foreground">
                {scenes.length} scenes — Script preview
              </p>
            </div>
          </div>
          {totalDuration && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{typeof totalDuration === "number" ? `${totalDuration}s` : totalDuration}</span>
            </div>
          )}
        </div>

        <ScrollArea className="max-h-[500px] pr-4">
          <div className="space-y-4">
            {scenes.map((scene, idx) => (
              <Card key={idx} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex">
                    <div className="bg-primary text-primary-foreground w-16 flex flex-col items-center justify-center p-3 shrink-0">
                      <PlayCircle className="h-5 w-5 mb-1" />
                      <span className="text-xs font-bold">
                        Scene {scene.sceneNumber || idx + 1}
                      </span>
                    </div>
                    <div className="flex-1 p-4 space-y-3">
                      {scene.sceneTitle && (
                        <h3 className="font-semibold">{scene.sceneTitle}</h3>
                      )}
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">NARRATION</p>
                        <p className="text-sm bg-muted/50 p-3 rounded-lg italic">
                          "{scene.narration}"
                        </p>
                      </div>
                      {scene.visualDescription && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">VISUAL</p>
                          <p className="text-sm text-muted-foreground">{scene.visualDescription}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
