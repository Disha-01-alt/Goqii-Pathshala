import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Play, Pause, ChevronLeft, ChevronRight, Volume2, Loader2, Sparkles, CheckCircle, RotateCcw,
} from "lucide-react";
import { toast } from "sonner";

interface Slide {
  image: string;
  audio: string | null;
}

interface NarratedSlideshowProps {
  moduleId: string;
  title?: string;
  onModuleComplete?: () => void;
}

/**
 * Plays an uploaded deck as a narrated slideshow: rendered slide images shown
 * full-bleed with the AI narration audio for each slide, AUTO-ADVANCING as each
 * clip ends. One Play press runs the whole deck. Uses assets the pipeline stores
 * (module_outputs.slide_images + module_slide_audio) — no MP4 stitch required.
 */
export default function NarratedSlideshow({ moduleId, title, onModuleComplete }: NarratedSlideshowProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [autoTried, setAutoTried] = useState(false);
  const [starting, setStarting] = useState(false);
  const [completed, setCompleted] = useState(false);

  const { data: slides = [] } = useQuery({
    queryKey: ["slideshow-assets", moduleId],
    queryFn: async (): Promise<Slide[]> => {
      const { data: imgOut } = await supabase
        .from("module_outputs")
        .select("content")
        .eq("module_id", moduleId)
        .eq("format_type", "slide_images")
        .maybeSingle();
      const images: string[] = ((imgOut?.content as any)?.images) || [];
      if (!images.length) return [];
      const { data: auds } = await supabase
        .from("module_slide_audio")
        .select("slide_number,audio_url")
        .eq("module_id", moduleId)
        .order("slide_number", { ascending: true });
      const bySlide = new Map<number, string>();
      (auds || []).forEach((a: any) => { if (a.audio_url) bySlide.set(a.slide_number, a.audio_url); });
      return images.map((img, i) => ({ image: img, audio: bySlide.get(i + 1) || null }));
    },
    refetchInterval: (q) => {
      const d = q.state.data as Slide[] | undefined;
      return d && d.length > 0 ? false : 4000;
    },
  });

  const ready = slides.length > 0;

  const { data: job } = useQuery({
    queryKey: ["slideshow-job", moduleId],
    queryFn: async () => {
      const { data } = await supabase
        .from("video_generation_jobs")
        .select("status,progress,current_step")
        .eq("module_id", moduleId)
        .order("created_at", { ascending: false })
        .limit(1);
      return (data && data[0]) || null;
    },
    enabled: !ready,
    refetchInterval: ready ? false : 5000,
  });

  const cur = slides[idx];

  // Move to the next slide; keep `playing` true so the chain continues.
  const advance = () => {
    setIdx((i) => {
      if (i < slides.length - 1) return i + 1;
      setPlaying(false);
      setCompleted((done) => {
        if (!done) onModuleComplete?.();
        return true;
      });
      return i;
    });
  };

  // Single source of truth for playback: whenever the slide or play-state
  // changes, play the current slide's audio (or hold a silent slide ~6s).
  // NOTE: we do NOT bind to the audio element's pause/ended events for state —
  // browsers fire `pause` when a clip ends, which would otherwise stop the chain.
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    if (!playing || !cur) { el.pause(); return; }
    if (cur.audio) {
      if (el.src !== cur.audio) el.src = cur.audio;
      el.play().catch(() => setPlaying(false)); // blocked autoplay → wait for a click
      return;
    }
    const t = setTimeout(advance, 6000); // silent slide
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, playing, cur?.audio]);

  // Try to start automatically once assets are ready (browsers may block audio
  // autoplay until the user interacts — then the Play button starts it, and it
  // runs through to the end on its own).
  useEffect(() => {
    if (ready && !autoTried) {
      setAutoTried(true);
      setPlaying(true);
    }
  }, [ready, autoTried]);

  const toggle = () => {
    if (!cur) return;
    if (completed) { setIdx(0); setCompleted(false); setPlaying(true); return; }
    setPlaying((p) => !p);
  };

  const go = (n: number) => setIdx(Math.max(0, Math.min(slides.length - 1, n)));

  const startBuild = async () => {
    setStarting(true);
    try {
      const { error } = await supabase.functions.invoke("convert-ppt-to-video", { body: { moduleId } });
      if (error) throw error;
      toast.success("Building your narrated slideshow…");
    } catch (e: any) {
      toast.error(e?.message || "Couldn't start. Please try again.");
    } finally {
      setStarting(false);
    }
  };

  // ── Ready: the player ──────────────────────────────────────────────────
  if (ready) {
    return (
      <div className="w-full">
        {title && <h1 className="text-lg font-bold text-foreground mb-3">{title}</h1>}
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="relative bg-black flex items-center justify-center" style={{ aspectRatio: "16 / 9" }}>
              {cur?.image && (
                <img src={cur.image} alt={`Slide ${idx + 1}`} className="max-h-full max-w-full object-contain" />
              )}
              {!playing && !completed && (
                <button
                  onClick={toggle}
                  className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors"
                  aria-label="Play"
                >
                  <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 shadow-lg">
                    <Play className="h-7 w-7 text-black ml-1" />
                  </span>
                </button>
              )}
            </div>
            <audio ref={audioRef} onEnded={advance} preload="auto" className="hidden" />
            <div className="flex items-center gap-1 px-4 py-3 border-t">
              <Button size="icon" variant="ghost" className="h-9 w-9" onClick={toggle} aria-label={playing ? "Pause" : "Play"}>
                {completed ? <RotateCcw className="h-5 w-5" /> : playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              </Button>
              <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => go(idx - 1)} disabled={idx === 0}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => go(idx + 1)} disabled={idx === slides.length - 1}>
                <ChevronRight className="h-5 w-5" />
              </Button>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground ml-2">
                <Volume2 className="h-3.5 w-3.5" />
                <span>Slide {idx + 1} of {slides.length}{cur && !cur.audio ? " (no narration)" : ""}</span>
              </div>
              {completed && (
                <span className="ml-auto flex items-center gap-1 text-xs text-green-600">
                  <CheckCircle className="h-3.5 w-3.5" /> Finished
                </span>
              )}
            </div>
            <div className="px-4 pb-3">
              <Progress value={((idx + 1) / slides.length) * 100} className="h-1.5" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Building: progress ─────────────────────────────────────────────────
  if (job && job.status === "processing") {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 mb-3">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <div>
              <p className="font-medium">Building your narrated slideshow…</p>
              <p className="text-sm text-muted-foreground">{job.current_step || "Working…"}</p>
            </div>
          </div>
          <Progress value={job.progress || 0} className="h-2" />
          <p className="text-xs text-muted-foreground mt-2">
            This runs on a free server and can take a few minutes. You can leave and come back.
          </p>
        </CardContent>
      </Card>
    );
  }

  // ── Idle / failed: generate ────────────────────────────────────────────
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium">Narrated slideshow</p>
              <p className="text-sm text-muted-foreground">
                Turn this deck into slides read aloud with AI narration.
              </p>
            </div>
          </div>
          <Button onClick={startBuild} disabled={starting}>
            {starting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Generate
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
