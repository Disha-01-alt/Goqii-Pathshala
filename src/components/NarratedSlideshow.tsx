import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Play, Pause, ChevronLeft, ChevronRight, Volume2, Loader2, Sparkles, CheckCircle,
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
 * full-bleed with the AI narration audio for each slide, auto-advancing as each
 * clip ends. Uses the assets the pipeline stores (module_outputs.slide_images +
 * module_slide_audio) — no MP4 stitch required, so it's reliable on free infra.
 */
export default function NarratedSlideshow({ moduleId, title, onModuleComplete }: NarratedSlideshowProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [starting, setStarting] = useState(false);
  const [completed, setCompleted] = useState(false);

  // Slide images + per-slide narration audio. Polls until they appear so the
  // slideshow shows up as soon as render + narration finish (before/independent
  // of any video stitch).
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

  // Build job (only used to show progress before the assets exist).
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

  // Drive playback: load the current slide's audio; auto-advance silent slides.
  useEffect(() => {
    const el = audioRef.current;
    if (!el || !cur) return;
    el.src = cur.audio || "";
    if (playing && cur.audio) {
      el.play().catch(() => setPlaying(false));
    }
    if (playing && !cur.audio) {
      const t = setTimeout(() => advance(), 5000);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, cur?.audio, playing]);

  const advance = () => {
    setIdx((i) => {
      if (i < slides.length - 1) return i + 1;
      setPlaying(false);
      if (!completed) { setCompleted(true); onModuleComplete?.(); }
      return i;
    });
  };

  const toggle = () => {
    if (!cur) return;
    if (playing) {
      setPlaying(false);
      audioRef.current?.pause();
    } else {
      setPlaying(true);
      if (cur.audio) audioRef.current?.play().catch(() => setPlaying(false));
    }
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
            <div className="bg-black flex items-center justify-center" style={{ aspectRatio: "16 / 9" }}>
              {cur?.image && (
                <img src={cur.image} alt={`Slide ${idx + 1}`} className="max-h-full max-w-full object-contain" />
              )}
            </div>
            <audio
              ref={audioRef}
              onEnded={advance}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              preload="auto"
              className="hidden"
            />
            <div className="flex items-center gap-1 px-4 py-3 border-t">
              <Button size="icon" variant="ghost" className="h-9 w-9" onClick={toggle} aria-label={playing ? "Pause" : "Play"}>
                {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
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
            </div>
            <div className="px-4 pb-3">
              <Progress value={((idx + 1) / slides.length) * 100} className="h-1.5" />
            </div>
          </CardContent>
        </Card>
        {completed && (
          <div className="mt-3 flex items-center gap-2 text-sm text-green-600">
            <CheckCircle className="h-4 w-4" /> Finished
          </div>
        )}
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
