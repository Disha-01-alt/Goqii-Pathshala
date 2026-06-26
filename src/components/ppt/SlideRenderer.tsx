import { ImageIcon } from "lucide-react";

function sanitizeBullet(text: string): string {
  if (!text) return text;
  let cleaned = text
    .replace(/\[Image:[^\]]*\]\s*/gi, '')
    .replace(/\[Icon:[^\]]*\]\s*/gi, '')
    .replace(/\[Visual:[^\]]*\]\s*/gi, '')
    .replace(/Prompt:\s*[^\n]*/gi, '')
    .replace(/Style:\s*[^\n]*/gi, '')
    .trim();
  return cleaned;
}

function sanitizeBullets(points: string[]): string[] {
  return points.map(sanitizeBullet).filter(p => p.length > 0);
}

interface SlideData {
  title: string;
  subtitle?: string;
  layout?: string;
  content_points?: string[];
  bulletPoints?: string[];
  leftColumn?: string[];
  rightColumn?: string[];
  takeaways?: string[];
  caption?: string;
  imageUrl?: string;
  imageSuggestion?: string;
}

interface SlideRendererProps {
  slide: SlideData;
  currentSlide: number;
  isFullscreen: boolean;
}

const SLIDE_BG = [
  "from-slate-900 via-slate-800 to-slate-900",
  "from-indigo-950 via-slate-900 to-slate-950",
  "from-slate-950 via-blue-950 to-slate-900",
  "from-gray-900 via-slate-800 to-gray-950",
  "from-slate-900 via-indigo-950 to-slate-900",
];

function BulletList({ points, isFullscreen }: { points: string[]; isFullscreen: boolean }) {
  const isLow = points.length <= 3;
  return (
    <div className={`flex-1 flex flex-col ${isFullscreen ? `${isLow ? "space-y-8" : "space-y-5"} justify-center` : `${isLow ? "space-y-5" : "space-y-3"} ${isLow ? "justify-center" : "justify-start"}`}`}>
      {points.map((point, idx) => (
        <div key={idx} className="flex items-start gap-3 group">
          <span className={`rounded-full bg-primary shrink-0 ${isFullscreen ? "w-2 h-2 mt-2.5" : "w-1.5 h-1.5 mt-2"}`} />
          <span className={`text-white/85 leading-relaxed ${isFullscreen ? "text-xl" : isLow ? "text-base" : "text-sm"}`}>
            {point}
          </span>
        </div>
      ))}
    </div>
  );
}

function ImagePanel({ imageUrl, imageSuggestion, title, isFullscreen }: { imageUrl?: string; imageSuggestion?: string; title: string; isFullscreen?: boolean }) {
  if (!imageUrl && !imageSuggestion) return null;
  return (
    <div className="flex items-center justify-center h-full">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={title}
          className={`rounded-lg shadow-lg object-cover border border-white/10 ${isFullscreen ? "max-h-[70vh]" : "max-h-full"}`}
        />
      ) : (
        <div className="bg-white/5 rounded-lg p-4 text-center border border-dashed border-white/20">
          <ImageIcon className="h-8 w-8 mx-auto mb-2 text-white/30" />
          <p className="text-xs text-white/30">{imageSuggestion}</p>
        </div>
      )}
    </div>
  );
}

function TitleOnlyLayout({ slide, isFullscreen }: { slide: SlideData; isFullscreen: boolean }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center gap-4">
      <h2 className={`font-bold text-white tracking-tight ${isFullscreen ? "text-5xl" : "text-3xl"}`}>
        {slide.title}
      </h2>
      {slide.subtitle && (
        <p className={`text-white/50 max-w-2xl ${isFullscreen ? "text-2xl" : "text-lg"}`}>
          {slide.subtitle}
        </p>
      )}
    </div>
  );
}

function BulletsWithImageLayout({ slide, isFullscreen }: { slide: SlideData; isFullscreen: boolean }) {
  const points = sanitizeBullets(slide.content_points || slide.bulletPoints || []);
  const hasImage = slide.imageUrl || slide.imageSuggestion;
  return (
    <div className="flex-1 flex flex-col">
      <h3 className={`font-semibold text-white tracking-tight ${isFullscreen ? "text-3xl mb-8" : "text-xl mb-4"}`}>
        {slide.title}
      </h3>
      <div className={`flex-1 flex gap-6 ${isFullscreen ? "items-center" : ""}`}>
        <div className={hasImage && isFullscreen ? "w-[60%]" : hasImage ? "flex-1" : "w-full"}>
          <BulletList points={points} isFullscreen={isFullscreen} />
        </div>
        {hasImage && (
          <div className={isFullscreen ? "w-[40%]" : "w-1/3"}>
            <ImagePanel imageUrl={slide.imageUrl} imageSuggestion={slide.imageSuggestion} title={slide.title} isFullscreen={isFullscreen} />
          </div>
        )}
      </div>
    </div>
  );
}

function BulletsFullLayout({ slide, isFullscreen }: { slide: SlideData; isFullscreen: boolean }) {
  const points = sanitizeBullets(slide.content_points || slide.bulletPoints || []);
  return (
    <div className="flex-1 flex flex-col">
      <h3 className={`font-semibold text-white tracking-tight ${isFullscreen ? "text-3xl mb-8" : "text-xl mb-4"}`}>
        {slide.title}
      </h3>
      <div className={`flex-1 ${isFullscreen ? "flex items-center" : ""}`}>
        <div className={isFullscreen ? "w-full max-w-[80%]" : "w-full"}>
          <BulletList points={points} isFullscreen={isFullscreen} />
        </div>
      </div>
    </div>
  );
}

function TwoColumnLayout({ slide, isFullscreen }: { slide: SlideData; isFullscreen: boolean }) {
  const left = sanitizeBullets(slide.leftColumn || []);
  const right = sanitizeBullets(slide.rightColumn || []);
  return (
    <div className="flex-1 flex flex-col">
      <h3 className={`font-semibold text-white tracking-tight ${isFullscreen ? "text-3xl mb-8" : "text-xl mb-4"}`}>
        {slide.title}
      </h3>
      <div className={`flex-1 grid grid-cols-2 gap-8 ${isFullscreen ? "items-center" : ""}`}>
        <div className={`${isFullscreen ? "space-y-5" : "space-y-3"} border-r border-white/10 pr-6`}>
          {left.map((item, idx) => (
            <div key={idx} className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span className={`text-white/85 ${isFullscreen ? "text-lg leading-relaxed" : "text-sm"}`}>{item}</span>
            </div>
          ))}
        </div>
        <div className={isFullscreen ? "space-y-5" : "space-y-3"}>
          {right.map((item, idx) => (
            <div key={idx} className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
              <span className={`text-white/85 ${isFullscreen ? "text-lg leading-relaxed" : "text-sm"}`}>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ImageFocusLayout({ slide, isFullscreen }: { slide: SlideData; isFullscreen: boolean }) {
  return (
    <div className="flex-1 flex flex-col">
      <h3 className={`font-semibold text-white text-center tracking-tight ${isFullscreen ? "text-3xl mb-6" : "text-xl mb-4"}`}>
        {slide.title}
      </h3>
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <div className={isFullscreen ? "max-w-2xl w-full" : "max-w-lg w-full"}>
          <ImagePanel imageUrl={slide.imageUrl} imageSuggestion={slide.imageSuggestion} title={slide.title} isFullscreen={isFullscreen} />
        </div>
        {slide.caption && (
          <p className={`text-white/50 text-center max-w-lg ${isFullscreen ? "text-lg" : "text-sm"}`}>
            {slide.caption}
          </p>
        )}
      </div>
    </div>
  );
}

function SummaryLayout({ slide, isFullscreen }: { slide: SlideData; isFullscreen: boolean }) {
  const takeaways = sanitizeBullets(slide.takeaways || slide.content_points || slide.bulletPoints || []);
  return (
    <div className="flex-1 flex flex-col">
      <h3 className={`font-semibold text-white text-center tracking-tight ${isFullscreen ? "text-3xl mb-6" : "text-xl mb-4"}`}>
        {slide.title}
      </h3>
      <div className="flex-1 flex items-center justify-center">
        <div className={`bg-white/5 border border-white/10 rounded-xl p-6 max-w-2xl w-full ${isFullscreen ? "space-y-6" : "space-y-4"}`}>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary/70 mb-2">Key Takeaways</p>
          {takeaways.map((item, idx) => (
            <div key={idx} className="flex items-start gap-3">
              <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                {idx + 1}
              </span>
              <span className={`text-white/85 ${isFullscreen ? "text-lg leading-relaxed" : "text-sm"}`}>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function SlideRenderer({ slide, currentSlide, isFullscreen }: SlideRendererProps) {
  if (!slide) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-white/50">No slide content</p>
      </div>
    );
  }

  const layout = slide.layout || inferLayout(slide, currentSlide);
  const bg = SLIDE_BG[currentSlide % SLIDE_BG.length];

  const inner = (() => {
    switch (layout) {
      case "title-only":
        return <TitleOnlyLayout slide={slide} isFullscreen={isFullscreen} />;
      case "two-column":
        return <TwoColumnLayout slide={slide} isFullscreen={isFullscreen} />;
      case "image-focus":
        return <ImageFocusLayout slide={slide} isFullscreen={isFullscreen} />;
      case "summary":
        return <SummaryLayout slide={slide} isFullscreen={isFullscreen} />;
      case "bullets-full":
        return <BulletsFullLayout slide={slide} isFullscreen={isFullscreen} />;
      case "bullets-with-image":
      default:
        return <BulletsWithImageLayout slide={slide} isFullscreen={isFullscreen} />;
    }
  })();

  return (
    <div className={`flex-1 flex flex-col bg-gradient-to-br ${bg} rounded-xl relative overflow-hidden`}>
      {/* Top accent bar */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-primary/60 to-transparent" />
      <div className="absolute bottom-0 right-0 w-48 h-48 bg-primary/5 rounded-full blur-3xl" />
      <div className={`relative flex-1 flex flex-col ${isFullscreen ? "p-12" : "p-6"}`}>
        {inner}
      </div>
    </div>
  );
}

function inferLayout(slide: SlideData, index: number): string {
  if (index === 0 && slide.subtitle) return "title-only";
  if (slide.leftColumn && slide.rightColumn) return "two-column";
  if (slide.takeaways) return "summary";
  if (slide.imageUrl || slide.imageSuggestion) return "bullets-with-image";
  return "bullets-full";
}
