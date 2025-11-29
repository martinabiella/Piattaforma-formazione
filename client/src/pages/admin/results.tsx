import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ClipboardCheck, Search, Filter } from "lucide-react";
import type { QuizAttemptWithDetails, Module } from "@shared/schema";

function LoadingSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-32" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <Card className="p-12">
      <CardContent className="flex flex-col items-center justify-center text-center">
        <ClipboardCheck className="h-16 w-16 text-muted-foreground/40 mb-4" />
        <h3 className="text-lg font-semibold mb-2" data-testid="text-empty-title">
          No Results Yet
        </h3>
        <p className="text-muted-foreground" data-testid="text-empty-description">
          Quiz results will appear here once users start taking quizzes.
        </p>
      </CardContent>
    </Card>
  );
}

export default function AdminResults() {
  const [searchTerm, setSearchTerm] = useState("");
  const [moduleFilter, setModuleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: attempts, isLoading: attemptsLoading } = useQuery<QuizAttemptWithDetails[]>({
    queryKey: ["/api/admin/quiz-attempts"],
  });

  const { data: modules } = useQuery<Module[]>({
    queryKey: ["/api/admin/modules"],
  });

  const filteredAttempts = (attempts || []).filter((attempt) => {
    const userName = attempt.user?.firstName 
      ? `${attempt.user.firstName} ${attempt.user.lastName || ""}`
      : attempt.user?.email || "";
    
    const matchesSearch = userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      attempt.module?.title?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesModule = moduleFilter === "all" || attempt.moduleId.toString() === moduleFilter;
    
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "passed" && attempt.passed) ||
      (statusFilter === "failed" && !attempt.passed);

    return matchesSearch && matchesModule && matchesStatus;
  });

  const breadcrumbs = [{ label: "Results" }];

  if (attemptsLoading) {
    return (
      <AdminLayout title="Quiz Results" breadcrumbs={breadcrumbs}>
        <LoadingSkeleton />
      </AdminLayout>
    );
  }

  if (!attempts || attempts.length === 0) {
    return (
      <AdminLayout title="Quiz Results" breadcrumbs={breadcrumbs}>
        <EmptyState />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Quiz Results" breadcrumbs={breadcrumbs}>
      <Card>
        <CardHeader>
          <CardTitle>All Quiz Attempts</CardTitle>
          <CardDescription>View and filter quiz results from all users</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by user or module..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search"
              />
            </div>
            
            <Select value={moduleFilter} onValueChange={setModuleFilter}>
              <SelectTrigger className="w-full sm:w-48" data-testid="select-module-filter">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by module" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modules</SelectItem>
                {(modules || []).map((module) => (
                  <SelectItem key={module.id} value={module.id.toString()}>
                    {module.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-36" data-testid="select-status-filter">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="passed">Passed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filteredAttempts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground" data-testid="text-no-results">
              No results match your filters.
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Module</TableHead>
                    <TableHead className="text-center">Score</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAttempts.map((attempt, index) => {
                    const userName = attempt.user?.firstName 
                      ? `${attempt.user.firstName} ${attempt.user.lastName || ""}`
                      : attempt.user?.email || "Unknown User";
                    
                    const initials = attempt.user?.firstName
                      ? `${attempt.user.firstName[0]}${attempt.user.lastName?.[0] || ""}`
                      : attempt.user?.email?.[0] || "U";

                    return (
                      <TableRow key={attempt.id} data-testid={`row-result-${index}`}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage 
                                src={attempt.user?.profileImageUrl || undefined} 
                                alt={userName}
                                className="object-cover"
                              />
                              <AvatarFallback className="text-xs">
                                {initials.toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-sm" data-testid={`text-user-${index}`}>
                                {userName}
                              </p>
                              {attempt.user?.email && attempt.user.firstName && (
                                <p className="text-xs text-muted-foreground">
                                  {attempt.user.email}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell data-testid={`text-module-${index}`}>
                          {attempt.module?.title || "Unknown Module"}
                        </TableCell>
                        <TableCell className="text-center">
                          <span 
                            className={`font-semibold ${
                              attempt.passed 
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-red-600 dark:text-red-400"
                            }`}
                            data-testid={`text-score-${index}`}
                          >
                            {attempt.score}%
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={attempt.passed ? "default" : "secondary"}
                            data-testid={`badge-status-${index}`}
                          >
                            {attempt.passed ? "Passed" : "Failed"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground text-sm" data-testid={`text-date-${index}`}>
                          {attempt.createdAt 
                            ? new Date(attempt.createdAt).toLocaleDateString(undefined, {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "N/A"
                          }
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          <p className="text-sm text-muted-foreground mt-4" data-testid="text-total-results">
            Showing {filteredAttempts.length} of {attempts.length} results
          </p>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
