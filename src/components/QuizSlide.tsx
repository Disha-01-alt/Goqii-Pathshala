import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CheckCircle2, XCircle } from "lucide-react";
import { motion } from "framer-motion";

interface QuizQuestion {
  chapterIndex: number;
  type: "multipleChoice" | "trueFalse" | "fillInBlank" | "openEnded";
  question: string;
  options?: string[];
  correctAnswer?: number | string | boolean;
  explanation?: string;
  sampleAnswer?: string;
  answerPlaceholder?: string;
  minWords?: number;
}

interface QuizSlideProps {
  question: QuizQuestion;
  questionNumber: number;
  totalQuestions: number;
  onAnswer: (isCorrect: boolean) => void;
  isAnswered: boolean;
  wasCorrect?: boolean;
}

export default function QuizSlide({
  question,
  questionNumber,
  totalQuestions,
  onAnswer,
  isAnswered,
  wasCorrect,
}: QuizSlideProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<number | string | boolean | null>(null);
  const [fillInAnswer, setFillInAnswer] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  const handleSubmit = () => {
    if (isAnswered) return;

    let correct = false;
    
    if (question.type === "multipleChoice") {
      correct = selectedAnswer === question.correctAnswer;
    } else if (question.type === "trueFalse") {
      correct = selectedAnswer === question.correctAnswer;
    } else if (question.type === "fillInBlank") {
      correct = fillInAnswer.toLowerCase().trim() === 
        String(question.correctAnswer).toLowerCase().trim();
    }

    setIsCorrect(correct);
    setShowFeedback(true);
    onAnswer(correct);
  };

  const canSubmit = () => {
    if (question.type === "fillInBlank") {
      return fillInAnswer.trim().length > 0;
    }
    return selectedAnswer !== null;
  };

  // If already answered from parent state, show the result
  const displayFeedback = showFeedback || isAnswered;
  const displayCorrect = showFeedback ? isCorrect : wasCorrect;

  return (
    <Card className="w-full overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="p-6 md:p-8"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Badge variant="secondary" className="text-sm">
            Question {questionNumber} of {totalQuestions}
          </Badge>
          {displayFeedback && (
            <Badge variant={displayCorrect ? "default" : "destructive"}>
              {displayCorrect ? "Correct!" : "Incorrect"}
            </Badge>
          )}
        </div>

        {/* Question */}
        <h2 className="text-xl md:text-2xl font-semibold text-foreground mb-8">
          {question.question}
        </h2>

        {/* Answer Options */}
        <div className="space-y-3 mb-8">
          {question.type === "multipleChoice" && question.options && (
            question.options.map((option, index) => {
              const isSelected = selectedAnswer === index;
              const isCorrectOption = index === question.correctAnswer;
              const showResult = displayFeedback;

              return (
                <button
                  key={index}
                  onClick={() => !displayFeedback && setSelectedAnswer(index)}
                  disabled={displayFeedback}
                  className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                    showResult
                      ? isCorrectOption
                        ? "border-green-500 bg-green-500/10"
                        : isSelected
                        ? "border-red-500 bg-red-500/10"
                        : "border-border bg-background"
                      : isSelected
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50 bg-background"
                  } ${displayFeedback ? "cursor-not-allowed" : "cursor-pointer"}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-foreground">{option}</span>
                    {showResult && isCorrectOption && (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    )}
                    {showResult && isSelected && !isCorrectOption && (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                </button>
              );
            })
          )}

          {question.type === "trueFalse" && (
            <div className="flex gap-4">
              {[true, false].map((value) => {
                const isSelected = selectedAnswer === value;
                const isCorrectOption = value === question.correctAnswer;
                const showResult = displayFeedback;

                return (
                  <button
                    key={String(value)}
                    onClick={() => !displayFeedback && setSelectedAnswer(value)}
                    disabled={displayFeedback}
                    className={`flex-1 p-4 text-center rounded-lg border-2 transition-all ${
                      showResult
                        ? isCorrectOption
                          ? "border-green-500 bg-green-500/10"
                          : isSelected
                          ? "border-red-500 bg-red-500/10"
                          : "border-border bg-background"
                        : isSelected
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50 bg-background"
                    } ${displayFeedback ? "cursor-not-allowed" : "cursor-pointer"}`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-lg font-medium text-foreground">
                        {value ? "True" : "False"}
                      </span>
                      {showResult && isCorrectOption && (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      )}
                      {showResult && isSelected && !isCorrectOption && (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {question.type === "fillInBlank" && (
            <div className="space-y-4">
              <Input
                value={fillInAnswer}
                onChange={(e) => !displayFeedback && setFillInAnswer(e.target.value)}
                placeholder="Type your answer..."
                disabled={displayFeedback}
                className={`text-lg ${
                  displayFeedback
                    ? displayCorrect
                      ? "border-green-500"
                      : "border-red-500"
                    : ""
                }`}
              />
              {displayFeedback && !displayCorrect && (
                <p className="text-sm text-muted-foreground">
                  Correct answer: <span className="font-medium text-foreground">{String(question.correctAnswer)}</span>
                </p>
              )}
            </div>
          )}
        </div>

        {/* Submit Button */}
        {!displayFeedback && (
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit()}
            size="lg"
            className="w-full"
          >
            Submit Answer
          </Button>
        )}

        {/* Feedback */}
        {displayFeedback && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-lg ${
              displayCorrect ? "bg-green-500/10" : "bg-red-500/10"
            }`}
          >
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">Explanation: </span>
              {question.explanation}
            </p>
          </motion.div>
        )}
      </motion.div>
    </Card>
  );
}
