import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Plus, 
  Pencil, 
  Trash2, 
  BookOpen,
  ClipboardCheck,
  GripVertical
} from "lucide-react";
import type { Module } from "@shared/schema";

function LoadingSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-9 w-32" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
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
        <BookOpen className="h-16 w-16 text-muted-foreground/40 mb-4" />
        <h3 className="text-lg font-semibold mb-2" data-testid="text-empty-title">
          No Modules Yet
        </h3>
        <p className="text-muted-foreground mb-6" data-testid="text-empty-description">
          Create your first training module to get started.
        </p>
        <Button asChild data-testid="button-create-first-module">
          <Link href="/admin/modules/new/edit" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create Module
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export default function AdminModules() {
  const { toast } = useToast();
  const [deleteModuleId, setDeleteModuleId] = useState<number | null>(null);

  const { data: modules, isLoading } = useQuery<Module[]>({
    queryKey: ["/api/admin/modules"],
  });

  const togglePublishMutation = useMutation({
    mutationFn: async ({ id, published }: { id: number; published: boolean }) => {
      await apiRequest("PATCH", `/api/admin/modules/${id}`, { published });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/modules"] });
      toast({
        title: "Success",
        description: "Module status updated.",
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
        description: "Failed to update module status.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/modules/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/modules"] });
      setDeleteModuleId(null);
      toast({
        title: "Success",
        description: "Module deleted successfully.",
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
        description: "Failed to delete module.",
        variant: "destructive",
      });
    },
  });

  const breadcrumbs = [{ label: "Modules" }];

  if (isLoading) {
    return (
      <AdminLayout title="Modules" breadcrumbs={breadcrumbs}>
        <LoadingSkeleton />
      </AdminLayout>
    );
  }

  if (!modules || modules.length === 0) {
    return (
      <AdminLayout title="Modules" breadcrumbs={breadcrumbs}>
        <EmptyState />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Modules" breadcrumbs={breadcrumbs}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <CardTitle>All Modules</CardTitle>
            <Button asChild data-testid="button-create-module">
              <Link href="/admin/modules/new/edit" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create Module
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Published</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {modules.sort((a, b) => a.order - b.order).map((module, index) => (
                <TableRow key={module.id} data-testid={`row-module-${module.id}`}>
                  <TableCell className="text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground/50 cursor-grab" />
                      {module.order}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium" data-testid={`text-module-title-${module.id}`}>
                        {module.title}
                      </p>
                      {module.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {module.description}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={module.published ? "default" : "secondary"}
                      data-testid={`badge-status-${module.id}`}
                    >
                      {module.published ? "Published" : "Draft"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={module.published}
                      onCheckedChange={(checked) => 
                        togglePublishMutation.mutate({ id: module.id, published: checked })
                      }
                      disabled={togglePublishMutation.isPending}
                      data-testid={`switch-publish-${module.id}`}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        asChild
                        data-testid={`button-edit-${module.id}`}
                      >
                        <Link href={`/admin/modules/${module.id}/edit`}>
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        asChild
                        data-testid={`button-quiz-${module.id}`}
                      >
                        <Link href={`/admin/modules/${module.id}/quiz/edit`}>
                          <ClipboardCheck className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => setDeleteModuleId(module.id)}
                        data-testid={`button-delete-${module.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={deleteModuleId !== null} onOpenChange={() => setDeleteModuleId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Module</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this module? This action cannot be undone 
              and will also delete all sections, quiz questions, and attempt records.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteModuleId(null)} data-testid="button-cancel-delete">
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => deleteModuleId && deleteMutation.mutate(deleteModuleId)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
