import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles, Presentation, FileText, BookOpen, Video, ChevronDown, HelpCircle, ClipboardList, Check, Mic } from "lucide-react";
import { UseModuleForge, ForgeInputs, FormatType } from "@/hooks/useModuleForge";
import { ELEVENLABS_VOICES } from "@/hooks/useInteractivePPT";
import { toast } from "sonner";

interface Step1Props {
  forge: UseModuleForge;
}

const formatOptions = [
  { type: "PPT" as FormatType, icon: Presentation, label: "Presentation", color: "bg-blue-500" },
  { type: "Article" as FormatType, icon: FileText, label: "Article", color: "bg-green-500" },
  { type: "Document" as FormatType, icon: BookOpen, label: "Document", color: "bg-yellow-500" },
  { type: "Video" as FormatType, icon: Video, label: "Video Script", color: "bg-red-500" },
];

export default function Step1ModuleInputs({ forge }: Step1Props) {
  const existingInputs = forge.module.forgeInputs;
  
  // Topic details
  const [topic, setTopic] = useState(existingInputs?.topic || "");
  const [description, setDescription] = useState(existingInputs?.description || "");
  const [scope, setScope] = useState(existingInputs?.scope || "");
  const [depth, setDepth] = useState<"Quick" | "Standard" | "Deep">(existingInputs?.depth || "Standard");
  const [imagesRequired, setImagesRequired] = useState(existingInputs?.imagesRequired ?? true);

  // Format selection
  const [selectedFormat, setSelectedFormat] = useState<FormatType>(existingInputs?.format || "PPT");
  
  // PPT preferences
  const [numberOfSlides, setNumberOfSlides] = useState(existingInputs?.formatPreferences?.numberOfSlides || 10);
  const [includeSpeakerNotes, setIncludeSpeakerNotes] = useState(existingInputs?.formatPreferences?.includeSpeakerNotes ?? true);
  const [enableNarration, setEnableNarration] = useState(existingInputs?.enableNarration ?? false);
  const [selectedVoice, setSelectedVoice] = useState(existingInputs?.narrationVoice || ELEVENLABS_VOICES[0].id);

  // Article preferences
  const [readingLength, setReadingLength] = useState<"Short" | "Medium" | "Long">(
    (existingInputs?.formatPreferences?.readingLength as any) || "Medium"
  );
  const [includeHeadings, setIncludeHeadings] = useState(existingInputs?.formatPreferences?.includeHeadings ?? true);

  // Document preferences
  const [formatStyle, setFormatStyle] = useState<"Textbook" | "Workbook">(
    (existingInputs?.formatPreferences?.formatStyle as any) || "Textbook"
  );
  const [includeSummaryBoxes, setIncludeSummaryBoxes] = useState(existingInputs?.formatPreferences?.includeSummaryBoxes ?? true);

  // Video preferences
  const [durationSeconds, setDurationSeconds] = useState<number>(
    (existingInputs?.formatPreferences?.durationSeconds as any) || 60
  );
  const [outputType, setOutputType] = useState<"Script only" | "Script + Storyboard">(
    (existingInputs?.formatPreferences?.outputType as any) || "Script only"
  );

  // Quiz config
  const [includeQuiz, setIncludeQuiz] = useState(existingInputs?.includeQuiz ?? false);
  const [quizQuestions, setQuizQuestions] = useState(existingInputs?.quizSettings?.numberOfQuestions || 5);
  const [quizDifficulty, setQuizDifficulty] = useState<"Easy" | "Medium" | "Hard">(existingInputs?.quizSettings?.difficulty || "Medium");
  const [quizTypes, setQuizTypes] = useState<("MCQ" | "True-False" | "Scenario")[]>(existingInputs?.quizSettings?.types || ["MCQ"]);

  // Assignment config
  const [includeAssignments, setIncludeAssignments] = useState(existingInputs?.includeAssignments ?? false);
  const [assignmentCount, setAssignmentCount] = useState(existingInputs?.assignmentSettings?.numberOfAssignments || 2);
  const [assignmentType, setAssignmentType] = useState<"worksheet" | "case study" | "project">(existingInputs?.assignmentSettings?.type || "worksheet");
  const [rubricRequired, setRubricRequired] = useState(existingInputs?.assignmentSettings?.rubricRequired ?? false);

  // Collapsible state
  const [formatOpen, setFormatOpen] = useState(true);
  const [quizOpen, setQuizOpen] = useState(false);
  const [assignmentOpen, setAssignmentOpen] = useState(false);

  const [isGenerating, setIsGenerating] = useState(false);

  const getFormatPreferences = () => {
    switch (selectedFormat) {
      case "PPT":
        return { numberOfSlides, includeSpeakerNotes, includeImages: imagesRequired };
      case "Article":
        return { readingLength, includeHeadings, includeImages: imagesRequired };
      case "Document":
        return { formatStyle, includeSummaryBoxes, includeImages: imagesRequired };
      case "Video":
        return { durationSeconds, outputType, voiceTone: "Professional" };
      default:
        return {};
    }
  };

  const handleGeneratePrompt = async () => {
    if (!topic || !description || !scope) {
      toast.error("Please fill in all required fields");
      return;
    }

    const inputs: ForgeInputs = {
      topic,
      description,
      scope,
      depth,
      imagesRequired,
      style: "Professional",
      format: selectedFormat,
      formatPreferences: getFormatPreferences(),
      includeQuiz,
      quizSettings: includeQuiz ? {
        numberOfQuestions: quizQuestions,
        difficulty: quizDifficulty,
        types: quizTypes,
      } : undefined,
      includeAssignments,
      assignmentSettings: includeAssignments ? {
        numberOfAssignments: assignmentCount,
        type: assignmentType,
        rubricRequired,
      } : undefined,
      enableNarration: selectedFormat === "PPT" ? enableNarration : undefined,
      narrationVoice: selectedFormat === "PPT" && enableNarration ? selectedVoice : undefined,
    };

    setIsGenerating(true);
    try {
      await forge.saveInputs(inputs);
      const prompt = await forge.generatePrompt(inputs);
      await forge.approvePrompt(prompt);
      forge.setCurrentStep(2);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const renderFormatPreferences = () => {
    switch (selectedFormat) {
      case "PPT":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Number of Slides</Label>
                <Input type="number" value={numberOfSlides} onChange={(e) => setNumberOfSlides(parseInt(e.target.value) || 2)} min={2} max={30} />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch checked={includeSpeakerNotes} onCheckedChange={setIncludeSpeakerNotes} />
                <Label>Speaker Notes</Label>
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch checked={imagesRequired} onCheckedChange={setImagesRequired} />
                <Label>Generate Images</Label>
              </div>
            </div>
            <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
              <div className="flex items-center gap-3">
                <Switch checked={enableNarration} onCheckedChange={setEnableNarration} />
                <div className="flex items-center gap-2">
                  <Mic className="h-4 w-4 text-primary" />
                  <Label className="font-medium">Enable Narration (Interactive PPT)</Label>
                </div>
              </div>
              {enableNarration && (
                <div>
                  <Label className="text-sm">Voice</Label>
                  <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ELEVENLABS_VOICES.map(v => (
                        <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Each slide will get AI-generated narration converted to audio.
                  </p>
                </div>
              )}
            </div>
          </div>
        );
      case "Article":
        return (
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Reading Length</Label>
              <Select value={readingLength} onValueChange={(v) => setReadingLength(v as typeof readingLength)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Short">Short</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Long">Long</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 pt-6">
              <Switch checked={includeHeadings} onCheckedChange={setIncludeHeadings} />
              <Label>Include Headings</Label>
            </div>
            <div className="flex items-center gap-2 pt-6">
              <Switch checked={imagesRequired} onCheckedChange={setImagesRequired} />
              <Label>Generate Images</Label>
            </div>
          </div>
        );
      case "Document":
        return (
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Format Style</Label>
              <Select value={formatStyle} onValueChange={(v) => setFormatStyle(v as typeof formatStyle)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Textbook">Textbook</SelectItem>
                  <SelectItem value="Workbook">Workbook</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 pt-6">
              <Switch checked={includeSummaryBoxes} onCheckedChange={setIncludeSummaryBoxes} />
              <Label>Summary Boxes</Label>
            </div>
            <div className="flex items-center gap-2 pt-6">
              <Switch checked={imagesRequired} onCheckedChange={setImagesRequired} />
              <Label>Generate Images</Label>
            </div>
          </div>
        );
      case "Video":
        return (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Duration</Label>
              <Select value={String(durationSeconds)} onValueChange={(v) => setDurationSeconds(parseInt(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 seconds</SelectItem>
                  <SelectItem value="60">1 minute</SelectItem>
                  <SelectItem value="90">1 min 30 secs</SelectItem>
                  <SelectItem value="120">2 minutes</SelectItem>
                  <SelectItem value="180">3 minutes</SelectItem>
                  <SelectItem value="300">5 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Output Type</Label>
              <Select value={outputType} onValueChange={(v) => setOutputType(v as typeof outputType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Script only">Script only</SelectItem>
                  <SelectItem value="Script + Storyboard">Script + Storyboard</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">Module Setup</h2>
        <p className="text-sm text-muted-foreground">
          Define your module topic, format, and preferences
        </p>
      </div>

      {/* Section 1: Topic Details */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="topic">Topic *</Label>
          <Input
            id="topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g., Introduction to Machine Learning"
          />
        </div>

        <div>
          <Label htmlFor="description">Topic Description *</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief 1-2 line description of what this module should cover..."
            rows={2}
            maxLength={200}
          />
          <p className="text-xs text-muted-foreground mt-1">{description.length}/200 characters</p>
        </div>

        <div>
          <Label htmlFor="scope">Scope / Sub-topics *</Label>
          <Textarea
            id="scope"
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            placeholder="List the sub-topics to cover (one per line or bullet points)..."
            rows={4}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Use line breaks or bullets to separate sub-topics
          </p>
        </div>

        <div>
          <Label htmlFor="depth">Depth</Label>
          <Select value={depth} onValueChange={(v) => setDepth(v as typeof depth)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Quick">Quick - Brief explanations</SelectItem>
              <SelectItem value="Standard">Standard - Moderate detail</SelectItem>
              <SelectItem value="Deep">Deep - Detailed with examples</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Section 2: Output Format */}
      <Collapsible open={formatOpen} onOpenChange={setFormatOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full justify-between">
            <span className="flex items-center gap-2">
              <Presentation className="h-4 w-4" />
              Output Format: {selectedFormat}
            </span>
            <ChevronDown className={`h-4 w-4 transition-transform ${formatOpen ? "rotate-180" : ""}`} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {formatOptions.map((option) => (
              <Card
                key={option.type}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedFormat === option.type ? "ring-2 ring-primary" : ""
                }`}
                onClick={() => setSelectedFormat(option.type)}
              >
                <CardContent className="p-3 text-center">
                  <div className={`h-10 w-10 rounded-lg ${option.color} flex items-center justify-center mx-auto mb-1.5`}>
                    <option.icon className="h-5 w-5 text-white" />
                  </div>
                  <p className="font-medium text-sm">{option.label}</p>
                  {selectedFormat === option.type && (
                    <Check className="h-4 w-4 text-primary mx-auto mt-0.5" />
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
          {renderFormatPreferences()}
        </CollapsibleContent>
      </Collapsible>

      {/* Section 3: Quiz Configuration */}
      <Collapsible open={quizOpen} onOpenChange={setQuizOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full justify-between">
            <span className="flex items-center gap-2">
              <HelpCircle className="h-4 w-4" />
              Quiz {includeQuiz ? `(${quizQuestions} questions, ${quizDifficulty})` : "(Disabled)"}
            </span>
            <ChevronDown className={`h-4 w-4 transition-transform ${quizOpen ? "rotate-180" : ""}`} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3">
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-3">
                <Switch checked={includeQuiz} onCheckedChange={setIncludeQuiz} />
                <Label className="font-medium">Include Quiz</Label>
              </div>
              {includeQuiz && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Number of Questions</Label>
                      <Input type="number" value={quizQuestions} onChange={(e) => setQuizQuestions(parseInt(e.target.value) || 5)} min={3} max={20} />
                    </div>
                    <div>
                      <Label>Difficulty</Label>
                      <Select value={quizDifficulty} onValueChange={(v) => setQuizDifficulty(v as typeof quizDifficulty)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Easy">Easy</SelectItem>
                          <SelectItem value="Medium">Medium</SelectItem>
                          <SelectItem value="Hard">Hard</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Question Types</Label>
                      <div className="flex flex-wrap gap-3 mt-2">
                        {([["MCQ", "Multiple Choice"], ["True-False", "True/False"], ["Scenario", "Scenario"]] as const).map(([value, label]) => (
                          <label key={value} className="flex items-center gap-2 cursor-pointer">
                            <Checkbox
                              checked={quizTypes.includes(value)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setQuizTypes([...quizTypes, value]);
                                } else if (quizTypes.length > 1) {
                                  setQuizTypes(quizTypes.filter(t => t !== value));
                                }
                              }}
                            />
                            <span className="text-sm">{label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* Section 4: Assignment Configuration */}
      <Collapsible open={assignmentOpen} onOpenChange={setAssignmentOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full justify-between">
            <span className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              Assignments {includeAssignments ? `(${assignmentCount} ${assignmentType})` : "(Disabled)"}
            </span>
            <ChevronDown className={`h-4 w-4 transition-transform ${assignmentOpen ? "rotate-180" : ""}`} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3">
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-3">
                <Switch checked={includeAssignments} onCheckedChange={setIncludeAssignments} />
                <Label className="font-medium">Include Assignments</Label>
              </div>
              {includeAssignments && (
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Number of Assignments</Label>
                    <Input type="number" value={assignmentCount} onChange={(e) => setAssignmentCount(parseInt(e.target.value) || 2)} min={1} max={5} />
                  </div>
                  <div>
                    <Label>Type</Label>
                    <Select value={assignmentType} onValueChange={(v) => setAssignmentType(v as typeof assignmentType)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="worksheet">Worksheet</SelectItem>
                        <SelectItem value="case study">Case Study</SelectItem>
                        <SelectItem value="project">Project</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2 pt-6">
                    <Switch checked={rubricRequired} onCheckedChange={setRubricRequired} />
                    <Label>Include Rubric</Label>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* Generate Button */}
      <div className="flex justify-end">
        <Button onClick={handleGeneratePrompt} disabled={isGenerating} size="lg">
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating Prompt...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate Prompt
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
