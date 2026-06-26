import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Circle } from "lucide-react";
import { useModuleForge } from "@/hooks/useModuleForge";
import Step1ModuleInputs from "./Step1ModuleInputs";
import Step2PromptDraft from "./Step2PromptDraft";
import Step3ContentDraft from "./Step3ContentDraft";
import Step4FinalizeModule from "./Step4FinalizeModule";
import Step5FinalSave from "./Step5FinalSave";

const STEPS = [
  { number: 1, title: "Module Setup" },
  { number: 2, title: "Prompt Draft" },
  { number: 3, title: "Generate Module" },
  { number: 4, title: "Edit & Review" },
  { number: 5, title: "Save & Submit" },
];

export default function ModuleForgeWizard() {
  const navigate = useNavigate();
  const forge = useModuleForge();
  const { currentStep, setCurrentStep, module } = forge;

  const progressPercent = ((currentStep - 1) / (STEPS.length - 1)) * 100;

  const canGoToStep = (stepNumber: number): boolean => {
    if (stepNumber === 1) return true;
    if (stepNumber === 2) return !!module.forgeInputs;
    if (stepNumber === 3) return !!module.approvedPrompt;
    if (stepNumber === 4) return !!module.formattedOutput;
    if (stepNumber === 5) return !!module.formattedOutput;
    return false;
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <Step1ModuleInputs forge={forge} />;
      case 2:
        return <Step2PromptDraft forge={forge} />;
      case 3:
        return <Step3ContentDraft forge={forge} />;
      case 4:
        return <Step4FinalizeModule forge={forge} />;
      case 5:
        return <Step5FinalSave forge={forge} />;
      default:
        return null;
    }
  };

  if (module.forgeStatus === "submitted_to_sme") {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Module Submitted!</h2>
        <p className="text-muted-foreground mb-6">
          Your module has been submitted for SME review.
        </p>
        <div className="flex gap-4 justify-center">
          <Button onClick={() => forge.resetForge()}>Create Another</Button>
          <Button variant="outline" onClick={() => navigate("/library")}>
            Go to Library
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Module Forge</CardTitle>
            <span className="text-sm text-muted-foreground">
              Step {currentStep} of {STEPS.length}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={progressPercent} className="h-2 mb-4" />
          <div className="flex justify-between">
            {STEPS.map((step) => (
              <button
                key={step.number}
                onClick={() => canGoToStep(step.number) && setCurrentStep(step.number)}
                disabled={!canGoToStep(step.number)}
                className={`flex flex-col items-center gap-1 text-xs transition-colors ${
                  currentStep === step.number
                    ? "text-primary"
                    : canGoToStep(step.number)
                    ? "text-muted-foreground hover:text-foreground cursor-pointer"
                    : "text-muted-foreground/50 cursor-not-allowed"
                }`}
              >
                {currentStep > step.number ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <Circle
                    className={`h-5 w-5 ${
                      currentStep === step.number ? "fill-primary text-primary" : ""
                    }`}
                  />
                )}
                <span className="hidden sm:block">{step.title}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">{renderStep()}</CardContent>
      </Card>
    </div>
  );
}
