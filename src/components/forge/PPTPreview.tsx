import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ImageIcon } from "lucide-react";

function sanitizeBullet(text: string): string {
  if (!text) return text;
  return text
    .replace(/\[Image:[^\]]*\]\s*/gi, '')
    .replace(/\[Icon:[^\]]*\]\s*/gi, '')
    .replace(/\[Visual:[^\]]*\]\s*/gi, '')
    .replace(/Prompt:\s*[^\n]*/gi, '')
    .replace(/Style:\s*[^\n]*/gi, '')
    .trim();
}

function sanitizeBullets(points: string[]): string[] {
  return points.map(sanitizeBullet).filter(p => p.length > 0);
}

interface PPTSlide {
  slideNumber: number;
  title: string;
  bulletPoints?: string[];
  speakerNotes?: string;
  imageSuggestion?: string;
  imageUrl?: string;
  hideImage?: boolean;
}

interface PPTContent {
  slides?: PPTSlide[];
}

interface PPTPreviewProps {
  content: PPTContent | PPTSlide[] | any;
}

const SLIDE_GRADIENTS = [
  "from-slate-900 via-slate-800 to-slate-900",
  "from-indigo-950 via-slate-900 to-slate-950",
  "from-slate-950 via-blue-950 to-slate-900",
  "from-gray-900 via-slate-800 to-gray-950",
  "from-slate-900 via-indigo-950 to-slate-900",
];

export default function PPTPreview({ content }: PPTPreviewProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides: PPTSlide[] = Array.isArray(content)
    ? content
    : content?.slides || [];

  if (!slides.length) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No slides generated yet
      </div>
    );
  }

  const slide = slides[currentSlide];
  const isTitle = currentSlide === 0;
  const gradient = SLIDE_GRADIENTS[currentSlide % SLIDE_GRADIENTS.length];
  const bulletPoints = sanitizeBullets(slide.bulletPoints || (slide as any).bullets || []);
  const hasImage = !slide.hideImage && (slide.imageUrl || slide.imageSuggestion);

  return (
    <div className="space-y-3">
      {/* 16:9 Slide Canvas */}
      <div
        className={`relative bg-gradient-to-br ${gradient} rounded-xl overflow-hidden shadow-2xl border border-white/10`}
        style={{ aspectRatio: "16/9" }}
      >
        {/* Decorative accent */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-primary/60 to-transparent" />
        <div className="absolute bottom-0 right-0 w-48 h-48 bg-primary/5 rounded-full blur-3xl" />

        <div className="relative h-full flex flex-col p-6 md:p-8">
          {isTitle ? (
            /* Title Slide Layout */
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-3">
              <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight leading-tight">
                {slide.title}
              </h2>
              {bulletPoints.length > 0 && (
                <p className="text-sm md:text-base text-white/60 max-w-lg">
                  {bulletPoints[0]}
                </p>
              )}
            </div>
          ) : (
            /* Content Slide Layout */
            <>
              <h3 className="text-lg md:text-xl font-semibold text-white mb-4 tracking-tight">
                {slide.title}
              </h3>
              <div className={`flex-1 flex gap-6 min-h-0 ${hasImage ? "" : ""}`}>
                {/* Bullet Points */}
                <div className={`flex-1 flex flex-col justify-center ${hasImage ? "max-w-[60%]" : ""} space-y-2.5`}>
                  {bulletPoints.length > 0 ? bulletPoints.map((point, idx) => (
                    <div key={idx} className="flex items-start gap-3 group">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                      <span className="text-sm md:text-base text-white/85 leading-relaxed">
                        {point}
                      </span>
                    </div>
                  )) : (
                    <p className="text-sm text-white/40 italic">No content for this slide</p>
                  )}
                </div>

                {/* Image Panel */}
                {hasImage && (
                  <div className="w-[35%] flex items-center justify-center">
                    {slide.imageUrl ? (
                      <img
                        src={slide.imageUrl}
                        alt={slide.title}
                        className="max-h-full max-w-full rounded-lg shadow-lg object-cover border border-white/10"
                      />
                    ) : (
                      <div className="bg-white/5 rounded-lg p-4 text-center border border-dashed border-white/20 w-full">
                        <ImageIcon className="h-6 w-6 mx-auto mb-2 text-white/30" />
                        <p className="text-xs text-white/30">{slide.imageSuggestion}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Slide Number */}
          <div className="flex items-center justify-between mt-auto pt-3">
            <div className="text-xs text-white/30 font-mono">
              {currentSlide + 1} / {slides.length}
            </div>
            {slide.speakerNotes && (
              <p className="text-xs text-white/25 italic truncate max-w-[60%]">
                Notes: {slide.speakerNotes}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Thumbnail Navigation */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => setCurrentSlide(prev => Math.max(0, prev - 1))}
          disabled={currentSlide === 0}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="flex-1 flex gap-1.5 overflow-x-auto py-1 px-1">
          {slides.map((s, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentSlide(idx)}
              className={`shrink-0 rounded-md border transition-all cursor-pointer ${
                idx === currentSlide
                  ? "border-primary ring-1 ring-primary/50 scale-105"
                  : "border-border/50 opacity-60 hover:opacity-100"
              }`}
              style={{ width: 64, height: 36 }}
            >
              <div
                className={`w-full h-full rounded-md bg-gradient-to-br ${SLIDE_GRADIENTS[idx % SLIDE_GRADIENTS.length]} flex items-center justify-center`}
              >
                <span className="text-[8px] text-white/70 font-mono">{idx + 1}</span>
              </div>
            </button>
          ))}
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => setCurrentSlide(prev => Math.min(slides.length - 1, prev + 1))}
          disabled={currentSlide === slides.length - 1}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
