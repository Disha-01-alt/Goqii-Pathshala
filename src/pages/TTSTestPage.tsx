import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Download, AlertCircle, Clock, FileAudio } from "lucide-react";

type Style = "narration" | "conversational" | "energetic";

const DEFAULT_TEXT =
  "Welcome to Goqii Pathshala. This is a sample narration to verify audio quality and Indian accent before enabling automatic PPT narration.";

export default function TTSTestPage() {
  const [text, setText] = useState(DEFAULT_TEXT);
  const [voiceDescription, setVoiceDescription] = useState("");
  const [style, setStyle] = useState<Style>("narration");
  const [language, setLanguage] = useState("en");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  const [serverMs, setServerMs] = useState<number | null>(null);
  const [bytes, setBytes] = useState<number | null>(null);

  const charCount = text.length;
  const tooLong = charCount > 4000;
  const tooShort = charCount < 1;

  const handleGenerate = async () => {
    setError(null);
    setAudioUrl(null);
    setElapsedMs(null);
    setServerMs(null);
    setBytes(null);

    if (tooShort || tooLong) {
      setError("Text must be 1–4000 characters.");
      return;
    }

    setLoading(true);
    const started = performance.now();
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("generate-voice", {
        body: {
          text: text.trim(),
          language,
          style,
          voice_description: voiceDescription.trim() || undefined,
        },
      });

      const total = Math.round(performance.now() - started);
      setElapsedMs(total);

      if (fnErr) {
        setError(fnErr.message || "Edge function error");
        return;
      }
      if (!data?.url) {
        setError(data?.error || "No audio URL returned");
        return;
      }
      setAudioUrl(data.url);
      if (typeof data.durationMs === "number") setServerMs(data.durationMs);
      if (typeof data.bytes === "number") setBytes(data.bytes);
    } catch (e) {
      setElapsedMs(Math.round(performance.now() - started));
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (b: number) => {
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / 1024 / 1024).toFixed(2)} MB`;
  };

  return (
    <div className="container mx-auto max-w-3xl py-8 px-4 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">TTS Service Test</h1>
        <p className="text-muted-foreground mt-1">
          Validate AI4Bharat narration (via the self-hosted TTS service) before enabling automatic PPT narration.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Generate narration</CardTitle>
          <CardDescription>
            Calls the same <code className="text-xs">generate-voice</code> edge function used by the PPT pipeline.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="text">Narration text</Label>
              <span
                className={`text-xs ${tooLong ? "text-destructive" : "text-muted-foreground"}`}
              >
                {charCount} / 4000
              </span>
            </div>
            <Textarea
              id="text"
              rows={6}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter the text you want to narrate…"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="voice">Voice description (optional)</Label>
            <Input
              id="voice"
              value={voiceDescription}
              onChange={(e) => setVoiceDescription(e.target.value)}
              placeholder='e.g. "A clear female Indian English speaker, calm and natural pace"'
            />
            <p className="text-xs text-muted-foreground">
              Leave empty to use the service default for the selected style.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Style</Label>
              <Select value={style} onValueChange={(v) => setStyle(v as Style)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="narration">Narration</SelectItem>
                  <SelectItem value="conversational">Conversational</SelectItem>
                  <SelectItem value="energetic">Energetic</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Language</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English (en)</SelectItem>
                  <SelectItem value="hi">Hindi (hi)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={loading || tooShort || tooLong}
            className="w-full sm:w-auto"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating…
              </>
            ) : (
              "Generate audio"
            )}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Generation failed</AlertTitle>
          <AlertDescription className="break-words">{error}</AlertDescription>
        </Alert>
      )}

      {(audioUrl || elapsedMs !== null) && !error && (
        <Card>
          <CardHeader>
            <CardTitle>Result</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              {elapsedMs !== null && (
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  Total: {(elapsedMs / 1000).toFixed(2)} s
                </span>
              )}
              {serverMs !== null && (
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  Server: {(serverMs / 1000).toFixed(2)} s
                </span>
              )}
              {bytes !== null && (
                <span className="inline-flex items-center gap-1">
                  <FileAudio className="h-4 w-4" />
                  {formatBytes(bytes)}
                </span>
              )}
            </div>

            {audioUrl && (
              <>
                <audio
                  key={audioUrl}
                  controls
                  src={audioUrl}
                  className="w-full"
                  autoPlay
                />
                <div className="flex gap-2">
                  <Button asChild variant="outline" size="sm">
                    <a href={audioUrl} download target="_blank" rel="noreferrer">
                      <Download className="mr-2 h-4 w-4" />
                      Download WAV
                    </a>
                  </Button>
                  <Button asChild variant="ghost" size="sm">
                    <a href={audioUrl} target="_blank" rel="noreferrer">
                      Open URL
                    </a>
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
