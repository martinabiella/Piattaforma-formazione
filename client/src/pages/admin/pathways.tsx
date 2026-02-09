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
import type { TrainingPathway, Module, UserGroup, User, GroupPathwayAssignment, UserPathwayAssignment } from "@shared/schema";

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
  const { toast } = useToast();
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  const { data: assignments } = useQuery<{
    groups: (GroupPathwayAssignment & { group: UserGroup })[],
    users: (UserPathwayAssignment & { user: User })[]
  }>({
    queryKey: [`/api/admin/pathways/${pathway?.id}/assignments`],
    enabled: !!pathway && open,
  });

  const { data: groups } = useQuery<GroupWithMembers[]>({
    queryKey: ["/api/admin/groups"],
    enabled: !!pathway && open,
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    enabled: !!pathway && open,
  });

  const assignGroupMutation = useMutation({
    mutationFn: async (groupId: number) => {
      return await apiRequest("POST", `/api/admin/pathways/${pathway?.id}/assign-group`, { groupId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/admin/pathways/${pathway?.id}/assignments`] });
      toast({ title: "Group Assigned", description: "The group has been assigned successfully." });
      setSelectedGroupId("");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to assign group.", variant: "destructive" });
    },
  });

  const assignUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest("POST", `/api/admin/pathways/${pathway?.id}/assign-user`, { userId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/admin/pathways/${pathway?.id}/assignments`] });
      toast({ title: "User Assigned", description: "The user has been assigned successfully." });
      setSelectedUserId("");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to assign user.", variant: "destructive" });
    },
  });

  const removeGroupAssignmentMutation = useMutation({
    mutationFn: async (groupId: number) => {
      return await apiRequest("DELETE", `/api/admin/pathways/${pathway?.id}/assign-group/${groupId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/admin/pathways/${pathway?.id}/assignments`] });
      toast({ title: "Assignment Removed", description: "The group assignment has been removed." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to remove assignment.", variant: "destructive" });
    },
  });

  const removeUserAssignmentMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest("DELETE", `/api/admin/pathways/${pathway?.id}/assign-user/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/admin/pathways/${pathway?.id}/assignments`] });
      toast({ title: "Assignment Removed", description: "The user assignment has been removed." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to remove assignment.", variant: "destructive" });
    },
  });

  if (!pathway) return null;

  // Filter out already assigned groups/users
  const assignedGroupIds = assignments?.groups?.map(g => g.groupId) || [];
  const assignedUserIds = assignments?.users?.map(u => u.userId) || [];

  const availableGroups = groups?.filter(g => !assignedGroupIds.includes(g.id)) || [];
  const availableUsers = users?.filter(u => !assignedUserIds.includes(u.id)) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Route className="h-5 w-5" />
            {pathway.name}
          </DialogTitle>
          <DialogDescription>{pathway.description || "No description"}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
          {/* Left Column: Modules */}
          <div>
            <h4 className="font-medium mb-3 flex items-center gap-2 text-primary">
              <BookOpen className="h-4 w-4" />
              Modules ({pathway.modules.length})
            </h4>
            {pathway.modules.length === 0 ? (
              <p className="text-muted-foreground text-sm py-2">No modules in this pathway.</p>
            ) : (
              <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-2">
                {pathway.modules
                  .sort((a, b) => a.orderIndex - b.orderIndex)
                  .map((pm, index) => (
                    <div
                      key={pm.moduleId}
                      className="flex items-center gap-3 p-3 rounded-lg bg-card border shadow-sm"
                      data-testid={`pathway-module-${pm.moduleId}`}
                    >
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium shrink-0 text-primary">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{pm.module?.title}</p>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Right Column: Assignments */}
          <div>
            <h4 className="font-medium mb-3 flex items-center gap-2 text-primary">
              <Users className="h-4 w-4" />
              Assignments
            </h4>

            <div className="space-y-6">
              {/* Groups Section */}
              <div className="space-y-3">
                <h5 className="text-sm font-semibold text-foreground/80">Groups</h5>

                {/* Add Group Control */}
                <div className="flex gap-2">
                  <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Select group to assign" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableGroups.length === 0 ? (
                        <SelectItem value="_none" disabled>No available groups</SelectItem>
                      ) : (
                        availableGroups.map((group) => (
                          <SelectItem key={group.id} value={group.id.toString()}>
                            {group.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    onClick={() => selectedGroupId && assignGroupMutation.mutate(parseInt(selectedGroupId))}
                    disabled={!selectedGroupId || assignGroupMutation.isPending}
                  >
                    Add
                  </Button>
                </div>

                {/* Assigned Groups List */}
                {!assignments?.groups?.length ? (
                  <p className="text-sm text-muted-foreground italic">No group assignments</p>
                ) : (
                  <div className="space-y-2 max-h-[20vh] overflow-y-auto pr-2">
                    {assignments.groups.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-2 rounded bg-muted/40 text-sm group">
                        <div className="flex flex-col">
                          <span className="font-medium">{item.group.name}</span>
                          <span className="text-xs text-muted-foreground">
                            Assigned: {new Date(item.createdAt || "").toLocaleDateString()}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removeGroupAssignmentMutation.mutate(item.groupId)}
                          disabled={removeGroupAssignmentMutation.isPending}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Users Section */}
              <div className="space-y-3 pt-2 border-t">
                <h5 className="text-sm font-semibold text-foreground/80">Individual Users</h5>

                {/* Add User Control */}
                <div className="flex gap-2">
                  <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Select user to assign" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableUsers.length === 0 ? (
                        <SelectItem value="_none" disabled>No available users</SelectItem>
                      ) : (
                        availableUsers.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.firstName} {user.lastName}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    onClick={() => selectedUserId && assignUserMutation.mutate(selectedUserId)}
                    disabled={!selectedUserId || assignUserMutation.isPending}
                  >
                    Add
                  </Button>
                </div>

                {/* Assigned Users List */}
                {!assignments?.users?.length ? (
                  <p className="text-sm text-muted-foreground italic">No user assignments</p>
                ) : (
                  <div className="space-y-2 max-h-[20vh] overflow-y-auto pr-2">
                    {assignments.users.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-2 rounded bg-muted/40 text-sm group">
                        <div className="flex flex-col">
                          <span className="font-medium">{item.user.firstName} {item.user.lastName}</span>
                          <span className="text-xs text-muted-foreground">{item.user.username}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removeUserAssignmentMutation.mutate(item.userId)}
                          disabled={removeUserAssignmentMutation.isPending}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
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

function EditPathwayDialog({
  pathway,
  open,
  onOpenChange,
}: {
  pathway: PathwayWithModules | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedModules, setSelectedModules] = useState<number[]>([]);
  const { toast } = useToast();

  const { data: modules } = useQuery<Module[]>({
    queryKey: ["/api/admin/modules"],
    enabled: open,
  });

  // Initialize form when pathway changes
  if (pathway && open && name === "" && selectedModules.length === 0) {
    setName(pathway.name);
    setDescription(pathway.description || "");
    setSelectedModules(pathway.modules.map(pm => pm.moduleId));
  }

  const updateMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string; moduleIds: number[] }) => {
      // 1. Update details
      await apiRequest("PATCH", `/api/admin/pathways/${pathway?.id}`, {
        name: data.name,
        description: data.description,
      });

      // 2. Update modules
      return await apiRequest("PUT", `/api/admin/pathways/${pathway?.id}/modules`, {
        moduleIds: data.moduleIds,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pathways"] });
      toast({
        title: "Pathway Updated",
        description: "The training pathway has been updated successfully.",
      });
      onOpenChange(false);
      // Reset form state slightly delayed to avoid flicker
      setTimeout(() => {
        setName("");
        setDescription("");
        setSelectedModules([]);
      }, 300);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update pathway.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || selectedModules.length === 0) return;
    updateMutation.mutate({
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

  if (!pathway) return null;

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (!val) {
        setName("");
        setDescription("");
        setSelectedModules([]);
      }
      onOpenChange(val);
    }}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Training Pathway</DialogTitle>
            <DialogDescription>
              Update details and manage modules for "{pathway.name}".
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Pathway Name</Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., New Employee Onboarding"
                data-testid="input-edit-pathway-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description (optional)</Label>
              <Textarea
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what learners will achieve"
                data-testid="input-edit-pathway-description"
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
                      id={`edit-module-${module.id}`}
                      checked={selectedModules.includes(module.id)}
                      onCheckedChange={() => toggleModule(module.id)}
                      data-testid={`checkbox-edit-module-${module.id}`}
                    />
                    <label
                      htmlFor={`edit-module-${module.id}`}
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
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!name.trim() || selectedModules.length === 0 || updateMutation.isPending}
            >
              {updateMutation.isPending ? "Updating..." : "Update Pathway"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminPathways() {
  const [selectedPathway, setSelectedPathway] = useState<PathwayWithModules | null>(null);
  const [editPathway, setEditPathway] = useState<PathwayWithModules | null>(null);
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
          <CreatePathwayDialog onSuccess={() => { }} />
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
                      onClick={() => setEditPathway(pathway)}
                      data-testid={`button-edit-pathway-${pathway.id}`}
                    >
                      <Edit2 className="h-4 w-4 mr-1" />
                      Edit
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
              <CreatePathwayDialog onSuccess={() => { }} />
            </CardContent>
          </Card>
        )}
      </div>

      <PathwayDetailsDialog
        pathway={selectedPathway}
        open={!!selectedPathway}
        onOpenChange={(open) => !open && setSelectedPathway(null)}
      />

      <EditPathwayDialog
        pathway={editPathway}
        open={!!editPathway}
        onOpenChange={(open) => !open && setEditPathway(null)}
      />

      <AssignPathwayDialog
        pathway={assignPathway}
        open={!!assignPathway}
        onOpenChange={(open) => !open && setAssignPathway(null)}
      />
    </AdminLayout>
  );
}
