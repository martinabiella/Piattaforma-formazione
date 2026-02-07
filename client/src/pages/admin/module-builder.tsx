import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useParams, useLocation } from "wouter";
import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Save,
  Plus,
  Trash2,
  GripVertical,
  ArrowLeft,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  FileText,
  Image,
  Eye,
  Pencil,
  CheckCircle2,
  Upload,
  Loader2,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { Module, ModuleStep, StepContentBlock, StepCheckpoint } from "@shared/schema";

interface StepWithDetails extends ModuleStep {
  contentBlocks: StepContentBlock[];
  checkpoint: StepCheckpoint | null;
}

interface StepFormData {
  id?: number;
  tempId: string;
  title: string;
  contentBlocks: ContentBlockFormData[];
  checkpoint: CheckpointFormData | null;
  checkpointRequired: boolean;
}

interface ContentBlockFormData {
  id?: number;
  tempId: string;
  blockType: string;
  content: string;
  imageUrl: string;
}

interface CheckpointFormData {
  question: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
}

interface CheckpointEditorProps {
  checkpoint: CheckpointFormData;
  stepIndex: number;
  checkpointRequired: boolean;
  onChange: (data: CheckpointFormData) => void;
  onRequiredChange: (required: boolean) => void;
  onRemove: () => void;
}

function CheckpointEditor({
  checkpoint,
  stepIndex,
  checkpointRequired,
  onChange,
  onRequiredChange,
  onRemove,
}: CheckpointEditorProps) {
  const handleOptionChange = (optionIndex: number, value: string) => {
    const newOptions = [...checkpoint.options];
    newOptions[optionIndex] = value;
    onChange({ ...checkpoint, options: newOptions });
  };

  const handleCorrectOptionChange = (index: number) => {
    onChange({ ...checkpoint, correctOptionIndex: index });
  };

  const addOption = () => {
    onChange({ ...checkpoint, options: [...checkpoint.options, ""] });
  };

  const removeOption = (index: number) => {
    const newOptions = checkpoint.options.filter((_, i) => i !== index);
    onChange({ ...checkpoint, options: newOptions });
  };

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Checkpoint Question</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 mr-4">
              <Switch
                id={`required-${stepIndex}`}
                checked={checkpointRequired}
                onCheckedChange={onRequiredChange}
              />
              <Label htmlFor={`required-${stepIndex}`}>Required to continue</Label>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onRemove}
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Question Text</Label>
          <Textarea
            value={checkpoint.question}
            onChange={(e) => onChange({ ...checkpoint, question: e.target.value })}
            placeholder="Enter the checkpoint question"
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <Label>Options</Label>
          {checkpoint.options.map((option, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="radio"
                name={`correct-option-${stepIndex}`}
                checked={checkpoint.correctOptionIndex === i}
                onChange={() => handleCorrectOptionChange(i)}
                className="h-4 w-4"
              />
              <Input
                value={option}
                onChange={(e) => handleOptionChange(i, e.target.value)}
                placeholder={`Option ${i + 1}`}
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeOption(i)}
                disabled={checkpoint.options.length <= 2}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addOption} className="mt-2">
            <Plus className="h-4 w-4 mr-2" /> Add Option
          </Button>
        </div>

        <div className="space-y-2">
          <Label>Explanation (shown after answering)</Label>
          <Textarea
            value={checkpoint.explanation}
            onChange={(e) => onChange({ ...checkpoint, explanation: e.target.value })}
            placeholder="Explain why the answer is correct..."
            rows={2}
          />
        </div>
      </CardContent>
    </Card>
  );
}

interface ModuleFormData {
  title: string;
  description: string;
  imageUrl: string;
  published: boolean;
}

function generateTempId(): string {
  return `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

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

function SortableContentBlock({
  block,
  stepIndex,
  blockIndex,
  onChange,
  onRemove,
}: {
  block: ContentBlockFormData;
  stepIndex: number;
  blockIndex: number;
  onChange: (data: Partial<ContentBlockFormData>) => void;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.tempId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("image", file);

    setIsUploading(true);
    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");

      const data = await res.json();
      onChange({ imageUrl: data.url });
      toast({ title: "Success", description: "Image uploaded successfully" });
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to upload image",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn("group", isDragging && "z-50")}
    >
      <Card className="border" data-testid={`content-block-${stepIndex}-${blockIndex}`}>
        <CardContent className="pt-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing p-1 hover-elevate rounded"
                data-testid={`drag-content-block-${stepIndex}-${blockIndex}`}
              >
                <GripVertical className="h-4 w-4 text-muted-foreground" />
              </button>
              <Badge variant="outline" className="text-xs">
                {block.blockType === "image" ? (
                  <>
                    <Image className="h-3 w-3 mr-1" />
                    Image
                  </>
                ) : (
                  <>
                    <FileText className="h-3 w-3 mr-1" />
                    Text
                  </>
                )}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onRemove}
              data-testid={`button-remove-block-${stepIndex}-${blockIndex}`}
            >
              <Trash2 className="h-3 w-3 text-destructive" />
            </Button>
          </div>

          <div className="space-y-2">
            <Label>Content (HTML)</Label>
            <Textarea
              value={block.content}
              onChange={(e) => onChange({ content: e.target.value })}
              placeholder="Enter content (HTML supported)"
              rows={4}
              className="font-mono text-sm"
              data-testid={`input-block-content-${stepIndex}-${blockIndex}`}
            />
          </div>

          <div className="space-y-2">
            <Label>Image URL (optional)</Label>
            <div className="flex gap-2">
              <Input
                value={block.imageUrl || ""}
                onChange={(e) => onChange({ imageUrl: e.target.value })}
                placeholder="https://example.com/image.jpg"
                data-testid={`input-block-image-${stepIndex}-${blockIndex}`}
              />
              <div className="relative">
                <input
                  type="file"
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={isUploading}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  title="Upload image"
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// CheckpointEditor moved to top of file

// Preview components that match user-facing styling
function ContentBlockPreview({ block }: { block: ContentBlockFormData }) {
  return (
    <div data-testid="content-block-preview">
      {block.imageUrl && (
        <div className="mb-4 rounded-lg overflow-hidden">
          <img
            src={block.imageUrl}
            alt="Step content"
            className="w-full h-auto max-h-80 object-cover"
          />
        </div>
      )}
      {block.content && (
        <div
          className="prose prose-lg dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: block.content }}
        />
      )}
    </div>
  );
}

function CheckpointPreview({ checkpoint, stepIndex }: { checkpoint: CheckpointFormData; stepIndex: number }) {
  const options = checkpoint.options || [];

  return (
    <Card className="border-2" data-testid={`checkpoint-preview-${stepIndex}`}>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Checkpoint Question</CardTitle>
          <Badge variant="outline" className="ml-auto">Required to continue</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="font-medium text-lg" data-testid={`text-checkpoint-question-preview-${stepIndex}`}>
          {checkpoint.question || "No question set"}
        </p>

        <div className="space-y-2">
          {options.map((option, index) => {
            const isCorrect = index === checkpoint.correctOptionIndex;

            return (
              <button
                key={index}
                type="button"
                disabled
                className="w-full p-4 rounded-lg border text-left transition-all flex items-center gap-3 cursor-pointer hover-elevate"
                data-testid={`option-preview-${stepIndex}-${index}`}
              >
                <span className="w-6 h-6 rounded-full border-2 flex items-center justify-center text-sm font-medium shrink-0">
                  {String.fromCharCode(65 + index)}
                </span>
                <span className="flex-1">{option || `Option ${String.fromCharCode(65 + index)}`}</span>
                {isCorrect && (
                  <Badge variant="secondary" className="text-xs">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Correct
                  </Badge>
                )}
              </button>
            );
          })}
        </div>

        <Button disabled className="w-full" data-testid={`button-submit-preview-${stepIndex}`}>
          Submit Answer
        </Button>

        {checkpoint.explanation && (
          <div className="mt-4 p-4 rounded-lg bg-muted/50 border">
            <p className="text-sm font-medium text-muted-foreground mb-1">Explanation (shown after answering):</p>
            <p className="text-sm" data-testid={`text-explanation-preview-${stepIndex}`}>{checkpoint.explanation}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StepPreview({ step, index }: { step: StepFormData; index: number }) {
  return (
    <Card data-testid={`step-preview-${index}`}>
      <CardHeader>
        <div className="flex items-center gap-3 flex-wrap">
          <Badge variant="secondary">Step {index + 1}</Badge>
        </div>
        <CardTitle className="text-2xl mt-2" data-testid={`text-step-title-preview-${index}`}>
          {step.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {step.contentBlocks.length === 0 && !step.checkpoint && (
          <p className="text-muted-foreground italic">No content added to this step yet.</p>
        )}

        {step.contentBlocks.map((block, blockIndex) => (
          <ContentBlockPreview key={block.tempId || blockIndex} block={block} />
        ))}

        {step.checkpoint && (
          <div className="mt-8 pt-6 border-t">
            <CheckpointPreview checkpoint={step.checkpoint} stepIndex={index} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SortableStep({
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
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: step.tempId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleContentBlockChange = (blockIndex: number, data: Partial<ContentBlockFormData>) => {
    const newBlocks = [...step.contentBlocks];
    newBlocks[blockIndex] = { ...newBlocks[blockIndex], ...data };
    onChange({ ...step, contentBlocks: newBlocks });
  };

  const handleAddContentBlock = () => {
    onChange({
      ...step,
      contentBlocks: [
        ...step.contentBlocks,
        { tempId: generateTempId(), blockType: "text", content: "", imageUrl: "" },
      ],
    });
  };

  const handleRemoveContentBlock = (blockIndex: number) => {
    onChange({
      ...step,
      contentBlocks: step.contentBlocks.filter((_, i) => i !== blockIndex),
    });
  };

  const handleAddCheckpoint = () => {
    onChange({
      ...step,
      checkpoint: {
        question: "",
        options: ["", "", "", ""],
        correctOptionIndex: 0,
        explanation: "",
      },
    });
  };

  const handleRemoveCheckpoint = () => {
    onChange({ ...step, checkpoint: null });
  };

  const handleContentBlockDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = step.contentBlocks.findIndex((b) => b.tempId === active.id);
      const newIndex = step.contentBlocks.findIndex((b) => b.tempId === over.id);
      onChange({
        ...step,
        contentBlocks: arrayMove(step.contentBlocks, oldIndex, newIndex),
      });
    }
  };

  return (
    <div ref={setNodeRef} style={style} className={cn(isDragging && "z-50")}>
      <Card className="border-2" data-testid={`step-card-${index}`}>
        <Collapsible open={isExpanded} onOpenChange={onToggle}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <button
                  {...attributes}
                  {...listeners}
                  className="cursor-grab active:cursor-grabbing p-1 hover-elevate rounded"
                  data-testid={`drag-step-${index}`}
                >
                  <GripVertical className="h-5 w-5 text-muted-foreground" />
                </button>
                <CollapsibleTrigger asChild>
                  <button
                    className="flex items-center gap-2 hover-elevate rounded p-1"
                    data-testid={`button-toggle-step-${index}`}
                  >
                    <Badge variant="outline">Step {index + 1}</Badge>
                    <span className="font-medium">{step.title || "Untitled Step"}</span>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                </CollapsibleTrigger>
              </div>
              <div className="flex items-center gap-2">
                {step.checkpoint && (
                  <Badge variant="secondary" className="text-xs">
                    <HelpCircle className="h-3 w-3 mr-1" />
                    Checkpoint
                  </Badge>
                )}
                <Badge variant="outline" className="text-xs">
                  {step.contentBlocks.length} block{step.contentBlocks.length !== 1 ? "s" : ""}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onRemove}
                  data-testid={`button-remove-step-${index}`}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          </CardHeader>

          <CollapsibleContent>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Step Title</Label>
                <Input
                  value={step.title}
                  onChange={(e) => onChange({ ...step, title: e.target.value })}
                  placeholder="Enter step title"
                  data-testid={`input-step-title-${index}`}
                />
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">Content Blocks</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddContentBlock}
                    data-testid={`button-add-content-${index}`}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Content
                  </Button>
                </div>

                {step.contentBlocks.length > 0 ? (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleContentBlockDragEnd}
                  >
                    <SortableContext
                      items={step.contentBlocks.map((b) => b.tempId)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-3">
                        {step.contentBlocks.map((block, blockIndex) => (
                          <SortableContentBlock
                            key={block.tempId}
                            block={block}
                            stepIndex={index}
                            blockIndex={blockIndex}
                            onChange={(data) => handleContentBlockChange(blockIndex, data)}
                            onRemove={() => handleRemoveContentBlock(blockIndex)}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4 border rounded-md border-dashed">
                    No content blocks yet. Add text or images to this step.
                  </p>
                )}
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">Checkpoint Question</Label>
                  {!step.checkpoint && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAddCheckpoint}
                      data-testid={`button-add-checkpoint-${index}`}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Checkpoint
                    </Button>
                  )}
                </div>

                {step.checkpoint ? (
                  <CheckpointEditor
                    checkpoint={step.checkpoint}
                    stepIndex={index}
                    checkpointRequired={step.checkpointRequired}
                    onChange={(data) => onChange({ ...step, checkpoint: data })}
                    onRequiredChange={(required) => onChange({ ...step, checkpointRequired: required })}
                    onRemove={handleRemoveCheckpoint}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4 border rounded-md border-dashed">
                    No checkpoint. Add a question to gate access to the next step.
                  </p>
                )}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </div>
  );
}

export default function ModuleBuilder() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const isNew = id === "new";

  const [moduleData, setModuleData] = useState<ModuleFormData>({
    title: "",
    description: "",
    imageUrl: "",
    published: false,
  });
  const [steps, setSteps] = useState<StepFormData[]>([]);
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set([0]));
  const [hasChanges, setHasChanges] = useState(false);
  const [viewMode, setViewMode] = useState<"edit" | "preview">("edit");

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const { data: existingModule, isLoading: moduleLoading } = useQuery<Module>({
    queryKey: ["/api/admin/modules", id],
    enabled: !isNew && !!id,
  });

  const { data: existingSteps, isLoading: stepsLoading } = useQuery<StepWithDetails[]>({
    queryKey: ["/api/admin/modules", id, "steps"],
    enabled: !isNew && !!id,
  });

  useEffect(() => {
    if (existingModule) {
      setModuleData({
        title: existingModule.title,
        description: existingModule.description || "",
        imageUrl: existingModule.imageUrl || "",
        published: existingModule.published,
      });
    }
  }, [existingModule]);

  useEffect(() => {
    if (existingSteps) {
      setSteps(
        existingSteps.map((s) => ({
          id: s.id,
          tempId: `existing-${s.id}`,
          title: s.title,
          contentBlocks: (s.contentBlocks || []).map((b) => ({
            id: b.id,
            tempId: `existing-block-${b.id}`,
            blockType: b.blockType,
            content: b.content || "",
            imageUrl: b.imageUrl || "",
          })),
          checkpoint: s.checkpoint
            ? {
              question: s.checkpoint.question,
              options: s.checkpoint.options || ["", "", "", ""],
              correctOptionIndex: s.checkpoint.correctOptionIndex,
              explanation: s.checkpoint.explanation || "",
            }
            : null,
          checkpointRequired: s.checkpointRequired !== undefined ? s.checkpointRequired : true,
        }))
      );
      setHasChanges(false);
    }
  }, [existingSteps]);

  const createModule = useMutation({
    mutationFn: async (data: ModuleFormData) => {
      return await apiRequest<Module>("POST", "/api/admin/modules", data);
    },
    onSuccess: (newModule) => {
      toast({ title: "Success", description: "Module created successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/modules"] });
      queryClient.invalidateQueries({ queryKey: ["/api/modules"] });
      setLocation(`/admin/modules/${newModule.id}/builder`);
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Session Expired", description: "Please log in again", variant: "destructive" });
        setTimeout(() => (window.location.href = "/api/login"), 500);
        return;
      }
      toast({ title: "Error", description: "Failed to create module", variant: "destructive" });
    },
  });

  const updateModule = useMutation({
    mutationFn: async (data: ModuleFormData) => {
      return await apiRequest<Module>("PATCH", `/api/admin/modules/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/modules", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/modules"] });
      queryClient.invalidateQueries({ queryKey: ["/api/modules"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Session Expired", description: "Please log in again", variant: "destructive" });
        setTimeout(() => (window.location.href = "/api/login"), 500);
        return;
      }
      toast({ title: "Error", description: "Failed to update module", variant: "destructive" });
    },
  });

  const saveSteps = useMutation({
    mutationFn: async (stepsToSave: StepFormData[]) => {
      return await apiRequest<StepWithDetails[]>("PUT", `/api/admin/modules/${id}/steps`, { steps: stepsToSave });
    },
    onSuccess: (data) => {
      if (data && Array.isArray(data)) {
        setSteps(
          data.map((s) => ({
            id: s.id,
            tempId: `existing-${s.id}`,
            title: s.title,
            contentBlocks: (s.contentBlocks || []).map((b) => ({
              id: b.id,
              tempId: `existing-block-${b.id}`,
              blockType: b.blockType,
              content: b.content || "",
              imageUrl: b.imageUrl || "",
            })),
            checkpoint: s.checkpoint
              ? {
                question: s.checkpoint.question,
                options: s.checkpoint.options || ["", "", "", ""],
                correctOptionIndex: s.checkpoint.correctOptionIndex,
                explanation: s.checkpoint.explanation || "",
              }
              : null,
            checkpointRequired: s.checkpointRequired ?? true,
          }))
        );
      }
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/modules", id, "steps"] });
      queryClient.invalidateQueries({ queryKey: ["/api/modules"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({ title: "Session Expired", description: "Please log in again", variant: "destructive" });
        setTimeout(() => (window.location.href = "/api/login"), 500);
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
      tempId: generateTempId(),
      title: `Step ${steps.length + 1}`,
      contentBlocks: [],
      checkpoint: null,
      checkpointRequired: true,
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

  const handleStepDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = steps.findIndex((s) => s.tempId === active.id);
      const newIndex = steps.findIndex((s) => s.tempId === over.id);
      setSteps(arrayMove(steps, oldIndex, newIndex));
      setHasChanges(true);
    }
  };

  const handleSaveAll = async () => {
    if (isNew) {
      createModule.mutate(moduleData);
    } else {
      await updateModule.mutateAsync(moduleData);
      await saveSteps.mutateAsync(steps);
      toast({ title: "Success", description: "Module saved successfully" });
    }
  };

  const isLoading = !isNew && (moduleLoading || stepsLoading);
  const isSaving = createModule.isPending || updateModule.isPending || saveSteps.isPending;

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
                {isNew ? "Create Module" : "Edit Module"}
              </h1>
              <p className="text-sm text-muted-foreground">
                Build your module with content sections and checkpoint questions
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {!isNew && steps.length > 0 && (
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "edit" | "preview")}>
                <TabsList>
                  <TabsTrigger value="edit" data-testid="tab-edit">
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit
                  </TabsTrigger>
                  <TabsTrigger value="preview" data-testid="tab-preview">
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            )}
            <Button
              onClick={handleSaveAll}
              disabled={isSaving || (isNew && !moduleData.title)}
              data-testid="button-save-all"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Saving..." : "Save Module"}
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Module Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={moduleData.title}
                  onChange={(e) => {
                    setModuleData({ ...moduleData, title: e.target.value });
                    setHasChanges(true);
                  }}
                  placeholder="Module title"
                  data-testid="input-module-title"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="imageUrl">Cover Image URL</Label>
                <Input
                  id="imageUrl"
                  value={moduleData.imageUrl}
                  onChange={(e) => {
                    setModuleData({ ...moduleData, imageUrl: e.target.value });
                    setHasChanges(true);
                  }}
                  placeholder="https://example.com/image.jpg"
                  data-testid="input-module-image"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={moduleData.description}
                onChange={(e) => {
                  setModuleData({ ...moduleData, description: e.target.value });
                  setHasChanges(true);
                }}
                placeholder="Module description"
                rows={3}
                data-testid="input-module-description"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="published"
                checked={moduleData.published}
                onCheckedChange={(checked) => {
                  setModuleData({ ...moduleData, published: checked });
                  setHasChanges(true);
                }}
                data-testid="switch-published"
              />
              <Label htmlFor="published">Published</Label>
            </div>
          </CardContent>
        </Card>

        {!isNew && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                {viewMode === "preview" ? "Preview: How Users Will See This Module" : "Learning Steps"}
              </h2>
              {viewMode === "edit" && (
                <Button onClick={handleAddStep} data-testid="button-add-step">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Step
                </Button>
              )}
            </div>

            {steps.length === 0 ? (
              <Card className="p-12">
                <CardContent className="flex flex-col items-center justify-center text-center">
                  <HelpCircle className="h-12 w-12 text-muted-foreground/40 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Steps Yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Create learning steps with content and checkpoint questions.
                    Each step can have text, images, and one checkpoint question.
                  </p>
                  <Button onClick={handleAddStep} data-testid="button-add-first-step">
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Step
                  </Button>
                </CardContent>
              </Card>
            ) : viewMode === "preview" ? (
              <div className="space-y-6">
                {steps.map((step, index) => (
                  <StepPreview key={step.tempId} step={step} index={index} />
                ))}
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleStepDragEnd}
              >
                <SortableContext
                  items={steps.map((s) => s.tempId)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-4">
                    {steps.map((step, index) => (
                      <SortableStep
                        key={step.tempId}
                        step={step}
                        index={index}
                        isExpanded={expandedSteps.has(index)}
                        onToggle={() => toggleExpanded(index)}
                        onChange={(data) => handleStepChange(index, data)}
                        onRemove={() => handleRemoveStep(index)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </>
        )}

        {hasChanges && (
          <div className="fixed bottom-4 right-4 bg-background border shadow-lg rounded-lg p-4 flex items-center gap-4 z-50">
            <span className="text-sm text-muted-foreground">You have unsaved changes</span>
            <Button onClick={handleSaveAll} disabled={isSaving} data-testid="button-save-floating">
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
