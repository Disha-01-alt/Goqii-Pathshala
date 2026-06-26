import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Mic } from "lucide-react";
import { toast } from "sonner";
import { useUserRole } from "@/hooks/useUserRole";

interface SpeakerNote { slideNumber: number; text: string }

interface Props {
  moduleId: string;
  speakerNotes?: SpeakerNote[];
  defaultProvider?: "elevenlabs" | "ai4bharat";
  defaultVoiceId?: string;
  defaultVoiceDescription?: string;
}

const ELEVEN_VOICES = [
  { id: "EXAVITQu4vr4xnSDxMaL", label: "Sarah — warm female" },
  { id: "cgSgspJ2msm6clMCkdW9", label: "Jessica — friendly female" },
  { id: "XrExE9yKIg1WjnnlVkGX", label: "Matilda — calm female" },
  { id: "JBFqnCBsd6RMkjVDRZzb", label: "George — mature male" },
  { id: "onwK4e9ZLuTAKqWW03F9", label: "Daniel — narrator male" },
  { id: "CwhRBWXzGAHq8TQ4Fs17", label: "Roger — confident male" },
  { id: "IKne3meq5aSn9XLyUdCD", label: "Charlie — energetic male" },
];

export default function GenerateNarrationButton({
  moduleId,
  speakerNotes = [],
  defaultProvider = "elevenlabs",
  defaultVoiceId = "EXAVITQu4vr4xnSDxMaL",
  defaultVoiceDescription = "A clear female Indian English speaker with a neutral pace.",
}: Props) {
  const { role } = useUserRole();
  const allowed = role === "sme" || role === "sme_expert" || role === "admin";

  const [open, setOpen] = useState(false);
  const [provider, setProvider] = useState<"elevenlabs" | "ai4bharat">(defaultProvider);
  const [voiceId, setVoiceId] = useState(defaultVoiceId);
  const [voiceDescription, setVoiceDescription] = useState(defaultVoiceDescription);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState("");

  if (!allowed) return null;
  if (!speakerNotes || speakerNotes.length === 0) return null;

  const run = async () => {
    setRunning(true);
    let succeeded = 0;
    let failed = 0;
    for (let i = 0; i < speakerNotes.length; i++) {
      const note = speakerNotes[i];
      setProgress(`Slide ${i + 1}/${speakerNotes.length}…`);
      try {
        const { error } = await supabase.functions.invoke("generate-audio", {
          body: {
            moduleId,
            slideIndex: note.slideNumber,
            text: note.text,
            narrationProvider: provider,
            voice: provider === "elevenlabs" ? voiceId : voiceDescription,
          },
        });
        if (error) { failed++; console.error(`Slide ${note.slideNumber}:`, error); }
        else succeeded++;
      } catch (e) {
        failed++;
        console.error(`Slide ${note.slideNumber}:`, e);
      }
    }
    setRunning(false);
    setProgress("");
    if (failed === 0) toast.success(`Generated narration for ${succeeded} slide(s).`);
    else toast.warning(`Generated ${succeeded}, ${failed} failed. Check console.`);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Mic className="mr-1.5 h-3.5 w-3.5" />
          Generate Narration
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate narration</DialogTitle>
          <DialogDescription>
            Reads {speakerNotes.length} slide note(s) aloud and saves audio per slide. Existing audio is replaced.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Voice provider</Label>
            <RadioGroup value={provider} onValueChange={(v) => setProvider(v as any)} className="grid grid-cols-2 gap-3">
              <Label htmlFor="g-prov-el" className={`flex flex-col p-3 rounded-md border-2 cursor-pointer ${provider === "elevenlabs" ? "border-primary bg-primary/5" : "border-border"}`}>
                <RadioGroupItem value="elevenlabs" id="g-prov-el" className="sr-only" />
                <span className="text-sm font-medium">ElevenLabs</span>
                <span className="text-xs text-muted-foreground">Recommended</span>
              </Label>
              <Label htmlFor="g-prov-ai" className={`flex flex-col p-3 rounded-md border-2 cursor-pointer ${provider === "ai4bharat" ? "border-primary bg-primary/5" : "border-border"}`}>
                <RadioGroupItem value="ai4bharat" id="g-prov-ai" className="sr-only" />
                <span className="text-sm font-medium">AI4Bharat</span>
                <span className="text-xs text-muted-foreground">Indic backup</span>
              </Label>
            </RadioGroup>
          </div>

          {provider === "elevenlabs" ? (
            <div className="space-y-2">
              <Label htmlFor="g-voice">Voice</Label>
              <select
                id="g-voice"
                value={voiceId}
                onChange={(e) => setVoiceId(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                {ELEVEN_VOICES.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}
              </select>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="g-desc">Voice description</Label>
              <Textarea id="g-desc" rows={2} value={voiceDescription} onChange={(e) => setVoiceDescription(e.target.value)} />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={running}>Cancel</Button>
          <Button onClick={run} disabled={running}>
            {running ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{progress || "Generating…"}</> : "Generate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
