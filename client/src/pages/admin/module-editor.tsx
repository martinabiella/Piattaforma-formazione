import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useParams, useLocation } from "wouter";
import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
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
  Save,
  Plus,
  Trash2,
  GripVertical,
  ImageIcon,
  ArrowLeft
} from "lucide-react";
import type { Module, ModuleSection, InsertModule, InsertModuleSection } from "@shared/schema";

interface ModuleWithSections extends Module {
  sections: ModuleSection[];
}

interface SectionFormData {
  id?: number;
  title: string;
  content: string;
  imageUrl: string;
  order: number;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function SectionEditor({
  section,
  index,
  onChange,
  onRemove,
}: {
  section: SectionFormData;
  index: number;
  onChange: (data: Partial<SectionFormData>) => void;
  onRemove: () => void;
}) {
  return (
    <Card className="border-2" data-testid={`section-editor-${index}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <GripVertical className="h-5 w-5 text-muted-foreground/50 cursor-grab" />
            <span className="text-sm font-medium text-muted-foreground">
              Section {index + 1}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onRemove}
            data-testid={`button-remove-section-${index}`}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor={`section-title-${index}`}>Section Title</Label>
          <Input
            id={`section-title-${index}`}
            value={section.title}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder="Enter section title"
            data-testid={`input-section-title-${index}`}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`section-content-${index}`}>Content (HTML)</Label>
          <Textarea
            id={`section-content-${index}`}
            value={section.content}
            onChange={(e) => onChange({ content: e.target.value })}
            placeholder="Enter section content (HTML supported)"
            rows={8}
            className="font-mono text-sm"
            data-testid={`textarea-section-content-${index}`}
          />
          <p className="text-xs text-muted-foreground">
            You can use HTML tags like &lt;p&gt;, &lt;h3&gt;, &lt;ul&gt;, &lt;strong&gt;, etc.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`section-image-${index}`}>Image URL (optional)</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id={`section-image-${index}`}
                value={section.imageUrl}
                onChange={(e) => onChange({ imageUrl: e.target.value })}
                placeholder="https://example.com/image.jpg"
                className="pl-10"
                data-testid={`input-section-image-${index}`}
              />
            </div>
          </div>
          {section.imageUrl && (
            <div className="mt-2 rounded-lg overflow-hidden border max-w-xs">
              <img
                src={section.imageUrl}
                alt="Preview"
                className="w-full h-auto max-h-32 object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function ModuleEditor() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const isNew = id === "new";

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [published, setPublished] = useState(false);
  const [order, setOrder] = useState(1);
  const [sections, setSections] = useState<SectionFormData[]>([]);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);

  const { data: module, isLoading } = useQuery<ModuleWithSections>({
    queryKey: ["/api/admin/modules", id],
    enabled: !isNew,
  });

  useEffect(() => {
    if (module) {
      setTitle(module.title);
      setDescription(module.description || "");
      setImageUrl(module.imageUrl || "");
      setPublished(module.published);
      setOrder(module.order);
      setSections(
        (module.sections || []).map((s) => ({
          id: s.id,
          title: s.title,
          content: s.content || "",
          imageUrl: s.imageUrl || "",
          order: s.order,
        }))
      );
    }
  }, [module]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const moduleData: InsertModule = {
        title,
        description: description || null,
        imageUrl: imageUrl || null,
        published,
        order,
      };

      let moduleId: number;

      if (isNew) {
        const result = await apiRequest<Module>("POST", "/api/admin/modules", moduleData);
        moduleId = result.id;
      } else {
        await apiRequest("PATCH", `/api/admin/modules/${id}`, moduleData);
        moduleId = parseInt(id!);
      }

      await apiRequest("PUT", `/api/admin/modules/${moduleId}/sections`, {
        sections: sections.map((s, index) => ({
          id: s.id,
          title: s.title,
          content: s.content || null,
          imageUrl: s.imageUrl || null,
          order: index + 1,
        })),
      });

      return moduleId;
    },
    onSuccess: (moduleId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/modules"] });
      toast({
        title: "Success",
        description: isNew ? "Module created successfully." : "Module updated successfully.",
      });
      if (isNew) {
        setLocation(`/admin/modules/${moduleId}/edit`);
      }
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
        description: "Failed to save module.",
        variant: "destructive",
      });
    },
  });

  const handleAddSection = () => {
    setSections([
      ...sections,
      {
        title: "",
        content: "",
        imageUrl: "",
        order: sections.length + 1,
      },
    ]);
  };

  const handleUpdateSection = (index: number, data: Partial<SectionFormData>) => {
    const newSections = [...sections];
    newSections[index] = { ...newSections[index], ...data };
    setSections(newSections);
  };

  const handleRemoveSection = (index: number) => {
    setSections(sections.filter((_, i) => i !== index));
  };

  const breadcrumbs = [
    { label: "Modules", href: "/admin/modules" },
    { label: isNew ? "New Module" : title || "Edit Module" },
  ];

  if (!isNew && isLoading) {
    return (
      <AdminLayout title="Edit Module" breadcrumbs={breadcrumbs}>
        <LoadingSkeleton />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title={isNew ? "Create Module" : "Edit Module"}
      breadcrumbs={breadcrumbs}
    >
      <div className="flex items-center justify-between gap-4 mb-6">
        <Button
          variant="ghost"
          asChild
          data-testid="button-back"
        >
          <Link href="/admin/modules" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Modules
          </Link>
        </Button>

        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending || !title.trim()}
          data-testid="button-save-module"
        >
          <Save className="h-4 w-4 mr-2" />
          {saveMutation.isPending ? "Saving..." : "Save Module"}
        </Button>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Module Details</CardTitle>
            <CardDescription>Basic information about the module</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter module title"
                data-testid="input-module-title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter module description"
                rows={3}
                data-testid="textarea-module-description"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="imageUrl">Cover Image URL</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="imageUrl"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://example.com/cover.jpg"
                    className="pl-10"
                    data-testid="input-module-image"
                  />
                </div>
              </div>
              {imageUrl && (
                <div className="mt-2 rounded-lg overflow-hidden border max-w-xs">
                  <img
                    src={imageUrl}
                    alt="Cover preview"
                    className="w-full h-auto max-h-32 object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="order">Display Order</Label>
                <Input
                  id="order"
                  type="number"
                  min={1}
                  value={order}
                  onChange={(e) => setOrder(parseInt(e.target.value) || 1)}
                  data-testid="input-module-order"
                />
              </div>

              <div className="flex items-center justify-between space-x-2 pt-6">
                <Label htmlFor="published">Published</Label>
                <Switch
                  id="published"
                  checked={published}
                  onCheckedChange={setPublished}
                  data-testid="switch-module-published"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content is now managed via Module Builder - see /admin/modules/:id/builder */}

        {!isNew && (
          <Card>
            <CardHeader>
              <CardTitle>Quiz</CardTitle>
              <CardDescription>Manage the quiz for this module</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild data-testid="button-edit-quiz">
                <Link href={`/admin/modules/${id}/quiz/edit`}>
                  Edit Quiz Questions
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Discard Changes?</DialogTitle>
            <DialogDescription>
              You have unsaved changes. Are you sure you want to leave?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDiscardDialog(false)}>
              Keep Editing
            </Button>
            <Button variant="destructive" asChild>
              <Link href="/admin/modules">Discard</Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
