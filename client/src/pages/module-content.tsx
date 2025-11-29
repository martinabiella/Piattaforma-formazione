import { useQuery } from "@tanstack/react-query";
import { Link, useParams, useLocation } from "wouter";
import { Header } from "@/components/header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { ArrowLeft, ArrowRight, BookOpen, ClipboardCheck } from "lucide-react";
import type { ModuleWithProgress, ModuleSection } from "@shared/schema";

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

  const { data: module, isLoading, error } = useQuery<ModuleWithProgress>({
    queryKey: ["/api/modules", id],
  });

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

  const sections = module.sections || [];
  const hasQuiz = module.quiz && module.quiz.questions && module.quiz.questions.length > 0;

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

        {sections.length === 0 ? (
          <EmptyContent />
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
                      Complete the quiz to finish this module
                    </p>
                  </div>
                </div>
                <Button asChild data-testid="button-start-quiz">
                  <Link href={`/app/modules/${id}/quiz`} className="flex items-center gap-2">
                    Start Quiz
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {!hasQuiz && sections.length > 0 && (
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
