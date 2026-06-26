import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Video, Clock, PlayCircle, Plus, Trash2 } from "lucide-react";
import EditableText, { TextStyle } from "./EditableText";
import FormatToolbar from "./FormatToolbar";

interface VideoScene {
  sceneNumber: number;
  sceneTitle?: string;
  narration: string;
  visualDescription?: string;
  titleStyle?: TextStyle;
  narrationStyle?: TextStyle;
}

interface VideoContent {
  title?: string;
  totalDuration?: string;
  scenes?: VideoScene[];
  titleStyle?: TextStyle;
}

interface EditableVideoPreviewProps {
  content: VideoContent | any;
  onContentChange: (content: VideoContent) => void;
}

export default function EditableVideoPreview({ content, onContentChange }: EditableVideoPreviewProps) {
  const [selectedScene, setSelectedScene] = useState<number | null>(null);
  const [sceneStyle, setSceneStyle] = useState<TextStyle>({ fontSize: "normal", textAlign: "left" });

  if (!content || (typeof content === "object" && Object.keys(content).length === 0)) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No video script generated yet
      </div>
    );
  }

  if (typeof content === "string") {
    return (
      <ScrollArea className="h-[500px] pr-4">
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <div className="whitespace-pre-wrap">{content}</div>
        </div>
      </ScrollArea>
    );
  }

  const scenes = content.scenes || [];

  const updateScene = (index: number, updates: Partial<VideoScene>) => {
    const newScenes = [...scenes];
    newScenes[index] = { ...newScenes[index], ...updates };
    onContentChange({ ...content, scenes: newScenes });
  };

  const addScene = () => {
    const newScene: VideoScene = {
      sceneNumber: scenes.length + 1,
      sceneTitle: "New Scene",
      narration: "Add narration here...",
      visualDescription: "Describe the visuals...",
    };
    onContentChange({ ...content, scenes: [...scenes, newScene] });
  };

  const removeScene = (index: number) => {
    const newScenes = scenes
      .filter((_: VideoScene, i: number) => i !== index)
      .map((scene: VideoScene, i: number) => ({ ...scene, sceneNumber: i + 1 }));
    onContentChange({ ...content, scenes: newScenes });
  };

  return (
    <ScrollArea className="h-[500px] pr-4">
      <div className="space-y-4">
        {/* Video Header */}
        <div className="flex items-center justify-between border-b pb-4">
          <div className="flex items-center gap-3">
            <Video className="h-6 w-6 text-primary" />
            <div className="flex-1">
              <EditableText
                value={content.title || "Video Script"}
                onChange={(title) => onContentChange({ ...content, title })}
                as="h2"
                className="font-bold text-lg"
                placeholder="Video Title"
                style={content.titleStyle}
              />
              <p className="text-sm text-muted-foreground">
                {scenes.length} scenes
              </p>
            </div>
          </div>
          {content.totalDuration && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <EditableText
                value={content.totalDuration}
                onChange={(duration) => onContentChange({ ...content, totalDuration: duration })}
                as="span"
                placeholder="Duration"
              />
            </div>
          )}
        </div>

        {/* Format Toolbar */}
        {selectedScene !== null && (
          <FormatToolbar
            style={sceneStyle}
            onStyleChange={setSceneStyle}
          />
        )}

        {/* Scenes */}
        {scenes.map((scene: VideoScene, idx: number) => (
          <Card
            key={idx}
            className={`overflow-hidden transition-all cursor-pointer ${
              selectedScene === idx ? "ring-2 ring-primary" : ""
            }`}
            onClick={() => setSelectedScene(idx)}
          >
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
                  <div className="flex items-start justify-between">
                    <EditableText
                      value={scene.sceneTitle || ""}
                      onChange={(title) => updateScene(idx, { sceneTitle: title })}
                      as="h3"
                      className="font-semibold"
                      placeholder="Scene Title"
                      style={selectedScene === idx ? sceneStyle : scene.titleStyle}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeScene(idx);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Narration */}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      NARRATION
                    </p>
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <EditableText
                        value={scene.narration || ""}
                        onChange={(narration) => updateScene(idx, { narration })}
                        as="p"
                        className="text-sm italic"
                        placeholder="Add narration..."
                        style={selectedScene === idx ? sceneStyle : scene.narrationStyle}
                        multiline
                      />
                    </div>
                  </div>

                  {/* Visual Description */}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      VISUAL
                    </p>
                    <EditableText
                      value={scene.visualDescription || ""}
                      onChange={(visual) => updateScene(idx, { visualDescription: visual })}
                      as="p"
                      className="text-sm text-muted-foreground"
                      placeholder="Describe the visuals..."
                      multiline
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Add Scene Button */}
        <Button variant="outline" onClick={addScene} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Add Scene
        </Button>
      </div>
    </ScrollArea>
  );
}
