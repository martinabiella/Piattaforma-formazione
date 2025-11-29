import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/header";
import { ModuleCard } from "@/components/module-card";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, Trophy, Clock } from "lucide-react";
import type { ModuleWithProgress } from "@shared/schema";

function DashboardStats({ modules }: { modules: ModuleWithProgress[] }) {
  const completed = modules.filter(m => m.status === "completed").length;
  const inProgress = modules.filter(m => m.status === "in_progress").length;
  const total = modules.length;

  const stats = [
    {
      label: "Total Modules",
      value: total,
      icon: BookOpen,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "In Progress",
      value: inProgress,
      icon: Clock,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-100 dark:bg-amber-900/30",
    },
    {
      label: "Completed",
      value: completed,
      icon: Trophy,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-100 dark:bg-emerald-900/30",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      {stats.map((stat, index) => (
        <Card key={index} data-testid={`card-stat-${stat.label.toLowerCase().replace(/\s+/g, '-')}`}>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-lg ${stat.bg} flex items-center justify-center`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold" data-testid={`text-stat-value-${stat.label.toLowerCase().replace(/\s+/g, '-')}`}>
                  {stat.value}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ModulesGrid({ modules }: { modules: ModuleWithProgress[] }) {
  if (modules.length === 0) {
    return (
      <Card className="p-12">
        <CardContent className="flex flex-col items-center justify-center text-center">
          <BookOpen className="h-16 w-16 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-semibold mb-2" data-testid="text-empty-title">No Modules Available</h3>
          <p className="text-muted-foreground" data-testid="text-empty-description">
            There are no published training modules yet. Check back soon!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {modules.map((module) => (
        <ModuleCard key={module.id} module={module} />
      ))}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <Skeleton className="w-12 h-12 rounded-lg" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-12" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <Skeleton className="aspect-video" />
            <CardContent className="p-6 space-y-4">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { data: modules, isLoading, error } = useQuery<ModuleWithProgress[]>({
    queryKey: ["/api/modules"],
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2" data-testid="text-dashboard-title">
            My Learning Dashboard
          </h1>
          <p className="text-muted-foreground" data-testid="text-dashboard-subtitle">
            Track your progress and continue learning where you left off.
          </p>
        </div>

        {isLoading ? (
          <LoadingSkeleton />
        ) : error ? (
          <Card className="p-12">
            <CardContent className="flex flex-col items-center justify-center text-center">
              <p className="text-destructive" data-testid="text-error">
                Failed to load modules. Please try again later.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <DashboardStats modules={modules || []} />
            <div className="mb-6">
              <h2 className="text-xl font-semibold" data-testid="text-modules-heading">
                Training Modules
              </h2>
            </div>
            <ModulesGrid modules={modules || []} />
          </>
        )}
      </main>
    </div>
  );
}
