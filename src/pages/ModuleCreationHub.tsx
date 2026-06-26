import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppSidebar } from "@/components/AppSidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Upload, ArrowLeft } from "lucide-react";
import ModuleForgeWizard from "@/components/forge/ModuleForgeWizard";
import ModuleUploader from "@/components/ModuleUploader";

type CreationMode = "select" | "ai" | "upload";

export default function ModuleCreationHub() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<CreationMode>("select");

  const handleBack = () => {
    if (mode === "select") {
      navigate("/library");
    } else {
      setMode("select");
    }
  };

  const creationOptions = [
    {
      id: "ai" as const,
      icon: Sparkles,
      title: "Create with AI",
      description: "Generate learning modules using AI with a step-by-step workflow. Create prompts, generate content, and format into PPT, Article, Document, or Video.",
      gradient: "from-primary/20 to-primary/5",
      iconBg: "bg-primary/10",
      iconColor: "text-primary"
    },
    {
      id: "upload" as const,
      icon: Upload,
      title: "Upload Your Own",
      description: "Upload existing content like videos, PowerPoints, PDFs, or documents. Optionally attach an assessment quiz to your content.",
      gradient: "from-secondary/20 to-secondary/5",
      iconBg: "bg-secondary",
      iconColor: "text-secondary-foreground"
    }
  ];

  return (
    <AppSidebar>
      <div className="min-h-screen bg-background">
        <main className="container mx-auto px-4 py-8">
          <Button variant="ghost" onClick={handleBack} className="mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {mode === "select" ? "Back to Library" : "Back to Options"}
          </Button>

          {mode === "select" && (
            <>
              <div className="text-center mb-12">
                <h1 className="text-4xl font-bold text-foreground mb-4">Create New Module</h1>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  Choose how you want to create your learning content
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
                {creationOptions.map((option) => (
                  <Card 
                    key={option.id}
                    className={`cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl border-2 hover:border-primary/50 bg-gradient-to-br ${option.gradient}`}
                    onClick={() => setMode(option.id)}
                  >
                    <CardHeader className="text-center pb-4">
                      <div className={`h-16 w-16 rounded-2xl ${option.iconBg} flex items-center justify-center mx-auto mb-4`}>
                        <option.icon className={`h-8 w-8 ${option.iconColor}`} />
                      </div>
                      <CardTitle className="text-xl">{option.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-center text-sm">
                        {option.description}
                      </CardDescription>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}

          {mode === "ai" && <ModuleForgeWizard />}
          {mode === "upload" && <ModuleUploader />}
        </main>
      </div>
    </AppSidebar>
  );
}
