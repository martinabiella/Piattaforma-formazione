import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useParams, useLocation } from "wouter";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle2, 
  XCircle, 
  Trophy,
  RotateCcw 
} from "lucide-react";
import type { ModuleWithProgress, QuizQuestion, InlineAnswer } from "@shared/schema";
import { cn } from "@/lib/utils";

interface QuizResult {
  score: number;
  quizScore?: number;
  inlineScore?: number;
  passed: boolean;
  answers: number[];
  inlineAnswers?: InlineAnswer[];
  passingScore: number;
}

function LoadingSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-8 w-full mt-4" />
      </CardHeader>
      <CardContent className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </CardContent>
      <CardFooter>
        <Skeleton className="h-10 w-24" />
      </CardFooter>
    </Card>
  );
}

function QuestionCard({
  question,
  questionIndex,
  totalQuestions,
  selectedAnswer,
  onSelectAnswer,
  onNext,
  onPrevious,
  onSubmit,
  isSubmitting,
}: {
  question: QuizQuestion;
  questionIndex: number;
  totalQuestions: number;
  selectedAnswer: number | null;
  onSelectAnswer: (index: number) => void;
  onNext: () => void;
  onPrevious: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}) {
  const isLast = questionIndex === totalQuestions - 1;
  const progress = ((questionIndex + 1) / totalQuestions) * 100;
  const options = question.options as string[];

  return (
    <Card data-testid="card-question">
      <CardHeader className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground" data-testid="text-question-number">
            Question {questionIndex + 1} of {totalQuestions}
          </span>
          <span className="text-sm font-medium" data-testid="text-question-progress">
            {Math.round(progress)}%
          </span>
        </div>
        <Progress value={progress} className="h-2" data-testid="progress-quiz" />
        <CardTitle className="text-xl font-semibold" data-testid="text-question">
          {question.question}
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <RadioGroup
          value={selectedAnswer?.toString() || ""}
          onValueChange={(value) => onSelectAnswer(parseInt(value))}
          className="space-y-3"
        >
          {options.map((option, index) => (
            <div key={index}>
              <Label
                htmlFor={`option-${index}`}
                className={cn(
                  "flex items-center space-x-3 p-4 rounded-lg border cursor-pointer transition-colors",
                  selectedAnswer === index
                    ? "border-primary bg-primary/5"
                    : "border-border hover-elevate"
                )}
                data-testid={`label-option-${index}`}
              >
                <RadioGroupItem value={index.toString()} id={`option-${index}`} data-testid={`radio-option-${index}`} />
                <span className="flex-1">{option}</span>
              </Label>
            </div>
          ))}
        </RadioGroup>
      </CardContent>
      
      <CardFooter className="flex justify-between gap-4">
        <Button
          variant="outline"
          onClick={onPrevious}
          disabled={questionIndex === 0}
          data-testid="button-previous"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>
        
        {isLast ? (
          <Button 
            onClick={onSubmit} 
            disabled={selectedAnswer === null || isSubmitting}
            data-testid="button-submit"
          >
            {isSubmitting ? "Submitting..." : "Submit Quiz"}
          </Button>
        ) : (
          <Button 
            onClick={onNext} 
            disabled={selectedAnswer === null}
            data-testid="button-next"
          >
            Next
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

function ResultsCard({
  result,
  questions,
  answers,
  moduleId,
  moduleName,
}: {
  result: QuizResult;
  questions: QuizQuestion[];
  answers: number[];
  moduleId: string;
  moduleName: string;
}) {
  const [, setLocation] = useLocation();
  const hasInlineScore = result.inlineScore !== undefined && result.inlineScore !== null;

  return (
    <div className="space-y-6">
      <Card className={cn(
        "border-2",
        result.passed ? "border-emerald-500/50" : "border-red-500/50"
      )} data-testid="card-results">
        <CardContent className="pt-8 pb-6 text-center">
          <div className={cn(
            "w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center",
            result.passed 
              ? "bg-emerald-100 dark:bg-emerald-900/30" 
              : "bg-red-100 dark:bg-red-900/30"
          )}>
            {result.passed ? (
              <Trophy className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <XCircle className="h-10 w-10 text-red-600 dark:text-red-400" />
            )}
          </div>
          
          <h2 className="text-2xl font-bold mb-2" data-testid="text-result-title">
            {result.passed ? "Congratulations!" : "Keep Trying!"}
          </h2>
          
          <p className="text-muted-foreground mb-6" data-testid="text-result-message">
            {result.passed 
              ? "You've successfully completed this module."
              : `You need ${result.passingScore}% to pass. Review the material and try again.`
            }
          </p>
          
          <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-muted">
            <span className="text-sm text-muted-foreground">Your Score:</span>
            <span className={cn(
              "text-2xl font-bold",
              result.passed ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
            )} data-testid="text-score">
              {result.score}%
            </span>
          </div>

          {hasInlineScore && (
            <div className="mt-4 text-sm text-muted-foreground space-y-1" data-testid="score-breakdown">
              <p>Score Breakdown:</p>
              <div className="flex justify-center gap-4">
                <span>Inline Questions: {result.inlineScore}%</span>
                <span>Final Quiz: {result.quizScore}%</span>
              </div>
            </div>
          )}
        </CardContent>
        
        <CardFooter className="flex flex-col sm:flex-row justify-center gap-4 pb-6">
          <Button variant="outline" asChild data-testid="button-back-to-dashboard">
            <Link href="/app">Back to Dashboard</Link>
          </Button>
          {!result.passed && (
            <Button 
              onClick={() => setLocation(`/app/modules/${moduleId}/quiz`)}
              data-testid="button-try-again"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          )}
        </CardFooter>
      </Card>

      <Card data-testid="card-answer-review">
        <CardHeader>
          <CardTitle>Answer Review</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {questions.map((question, index) => {
            const userAnswer = answers[index];
            const isCorrect = userAnswer === question.correctOptionIndex;
            const options = question.options as string[];
            
            return (
              <div 
                key={question.id} 
                className={cn(
                  "p-4 rounded-lg border",
                  isCorrect 
                    ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-900/10 dark:border-emerald-800"
                    : "bg-red-50 border-red-200 dark:bg-red-900/10 dark:border-red-800"
                )}
                data-testid={`review-question-${index}`}
              >
                <div className="flex items-start gap-3">
                  {isCorrect ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium mb-2" data-testid={`review-question-text-${index}`}>
                      {index + 1}. {question.question}
                    </p>
                    <div className="space-y-1 text-sm">
                      <p data-testid={`review-your-answer-${index}`}>
                        <span className="text-muted-foreground">Your answer: </span>
                        <span className={isCorrect ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}>
                          {options[userAnswer]}
                        </span>
                      </p>
                      {!isCorrect && (
                        <p data-testid={`review-correct-answer-${index}`}>
                          <span className="text-muted-foreground">Correct answer: </span>
                          <span className="text-emerald-600 dark:text-emerald-400">
                            {options[question.correctOptionIndex]}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

export default function Quiz() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [result, setResult] = useState<QuizResult | null>(null);

  // Parse inline answers from URL query string
  const urlParams = new URLSearchParams(window.location.search);
  const inlineAnswersParam = urlParams.get("inlineAnswers");
  const inlineAnswers: InlineAnswer[] = inlineAnswersParam 
    ? JSON.parse(decodeURIComponent(inlineAnswersParam)) 
    : [];

  const { data: module, isLoading, error } = useQuery<ModuleWithProgress>({
    queryKey: ["/api/modules", id],
  });

  const submitMutation = useMutation({
    mutationFn: async (data: { moduleId: number; quizId: number; answers: number[]; inlineAnswers?: InlineAnswer[] }) => {
      return await apiRequest<QuizResult>("POST", "/api/quiz-attempts", data);
    },
    onSuccess: (data) => {
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/modules"] });
      queryClient.invalidateQueries({ queryKey: ["/api/modules", id] });
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
        description: "Failed to submit quiz. Please try again.",
        variant: "destructive",
      });
    },
  });

  const questions = module?.quiz?.questions || [];

  useEffect(() => {
    if (questions.length > 0 && answers.length === 0) {
      setAnswers(new Array(questions.length).fill(null));
    }
  }, [questions.length, answers.length]);

  useEffect(() => {
    setCurrentQuestion(0);
    setAnswers([]);
    setResult(null);
  }, [id]);

  const handleSelectAnswer = (index: number) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestion] = index;
    setAnswers(newAnswers);
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const handleSubmit = () => {
    if (answers.includes(null)) {
      toast({
        title: "Incomplete Quiz",
        description: "Please answer all questions before submitting.",
        variant: "destructive",
      });
      return;
    }

    if (!module?.quiz) return;

    submitMutation.mutate({
      moduleId: module.id,
      quizId: module.quiz.id,
      answers: answers as number[],
      inlineAnswers: inlineAnswers.length > 0 ? inlineAnswers : undefined,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-3xl mx-auto px-4 md:px-6 py-8">
          <LoadingSkeleton />
        </main>
      </div>
    );
  }

  if (error || !module || !module.quiz || questions.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-3xl mx-auto px-4 md:px-6 py-8">
          <Card className="p-12">
            <CardContent className="flex flex-col items-center justify-center text-center">
              <p className="text-destructive mb-4" data-testid="text-error">
                {error ? "Failed to load quiz." : "This module doesn't have a quiz yet."}
              </p>
              <Button asChild>
                <Link href={`/app/modules/${id}`}>Back to Module</Link>
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="max-w-3xl mx-auto px-4 md:px-6 py-8">
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/app" data-testid="link-breadcrumb-dashboard">Dashboard</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href={`/app/modules/${id}`} data-testid="link-breadcrumb-module">
                  {module.title}
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage data-testid="text-breadcrumb-quiz">Quiz</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {!result && (
          <Button 
            variant="ghost" 
            asChild 
            className="mb-6 -ml-2"
            data-testid="button-back"
          >
            <Link href={`/app/modules/${id}`} className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Module
            </Link>
          </Button>
        )}

        <h1 className="text-2xl font-bold mb-6" data-testid="text-quiz-title">
          {module.title} - Quiz
        </h1>

        {result ? (
          <ResultsCard
            result={result}
            questions={questions}
            answers={answers as number[]}
            moduleId={id!}
            moduleName={module.title}
          />
        ) : (
          <QuestionCard
            question={questions[currentQuestion]}
            questionIndex={currentQuestion}
            totalQuestions={questions.length}
            selectedAnswer={answers[currentQuestion]}
            onSelectAnswer={handleSelectAnswer}
            onNext={handleNext}
            onPrevious={handlePrevious}
            onSubmit={handleSubmit}
            isSubmitting={submitMutation.isPending}
          />
        )}
      </main>
    </div>
  );
}
