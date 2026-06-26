import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Loader2, Sparkles, ArrowRight, AlertCircle, RefreshCw, Check, XCircle } from "lucide-react";
import { UseModuleForge, FormattedOutput } from "@/hooks/useModuleForge";
import { useInteractivePPT } from "@/hooks/useInteractivePPT";
import { toast } from "sonner";
import PPTPreview from "./PPTPreview";
import ArticlePreview from "./ArticlePreview";
import DocumentPreview from "./DocumentPreview";
import VideoPreview from "./VideoPreview";

interface Step3Props {
  forge: UseModuleForge;
}

export default function Step3ContentDraft({ forge }: Step3Props) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedOutput, setGeneratedOutput] = useState<FormattedOutput | null>(forge.module.formattedOutput);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const cancelledRef = useRef(false);
  const interactivePPT = useInteractivePPT();

  const inputs = forge.module.forgeInputs;
  const selectedFormat = inputs?.format || "PPT";
  const enableNarration = inputs?.enableNarration ?? false;

  const mapSlidesToOutput = useCallback((slides: any[], base?: FormattedOutput): FormattedOutput => {
    return {
      type: "PPT",
      content: {
        slides: slides.map(s => ({
          slideNumber: s.slide_number,
          title: s.title,
          bulletPoints: s.content_points,
          speakerNotes: s.narration_text,
          narration_text: s.narration_text,
          imageSuggestion: s.imageSuggestion,
          imageUrl: s.imageUrl,
        })),
        isInteractivePPT: true,
      },
      preferences: base?.preferences ?? { ...inputs?.formatPreferences, enableNarration: true, voiceId: inputs?.narrationVoice } as any,
    };
  }, [inputs]);

  const handleGenerate = async () => {
    if (!inputs) {
      toast.error("Module inputs not found");
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);
    setGeneratedOutput(null);
    cancelledRef.current = false;

    try {
      let finalOutput: FormattedOutput;

      if (selectedFormat === "PPT" && enableNarration) {
        const contentSource = forge.module.approvedPrompt || "";
        const slides = await interactivePPT.generateInteractivePPT(
          contentSource,
          inputs.formatPreferences?.numberOfSlides || 10,
          inputs.imagesRequired,
        );
        if (cancelledRef.current) return;
        finalOutput = mapSlidesToOutput(slides);
      } else {
        finalOutput = await forge.generateFinalModule(
          selectedFormat,
          inputs.formatPreferences,
          forge.module.approvedPrompt || undefined,
        );
        if (cancelledRef.current) return;
      }

      setGeneratedOutput(finalOutput);
      forge.saveFormattedOutput(finalOutput);
      toast.success("Content generated! Add images in the next step.");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to generate module";
      setGenerationError(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCancel = () => {
    cancelledRef.current = true;
    setIsGenerating(false);
    toast.info("Generation cancelled.");
  };

  const handleContinue = () => {
    if (generatedOutput) {
      forge.setCurrentStep(4);
    }
  };

  const renderPreview = () => {
    if (!generatedOutput) return null;
    switch (generatedOutput.type) {
      case "PPT":
        return <PPTPreview content={generatedOutput.content} />;
      case "Article":
        return <ArticlePreview content={generatedOutput.content} />;
      case "Document":
        return <DocumentPreview content={generatedOutput.content} />;
      case "Video":
        return <VideoPreview content={generatedOutput.content} />;
      default:
        return null;
    }
  };

  const renderGeneratingUI = () => (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="p-8">
        <div className="flex flex-col items-center text-center space-y-5">
          <Sparkles className="h-12 w-12 text-primary animate-pulse" />
          <div className="space-y-1">
            <p className="text-lg font-semibold">Generating content...</p>
            <p className="text-sm text-muted-foreground">
              Please wait while AI writes your module. Images can be added in the next step.
            </p>
          </div>
          <div className="w-full max-w-xs">
            <Progress value={undefined} className="h-2 animate-pulse" />
          </div>
          <Button variant="ghost" size="sm" onClick={handleCancel} className="gap-1 text-muted-foreground">
            <XCircle className="h-4 w-4" /> Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">Generate Module</h2>
        <p className="text-sm text-muted-foreground">
          AI will create your {selectedFormat} content. You'll choose images in the Edit step.
          {inputs?.includeQuiz && " • Quiz will be generated in the next step"}
          {inputs?.includeAssignments && " • Assignments will be generated in the next step"}
        </p>
      </div>

      {!isGenerating && !generatedOutput && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-6">
            <div className="text-center space-y-3">
              <Sparkles className="h-10 w-10 text-primary mx-auto" />
              <div>
                <p className="font-semibold text-lg">Ready to Generate</p>
                <p className="text-sm text-muted-foreground">
                  Format: {selectedFormat}
                  {selectedFormat === "PPT" && ` • ${inputs?.formatPreferences?.numberOfSlides || 10} slides`}
                  {selectedFormat === "PPT" && enableNarration && " • With narration"}
                  {selectedFormat === "Article" && ` • ${inputs?.formatPreferences?.readingLength || "Medium"} length`}
                </p>
              </div>
              <Button onClick={handleGenerate} size="lg" className="gap-2">
                <Sparkles className="h-4 w-4" />Generate Module
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isGenerating && renderGeneratingUI()}

      {generationError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{generationError}</span>
            <Button variant="outline" size="sm" onClick={handleGenerate}>
              <RefreshCw className="h-4 w-4 mr-1" /> Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {generatedOutput && !isGenerating && (
        <>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Check className="h-5 w-5 text-green-500" />
                Preview: {generatedOutput.type}
              </CardTitle>
            </CardHeader>
            <CardContent>{renderPreview()}</CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={handleGenerate} disabled={isGenerating}>
              <RefreshCw className="mr-2 h-4 w-4" /> Regenerate
            </Button>
            <Button onClick={handleContinue} size="lg">
              Continue to Edit & Review
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
