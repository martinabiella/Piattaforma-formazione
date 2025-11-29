import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useParams, useLocation } from "wouter";
import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Save, 
  Plus, 
  Trash2, 
  GripVertical,
  ArrowLeft,
  HelpCircle
} from "lucide-react";
import type { Module, Quiz, QuizQuestion } from "@shared/schema";
import { cn } from "@/lib/utils";

interface ModuleWithQuiz extends Module {
  quiz?: Quiz & { questions: QuizQuestion[] };
}

interface QuestionFormData {
  id?: number;
  question: string;
  options: string[];
  correctOptionIndex: number;
  order: number;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-1/3" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function QuestionEditor({
  question,
  index,
  onChange,
  onRemove,
}: {
  question: QuestionFormData;
  index: number;
  onChange: (data: Partial<QuestionFormData>) => void;
  onRemove: () => void;
}) {
  const handleOptionChange = (optionIndex: number, value: string) => {
    const newOptions = [...question.options];
    newOptions[optionIndex] = value;
    onChange({ options: newOptions });
  };

  return (
    <Card className="border-2" data-testid={`question-editor-${index}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <GripVertical className="h-5 w-5 text-muted-foreground/50 cursor-grab" />
            <span className="text-sm font-medium text-muted-foreground">
              Question {index + 1}
            </span>
          </div>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={onRemove}
            data-testid={`button-remove-question-${index}`}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor={`question-text-${index}`}>Question Text</Label>
          <Textarea
            id={`question-text-${index}`}
            value={question.question}
            onChange={(e) => onChange({ question: e.target.value })}
            placeholder="Enter your question"
            rows={2}
            data-testid={`textarea-question-${index}`}
          />
        </div>
        
        <div className="space-y-3">
          <Label>Answer Options (select the correct one)</Label>
          <RadioGroup
            value={question.correctOptionIndex.toString()}
            onValueChange={(value) => onChange({ correctOptionIndex: parseInt(value) })}
          >
            {question.options.map((option, optionIndex) => (
              <div 
                key={optionIndex} 
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border",
                  question.correctOptionIndex === optionIndex 
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
                    : "border-border"
                )}
              >
                <RadioGroupItem 
                  value={optionIndex.toString()} 
                  id={`option-${index}-${optionIndex}`}
                  data-testid={`radio-correct-${index}-${optionIndex}`}
                />
                <Input
                  value={option}
                  onChange={(e) => handleOptionChange(optionIndex, e.target.value)}
                  placeholder={`Option ${optionIndex + 1}`}
                  className="flex-1"
                  data-testid={`input-option-${index}-${optionIndex}`}
                />
              </div>
            ))}
          </RadioGroup>
          <p className="text-xs text-muted-foreground">
            Click the radio button to mark the correct answer.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function QuizEditor() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [passingScore, setPassingScore] = useState(70);
  const [questions, setQuestions] = useState<QuestionFormData[]>([]);

  const { data: module, isLoading } = useQuery<ModuleWithQuiz>({
    queryKey: ["/api/admin/modules", id, "quiz"],
  });

  useEffect(() => {
    if (module?.quiz) {
      setPassingScore(module.quiz.passingScore);
      setQuestions(
        (module.quiz.questions || []).map((q) => ({
          id: q.id,
          question: q.question,
          options: q.options as string[],
          correctOptionIndex: q.correctOptionIndex,
          order: q.order,
        }))
      );
    }
  }, [module]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PUT", `/api/admin/modules/${id}/quiz`, {
        passingScore,
        questions: questions.map((q, index) => ({
          id: q.id,
          question: q.question,
          options: q.options,
          correctOptionIndex: q.correctOptionIndex,
          order: index + 1,
        })),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/modules"] });
      toast({
        title: "Success",
        description: "Quiz saved successfully.",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to save quiz.",
        variant: "destructive",
      });
    },
  });

  const handleAddQuestion = () => {
    setQuestions([
      ...questions,
      {
        question: "",
        options: ["", "", "", ""],
        correctOptionIndex: 0,
        order: questions.length + 1,
      },
    ]);
  };

  const handleUpdateQuestion = (index: number, data: Partial<QuestionFormData>) => {
    const newQuestions = [...questions];
    newQuestions[index] = { ...newQuestions[index], ...data };
    setQuestions(newQuestions);
  };

  const handleRemoveQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const isValid = questions.length >= 1 && questions.every(
    (q) => q.question.trim() && q.options.every((o) => o.trim())
  );

  const breadcrumbs = [
    { label: "Modules", href: "/admin/modules" },
    { label: module?.title || "Module", href: `/admin/modules/${id}/edit` },
    { label: "Edit Quiz" },
  ];

  if (isLoading) {
    return (
      <AdminLayout title="Edit Quiz" breadcrumbs={breadcrumbs}>
        <LoadingSkeleton />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Edit Quiz" breadcrumbs={breadcrumbs}>
      <div className="flex items-center justify-between gap-4 mb-6">
        <Button 
          variant="ghost" 
          asChild
          data-testid="button-back"
        >
          <Link href={`/admin/modules/${id}/edit`} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Module
          </Link>
        </Button>
        
        <Button 
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || !isValid}
          data-testid="button-save-quiz"
        >
          <Save className="h-4 w-4 mr-2" />
          {saveMutation.isPending ? "Saving..." : "Save Quiz"}
        </Button>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Quiz Settings</CardTitle>
            <CardDescription>Configure passing score and other settings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-w-xs">
              <Label htmlFor="passingScore">Passing Score (%)</Label>
              <Input
                id="passingScore"
                type="number"
                min={1}
                max={100}
                value={passingScore}
                onChange={(e) => setPassingScore(parseInt(e.target.value) || 70)}
                data-testid="input-passing-score"
              />
              <p className="text-xs text-muted-foreground">
                Users must score at least {passingScore}% to pass this quiz.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle>Questions</CardTitle>
                <CardDescription>
                  Add 5-10 multiple choice questions for the quiz
                </CardDescription>
              </div>
              <Button onClick={handleAddQuestion} variant="outline" data-testid="button-add-question">
                <Plus className="h-4 w-4 mr-2" />
                Add Question
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {questions.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed rounded-lg">
                <HelpCircle className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
                <p className="text-muted-foreground mb-4" data-testid="text-no-questions">
                  No questions yet. Add your first question to start building the quiz.
                </p>
                <Button onClick={handleAddQuestion} variant="outline" data-testid="button-add-first-question">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Question
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {questions.map((question, index) => (
                  <QuestionEditor
                    key={index}
                    question={question}
                    index={index}
                    onChange={(data) => handleUpdateQuestion(index, data)}
                    onRemove={() => handleRemoveQuestion(index)}
                  />
                ))}
              </div>
            )}
            
            {questions.length > 0 && questions.length < 5 && (
              <p className="text-sm text-amber-600 dark:text-amber-400 mt-4" data-testid="text-question-warning">
                Recommendation: Add at least {5 - questions.length} more question(s) for a comprehensive quiz.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
