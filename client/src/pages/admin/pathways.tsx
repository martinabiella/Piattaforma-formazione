import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Route, Trash2, Edit2, BookOpen, Users, UserPlus, GripVertical } from "lucide-react";
import type { TrainingPathway, Module, UserGroup, User } from "@shared/schema";

interface PathwayModule {
  moduleId: number;
  orderIndex: number;
  module: Module;
}

interface PathwayWithModules extends TrainingPathway {
  modules: PathwayModule[];
}

interface GroupWithMembers extends UserGroup {
  members: { userId: string; user: User }[];
}

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <Skeleton className="h-6 w-32 mb-2" />
            <Skeleton className="h-4 w-48 mb-4" />
            <Skeleton className="h-8 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function CreatePathwayDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedModules, setSelectedModules] = useState<number[]>([]);
  const { toast } = useToast();

  const { data: modules } = useQuery<Module[]>({
    queryKey: ["/api/admin/modules"],
    enabled: open,
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string; moduleIds: number[] }) => {
      return await apiRequest("POST", "/api/admin/pathways", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pathways"] });
      toast({
        title: "Pathway Created",
        description: "The training pathway has been created successfully.",
      });
      setOpen(false);
      setName("");
      setDescription("");
      setSelectedModules([]);
      onSuccess();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create pathway.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || selectedModules.length === 0) return;
    createMutation.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
      moduleIds: selectedModules,
    });
  };

  const toggleModule = (moduleId: number) => {
    setSelectedModules((prev) =>
      prev.includes(moduleId) ? prev.filter((id) => id !== moduleId) : [...prev, moduleId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-create-pathway">
          <Plus className="h-4 w-4 mr-2" />
          Create Pathway
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Training Pathway</DialogTitle>
            <DialogDescription>
              Bundle modules together to create a structured learning experience.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Pathway Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., New Employee Onboarding"
                data-testid="input-pathway-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what learners will achieve"
                data-testid="input-pathway-description"
              />
            </div>
            <div className="space-y-2">
              <Label>Select Modules</Label>
              <div className="space-y-2 max-h-48 overflow-auto border rounded-lg p-3">
                {modules?.map((module) => (
                  <div
                    key={module.id}
                    className="flex items-center gap-3 p-2 rounded hover:bg-muted/50"
                  >
                    <Checkbox
                      id={`module-${module.id}`}
                      checked={selectedModules.includes(module.id)}
                      onCheckedChange={() => toggleModule(module.id)}
                      data-testid={`checkbox-module-${module.id}`}
                    />
                    <label
                      htmlFor={`module-${module.id}`}
                      className="flex-1 cursor-pointer text-sm"
                    >
                      {module.title}
                    </label>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {selectedModules.length} module(s) selected
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!name.trim() || selectedModules.length === 0 || createMutation.isPending}
            >
              {createMutation.isPending ? "Creating..." : "Create Pathway"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AssignPathwayDialog({
  pathway,
  open,
  onOpenChange,
}: {
  pathway: PathwayWithModules | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const [assignType, setAssignType] = useState<"group" | "user">("group");
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  const { data: groups } = useQuery<GroupWithMembers[]>({
    queryKey: ["/api/admin/groups"],
    enabled: open,
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    enabled: open,
  });

  const assignMutation = useMutation({
    mutationFn: async (data: { pathwayId: number; groupId?: number; userId?: string }) => {
      if (data.groupId) {
        return await apiRequest("POST", `/api/admin/pathways/${data.pathwayId}/assign-group`, { groupId: data.groupId });
      } else {
        return await apiRequest("POST", `/api/admin/pathways/${data.pathwayId}/assign-user`, { userId: data.userId });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pathways"] });
      toast({
        title: "Pathway Assigned",
        description: "The pathway has been assigned successfully.",
      });
      setSelectedGroupId("");
      setSelectedUserId("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to assign pathway.",
        variant: "destructive",
      });
    },
  });

  if (!pathway) return null;

  const handleAssign = () => {
    if (assignType === "group" && selectedGroupId) {
      assignMutation.mutate({ pathwayId: pathway.id, groupId: parseInt(selectedGroupId) });
    } else if (assignType === "user" && selectedUserId) {
      assignMutation.mutate({ pathwayId: pathway.id, userId: selectedUserId });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Pathway</DialogTitle>
          <DialogDescription>
            Assign "{pathway.name}" to a group or individual user.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Assign To</Label>
            <Select value={assignType} onValueChange={(v) => setAssignType(v as "group" | "user")}>
              <SelectTrigger data-testid="select-assign-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="group">Group</SelectItem>
                <SelectItem value="user">Individual User</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {assignType === "group" ? (
            <div className="space-y-2">
              <Label>Select Group</Label>
              <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                <SelectTrigger data-testid="select-assign-group">
                  <SelectValue placeholder="Choose a group" />
                </SelectTrigger>
                <SelectContent>
                  {groups?.map((group) => (
                    <SelectItem key={group.id} value={group.id.toString()}>
                      {group.name} ({group.members.length} members)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Select User</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger data-testid="select-assign-user">
                  <SelectValue placeholder="Choose a user" />
                </SelectTrigger>
                <SelectContent>
                  {users?.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.firstName} {user.lastName} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={
              assignMutation.isPending ||
              (assignType === "group" && !selectedGroupId) ||
              (assignType === "user" && !selectedUserId)
            }
          >
            {assignMutation.isPending ? "Assigning..." : "Assign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PathwayDetailsDialog({
  pathway,
  open,
  onOpenChange,
}: {
  pathway: PathwayWithModules | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!pathway) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Route className="h-5 w-5" />
            {pathway.name}
          </DialogTitle>
          <DialogDescription>{pathway.description || "No description"}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div>
            <h4 className="font-medium mb-3">Modules in this pathway ({pathway.modules.length})</h4>
            {pathway.modules.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No modules in this pathway.</p>
            ) : (
              <div className="space-y-2">
                {pathway.modules
                  .sort((a, b) => a.orderIndex - b.orderIndex)
                  .map((pm, index) => (
                    <div
                      key={pm.moduleId}
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                      data-testid={`pathway-module-${pm.moduleId}`}
                    >
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{pm.module?.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {pm.module?.description}
                        </p>
                      </div>
                      <Badge variant="secondary">
                        <BookOpen className="h-3 w-3 mr-1" />
                        Module
                      </Badge>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminPathways() {
  const [selectedPathway, setSelectedPathway] = useState<PathwayWithModules | null>(null);
  const [assignPathway, setAssignPathway] = useState<PathwayWithModules | null>(null);
  const { toast } = useToast();

  const { data: pathways, isLoading } = useQuery<PathwayWithModules[]>({
    queryKey: ["/api/admin/pathways"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (pathwayId: number) => {
      return await apiRequest("DELETE", `/api/admin/pathways/${pathwayId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pathways"] });
      toast({
        title: "Pathway Deleted",
        description: "The pathway has been deleted.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete pathway.",
        variant: "destructive",
      });
    },
  });

  return (
    <AdminLayout title="Training Pathways" breadcrumbs={[{ label: "Pathways" }]}>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <p className="text-muted-foreground">
            Create structured learning experiences by bundling modules together.
          </p>
          <CreatePathwayDialog onSuccess={() => {}} />
        </div>

        {isLoading ? (
          <LoadingSkeleton />
        ) : pathways && pathways.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pathways.map((pathway) => (
              <Card key={pathway.id} className="hover-elevate" data-testid={`card-pathway-${pathway.id}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Route className="h-4 w-4 text-primary" />
                        {pathway.name}
                      </CardTitle>
                      <CardDescription className="line-clamp-2">
                        {pathway.description || "No description"}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pb-2">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <BookOpen className="h-4 w-4" />
                      {pathway.modules.length} modules
                    </span>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between gap-2 pt-2">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedPathway(pathway)}
                      data-testid={`button-view-pathway-${pathway.id}`}
                    >
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAssignPathway(pathway)}
                      data-testid={`button-assign-pathway-${pathway.id}`}
                    >
                      <UserPlus className="h-4 w-4 mr-1" />
                      Assign
                    </Button>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" data-testid={`button-delete-pathway-${pathway.id}`}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Pathway</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{pathway.name}"? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteMutation.mutate(pathway.id)}
                          className="bg-destructive hover:bg-destructive/90"
                          data-testid={`button-confirm-delete-pathway-${pathway.id}`}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-12">
            <CardContent className="flex flex-col items-center justify-center text-center">
              <Route className="h-16 w-16 text-muted-foreground/40 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Pathways Yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first training pathway to guide learners through modules.
              </p>
              <CreatePathwayDialog onSuccess={() => {}} />
            </CardContent>
          </Card>
        )}
      </div>

      <PathwayDetailsDialog
        pathway={selectedPathway}
        open={!!selectedPathway}
        onOpenChange={(open) => !open && setSelectedPathway(null)}
      />

      <AssignPathwayDialog
        pathway={assignPathway}
        open={!!assignPathway}
        onOpenChange={(open) => !open && setAssignPathway(null)}
      />
    </AdminLayout>
  );
}
