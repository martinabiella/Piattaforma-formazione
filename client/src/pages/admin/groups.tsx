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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Users, Trash2, UserPlus, X, Edit2, Route } from "lucide-react";
import type { UserGroup, User } from "@shared/schema";

interface GroupMember {
  userId: string;
  joinedAt: Date;
  user: User;
}

interface GroupWithMembers extends UserGroup {
  members: GroupMember[];
}

interface UserWithProgress extends User {
  modulesCompleted?: number;
  totalModules?: number;
  averageScore?: number;
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

function CreateGroupDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const { toast } = useToast();

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      return await apiRequest("POST", "/api/admin/groups", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/groups"] });
      toast({
        title: "Group Created",
        description: "The group has been created successfully.",
      });
      setOpen(false);
      setName("");
      setDescription("");
      onSuccess();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create group.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createMutation.mutate({ name: name.trim(), description: description.trim() || undefined });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-create-group">
          <Plus className="h-4 w-4 mr-2" />
          Create Group
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Group</DialogTitle>
            <DialogDescription>
              Create a group to organize users and assign training pathways.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Group Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Sales Team"
                data-testid="input-group-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the purpose of this group"
                data-testid="input-group-description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create Group"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function GroupDetailsDialog({
  group,
  open,
  onOpenChange,
}: {
  group: GroupWithMembers | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const { data: users } = useQuery<UserWithProgress[]>({
    queryKey: ["/api/admin/users"],
    enabled: open,
  });

  const addMemberMutation = useMutation({
    mutationFn: async ({ groupId, userId }: { groupId: number; userId: string }) => {
      return await apiRequest("POST", `/api/admin/groups/${groupId}/members`, { userId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/groups"] });
      setSelectedUserId("");
      toast({
        title: "Member Added",
        description: "User has been added to the group.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add member.",
        variant: "destructive",
      });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async ({ groupId, userId }: { groupId: number; userId: string }) => {
      return await apiRequest("DELETE", `/api/admin/groups/${groupId}/members/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/groups"] });
      toast({
        title: "Member Removed",
        description: "User has been removed from the group.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove member.",
        variant: "destructive",
      });
    },
  });

  const updateGroupMutation = useMutation({
    mutationFn: async ({ groupId, data }: { groupId: number; data: { name?: string; description?: string } }) => {
      return await apiRequest("PATCH", `/api/admin/groups/${groupId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/groups"] });
      setIsEditing(false);
      toast({
        title: "Group Updated",
        description: "Group details have been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update group.",
        variant: "destructive",
      });
    },
  });

  if (!group) return null;

  const memberIds = new Set(group.members.map((m) => m.userId));
  const availableUsers = users?.filter((u) => !memberIds.has(u.id)) || [];

  const handleEdit = () => {
    setEditName(group.name);
    setEditDescription(group.description || "");
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    updateGroupMutation.mutate({
      groupId: group.id,
      data: { name: editName.trim(), description: editDescription.trim() || undefined },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            {isEditing ? (
              <div className="flex-1 space-y-2">
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  data-testid="input-edit-group-name"
                />
                <Textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Description"
                  data-testid="input-edit-group-description"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveEdit} disabled={updateGroupMutation.isPending}>
                    Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div>
                  <DialogTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    {group.name}
                  </DialogTitle>
                  <DialogDescription>{group.description || "No description"}</DialogDescription>
                </div>
                <Button variant="ghost" size="icon" onClick={handleEdit}>
                  <Edit2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          <div>
            <h4 className="font-medium mb-3">Add Member</h4>
            <div className="flex gap-2">
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="flex-1" data-testid="select-add-member">
                  <SelectValue placeholder="Select a user to add" />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground">No available users</div>
                  ) : (
                    availableUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.firstName} {user.lastName} ({user.email})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <Button
                onClick={() => addMemberMutation.mutate({ groupId: group.id, userId: selectedUserId })}
                disabled={!selectedUserId || addMemberMutation.isPending}
                data-testid="button-add-member"
              >
                <UserPlus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-3">Members ({group.members.length})</h4>
            {group.members.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No members in this group yet.</p>
            ) : (
              <div className="space-y-2">
                {group.members.map((member) => (
                  <div
                    key={member.userId}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    data-testid={`member-${member.userId}`}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.user?.profileImageUrl || undefined} />
                        <AvatarFallback>
                          {member.user?.firstName?.[0] || member.user?.email?.[0] || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">
                          {member.user?.firstName} {member.user?.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">{member.user?.email}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeMemberMutation.mutate({ groupId: group.id, userId: member.userId })}
                      disabled={removeMemberMutation.isPending}
                      data-testid={`button-remove-member-${member.userId}`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
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

export default function AdminGroups() {
  const [selectedGroup, setSelectedGroup] = useState<GroupWithMembers | null>(null);
  const { toast } = useToast();

  const { data: groups, isLoading } = useQuery<GroupWithMembers[]>({
    queryKey: ["/api/admin/groups"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (groupId: number) => {
      return await apiRequest("DELETE", `/api/admin/groups/${groupId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/groups"] });
      toast({
        title: "Group Deleted",
        description: "The group has been deleted.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete group.",
        variant: "destructive",
      });
    },
  });

  return (
    <AdminLayout title="Group Management" breadcrumbs={[{ label: "Groups" }]}>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <p className="text-muted-foreground">
            Organize users into groups for easier training pathway assignments.
          </p>
          <CreateGroupDialog onSuccess={() => {}} />
        </div>

        {isLoading ? (
          <LoadingSkeleton />
        ) : groups && groups.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups.map((group) => (
              <Card key={group.id} className="hover-elevate" data-testid={`card-group-${group.id}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{group.name}</CardTitle>
                      <CardDescription className="line-clamp-2">
                        {group.description || "No description"}
                      </CardDescription>
                    </div>
                    <Badge variant="secondary">
                      <Users className="h-3 w-3 mr-1" />
                      {group.members.length}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pb-2">
                  <div className="flex -space-x-2">
                    {group.members.slice(0, 5).map((member) => (
                      <Avatar key={member.userId} className="h-8 w-8 border-2 border-background">
                        <AvatarImage src={member.user?.profileImageUrl || undefined} />
                        <AvatarFallback className="text-xs">
                          {member.user?.firstName?.[0] || "U"}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                    {group.members.length > 5 && (
                      <div className="h-8 w-8 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs">
                        +{group.members.length - 5}
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedGroup(group)}
                    data-testid={`button-manage-group-${group.id}`}
                  >
                    Manage
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" data-testid={`button-delete-group-${group.id}`}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Group</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{group.name}"? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteMutation.mutate(group.id)}
                          className="bg-destructive hover:bg-destructive/90"
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
              <Users className="h-16 w-16 text-muted-foreground/40 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Groups Yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first group to start organizing users.
              </p>
              <CreateGroupDialog onSuccess={() => {}} />
            </CardContent>
          </Card>
        )}
      </div>

      <GroupDetailsDialog
        group={selectedGroup}
        open={!!selectedGroup}
        onOpenChange={(open) => !open && setSelectedGroup(null)}
      />
    </AdminLayout>
  );
}
