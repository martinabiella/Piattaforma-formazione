import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useParams, useLocation } from "wouter";
import { Header } from "@/components/header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, XCircle, Lock, LockOpen, HelpCircle, Trophy } from "lucide-react";
import type { ModuleWithSteps, StepWithProgress } from "@shared/schema";
import { cn } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface CheckpointProps {
  step: StepWithProgress;
  onAnswer: (selectedIndex: number) => void;
  isPending: boolean;
}

function Checkpoint({ step, onAnswer, isPending }: CheckpointProps) {
  const checkpoint = step.checkpoint;
  if (!checkpoint) return null;

  // Use checkpoint-level progress if available, otherwise fall back to step-level
  const checkpointWithProgress = checkpoint as typeof checkpoint & { userAnswer?: number; wasCorrect?: boolean };
  const savedAnswer = checkpointWithProgress.userAnswer;
  const wasCorrect = checkpointWithProgress.wasCorrect;
  const showResult = savedAnswer !== undefined;

  const [selected, setSelected] = useState<number | null>(savedAnswer ?? null);

  const options = checkpoint.options || [];

  const handleSelect = (index: number) => {
    if (showResult || isPending) return;
    setSelected(index);
  };

  const handleSubmit = () => {
    if (selected === null || isPending) return;
    onAnswer(selected);
  };

  return (
    <Card className={cn(
      "border-2",
      showResult && wasCorrect && "border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-950/20",
      showResult && !wasCorrect && "border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20"
    )} data-testid={`checkpoint-${checkpoint.id}`}>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Checkpoint Question</CardTitle>
          {!showResult && (
            <Badge variant="outline" className="ml-auto">Required to continue</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="font-medium text-lg" data-testid={`text-checkpoint-question-${step.id}`}>
          {checkpoint.question}
        </p>

        <div className="space-y-2">
          {options.map((option, index) => {
            const isSelected = selected === index;
            const isCorrectOption = index === checkpoint.correctOptionIndex;

            let optionStyles = "cursor-pointer hover-elevate";
            if (showResult) {
              if (isCorrectOption) {
                optionStyles = "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30";
              } else if (isSelected && !isCorrectOption) {
                optionStyles = "border-red-500 bg-red-50 dark:bg-red-950/30";
              }
            } else if (isSelected) {
              optionStyles = "border-primary bg-primary/5";
            }

            return (
              <button
                key={index}
                onClick={() => handleSelect(index)}
                disabled={showResult || isPending}
                className={cn(
                  "w-full p-4 rounded-lg border text-left transition-all flex items-center gap-3",
                  optionStyles,
                  (showResult || isPending) && "cursor-default"
                )}
                data-testid={`option-checkpoint-${step.id}-${index}`}
              >
                <span className={cn(
                  "w-6 h-6 rounded-full border-2 flex items-center justify-center text-sm font-medium shrink-0",
                  isSelected && !showResult && "border-primary bg-primary text-primary-foreground",
                  showResult && isCorrectOption && "border-emerald-500 bg-emerald-500 text-white",
                  showResult && isSelected && !isCorrectOption && "border-red-500 bg-red-500 text-white"
                )}>
                  {showResult && isCorrectOption && <CheckCircle2 className="h-4 w-4" />}
                  {showResult && isSelected && !isCorrectOption && <XCircle className="h-4 w-4" />}
                  {!showResult && String.fromCharCode(65 + index)}
                </span>
                <span>{option}</span>
              </button>
            );
          })}
        </div>

        {!showResult && (
          <Button
            onClick={handleSubmit}
            disabled={selected === null || isPending}
            className="w-full"
            data-testid={`button-submit-checkpoint-${step.id}`}
          >
            {isPending ? "Submitting..." : "Submit Answer"}
          </Button>
        )}

        {showResult && checkpoint.explanation && (
          <div className={cn(
            "p-4 rounded-lg",
            wasCorrect ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-amber-100 dark:bg-amber-900/30"
          )}>
            <p className="text-sm" data-testid={`text-explanation-${step.id}`}>
              <strong>Explanation:</strong> {checkpoint.explanation}
            </p>
          </div>
        )}

        {showResult && (
          <div className="flex items-center gap-2 text-sm">
            {wasCorrect ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span className="text-emerald-600 font-medium">Correct! You can proceed to the next step.</span>
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4 text-amber-600" />
                <span className="text-amber-600 font-medium">
                  Not quite right. The correct answer was {String.fromCharCode(65 + (checkpoint.correctOptionIndex || 0))}. You can still proceed.
                </span>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StepNavItem({
  step,
  index,
  isCurrent,
  onClick
}: {
  step: StepWithProgress;
  index: number;
  isCurrent: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={!step.isUnlocked}
      className={cn(
        "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all",
        step.isUnlocked ? "hover-elevate cursor-pointer" : "opacity-50 cursor-not-allowed",
        isCurrent && "bg-primary/10 border border-primary/20"
      )}
      data-testid={`step-nav-${step.id}`}
    >
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium shrink-0",
        step.isCompleted && step.wasCorrect && "bg-emerald-500 text-white",
        step.isCompleted && !step.wasCorrect && "bg-amber-500 text-white",
        !step.isCompleted && step.isUnlocked && "bg-primary text-primary-foreground",
        !step.isUnlocked && "bg-muted text-muted-foreground"
      )}>
        {step.isCompleted ? (
          step.wasCorrect ? <CheckCircle2 className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />
        ) : step.isUnlocked ? (
          index + 1
        ) : (
          <Lock className="h-3 w-3" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn(
          "font-medium",
          isCurrent && "text-primary"
        )}>
          {step.title}
        </p>
        {step.isCompleted && (
          <p className="text-xs text-muted-foreground">
            {step.wasCorrect ? "Answered correctly" : "Answered"}
          </p>
        )}
      </div>
    </button>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-6 w-full" />
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

export default function ModuleSteps() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const { toast } = useToast();

  const { data: module, isLoading, error } = useQuery<ModuleWithSteps>({
    queryKey: ["/api/modules", id, "steps"],
  });

  const submitCheckpoint = useMutation({
    mutationFn: async ({ stepId, selectedAnswerIndex, checkpointId }: { stepId: number; selectedAnswerIndex: number; checkpointId?: number }) => {
      return await apiRequest<{ correct: boolean; unlockNext: boolean }>("POST", `/api/steps/${stepId}/checkpoint`, { selectedAnswerIndex, checkpointId });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/modules", id, "steps"] });
      if (data?.correct) {
        toast({
          title: "Correct!",
          description: "You can proceed to the next step.",
        });
      } else {
        toast({
          title: "Not quite right",
          description: "Review the explanation and continue to the next step.",
          variant: "default",
        });
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to submit answer. Please try again.",
        variant: "destructive",
      });
    },
  });

  const markComplete = useMutation({
    mutationFn: async (stepId: number) => {
      return await apiRequest<{ success: boolean }>("POST", `/api/steps/${stepId}/complete`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/modules", id, "steps"] });
      toast({
        title: "Step Completed!",
        description: "You can proceed to the next step.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to mark step complete. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Sync currentStepIndex with module data
  useEffect(() => {
    if (module) {
      setCurrentStepIndex(module.currentStepIndex);
    }
  }, [module?.currentStepIndex]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-5xl mx-auto px-4 md:px-6 py-8">
          <LoadingSkeleton />
        </main>
      </div>
    );
  }

  if (error || !module) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-5xl mx-auto px-4 md:px-6 py-8">
          <Card className="p-12">
            <CardContent className="flex flex-col items-center justify-center text-center">
              <p className="text-destructive" data-testid="text-error">
                Failed to load module. Please try again later.
              </p>
              <Button asChild className="mt-4">
                <Link href="/app">Back to Dashboard</Link>
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const steps = module.steps || [];
  const currentStep = steps[currentStepIndex];
  const isComplete = module.status === "completed";
  const progress = steps.length > 0 ? (module.completedSteps / steps.length) * 100 : 0;

  const handleStepChange = (index: number) => {
    if (steps[index]?.isUnlocked) {
      setCurrentStepIndex(index);
    }
  };

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1 && steps[currentStepIndex + 1]?.isUnlocked) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  const handleCheckpointAnswer = (selectedIndex: number, checkpointId?: number) => {
    if (!currentStep) return;
    submitCheckpoint.mutate({
      stepId: currentStep.id,
      selectedAnswerIndex: selectedIndex,
      checkpointId
    });
  };

  if (steps.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-5xl mx-auto px-4 md:px-6 py-8">
          <Button
            variant="ghost"
            asChild
            className="mb-6 -ml-2"
          >
            <Link href="/app" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>

          <Card className="p-12">
            <CardContent className="flex flex-col items-center justify-center text-center">
              <BookOpen className="h-16 w-16 text-muted-foreground/40 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Steps Yet</h3>
              <p className="text-muted-foreground">
                This module doesn't have any learning steps yet. Check back later!
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-6xl mx-auto px-4 md:px-6 py-8">
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/app" data-testid="link-breadcrumb-dashboard">Dashboard</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage data-testid="text-breadcrumb-module">{module.title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <Button
          variant="ghost"
          asChild
          className="mb-6 -ml-2"
          data-testid="button-back"
        >
          <Link href="/app" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar - Step navigation */}
          <aside className="lg:w-72 shrink-0">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Your Progress</CardTitle>
                <div className="flex items-center gap-2 mt-2">
                  <Progress value={progress} className="flex-1" />
                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                    {module.completedSteps}/{steps.length}
                  </span>
                </div>
                {module.moduleScore !== undefined && isComplete && (
                  <div className="flex items-center gap-2 mt-2 text-sm">
                    <Trophy className="h-4 w-4 text-amber-500" />
                    <span>Score: <strong>{module.moduleScore}%</strong></span>
                  </div>
                )}
              </CardHeader>
              <CardContent className="pt-0">
                <ScrollArea className="max-h-[60vh]">
                  <div className="space-y-1">
                    {steps.map((step, index) => (
                      <StepNavItem
                        key={step.id}
                        step={step}
                        index={index}
                        isCurrent={index === currentStepIndex}
                        onClick={() => handleStepChange(index)}
                      />
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </aside>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3 flex-wrap">
                  <Badge variant={currentStep?.isCompleted ? "default" : "secondary"}>
                    Step {currentStepIndex + 1} of {steps.length}
                  </Badge>
                  {currentStep?.isCompleted && (
                    <Badge variant="outline" className={cn(
                      currentStep.wasCorrect
                        ? "border-emerald-500 text-emerald-600"
                        : "border-amber-500 text-amber-600"
                    )}>
                      {currentStep.wasCorrect ? "Answered Correctly" : "Answered"}
                    </Badge>
                  )}
                  {!currentStep?.isUnlocked && (
                    <Badge variant="destructive">
                      <Lock className="h-3 w-3 mr-1" />
                      Locked
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-2xl mt-2" data-testid="text-step-title">
                  {currentStep?.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Content blocks */}
                {currentStep?.contentBlocks.map((block) => (
                  <div key={block.id} data-testid={`content-block-${block.id}`}>
                    {block.imageUrl && (
                      <div className="mb-4 rounded-lg overflow-hidden">
                        <img
                          src={block.imageUrl}
                          alt="Step content"
                          className="w-full h-auto max-h-80 object-cover"
                        />
                      </div>
                    )}
                    {block.content && (
                      <div
                        className="prose prose-lg dark:prose-invert max-w-none"
                        dangerouslySetInnerHTML={{ __html: block.content }}
                      />
                    )}
                  </div>
                ))}

                {/* Checkpoint questions */}
                {currentStep?.checkpoints && currentStep.checkpoints.length > 0 && currentStep.isUnlocked && (
                  <div className="mt-8 pt-6 border-t space-y-6">
                    {currentStep.checkpoints.map((checkpoint, index) => (
                      <Checkpoint
                        key={checkpoint.id || index}
                        step={{ ...currentStep, checkpoint }}
                        onAnswer={(idx) => handleCheckpointAnswer(idx, checkpoint.id)}
                        isPending={submitCheckpoint.isPending}
                      />
                    ))}
                  </div>
                )}
                {/* Fallback for old checkpoint format */}
                {(!currentStep?.checkpoints || currentStep.checkpoints.length === 0) && currentStep?.checkpoint && currentStep.isUnlocked && (
                  <div className="mt-8 pt-6 border-t">
                    <Checkpoint
                      step={currentStep}
                      onAnswer={(idx) => handleCheckpointAnswer(idx, currentStep.checkpoint!.id)}
                      isPending={submitCheckpoint.isPending}
                    />
                  </div>
                )}

                {/* Navigation buttons */}
                <div className="flex items-center justify-between pt-6 border-t gap-4">
                  <Button
                    variant="outline"
                    onClick={handlePrevious}
                    disabled={currentStepIndex === 0}
                    data-testid="button-previous-step"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Previous
                  </Button>

                  {currentStepIndex < steps.length - 1 ? (
                    <Button
                      onClick={handleNext}
                      disabled={!steps[currentStepIndex + 1]?.isUnlocked}
                      data-testid="button-next-step"
                    >
                      Next Step
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  ) : isComplete ? (
                    <Button asChild data-testid="button-finish">
                      <Link href="/app">
                        <Trophy className="h-4 w-4 mr-2" />
                        Complete - Return to Dashboard
                      </Link>
                    </Button>
                  ) : currentStep && (!currentStep.checkpoints || currentStep.checkpoints.length === 0) && !currentStep.isCompleted ? (
                    <Button
                      onClick={() => markComplete.mutate(currentStep.id)}
                      disabled={markComplete.isPending}
                      data-testid="button-mark-complete"
                    >
                      {markComplete.isPending ? "Completing..." : "Mark as Read & Complete"}
                    </Button>
                  ) : currentStep?.isCompleted ? (
                    <Button asChild data-testid="button-finish">
                      <Link href="/app">
                        <Trophy className="h-4 w-4 mr-2" />
                        Complete - Return to Dashboard
                      </Link>
                    </Button>
                  ) : (
                    <Button disabled data-testid="button-answer-required">
                      Answer checkpoint to complete
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Completion card */}
            {isComplete && (
              <Card className="mt-6 border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-950/20">
                <CardContent className="flex items-center gap-4 py-6">
                  <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center">
                    <Trophy className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Module Complete!</h3>
                    <p className="text-muted-foreground">
                      Your score: <strong>{module.moduleScore}%</strong> ({module.completedSteps} of {steps.length} steps completed)
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
