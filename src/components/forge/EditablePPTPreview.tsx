import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Presentation, Plus, Trash2, GripVertical, ImageIcon, ImageOff } from "lucide-react";
import EditableText, { TextStyle } from "./EditableText";
import EditableImage from "./EditableImage";
import FormatToolbar from "./FormatToolbar";

interface PPTSlide {
  title: string;
  bulletPoints?: string[];
  bullets?: string[];
  speakerNotes?: string;
  imageUrl?: string;
  imageSuggestion?: string;
  hideImage?: boolean;
  titleStyle?: TextStyle;
  bulletStyles?: TextStyle[];
}

interface PPTContent {
  title?: string;
  slides?: PPTSlide[];
}

interface EditablePPTPreviewProps {
  content: PPTContent | any;
  onContentChange: (content: PPTContent) => void;
}

function getBullets(slide: PPTSlide): string[] {
  return slide.bulletPoints || slide.bullets || [];
}

export default function EditablePPTPreview({ content, onContentChange }: EditablePPTPreviewProps) {
  const [selectedSlide, setSelectedSlide] = useState<number | null>(null);
  const [slideStyle, setSlideStyle] = useState<TextStyle>({ fontSize: "normal", textAlign: "left" });

  if (!content || (typeof content === "object" && Object.keys(content).length === 0)) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No PPT content generated yet
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

  const slides = content.slides || [];

  const updateSlide = (index: number, updates: Partial<PPTSlide>) => {
    const newSlides = [...slides];
    newSlides[index] = { ...newSlides[index], ...updates };
    onContentChange({ ...content, slides: newSlides });
  };

  const updateBullet = (slideIndex: number, bulletIndex: number, newValue: string) => {
    const newSlides = [...slides];
    const currentBullets = [...getBullets(newSlides[slideIndex])];
    currentBullets[bulletIndex] = newValue;
    newSlides[slideIndex] = { ...newSlides[slideIndex], bulletPoints: currentBullets };
    onContentChange({ ...content, slides: newSlides });
  };

  const addBullet = (slideIndex: number) => {
    const newSlides = [...slides];
    const currentBullets = [...getBullets(newSlides[slideIndex]), "New bullet point"];
    newSlides[slideIndex] = { ...newSlides[slideIndex], bulletPoints: currentBullets };
    onContentChange({ ...content, slides: newSlides });
  };

  const removeBullet = (slideIndex: number, bulletIndex: number) => {
    const newSlides = [...slides];
    const currentBullets = [...getBullets(newSlides[slideIndex])];
    currentBullets.splice(bulletIndex, 1);
    newSlides[slideIndex] = { ...newSlides[slideIndex], bulletPoints: currentBullets };
    onContentChange({ ...content, slides: newSlides });
  };

  const toggleImageSlot = (slideIndex: number) => {
    const slide = slides[slideIndex];
    const isCurrentlyHidden = slide.hideImage;
    if (isCurrentlyHidden) {
      updateSlide(slideIndex, { hideImage: false });
    } else {
      updateSlide(slideIndex, { hideImage: true, imageUrl: undefined, imageSuggestion: undefined });
    }
  };

  const updateTitle = (newTitle: string) => {
    onContentChange({ ...content, title: newTitle });
  };

  const showImage = (slide: PPTSlide) => !slide.hideImage;

  return (
    <ScrollArea className="h-[500px] pr-4">
      <div className="space-y-4">
        {/* Presentation Title */}
        <div className="flex items-center gap-3 border-b pb-4">
          <Presentation className="h-6 w-6 text-primary" />
          <EditableText
            value={content.title || "Untitled Presentation"}
            onChange={updateTitle}
            as="h1"
            className="text-xl font-bold flex-1"
            placeholder="Presentation Title"
          />
        </div>

        {/* Format Toolbar */}
        {selectedSlide !== null && (
          <FormatToolbar
            style={slideStyle}
            onStyleChange={setSlideStyle}
          />
        )}

        {/* Slides */}
        {slides.map((slide: PPTSlide, slideIndex: number) => {
          const bullets = getBullets(slide);
          const hasImageSlot = showImage(slide);

          return (
            <Card
              key={slideIndex}
              className={`transition-all ${selectedSlide === slideIndex ? "ring-2 ring-primary" : ""}`}
              onClick={() => setSelectedSlide(slideIndex)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                  <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded">
                    Slide {slideIndex + 1}
                  </span>
                  <div className="ml-auto">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleImageSlot(slideIndex);
                      }}
                    >
                      {hasImageSlot ? (
                        <>
                          <ImageOff className="h-3 w-3" />
                          Remove image
                        </>
                      ) : (
                        <>
                          <ImageIcon className="h-3 w-3" />
                          Add image
                        </>
                      )}
                    </Button>
                  </div>
                </div>
                <EditableText
                  value={slide.title || ""}
                  onChange={(newTitle) => updateSlide(slideIndex, { title: newTitle })}
                  as="h2"
                  className="text-lg font-semibold"
                  style={selectedSlide === slideIndex ? slideStyle : slide.titleStyle}
                  placeholder="Slide Title"
                />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className={`grid gap-4 ${hasImageSlot ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"}`}>
                  {/* Bullet Points */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Content</p>
                    <ul className="space-y-1">
                      {bullets.map((bullet: string, bulletIndex: number) => (
                        <li key={bulletIndex} className="flex items-start gap-2 group">
                          <span className="text-primary mt-1">•</span>
                          <EditableText
                            value={bullet}
                            onChange={(newValue) => updateBullet(slideIndex, bulletIndex, newValue)}
                            as="span"
                            className="flex-1 text-sm"
                            style={selectedSlide === slideIndex ? slideStyle : undefined}
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeBullet(slideIndex, bulletIndex);
                            }}
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                    {bullets.length === 0 && (
                      <p className="text-xs text-muted-foreground italic">No content yet. Add bullet points below.</p>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        addBullet(slideIndex);
                      }}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add bullet
                    </Button>
                  </div>

                  {/* Image */}
                  {hasImageSlot && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">Image</p>
                      <EditableImage
                        imageUrl={slide.imageUrl}
                        onImageChange={(url) => updateSlide(slideIndex, { imageUrl: url || undefined })}
                        alt={slide.title}
                        aspectRatio="video"
                        imageSuggestion={slide.imageSuggestion}
                        contextLabel={slide.title}
                        onRemoveSlot={() => toggleImageSlot(slideIndex)}
                      />
                    </div>
                  )}
                </div>

                {/* Speaker Notes — always shown */}
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Speaker Notes</p>
                  <EditableText
                    value={slide.speakerNotes || ""}
                    onChange={(notes) => updateSlide(slideIndex, { speakerNotes: notes })}
                    as="p"
                    className="text-sm text-muted-foreground bg-muted/50 p-2 rounded"
                    placeholder="Add speaker notes..."
                    multiline
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </ScrollArea>
  );
}
