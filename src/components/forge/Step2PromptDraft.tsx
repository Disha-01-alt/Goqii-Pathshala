import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, ArrowRight } from "lucide-react";
import { UseModuleForge } from "@/hooks/useModuleForge";

interface Step2Props {
  forge: UseModuleForge;
}

export default function Step2PromptDraft({ forge }: Step2Props) {
  const [prompt, setPrompt] = useState(forge.module.approvedPrompt || "");
  const [isGenerating, setIsGenerating] = useState(false);

  const inputs = forge.module.forgeInputs;

  const handleRegenerate = async () => {
    setIsGenerating(true);
    try {
      const newPrompt = await forge.regeneratePrompt();
      setPrompt(newPrompt);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApproveAndContinue = async () => {
    await forge.approvePrompt(prompt);
    forge.setCurrentStep(3);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">Prompt Draft</h2>
        <p className="text-sm text-muted-foreground">
          Review and edit the master prompt that will generate your {inputs?.format || "module"} content
        </p>
      </div>

      {/* Config summary */}
      {inputs && (
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{inputs.format}</Badge>
          <Badge variant="outline">{inputs.depth}</Badge>
          {inputs.includeQuiz && <Badge variant="outline">Quiz: {inputs.quizSettings?.numberOfQuestions}q</Badge>}
          {inputs.includeAssignments && <Badge variant="outline">Assignments: {inputs.assignmentSettings?.numberOfAssignments}</Badge>}
          {inputs.imagesRequired && <Badge variant="outline">Images</Badge>}
        </div>
      )}

      <Textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        rows={20}
        className="font-mono text-sm"
        placeholder="Master prompt will appear here..."
      />

      <div className="flex justify-between">
        <Button variant="outline" onClick={handleRegenerate} disabled={isGenerating || forge.isGeneratingPrompt}>
          {forge.isGeneratingPrompt ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Regenerate Prompt
        </Button>

        <Button onClick={handleApproveAndContinue} disabled={!prompt}>
          Approve & Continue
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
