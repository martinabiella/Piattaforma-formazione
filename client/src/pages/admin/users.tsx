import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { AdminLayout } from "@/components/admin-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Search, Shield, User, Eye, ChevronRight, Trophy, BookOpen, Users, UserPlus, KeyRound } from "lucide-react";
import type { User as UserType, QuizAttemptWithDetails, UserGroup } from "@shared/schema";

interface UserWithProgress extends UserType {
  modulesCompleted: number;
  totalModules: number;
  averageScore: number;
  attempts?: QuizAttemptWithDetails[];
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  );
}

function UserDetailsDialog({
  user,
  open,
  onOpenChange,
}: {
  user: UserWithProgress | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const [newPassword, setNewPassword] = useState("");

  const { data: userDetails, isLoading } = useQuery<UserWithProgress>({
    queryKey: ["/api/admin/users", user?.id],
    enabled: !!user && open,
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      return await apiRequest("PATCH", `/api/admin/users/${userId}/role`, { role });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users", variables.userId] });
      toast({
        title: "Role Updated",
        description: "User role has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to update user role: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const updatePasswordMutation = useMutation({
    mutationFn: async ({ userId, password }: { userId: string; password: string }) => {
      return await apiRequest("PATCH", `/api/admin/users/${userId}/password`, { password });
    },
    onSuccess: () => {
      toast({
        title: "Password Updated",
        description: "User password has been updated successfully.",
      });
      setNewPassword("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to update password: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  if (!user) return null;

  const details = userDetails || user;
  const attempts = details.attempts || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={details.profileImageUrl || undefined} />
              <AvatarFallback>
                {details.firstName?.[0] || details.email?.[0] || "U"}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                {details.firstName} {details.lastName}
                <Badge variant={details.role === "admin" ? "default" : "secondary"}>
                  {details.role}
                </Badge>
              </div>
              <p className="text-sm font-normal text-muted-foreground">{details.email}</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <BookOpen className="h-6 w-6 mx-auto mb-2 text-primary" />
                <p className="text-2xl font-bold">{details.modulesCompleted}/{details.totalModules}</p>
                <p className="text-xs text-muted-foreground">Modules Completed</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Trophy className="h-6 w-6 mx-auto mb-2 text-amber-500" />
                <p className="text-2xl font-bold">{details.averageScore || 0}%</p>
                <p className="text-xs text-muted-foreground">Average Score</p>
              </CardContent>
            </Card>

          </div>

          <div>
            <h4 className="font-medium mb-2">Role Management</h4>
            <Select
              value={details.role || "user"}
              onValueChange={(value) => {
                updateRoleMutation.mutate({ userId: details.id, role: value });
              }}
              disabled={updateRoleMutation.isPending}
            >
              <SelectTrigger className="w-full" data-testid="select-user-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <h4 className="font-medium mb-2">Change Password</h4>
            <div className="flex gap-2">
              <Input
                type="password"
                placeholder="New password (min 6 characters)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="flex-1"
                data-testid="input-new-password"
              />
              <Button
                onClick={() => updatePasswordMutation.mutate({ userId: details.id, password: newPassword })}
                disabled={updatePasswordMutation.isPending || newPassword.length < 6}
                data-testid="button-save-password"
              >
                <KeyRound className="h-4 w-4 mr-1" />
                {updatePasswordMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>

          {isLoading ? (
            <LoadingSkeleton />
          ) : attempts.length > 0 ? (
            <div>
              <h4 className="font-medium mb-2">Recent Quiz Attempts</h4>
              <div className="space-y-2">
                {attempts.slice(0, 5).map((attempt) => (
                  <div
                    key={attempt.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    data-testid={`attempt-${attempt.id}`}
                  >
                    <div>
                      <p className="font-medium text-sm">{attempt.module?.title || "Unknown Module"}</p>
                      <p className="text-xs text-muted-foreground">
                        {attempt.createdAt
                          ? new Date(attempt.createdAt).toLocaleDateString()
                          : "N/A"}
                      </p>
                    </div>
                    <Badge variant={attempt.passed ? "default" : "secondary"}>
                      {attempt.score}%
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">No quiz attempts yet.</p>
          )}
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

const createUserSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  role: z.enum(["user", "admin"]),
});

function CreateUserDialog() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const form = useForm<z.infer<typeof createUserSchema>>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      username: "",
      password: "",
      firstName: "",
      lastName: "",
      email: "",
      role: "user",
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: z.infer<typeof createUserSchema>) => {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create user");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Success", description: "User created successfully" });
      setOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="h-4 w-4 mr-2" />
          Create User
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New User</DialogTitle>
          <DialogDescription>
            Add a new user to the platform. They will receive an email with their credentials.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => createUserMutation.mutate(data))} className="space-y-4">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={createUserMutation.isPending}>
                {createUserMutation.isPending && <span className="animate-spin mr-2">⏳</span>}
                Create User
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// Bulk Upload Dialog
function BulkUploadDialog() {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [groupId, setGroupId] = useState<string>("no-group");
  const { toast } = useToast();
  const [result, setResult] = useState<{ created: number; failed: { row: number; error: string }[] } | null>(null);

  const { data: groups } = useQuery<UserGroup[]>({
    queryKey: ["/api/admin/groups"],
    enabled: open,
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ file, groupId }: { file: File; groupId?: number }) => {
      const formData = new FormData();
      formData.append("file", file);
      if (groupId) {
        formData.append("groupId", groupId.toString());
      }

      const res = await fetch("/api/admin/users/bulk", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Upload failed");
      }

      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setResult(data);
      toast({
        title: "Bulk Upload Complete",
        description: `Created ${data.created} users. ${data.failed.length} failed.`,
        variant: "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleUpload = () => {
    if (!file) return;
    const gid = groupId === "no-group" ? undefined : parseInt(groupId);
    uploadMutation.mutate({ file, groupId: gid });
  };

  const handleDownloadTemplate = () => {
    const headers = ["username", "password", "firstName", "lastName", "email", "role"];
    const csvContent = headers.join(",") + "\nuser1,pass123,John,Doe,john@example.com,user";
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "users_template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const resetState = () => {
    setFile(null);
    setResult(null);
    setGroupId("no-group");
  }

  return (
    <Dialog open={open} onOpenChange={(val) => { setOpen(val); if (!val) resetState(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="mr-2">
          <Users className="h-4 w-4 mr-2" />
          Bulk Upload
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Bulk User Upload</DialogTitle>
          <DialogDescription>
            Upload a CSV or Excel file to create multiple users at once.
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Template</Label>
              <div>
                <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
                  Download CSV Template
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="file">File (CSV, XLS, XLSX)</Label>
              <Input
                id="file"
                type="file"
                accept=".csv, .xls, .xlsx"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="group">Assign to Group (Optional)</Label>
              <Select value={groupId} onValueChange={setGroupId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a group" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no-group">None</SelectItem>
                  {groups?.map((g) => (
                    <SelectItem key={g.id} value={g.id.toString()}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ) : (
          <div className="py-4 space-y-4">
            <div className="flex items-center gap-2 text-green-600">
              <Trophy className="h-5 w-5" />
              <span className="font-medium">{result.created} users created successfully</span>
            </div>

            {result.failed.length > 0 && (
              <div className="space-y-2">
                <p className="font-medium text-destructive">Failed Rows ({result.failed.length})</p>
                <div className="max-h-[200px] overflow-auto border rounded-md p-2 text-sm bg-muted/50">
                  {result.failed.map((f, i) => (
                    <div key={i} className="py-1 border-b last:border-0">
                      <span className="font-mono font-bold mr-2">Row {f.row}:</span>
                      <span className="text-muted-foreground">{f.error}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {!result ? (
            <Button onClick={handleUpload} disabled={!file || uploadMutation.isPending}>
              {uploadMutation.isPending ? "Uploading..." : "Upload"}
            </Button>
          ) : (
            <Button onClick={() => setOpen(false)}>Close</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminUsers() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [selectedUser, setSelectedUser] = useState<UserWithProgress | null>(null);

  const { data: users, isLoading } = useQuery<UserWithProgress[]>({
    queryKey: ["/api/admin/users"],
  });

  const filteredUsers = users?.filter((user) => {
    const matchesRole = roleFilter === "all" || user.role === roleFilter;

    if (!search) return matchesRole;

    const searchLower = search.toLowerCase();
    const matchesSearch =
      (user.email || "").toLowerCase().includes(searchLower) ||
      (user.firstName || "").toLowerCase().includes(searchLower) ||
      (user.lastName || "").toLowerCase().includes(searchLower) ||
      (user.username || "").toLowerCase().includes(searchLower);

    return matchesSearch && matchesRole;
  });

  return (
    <AdminLayout title="User Management" breadcrumbs={[{ label: "Users" }]}>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>All Users</CardTitle>
                <CardDescription>View and manage user accounts and progress</CardDescription>
              </div>
              <div className="flex items-center">
                <BulkUploadDialog />
                <CreateUserDialog />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-users"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[150px]" data-testid="select-role-filter">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="user">Users</SelectItem>
                  <SelectItem value="admin">Admins</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <LoadingSkeleton />
            ) : filteredUsers && filteredUsers.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Avg. Score</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.profileImageUrl || undefined} />
                            <AvatarFallback>
                              {user.firstName?.[0] || user.email?.[0] || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {user.firstName} {user.lastName}
                            </p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={user.role === "admin" ? "default" : "secondary"}
                        >
                          {user.role === "admin" ? (
                            <Shield className="h-3 w-3 mr-1" />
                          ) : (
                            <User className="h-3 w-3 mr-1" />
                          )}
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 min-w-[120px]">
                          <Progress
                            value={(user.modulesCompleted / Math.max(user.totalModules, 1)) * 100}
                            className="h-2 flex-1"
                          />
                          <span className="text-sm text-muted-foreground whitespace-nowrap">
                            {user.modulesCompleted}/{user.totalModules}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{user.averageScore || 0}%</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedUser(user)}
                          data-testid={`button-view-user-${user.id}`}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-40" />
                <p>No users found</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <UserDetailsDialog
        user={selectedUser}
        open={!!selectedUser}
        onOpenChange={(open) => !open && setSelectedUser(null)}
      />
    </AdminLayout>
  );
}
