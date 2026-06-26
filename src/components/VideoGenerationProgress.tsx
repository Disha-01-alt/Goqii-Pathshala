import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Video, Loader2, Play, RefreshCw, AlertCircle, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface VideoGenerationProgressProps {
  moduleId: string;
  scenes: any[];
  onVideoReady?: (videoUrl: string) => void;
  /** Which edge function to invoke. Default uses the AI/Runway pipeline; "uploaded" stitches slide PNGs + ElevenLabs narration. */
  endpoint?: "ai" | "uploaded";
}

export default function VideoGenerationProgress({ moduleId, scenes, onVideoReady, endpoint = "ai" }: VideoGenerationProgressProps) {
  const functionName = endpoint === "uploaded" ? "convert-ppt-to-video" : "generate-video-pipeline";
  const { session } = useAuth();
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("idle");
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState("");
  const [sceneCompleted, setSceneCompleted] = useState(0);
  const [sceneTotal, setSceneTotal] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  // Check for an existing job on mount. A render is often kicked off
  // (fire-and-forget) moments before this mounts, so the job row may not exist
  // yet — retry a few times to catch it before falling back to the idle state.
  useEffect(() => {
    let cancelled = false;

    const tryLoadJob = async () => {
      const { data } = await supabase
        .from("video_generation_jobs" as any)
        .select("*")
        .eq("module_id", moduleId)
        .order("created_at", { ascending: false })
        .limit(1);

      if (cancelled) return false;
      if (data && data.length > 0) {
        const job = data[0] as any;
        setJobId(job.id);
        setStatus(job.status);
        setProgress(job.progress || 0);
        setCurrentStep(job.current_step || "");
        setSceneCompleted(job.scene_completed || 0);
        setSceneTotal(job.scene_total || 0);
        if (job.output_video_url) {
          setVideoUrl(job.output_video_url);
          onVideoReady?.(job.output_video_url);
        }
        if (job.error_message) setErrorMessage(job.error_message);
        return true;
      }
      return false;
    };

    (async () => {
      for (let attempt = 0; attempt < 6 && !cancelled; attempt++) {
        if (await tryLoadJob()) return;
        await new Promise((r) => setTimeout(r, 3000));
      }
    })();

    return () => { cancelled = true; };
  }, [moduleId]);

  // Poll for render status
  useEffect(() => {
    if (!jobId || status === "completed" || status === "failed" || status === "idle") return;

    const interval = setInterval(async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-video-render`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              Authorization: `Bearer ${session?.access_token}`,
            },
            body: JSON.stringify({ jobId }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          setStatus(data.status);
          setProgress(data.progress || 0);
          if (data.currentStep) setCurrentStep(data.currentStep);
          if (data.sceneCompleted !== undefined) setSceneCompleted(data.sceneCompleted);
          if (data.sceneTotal !== undefined) setSceneTotal(data.sceneTotal);

          if (data.status === "completed" && data.outputVideoUrl) {
            setVideoUrl(data.outputVideoUrl);
            onVideoReady?.(data.outputVideoUrl);
            toast.success("Video generated successfully!");
          }
          if (data.status === "failed") {
            setErrorMessage(data.errorMessage || "Generation failed");
            toast.error("Video generation failed");
          }
        }
      } catch (err) {
        console.error("Poll error:", err);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [jobId, status, session]);

  const startGeneration = useCallback(async () => {
    if (!session?.access_token) {
      toast.error("Please sign in first");
      return;
    }

    setIsStarting(true);
    setErrorMessage("");
    setStatus("processing");
    setProgress(0);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${functionName}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ moduleId }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to start generation");
      }

      setJobId(data.jobId);
      setSceneTotal(scenes.length);
      toast.success("Video generation started!");
    } catch (err) {
      setStatus("failed");
      setErrorMessage(err instanceof Error ? err.message : "Unknown error");
      toast.error("Failed to start video generation");
    } finally {
      setIsStarting(false);
    }
  }, [moduleId, session, scenes.length]);

  // Completed state - show video player
  if (status === "completed" && videoUrl) {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CheckCircle className="h-5 w-5 text-primary" />
            Generated Video
          </CardTitle>
        </CardHeader>
        <CardContent>
          <video
            src={videoUrl}
            controls
            className="w-full max-h-[500px] rounded-lg bg-black"
            preload="metadata"
          />
          <div className="mt-3 flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={startGeneration}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Regenerate
            </Button>
            <a href={videoUrl} download target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="outline">
                Download MP4
              </Button>
            </a>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Failed state
  if (status === "failed") {
    return (
      <Card className="border-destructive/50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <div>
              <p className="font-medium text-destructive">Video Generation Failed</p>
              <p className="text-sm text-muted-foreground">{errorMessage}</p>
            </div>
          </div>
          <Button onClick={startGeneration} disabled={isStarting}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Processing state
  if (status === "processing" || status === "rendering") {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 mb-4">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <div className="flex-1">
              <p className="font-medium">Generating Video</p>
              <p className="text-sm text-muted-foreground">{currentStep}</p>
            </div>
            {sceneTotal > 0 && (
              <Badge variant="secondary">
                {sceneCompleted} / {sceneTotal} scenes
              </Badge>
            )}
          </div>
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground mt-2 text-right">{progress}%</p>
        </CardContent>
      </Card>
    );
  }

  // Idle state - show generate button
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Video className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium">Generate Video</p>
              <p className="text-sm text-muted-foreground">
                Convert {scenes.length} scenes into a rendered MP4 video
              </p>
            </div>
          </div>
          <Button onClick={startGeneration} disabled={isStarting}>
            {isStarting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Play className="mr-2 h-4 w-4" />
            )}
            Generate Video
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
