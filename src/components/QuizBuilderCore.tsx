import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, GripVertical, ChevronDown, ChevronUp } from "lucide-react";
import QuizQuestionEditor from "./QuizQuestionEditor";

export interface QuizQuestion {
  id: string;
  type: "multiple_choice" | "true_false" | "short_answer" | "match_column" | "fill_blank" | "sequence" | "hotspot";
  question: string;
  options?: string[];
  correctAnswer?: string | string[] | number[];
  matchPairs?: { left: string; right: string }[];
  points: number;
  explanation?: string;
}

export const questionTypeLabels: Record<QuizQuestion["type"], string> = {
  multiple_choice: "Multiple Choice",
  true_false: "True / False",
  short_answer: "Short Answer",
  match_column: "Match the Column",
  fill_blank: "Fill in the Blank",
  sequence: "Sequence / Ordering",
  hotspot: "Hotspot"
};

interface QuizBuilderCoreProps {
  questions: QuizQuestion[];
  onQuestionsChange: (questions: QuizQuestion[]) => void;
  disabled?: boolean;
}

export default function QuizBuilderCore({ questions, onQuestionsChange, disabled = false }: QuizBuilderCoreProps) {
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);

  const addQuestion = (type: QuizQuestion["type"]) => {
    const newQuestion: QuizQuestion = {
      id: `q-${Date.now()}`,
      type,
      question: "",
      points: 1,
      options: type === "multiple_choice" ? ["", "", "", ""] : type === "true_false" ? ["True", "False"] : undefined,
      correctAnswer: type === "true_false" ? "True" : undefined,
      matchPairs: type === "match_column" ? [{ left: "", right: "" }] : undefined
    };
    onQuestionsChange([...questions, newQuestion]);
    setExpandedQuestion(newQuestion.id);
  };

  const updateQuestion = (id: string, updates: Partial<QuizQuestion>) => {
    onQuestionsChange(questions.map(q => q.id === id ? { ...q, ...updates } : q));
  };

  const deleteQuestion = (id: string) => {
    onQuestionsChange(questions.filter(q => q.id !== id));
    if (expandedQuestion === id) {
      setExpandedQuestion(null);
    }
  };

  const moveQuestion = (index: number, direction: "up" | "down") => {
    const newQuestions = [...questions];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= questions.length) return;
    
    [newQuestions[index], newQuestions[targetIndex]] = [newQuestions[targetIndex], newQuestions[index]];
    onQuestionsChange(newQuestions);
  };

  const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);

  return (
    <div className="space-y-4">
      {/* Add Question Types */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Add Questions</CardTitle>
          <CardDescription>Choose a question type to add</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(questionTypeLabels) as QuizQuestion["type"][]).map((type) => (
              <Button
                key={type}
                variant="outline"
                size="sm"
                onClick={() => addQuestion(type)}
                disabled={disabled}
              >
                <Plus className="h-4 w-4 mr-1" />
                {questionTypeLabels[type]}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Questions List */}
      {questions.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Questions ({questions.length})</CardTitle>
                <CardDescription>Total points: {totalPoints}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {questions.map((question, index) => (
              <div
                key={question.id}
                className="border rounded-lg overflow-hidden"
              >
                {/* Question Header */}
                <div
                  className="flex items-center gap-2 p-3 bg-muted/50 cursor-pointer"
                  onClick={() => setExpandedQuestion(expandedQuestion === question.id ? null : question.id)}
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-sm text-muted-foreground">
                    Q{index + 1}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary">
                    {questionTypeLabels[question.type]}
                  </span>
                  <span className="flex-1 truncate text-sm">
                    {question.question || "Untitled question"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {question.points} pt{question.points !== 1 ? "s" : ""}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => { e.stopPropagation(); moveQuestion(index, "up"); }}
                      disabled={index === 0 || disabled}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => { e.stopPropagation(); moveQuestion(index, "down"); }}
                      disabled={index === questions.length - 1 || disabled}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={(e) => { e.stopPropagation(); deleteQuestion(question.id); }}
                      disabled={disabled}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Question Editor */}
                {expandedQuestion === question.id && (
                  <div className="p-4 border-t">
                    <QuizQuestionEditor
                      question={question}
                      onChange={(updates) => updateQuestion(question.id, updates)}
                    />
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {questions.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground text-sm">
              No questions added yet. Click a question type above to get started.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
