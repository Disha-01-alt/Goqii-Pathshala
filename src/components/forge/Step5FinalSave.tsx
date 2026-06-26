import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Loader2, Save, CheckCircle, FileText, HelpCircle, ClipboardList, ChevronDown, AlertCircle, Mic, Volume2, Headphones, X } from "lucide-react";
import { UseModuleForge } from "@/hooks/useModuleForge";
import { useInteractivePPT, ELEVENLABS_VOICES, type AudioResult } from "@/hooks/useInteractivePPT";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Step5Props {
  forge: UseModuleForge;
}

type AudioStatus = "pending" | "generating" | "completed" | "skipped" | "failed";

export default function Step5FinalSave({ forge }: Step5Props) {
  const { module, submitToSME, isSaving, updateFormattedContent } = forge;
  const [audioPreviewOpen, setAudioPreviewOpen] = useState(true);
  const [selectedVoice, setSelectedVoice] = useState(
    module.forgeInputs?.narrationVoice || ELEVENLABS_VOICES[0].id
  );
  const [isPreviewingVoice, setIsPreviewingVoice] = useState(false);
  const [editingNarrationSlide, setEditingNarrationSlide] = useState<number | null>(null);
  const [audioStatus, setAudioStatus] = useState<AudioStatus>("pending");
  const [showFallbackDialog, setShowFallbackDialog] = useState(false);
  const [fallbackReason, setFallbackReason] = useState("");
  const voicePreviewRef = useRef<HTMLAudioElement | null>(null);
  const interactivePPT = useInteractivePPT();

  const isInteractivePPT = module.formattedOutput?.content?.isInteractivePPT === true;
  const interactiveSlides = isInteractivePPT ? (module.formattedOutput?.content?.slides || []) : [];
  const includedQuizCount = module.quizData?.questions.filter((q) => q.included).length || 0;
  const includedAssignmentCount = module.assignmentData?.assignments.filter((a) => a.included).length || 0;
  const hasFormattedOutput = !!module.formattedOutput;

  const canSave = !isInteractivePPT
    ? hasFormattedOutput
    : hasFormattedOutput && (audioStatus === "completed" || audioStatus === "skipped");

  const handleNarrationChange = useCallback((slideIdx: number, newText: string) => {
    if (!module.formattedOutput?.content?.slides) return;
    const updatedSlides = [...module.formattedOutput.content.slides];
    updatedSlides[slideIdx] = { ...updatedSlides[slideIdx], narration_text: newText };
    updateFormattedContent({ ...module.formattedOutput.content, slides: updatedSlides });
  }, [module.formattedOutput, updateFormattedContent]);

  const handlePreviewVoice = useCallback(async () => {
    if (isPreviewingVoice) {
      voicePreviewRef.current?.pause();
      voicePreviewRef.current = null;
      setIsPreviewingVoice(false);
      return;
    }
    setIsPreviewingVoice(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-audio`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            text: "Hello, this is a preview of the selected voice.",
            slideIndex: 0,
            voice: selectedVoice,
          }),
        }
      );
      if (!response.ok) throw new Error("Preview failed");
      const data = await response.json();
      const audio = new Audio(`data:audio/mpeg;base64,${data.audioContent}`);
      voicePreviewRef.current = audio;
      audio.onended = () => setIsPreviewingVoice(false);
      await audio.play();
    } catch {
      toast.error("Failed to preview voice");
      setIsPreviewingVoice(false);
    }
  }, [selectedVoice, isPreviewingVoice]);

  const getErrorMessage = (reason: string) => {
    switch (reason) {
      case "API_KEY_INVALID": return "The ElevenLabs API key is invalid.";
      case "FREE_TIER_BLOCKED": return "The ElevenLabs free tier account has been blocked due to unusual activity.";
      case "CREDITS_EXHAUSTED": return "The ElevenLabs API credits have been exhausted.";
      default: return "Audio generation failed due to an API error.";
    }
  };

  const handleGenerateAudio = useCallback(async () => {
    setAudioStatus("generating");

    // We need a module ID for audio records. Save silently first if needed.
    let moduleId = module.id;
    if (!moduleId) {
      try {
        toast.info("Saving module to prepare for audio generation...");
        moduleId = await submitToSME();
        if (!moduleId) {
          toast.error("Failed to save module before generating audio.");
          setAudioStatus("failed");
          return;
        }
      } catch {
        toast.error("Failed to save module before generating audio.");
        setAudioStatus("failed");
        return;
      }
    }

    const result: AudioResult = await interactivePPT.generateAllAudio(
      moduleId,
      interactiveSlides.map((s: any) => ({
        slide_number: s.slideNumber || s.slide_number,
        narration_text: s.narration_text || s.speakerNotes || "",
      })),
      selectedVoice
    );

    if (result.success) {
      setAudioStatus("completed");
    } else if (
      result.failReason === "API_KEY_INVALID" ||
      result.failReason === "FREE_TIER_BLOCKED" ||
      result.failReason === "CREDITS_EXHAUSTED"
    ) {
      setFallbackReason(result.failReason);
      setShowFallbackDialog(true);
      setAudioStatus("failed");
    } else {
      setAudioStatus("failed");
    }
  }, [module.id, interactiveSlides, selectedVoice, interactivePPT, submitToSME]);

  const handleFallbackAccept = useCallback(() => {
    setShowFallbackDialog(false);
    setAudioStatus("skipped");
    // Strip interactive PPT flag so it saves as normal PPT
    if (module.formattedOutput?.content) {
      const strippedContent = { ...module.formattedOutput.content, isInteractivePPT: false };
      if (strippedContent.slides) {
        strippedContent.slides = strippedContent.slides.map((s: any) => {
          const { narration_text, speakerNotes, ...rest } = s;
          return rest;
        });
      }
      updateFormattedContent(strippedContent);
    }
    toast.info("Module will be saved as a normal PPT without narration.");
  }, [module.formattedOutput, updateFormattedContent]);

  const handleFallbackDecline = useCallback(() => {
    setShowFallbackDialog(false);
    setAudioStatus("failed");
  }, []);

  const handleSubmit = useCallback(async () => {
    try {
      await submitToSME();
    } catch {
      // Error handled by submitToSME
    }
  }, [submitToSME]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">Save & Submit</h2>
        <p className="text-sm text-muted-foreground">
          Review your module summary and submit for SME review
        </p>
      </div>

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{module.title || "Untitled Module"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{module.description}</p>
          <div className="flex flex-wrap gap-2">
            {module.formattedOutput && (
              <Badge variant="outline" className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                {module.formattedOutput.type}
              </Badge>
            )}
            {includedQuizCount > 0 && (
              <Badge variant="outline" className="flex items-center gap-1">
                <HelpCircle className="h-3 w-3" />
                {includedQuizCount} quiz questions
              </Badge>
            )}
            {includedAssignmentCount > 0 && (
              <Badge variant="outline" className="flex items-center gap-1">
                <ClipboardList className="h-3 w-3" />
                {includedAssignmentCount} assignments
              </Badge>
            )}
          </div>
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            {["Module inputs saved", "Prompt approved", "Module generated", "Content reviewed"].map((text) => (
              <div key={text} className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-primary" />
                <span>{text}</span>
              </div>
            ))}
            <div className="flex items-center gap-2 text-sm">
              {hasFormattedOutput ? (
                <>
                  <CheckCircle className="h-4 w-4 text-primary" />
                  <span>Formatted as {module.formattedOutput?.type}</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <span className="text-destructive">Module not generated yet</span>
                </>
              )}
            </div>
            {isInteractivePPT && (
              <div className="flex items-center gap-2 text-sm">
                {audioStatus === "completed" ? (
                  <><CheckCircle className="h-4 w-4 text-primary" /><span>Audio narration generated</span></>
                ) : audioStatus === "skipped" ? (
                  <><CheckCircle className="h-4 w-4 text-muted-foreground" /><span className="text-muted-foreground">Proceeding without narration</span></>
                ) : audioStatus === "generating" ? (
                  <><Loader2 className="h-4 w-4 animate-spin text-primary" /><span>Generating audio...</span></>
                ) : (
                  <><AlertCircle className="h-4 w-4 text-amber-500" /><span className="text-amber-600">Audio narration pending</span></>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Interactive PPT Audio */}
      {isInteractivePPT && hasFormattedOutput && (
        <Collapsible open={audioPreviewOpen} onOpenChange={setAudioPreviewOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              <span className="flex items-center gap-2">
                <Mic className="h-4 w-4" />
                Audio Narration ({interactiveSlides.length} slides)
              </span>
              <ChevronDown className={`h-4 w-4 transition-transform ${audioPreviewOpen ? "rotate-180" : ""}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4 space-y-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm">Voice:</Label>
                    <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                      <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ELEVENLABS_VOICES.map(v => (
                          <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button variant="outline" size="sm" onClick={handlePreviewVoice} className="gap-1.5">
                    {isPreviewingVoice ? <><X className="h-3.5 w-3.5" /> Stop</> : <><Headphones className="h-3.5 w-3.5" /> Preview Voice</>}
                  </Button>
                  <Button
                    onClick={handleGenerateAudio}
                    disabled={interactivePPT.isGeneratingAudio || audioStatus === "completed" || audioStatus === "skipped"}
                    className="gap-2"
                  >
                    {interactivePPT.isGeneratingAudio ? (
                      <><Loader2 className="h-4 w-4 animate-spin" />Generating {interactivePPT.audioProgress.current}/{interactivePPT.audioProgress.total}...</>
                    ) : audioStatus === "completed" ? (
                      <><CheckCircle className="h-4 w-4" />Audio Generated</>
                    ) : audioStatus === "skipped" ? (
                      <><CheckCircle className="h-4 w-4" />Skipped (Normal PPT)</>
                    ) : (
                      <><Volume2 className="h-4 w-4" />Generate All Audio</>
                    )}
                  </Button>
                </div>
                {interactivePPT.isGeneratingAudio && (
                  <div className="mt-3">
                    <Progress value={(interactivePPT.audioProgress.completed / Math.max(interactivePPT.audioProgress.total, 1)) * 100} className="h-2" />
                  </div>
                )}
                {audioStatus === "failed" && !showFallbackDialog && (
                  <div className="mt-3 bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                    <p className="text-sm text-destructive">
                      Audio generation failed. Please try again or click "Generate All Audio" to retry.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {interactiveSlides.map((slide: any, idx: number) => {
                const narrationText = slide.narration_text || slide.speakerNotes || "";
                const isEditing = editingNarrationSlide === idx;
                return (
                  <Card key={idx} className="border">
                    <CardContent className="p-4 space-y-2">
                      <p className="text-sm font-medium">Slide {idx + 1}: {slide.title}</p>
                      {isEditing ? (
                        <div className="space-y-2">
                          <Textarea value={narrationText} onChange={(e) => handleNarrationChange(idx, e.target.value)} className="min-h-[100px] text-sm" />
                          <Button variant="outline" size="sm" onClick={() => setEditingNarrationSlide(null)}>Done</Button>
                        </div>
                      ) : (
                        <div onClick={() => setEditingNarrationSlide(idx)} className="text-xs text-muted-foreground bg-muted/50 rounded p-2 cursor-pointer hover:bg-muted transition-colors line-clamp-3">
                          {narrationText || <span className="italic">Click to add narration text...</span>}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Warning */}
      {!hasFormattedOutput && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
          <p className="text-sm text-destructive">
            Please go back to Step 3 and generate your module before submitting.
          </p>
        </div>
      )}

      {/* Interactive PPT instruction */}
      {isInteractivePPT && hasFormattedOutput && audioStatus === "pending" && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 flex items-center gap-3">
          <Mic className="h-5 w-5 text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-700">
            Please generate audio narration before saving. Click "Generate All Audio" above to proceed.
          </p>
        </div>
      )}

      {/* Submit */}
      <div className="flex justify-center">
        <Button
          onClick={handleSubmit}
          disabled={isSaving || interactivePPT.isGeneratingAudio || !canSave}
          size="lg"
          className="px-8"
        >
          {isSaving ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
          ) : interactivePPT.isGeneratingAudio ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating Audio...</>
          ) : (
            <><Save className="mr-2 h-4 w-4" />Save Module & Submit for Review</>
          )}
        </Button>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        After saving, your module will be locked and sent to SME for review.
      </p>

      {/* Fallback Dialog */}
      <AlertDialog open={showFallbackDialog} onOpenChange={setShowFallbackDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Audio Generation Failed</AlertDialogTitle>
            <AlertDialogDescription>
              {getErrorMessage(fallbackReason)} Would you like to proceed as a normal PPT without narration?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleFallbackDecline}>No, Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleFallbackAccept}>Yes, Continue Without Audio</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
