import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useParams, useLocation } from "wouter";
import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Save,
  Plus,
  Trash2,
  GripVertical,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Type,
  Columns,
  Image as ImageIcon,
  Layout,
  HelpCircle,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Module, ModuleStep, StepContentBlock, StepCheckpoint } from "@shared/schema";
import { RichTextEditor } from "@/components/rich-text-editor";

interface StepWithDetails extends ModuleStep {
  contentBlocks: StepContentBlock[];
  checkpoint: StepCheckpoint | null;
  checkpoints?: StepCheckpoint[]; // Support multiple from backend
}

interface StepFormData {
  id?: number;
  title: string;
  items: StepItemFormData[]; // Unified list
  checkpointRequired: boolean;
  order: number;
}

interface StepItemFormData {
  id?: number;
  // Discriminator
  itemType: "content" | "checkpoint";

  // Content block fields
  blockType?: "text" | "image" | "video" | "split";
  content?: string;
  imageUrl?: string;
  metadata?: {
    splitRatio?: "30-70" | "50-50" | "70-30";
    reverseLayout?: boolean;
    columns?: 1 | 2 | 3;
    fontSize?: "small" | "normal" | "large" | "xlarge";
  };

  // Checkpoint fields
  question?: string;
  options?: string[];
  correctOptionIndex?: number;
  explanation?: string;
  isEvaluated?: boolean;
}

const initialStep: StepFormData = {
  title: "",
  order: 0,
  checkpointRequired: true,
  items: [],
};

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function CheckpointItemEditor({
  item,
  onChange,
}: {
  item: StepItemFormData;
  onChange: (data: StepItemFormData) => void;
}) {
  const options = item.options || ["", "", "", ""];

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    onChange({ ...item, options: newOptions });
  };

  return (
    <div className="border border-indigo-100 rounded-md p-4 bg-indigo-50/30">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Question</Label>
          <Textarea
            value={item.question || ""}
            onChange={(e) => onChange({ ...item, question: e.target.value })}
            placeholder="Enter the checkpoint question"
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <Label>Answer Options (Select the correct one)</Label>
          {options.map((option, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onChange({ ...item, correctOptionIndex: idx })}
                className={cn(
                  "w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-medium shrink-0 transition-colors",
                  item.correctOptionIndex === idx
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : "border-muted-foreground/30 hover:border-primary"
                )}
                title="Mark as correct answer"
              >
                {String.fromCharCode(65 + idx)}
              </button>
              <Input
                value={option}
                onChange={(e) => handleOptionChange(idx, e.target.value)}
                placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                className={item.correctOptionIndex === idx ? "border-emerald-500 ring-emerald-500/20" : ""}
              />
            </div>
          ))}
        </div>

        <Separator />

        <div className="flex items-center justify-between space-x-2">
          <div className="space-y-0.5">
            <Label className="text-base">Include in Final Evaluation</Label>
            <p className="text-sm text-muted-foreground">
              If enabled, this question will count towards the module score.
            </p>
          </div>
          <Switch
            checked={item.isEvaluated !== false}
            onCheckedChange={(checked) => onChange({ ...item, isEvaluated: checked })}
          />
        </div>

        <div className="space-y-2">
          <Label>Explanation (shown after answering)</Label>
          <Textarea
            value={item.explanation || ""}
            onChange={(e) => onChange({ ...item, explanation: e.target.value })}
            placeholder="Explain why the answer is correct"
            rows={2}
          />
        </div>
      </div>
    </div>
  );
}

function ContentBlockItemEditor({
  item,
  onChange,
}: {
  item: StepItemFormData;
  onChange: (data: StepItemFormData) => void;
}) {
  const metadata = item.metadata || {};

  return (
    <div className="space-y-4 p-4 border rounded-md bg-white">
      <div className="flex items-center gap-2 mb-2">
        {/* Block Type Selector could go here if we supported switching typs */}
        <Badge variant="outline" className="uppercase text-xs font-bold text-muted-foreground">
          {item.blockType || "Text"} Block
        </Badge>
      </div>

      {item.blockType === "text" && (
        <div className="space-y-3">
          <div className="flex items-center gap-4 border-b pb-2 mb-2">
            <div className="flex items-center gap-2">
              <Type className="h-4 w-4 text-muted-foreground" />
              <select
                className="text-sm border rounded px-2 py-1 bg-background"
                value={metadata.fontSize || "normal"}
                onChange={(e) => onChange({ ...item, metadata: { ...metadata, fontSize: e.target.value as any } })}
              >
                <option value="small">Small Text</option>
                <option value="normal">Normal Text</option>
                <option value="large">Large Text</option>
                <option value="xlarge">Extra Large</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <Columns className="h-4 w-4 text-muted-foreground" />
              <select
                className="text-sm border rounded px-2 py-1 bg-background"
                value={metadata.columns || 1}
                onChange={(e) => onChange({ ...item, metadata: { ...metadata, columns: parseInt(e.target.value) as any } })}
              >
                <option value={1}>1 Column</option>
                <option value={2}>2 Columns</option>
                <option value={3}>3 Columns</option>
              </select>
            </div>
          </div>

          <RichTextEditor
            content={item.content || ""}
            onChange={(content) => onChange({ ...item, content })}
            className="min-h-[200px]"
          />
        </div>
      )}

      {item.blockType === "image" && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Image URL</Label>
            <div className="flex gap-2">
              <Input
                value={item.imageUrl || ""}
                onChange={(e) => onChange({ ...item, imageUrl: e.target.value })}
                placeholder="https://example.com/image.jpg"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Provide a direct URL to an image.
            </p>
          </div>
          {item.imageUrl && (
            <div className="relative aspect-video rounded-md overflow-hidden border bg-muted">
              <img
                src={item.imageUrl}
                alt="Preview"
                className="object-cover w-full h-full"
                onError={(e) => (e.currentTarget.style.display = "none")}
              />
            </div>
          )}
        </div>
      )}

      {item.blockType === "video" && (
        <div className="space-y-2">
          <Label>Video Embed</Label>
          <Textarea
            value={item.content || ""}
            onChange={(e) => onChange({ ...item, content: e.target.value })}
            placeholder="Paste YouTube embed code or checking URL..."
            rows={3}
            className="font-mono text-sm"
          />
        </div>
      )}
    </div>
  );
}

function StepEditor({
  step,
  index,
  isExpanded,
  onToggle,
  onChange,
  onRemove,
}: {
  step: StepFormData;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  onChange: (data: StepFormData) => void;
  onRemove: () => void;
}) {
  const items = step.items || [];

  const handleAddItem = (type: "content" | "checkpoint", blockType: "text" | "image" | "video" | "split" = "text") => {
    const newItem: StepItemFormData = type === "content"
      ? {
        itemType: "content",
        blockType,
        content: "",
        imageUrl: "",
        metadata: { fontSize: "normal", columns: 1 }
      }
      : {
        itemType: "checkpoint",
        question: "",
        options: ["", "", "", ""],
        correctOptionIndex: 0,
        explanation: "",
        isEvaluated: true,
      };

    onChange({
      ...step,
      items: [...items, newItem]
    });
  };

  const handleUpdateItem = (itemIndex: number, updates: Partial<StepItemFormData>) => {
    const newItems = [...items];
    // We update the item at itemIndex
    newItems[itemIndex] = { ...newItems[itemIndex], ...updates };
    onChange({ ...step, items: newItems });
  };

  const handleRemoveItem = (itemIndex: number) => {
    const newItems = items.filter((_, i) => i !== itemIndex);
    onChange({ ...step, items: newItems });
  };

  const handleMoveItem = (itemIndex: number, direction: "up" | "down") => {
    if (
      (direction === "up" && itemIndex === 0) ||
      (direction === "down" && itemIndex === items.length - 1)
    ) {
      return;
    }

    const newItems = [...items];
    const targetIndex = direction === "up" ? itemIndex - 1 : itemIndex + 1;
    // Swap
    [newItems[itemIndex], newItems[targetIndex]] = [newItems[targetIndex], newItems[itemIndex]];

    onChange({ ...step, items: newItems });
  };

  return (
    <Card className="border-l-4 border-l-primary/50 overflow-hidden">
      <CardHeader className="bg-muted/10 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={onToggle}
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
            <div className="flex-1 max-w-md">
              <Input
                value={step.title}
                onChange={(e) => onChange({ ...step, title: e.target.value })}
                className="font-semibold h-8"
                placeholder="Step Title"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <Badge variant="secondary">{items.length} items</Badge>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onRemove}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-6 space-y-6">
          <div className="space-y-4">
            {items.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed rounded-lg bg-muted/20">
                <p className="text-muted-foreground text-sm mb-4">No content yet. Add text, images, or checkpoints.</p>
              </div>
            ) : (
              items.map((item, idx) => (
                <div key={idx} className="group relative flex gap-2 items-start">
                  <div className="flex flex-col gap-1 pt-4 opacity-50 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      disabled={idx === 0}
                      onClick={() => handleMoveItem(idx, "up")}
                    >
                      <ArrowUp className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      disabled={idx === items.length - 1}
                      onClick={() => handleMoveItem(idx, "down")}
                    >
                      <ArrowDown className="h-3 w-3" />
                    </Button>
                    <div className="flex-1" />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive"
                      onClick={() => handleRemoveItem(idx)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>

                  <div className="flex-1 min-w-0">
                    {item.itemType === "content" ? (
                      <ContentBlockItemEditor
                        item={item}
                        onChange={(updates) => handleUpdateItem(idx, updates)}
                      />
                    ) : (
                      <CheckpointItemEditor
                        item={item}
                        onChange={(updates) => handleUpdateItem(idx, updates)}
                      />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <Separator />

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => handleAddItem("content", "text")}>
              <Type className="h-4 w-4 mr-2" /> Add Text
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleAddItem("content", "image")}>
              <ImageIcon className="h-4 w-4 mr-2" /> Add Image
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleAddItem("content", "video")}>
              <Layout className="h-4 w-4 mr-2" /> Add Video
            </Button>
            <div className="w-px bg-border h-8 mx-2" />
            <Button variant="secondary" size="sm" onClick={() => handleAddItem("checkpoint")}>
              <HelpCircle className="h-4 w-4 mr-2" /> Add Checkpoint Question
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export default function AdminStepEditor() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [steps, setSteps] = useState<StepFormData[]>([]);
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set([0]));
  const [hasChanges, setHasChanges] = useState(false);

  const { data: module } = useQuery<Module>({
    queryKey: ["/api/admin/modules", id],
    enabled: !!id,
  });

  const { data: stepsData, isLoading } = useQuery<StepWithDetails[]>({
    queryKey: ["/api/admin/modules", id, "steps"],
    enabled: !!id,
  });

  useEffect(() => {
    if (stepsData) {
      setSteps(stepsData.map(s => {
        // Map legacy fields to unified items if items not present
        let items: StepItemFormData[] = [];

        if (s.contentBlocks) {
          items = s.contentBlocks.map(block => ({
            id: block.id,
            itemType: "content",
            blockType: (block.blockType as any) || "text",
            content: block.content || "",
            imageUrl: block.imageUrl || "",
            metadata: block.metadata as any,
          }));
        }

        if (s.checkpoints && s.checkpoints.length > 0) {
          // Multiple checkpoints
          s.checkpoints.forEach(cp => {
            items.push({
              id: cp.id,
              itemType: "checkpoint",
              question: cp.question,
              options: cp.options as string[],
              correctOptionIndex: cp.correctOptionIndex,
              explanation: cp.explanation || "",
              isEvaluated: cp.isEvaluated ?? true,
            });
          });
        } else if (s.checkpoint) {
          // Single legacy checkpoint
          items.push({
            id: s.checkpoint.id,
            itemType: "checkpoint",
            question: s.checkpoint.question,
            options: s.checkpoint.options as string[],
            correctOptionIndex: s.checkpoint.correctOptionIndex,
            explanation: s.checkpoint.explanation || "",
            isEvaluated: s.checkpoint.isEvaluated ?? true,
          });
        }

        // Items must be sorted? 
        // NOTE: Server routes now support custom ordering. 
        // We assume backend returns them in correct order if we processed them properly. 
        // But here we constructed items from separate arrays.
        // If contentBlocks had order, we should respect it.
        // For now, we append checkpoints at the end for legacy data. 
        // New data will have correct unified order if we store it.
        // (Since we just enabled unified storage, old data will rely on this fallback).

        return {
          id: s.id,
          title: s.title,
          order: s.order,
          checkpointRequired: s.checkpointRequired,
          items,
        };
      }));
      setHasChanges(false);
    }
  }, [stepsData]);

  const saveSteps = useMutation({
    mutationFn: async (stepsToSave: StepFormData[]) => {
      // Clean up metadata before saving
      const cleanedSteps = stepsToSave.map(step => ({
        ...step,
        items: step.items.map(item => ({
          ...item,
          // Ensure metadata is valid JSON object
          metadata: item.metadata || {}
        }))
      }));

      return await apiRequest<StepWithDetails[]>("PUT", `/api/admin/modules/${id}/steps`, { steps: cleanedSteps });
    },
    onSuccess: (data) => {
      // Refresh local state from server response to get IDs of new items
      if (data && Array.isArray(data)) {
        setSteps(data.map(s => {
          let items: StepItemFormData[] = [];
          if (s.contentBlocks) {
            items = s.contentBlocks.map(block => ({
              id: block.id,
              itemType: "content",
              blockType: (block.blockType as any) || "text",
              content: block.content || "",
              imageUrl: block.imageUrl || "",
              metadata: block.metadata as any,
              // Use order from block if needed, but array order in resultSteps should be correct
            }));
          }
          // The resultSteps response from our new backend will have checkpoints sorted relative to blocks?
          // Actually, our backend now returns { contentBlocks: [], checkpoints: [] }
          // It does NOT return a unified "items" array.
          // So we have to reconstruct "items" merging them.
          // BUT, we lost the relative order between blocks and checkpoints in the response!
          // We know the order *within* contentBlocks and *within* checkpoints.
          // But since the backend splits them, the response lacks the "interleaved" info unless we add "order" field to both and sort.
          // The backend does return "order" field for both!

          let unifiedItems: any[] = [...items];

          if (s.checkpoints) {
            s.checkpoints.forEach(cp => {
              unifiedItems.push({
                id: cp.id,
                itemType: "checkpoint",
                question: cp.question,
                options: cp.options,
                correctOptionIndex: cp.correctOptionIndex,
                explanation: cp.explanation,
                order: cp.order // We added this to schema/response!
              });
            });
          }

          // Sort by order
          unifiedItems.sort((a, b) => (a.order || 0) - (b.order || 0));

          return {
            id: s.id,
            title: s.title,
            order: s.order,
            checkpointRequired: s.checkpointRequired,
            items: unifiedItems,
          };
        }));
      }
      setHasChanges(false);
      toast({ title: "Success", description: "Steps saved successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/modules", id, "steps"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Session Expired", description: "Please log in again", variant: "destructive" });
        setTimeout(() => window.location.href = "/api/login", 500);
        return;
      }
      toast({ title: "Error", description: "Failed to save steps", variant: "destructive" });
    },
  });

  const handleStepChange = (index: number, data: StepFormData) => {
    const newSteps = [...steps];
    newSteps[index] = data;
    setSteps(newSteps);
    setHasChanges(true);
  };

  const handleAddStep = () => {
    const newStep: StepFormData = {
      title: `Step ${steps.length + 1}`,
      items: [],
      order: steps.length + 1,
      checkpointRequired: true
    };
    setSteps([...steps, newStep]);
    setExpandedSteps(new Set([...Array.from(expandedSteps), steps.length]));
    setHasChanges(true);
  };

  const handleRemoveStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index));
    setHasChanges(true);
  };

  const toggleExpanded = (index: number) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedSteps(newExpanded);
  };

  const handleSave = () => {
    saveSteps.mutate(steps);
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <LoadingSkeleton />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/admin/modules" data-testid="button-back">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-page-title">
                Step Editor: {module?.title || "Loading..."}
              </h1>
              <p className="text-sm text-muted-foreground">
                Add content, videos, and checkpoints to this module.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleAddStep}
              data-testid="button-add-step"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Step
            </Button>
            <Button
              onClick={handleSave}
              disabled={!hasChanges || saveSteps.isPending}
              data-testid="button-save-steps"
            >
              <Save className="h-4 w-4 mr-2" />
              {saveSteps.isPending ? "Saving..." : "Save Steps"}
            </Button>
          </div>
        </div>

        {steps.length === 0 ? (
          <Card className="p-12">
            <CardContent className="flex flex-col items-center justify-center text-center">
              <HelpCircle className="h-12 w-12 text-muted-foreground/40 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Steps Yet</h3>
              <p className="text-muted-foreground mb-4">
                Create learning steps with content and checkpoint questions.
              </p>
              <Button onClick={handleAddStep} data-testid="button-add-first-step">
                <Plus className="h-4 w-4 mr-2" />
                Add First Step
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {steps.map((step, index) => (
              <StepEditor
                key={step.id || index}
                step={step}
                index={index}
                isExpanded={expandedSteps.has(index)}
                onToggle={() => toggleExpanded(index)}
                onChange={(data) => handleStepChange(index, data)}
                onRemove={() => handleRemoveStep(index)}
              />
            ))}
          </div>
        )}

        {hasChanges && (
          <div className="fixed bottom-4 right-4 bg-background border shadow-lg rounded-lg p-4 flex items-center gap-4 z-50 animate-in fade-in slide-in-from-bottom-4">
            <span className="text-sm text-muted-foreground">You have unsaved changes</span>
            <Button
              onClick={handleSave}
              disabled={saveSteps.isPending}
              data-testid="button-save-floating"
            >
              {saveSteps.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
