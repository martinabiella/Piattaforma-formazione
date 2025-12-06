import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams, useLocation } from "wouter";
import { Header } from "@/components/header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { ArrowLeft, ArrowRight, BookOpen, ClipboardCheck, CheckCircle2, XCircle, HelpCircle } from "lucide-react";
import type { ModuleWithProgress, ModuleSection, ContentBlock, InlineAnswer } from "@shared/schema";
import { cn } from "@/lib/utils";

interface InlineQuestionProps {
  block: ContentBlock;
  answer: InlineAnswer | undefined;
  onAnswer: (blockId: number, selectedIndex: number, correct: boolean) => void;
}

function InlineQuestion({ block, answer, onAnswer }: InlineQuestionProps) {
  const [selected, setSelected] = useState<number | null>(answer?.selectedIndex ?? null);
  const [showResult, setShowResult] = useState(answer !== undefined);
  const options = block.options || [];

  const handleSelect = (index: number) => {
    if (showResult) return;
    setSelected(index);
  };

  const handleSubmit = () => {
    if (selected === null) return;
    const correct = selected === block.correctOptionIndex;
    onAnswer(block.id, selected, correct);
    setShowResult(true);
  };

  const isCorrect = answer?.correct;

  return (
    <Card className={cn(
      "my-8 border-2",
      showResult && isCorrect && "border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-950/20",
      showResult && !isCorrect && "border-red-500/50 bg-red-50/50 dark:bg-red-950/20"
    )} data-testid={`inline-question-${block.id}`}>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Quick Check</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="font-medium" data-testid={`text-inline-question-${block.id}`}>
          {block.question}
        </p>

        <div className="space-y-2">
          {options.map((option, index) => {
            const isSelected = selected === index;
            const isCorrectOption = index === block.correctOptionIndex;
            
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
                disabled={showResult}
                className={cn(
                  "w-full p-4 rounded-lg border text-left transition-all flex items-center gap-3",
                  optionStyles,
                  showResult && "cursor-default"
                )}
                data-testid={`option-inline-${block.id}-${index}`}
              >
                <span className={cn(
                  "w-6 h-6 rounded-full border-2 flex items-center justify-center text-sm font-medium",
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
            disabled={selected === null}
            className="w-full"
            data-testid={`button-submit-inline-${block.id}`}
          >
            Check Answer
          </Button>
        )}

        {showResult && block.explanation && (
          <div className={cn(
            "p-4 rounded-lg",
            isCorrect ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-amber-100 dark:bg-amber-900/30"
          )}>
            <p className="text-sm" data-testid={`text-explanation-${block.id}`}>
              <strong>Explanation:</strong> {block.explanation}
            </p>
          </div>
        )}

        {showResult && (
          <div className="flex items-center gap-2 text-sm">
            {isCorrect ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span className="text-emerald-600 font-medium">Correct!</span>
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4 text-red-600" />
                <span className="text-red-600 font-medium">
                  Incorrect. The correct answer is {String.fromCharCode(65 + (block.correctOptionIndex || 0))}.
                </span>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TextBlock({ block, index }: { block: ContentBlock; index: number }) {
  return (
    <section className="scroll-mt-24" id={`block-${block.id}`} data-testid={`block-text-${block.id}`}>
      {block.title && (
        <h2 className="text-2xl font-semibold mb-4" data-testid={`text-block-title-${block.id}`}>
          {index + 1}. {block.title}
        </h2>
      )}
      
      {block.imageUrl && (
        <div className="my-6 rounded-lg overflow-hidden">
          <img 
            src={block.imageUrl} 
            alt={block.title || "Module content"}
            className="w-full h-auto max-h-96 object-cover"
            data-testid={`img-block-${block.id}`}
          />
        </div>
      )}
      
      {block.content && (
        <div 
          className="prose prose-lg dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: block.content }}
          data-testid={`content-block-${block.id}`}
        />
      )}
    </section>
  );
}

function SectionContent({ section, index }: { section: ModuleSection; index: number }) {
  return (
    <section className="scroll-mt-24" id={`section-${section.id}`} data-testid={`section-${section.id}`}>
      <h2 className="text-2xl font-semibold mb-4" data-testid={`text-section-title-${section.id}`}>
        {index + 1}. {section.title}
      </h2>
      
      {section.imageUrl && (
        <div className="my-6 rounded-lg overflow-hidden">
          <img 
            src={section.imageUrl} 
            alt={section.title}
            className="w-full h-auto max-h-96 object-cover"
            data-testid={`img-section-${section.id}`}
          />
        </div>
      )}
      
      {section.content && (
        <div 
          className="prose prose-lg dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: section.content }}
          data-testid={`content-section-${section.id}`}
        />
      )}
    </section>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-8 w-1/3" />
      <div className="space-y-4">
        <Skeleton className="h-12 w-2/3" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-4/5" />
      </div>
      <Skeleton className="h-64 w-full rounded-lg" />
      <div className="space-y-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  );
}

function EmptyContent() {
  return (
    <Card className="p-12">
      <CardContent className="flex flex-col items-center justify-center text-center">
        <BookOpen className="h-16 w-16 text-muted-foreground/40 mb-4" />
        <h3 className="text-lg font-semibold mb-2" data-testid="text-empty-content-title">
          Content Coming Soon
        </h3>
        <p className="text-muted-foreground" data-testid="text-empty-content-description">
          This module doesn't have any content yet. Check back later!
        </p>
      </CardContent>
    </Card>
  );
}

export default function ModuleContent() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const [inlineAnswers, setInlineAnswers] = useState<Map<number, InlineAnswer>>(new Map());

  const { data: module, isLoading, error } = useQuery<ModuleWithProgress>({
    queryKey: ["/api/modules", id],
  });

  // Calculate inline question progress
  const contentBlocks = module?.contentBlocks || [];
  const inlineQuestions = contentBlocks.filter(b => b.blockType === "question");
  const answeredCount = inlineAnswers.size;
  const totalInlineQuestions = inlineQuestions.length;
  const inlineProgress = totalInlineQuestions > 0 ? (answeredCount / totalInlineQuestions) * 100 : 0;
  const correctCount = Array.from(inlineAnswers.values()).filter(a => a.correct).length;

  const handleInlineAnswer = (blockId: number, selectedIndex: number, correct: boolean) => {
    setInlineAnswers(prev => {
      const next = new Map(prev);
      next.set(blockId, { blockId, selectedIndex, correct });
      return next;
    });
  };

  // Determine content to render (prefer blocks, fallback to sections)
  const hasBlocks = contentBlocks.length > 0;
  const sections = module?.sections || [];
  const hasContent = hasBlocks || sections.length > 0;
  const hasQuiz = module?.quiz && module.quiz.questions && module.quiz.questions.length > 0;

  // Track text block index for numbering
  let textBlockIndex = 0;

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

  if (error || !module) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-3xl mx-auto px-4 md:px-6 py-8">
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
            Back to Modules
          </Link>
        </Button>

        <header className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <StatusBadge status={module.status} />
            {module.lastAttemptScore !== undefined && (
              <span className="text-sm text-muted-foreground" data-testid="text-last-score">
                Last score: {module.lastAttemptScore}%
              </span>
            )}
          </div>
          
          <h1 className="text-3xl md:text-4xl font-bold mb-4" data-testid="text-module-title">
            {module.title}
          </h1>
          
          {module.description && (
            <p className="text-lg text-muted-foreground" data-testid="text-module-description">
              {module.description}
            </p>
          )}
        </header>

        {module.imageUrl && (
          <div className="mb-8 rounded-lg overflow-hidden">
            <img 
              src={module.imageUrl} 
              alt={module.title}
              className="w-full h-auto max-h-96 object-cover"
              data-testid="img-module-hero"
            />
          </div>
        )}

        {totalInlineQuestions > 0 && (
          <Card className="mb-8 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Learning Progress</span>
                <span className="text-sm text-muted-foreground">
                  {answeredCount}/{totalInlineQuestions} questions answered
                  {answeredCount > 0 && ` (${correctCount} correct)`}
                </span>
              </div>
              <Progress value={inlineProgress} className="h-2" />
            </CardContent>
          </Card>
        )}

        {!hasContent ? (
          <EmptyContent />
        ) : hasBlocks ? (
          <div className="space-y-12 mb-12">
            {contentBlocks.map((block) => {
              if (block.blockType === "question") {
                return (
                  <InlineQuestion
                    key={block.id}
                    block={block}
                    answer={inlineAnswers.get(block.id)}
                    onAnswer={handleInlineAnswer}
                  />
                );
              } else {
                const currentIndex = textBlockIndex;
                textBlockIndex++;
                return (
                  <TextBlock key={block.id} block={block} index={currentIndex} />
                );
              }
            })}
          </div>
        ) : (
          <div className="space-y-12 mb-12">
            {sections.map((section, index) => (
              <SectionContent key={section.id} section={section} index={index} />
            ))}
          </div>
        )}

        {hasQuiz && (
          <Card className="mt-8 border-primary/20 bg-primary/5">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <ClipboardCheck className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold" data-testid="text-quiz-cta-title">
                      Ready to Test Your Knowledge?
                    </h3>
                    <p className="text-sm text-muted-foreground" data-testid="text-quiz-cta-description">
                      {totalInlineQuestions > 0 
                        ? `Complete the final quiz to finish this module. Your inline answers (${correctCount}/${totalInlineQuestions} correct) will contribute to your score.`
                        : "Complete the quiz to finish this module"
                      }
                    </p>
                  </div>
                </div>
                <Button 
                  asChild 
                  data-testid="button-start-quiz"
                  disabled={totalInlineQuestions > 0 && answeredCount < totalInlineQuestions}
                >
                  <Link 
                    href={`/app/modules/${id}/quiz?inlineAnswers=${encodeURIComponent(JSON.stringify(Array.from(inlineAnswers.values())))}`}
                    className="flex items-center gap-2"
                  >
                    Start Quiz
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
              {totalInlineQuestions > 0 && answeredCount < totalInlineQuestions && (
                <p className="text-sm text-amber-600 dark:text-amber-400 mt-4">
                  Please answer all inline questions before taking the final quiz.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {!hasQuiz && hasContent && (
          <Card className="mt-8">
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground" data-testid="text-no-quiz">
                This module does not have a quiz yet.
              </p>
              <Button asChild className="mt-4">
                <Link href="/app">Back to Dashboard</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
