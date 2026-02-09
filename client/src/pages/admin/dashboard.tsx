import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BookOpen,
  Users,
  ClipboardCheck,
  Trophy,
  Plus,
  ArrowRight,
  TrendingUp
} from "lucide-react";
import type { Module, QuizAttemptWithDetails } from "@shared/schema";

interface AdminStats {
  totalModules: number;
  publishedModules: number;
  totalUsers: number;

  passRate: number;
}

function StatsCards({ stats }: { stats: AdminStats | undefined; isLoading: boolean }) {
  const statCards = [
    {
      title: "Total Modules",
      value: stats?.totalModules ?? 0,
      icon: BookOpen,
      description: `${stats?.publishedModules ?? 0} published`,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      title: "Total Users",
      value: stats?.totalUsers ?? 0,
      icon: Users,
      description: "Registered learners",
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-100 dark:bg-blue-900/30",
    },

    {
      title: "Pass Rate",
      value: `${stats?.passRate ?? 0}%`,
      icon: Trophy,
      description: "Average success rate",
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-100 dark:bg-emerald-900/30",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {statCards.map((stat, index) => (
        <Card key={index} data-testid={`card-admin-stat-${index}`}>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-lg ${stat.bg} flex items-center justify-center`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">{stat.title}</p>
                <p className="text-2xl font-bold" data-testid={`text-admin-stat-${index}`}>
                  {stat.value}
                </p>
                <p className="text-xs text-muted-foreground">{stat.description}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function RecentActivity({ attempts }: { attempts: QuizAttemptWithDetails[] }) {
  if (attempts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Recent Activity
          </CardTitle>
          <CardDescription>Latest quiz attempts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground" data-testid="text-no-activity">
            No quiz attempts yet.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Recent Activity
        </CardTitle>
        <CardDescription>Latest quiz attempts</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {attempts.slice(0, 5).map((attempt, index) => (
            <div
              key={attempt.id}
              className="flex items-center justify-between py-2 border-b last:border-0"
              data-testid={`activity-item-${index}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                  {attempt.user?.firstName?.[0] || attempt.user?.email?.[0] || "U"}
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {attempt.user?.firstName
                      ? `${attempt.user.firstName} ${attempt.user.lastName || ""}`
                      : attempt.user?.email || "Unknown User"
                    }
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {attempt.module?.title || "Unknown Module"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={attempt.passed ? "default" : "secondary"}>
                  {attempt.score}%
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {attempt.createdAt
                    ? new Date(attempt.createdAt).toLocaleDateString()
                    : "N/A"
                  }
                </span>
              </div>
            </div>
          ))}
        </div>
        <Button variant="ghost" asChild className="w-full mt-4" data-testid="button-view-all-results">
          <Link href="/admin/results" className="flex items-center gap-2">
            View All Results
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function QuickActions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
        <CardDescription>Common management tasks</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button asChild className="w-full justify-start" variant="outline" data-testid="button-create-module">
          <Link href="/admin/modules?action=create" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create New Module
          </Link>
        </Button>
        <Button asChild className="w-full justify-start" variant="outline" data-testid="button-manage-modules">
          <Link href="/admin/modules" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Manage Modules
          </Link>
        </Button>
        <Button asChild className="w-full justify-start" variant="outline" data-testid="button-view-results">
          <Link href="/admin/results" className="flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4" />
            View Results
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <Skeleton className="w-12 h-12 rounded-lg" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-16" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
  });

  const { data: recentAttempts, isLoading: attemptsLoading } = useQuery<QuizAttemptWithDetails[]>({
    queryKey: ["/api/admin/recent-attempts"],
  });

  const isLoading = statsLoading || attemptsLoading;

  return (
    <AdminLayout title="Dashboard">
      {isLoading ? (
        <LoadingSkeleton />
      ) : (
        <>
          <StatsCards stats={stats} isLoading={statsLoading} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <RecentActivity attempts={recentAttempts || []} />
            </div>
            <QuickActions />
          </div>
        </>
      )}
    </AdminLayout>
  );
}
