import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useParams, useLocation } from "wouter";
import { AdminLayout } from "@/components/admin-layout";
import { RichTextEditor } from "@/components/rich-text-editor";
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
  Columns,
  ArrowRightLeft,
  LayoutTemplate,
  Type,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { Module, ModuleStep, StepContentBlock, StepCheckpoint } from "@shared/schema";

interface StepWithDetails extends ModuleStep {
  contentBlocks: StepContentBlock[];
  checkpoints?: StepCheckpoint[];
  checkpoint?: StepCheckpoint | null; // Legacy support
}

interface StepFormData {
  id?: number;
  tempId: string;
  title: string;
  items: (ContentBlockFormData | CheckpointFormData)[];
  checkpointRequired: boolean;
}

interface ContentBlockFormData {
  id?: number;
  tempId: string;
  itemType: "content";
  order?: number;
  blockType: string;
  content: string;
  imageUrl: string;
  metadata?: {
    splitRatio?: "30-70" | "50-50" | "70-30";
    reverseLayout?: boolean;
    fontSize?: "small" | "normal" | "large" | "xlarge";
    columns?: 1 | 2 | 3;
    imageWidth?: "25%" | "50%" | "75%" | "100%";
    width?: "1/3" | "1/2" | "full";
  };
}

interface CheckpointFormData {
  id?: number;
  tempId: string;
  itemType: "checkpoint";
  order?: number;
  question: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
  isEvaluated: boolean;
}

interface CheckpointEditorProps {
  checkpoint: CheckpointFormData;
  stepIndex: number;
  checkpointIndex: number;
  checkpointRequired: boolean;
  onChange: (data: CheckpointFormData) => void;
  onRequiredChange: (required: boolean) => void;
  onRemove: () => void;
}


function SortableCheckpoint({
  checkpoint,
  stepIndex,
  itemIndex,
  checkpointRequired,
  onChange,
  onRequiredChange,
  onRemove,
}: {
  checkpoint: CheckpointFormData;
  stepIndex: number;
  itemIndex: number;
  checkpointRequired: boolean;
  onChange: (data: Partial<CheckpointFormData>) => void;
  onRequiredChange: (required: boolean) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: checkpoint.tempId });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div ref={setNodeRef} style={style} className={cn("group relative", isDragging && "z-50")}>
      <div className="absolute left-2 top-4 z-10">
        <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
      <div className="pl-8">
        <CheckpointEditor
          checkpoint={checkpoint}
          stepIndex={stepIndex}
          checkpointIndex={itemIndex}
          checkpointRequired={checkpointRequired}
          onChange={(data) => onChange(data)}
          onRequiredChange={onRequiredChange}
          onRemove={onRemove}
        />
      </div>
    </div>
  );
}

function CheckpointEditor({
  checkpoint,
  stepIndex,
  checkpointIndex,
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

            <div className="flex items-center gap-2 mr-4">
              <Switch
                id={`evaluated-${stepIndex}-${checkpointIndex}`}
                checked={checkpoint.isEvaluated}
                onCheckedChange={(checked) => onChange({ ...checkpoint, isEvaluated: checked })}
              />
              <Label htmlFor={`evaluated-${stepIndex}-${checkpointIndex}`}>Scored</Label>
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

        {!checkpoint.isEvaluated && (
          <p className="text-sm text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
            This question is for practice only and will not affect the final module score.
          </p>
        )}
      </CardContent>
    </Card >
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
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        credentials: "include",
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

  const updateMetadata = (updates: Partial<NonNullable<ContentBlockFormData['metadata']>>) => {
    onChange({
      metadata: {
        splitRatio: "50-50",
        reverseLayout: false,
        ...block.metadata,
        ...updates
      }
    });
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn("group", isDragging && "z-50")}
    >
      <Card className="border" data-testid={`content-block-${stepIndex}-${blockIndex}`}>
        <CardContent className="pt-4 space-y-3">
          {/* Header with Drag Handle and Type Selector */}
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

              <div className="flex bg-muted rounded-md p-1 gap-1">
                <Button
                  variant={block.blockType === "text" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => onChange({ blockType: "text" })}
                >
                  <FileText className="h-3 w-3 mr-1" /> Text
                </Button>
                <Button
                  variant={block.blockType === "image" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => onChange({ blockType: "image" })}
                >
                  <Image className="h-3 w-3 mr-1" /> Image
                </Button>
                <Button
                  variant={block.blockType === "split" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => onChange({ blockType: "split" })}
                >
                  <Columns className="h-3 w-3 mr-1" /> Split
                </Button>
              </div>
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

          {/* Split Layout Controls */}
          {block.blockType === "split" && (
            <div className="flex items-center gap-4 bg-muted/30 p-2 rounded-md">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">Ratio:</span>
                <div className="flex gap-1">
                  {(["30-70", "50-50", "70-30"] as const).map((ratio) => (
                    <Button
                      key={ratio}
                      variant={block.metadata?.splitRatio === ratio ? "secondary" : "outline"}
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => updateMetadata({ splitRatio: ratio })}
                    >
                      {ratio.replace("-", "/")}
                    </Button>
                  ))}
                </div>
              </div>
              <Separator orientation="vertical" className="h-4" />
              <Button
                variant={block.metadata?.reverseLayout ? "secondary" : "outline"}
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => updateMetadata({ reverseLayout: !block.metadata?.reverseLayout })}
              >
                <ArrowRightLeft className="h-3 w-3 mr-1" />
                {block.metadata?.reverseLayout ? "Image Left" : "Text Left"}
              </Button>
            </div>
          )}

          {/* Content Inputs */}
          <div className={cn(
            "grid gap-4",
            block.blockType === "split" ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"
          )}>
            {/* Text Input */}
            {(block.blockType === "text" || block.blockType === "split") && (
              <div className={cn("space-y-2", block.blockType === "split" && block.metadata?.reverseLayout && "order-2")}>
                <div className="flex items-center justify-between">
                  <Label>Content</Label>
                  {block.blockType === "text" && (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <Type className="h-3 w-3 text-muted-foreground" />
                        <select
                          className="text-xs border rounded px-1 py-0.5 bg-background h-6"
                          value={block.metadata?.fontSize || "normal"}
                          onChange={(e) => updateMetadata({ fontSize: e.target.value as any })}
                        >
                          <option value="small">Small</option>
                          <option value="normal">Normal</option>
                          <option value="large">Large</option>
                          <option value="xlarge">Extra Large</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-1">
                        <Columns className="h-3 w-3 text-muted-foreground" />
                        <select
                          className="text-xs border rounded px-1 py-0.5 bg-background h-6"
                          value={block.metadata?.columns || 1}
                          onChange={(e) => updateMetadata({ columns: parseInt(e.target.value) as any })}
                        >
                          <option value={1}>1 Col</option>
                          <option value={2}>2 Cols</option>
                          <option value={3}>3 Cols</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
                {block.blockType === "text" && (
                  <div className="flex items-center gap-2 mt-2">
                    <Label className="text-xs text-muted-foreground whitespace-nowrap">Block Width:</Label>
                    <div className="flex gap-1">
                      {(["full", "1/2", "1/3"] as const).map((w) => (
                        <Button
                          key={w}
                          type="button"
                          variant={block.metadata?.width === w || (!block.metadata?.width && w === "full") ? "secondary" : "outline"}
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={() => updateMetadata({ width: w })}
                        >
                          {w === "full" ? "Full" : w === "1/2" ? "1/2" : "1/3"}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
                <RichTextEditor
                  content={block.content}
                  onChange={(html) => onChange({ content: html })}
                  placeholder="Start typing your content..."
                  className={cn(
                    "min-h-[150px]",
                    block.metadata?.columns === 2 && "prose-columns-2",
                    block.metadata?.columns === 3 && "prose-columns-3"
                  )}
                />
              </div>
            )}

            {/* Image Input */}
            {(block.blockType === "image" || block.blockType === "split") && (
              <div className={cn("space-y-2", block.blockType === "split" && block.metadata?.reverseLayout && "order-1")}>
                <Label>Image</Label>
                <div className="flex flex-col gap-2">
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
                        ref={fileInputRef}
                        className="hidden"
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
                        onClick={() => fileInputRef.current?.click()}
                      >
                        {isUploading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {block.imageUrl && (
                    <div className="relative w-full rounded-md border bg-muted flex justify-center p-2">
                      <img
                        src={block.imageUrl}
                        alt="Preview"
                        style={{ width: block.metadata?.imageWidth || "100%" }}
                        className="h-auto object-cover"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Image Width Control */}
            {(block.blockType === "image" || block.blockType === "split") && (
              <div className="flex items-center gap-2 mt-2">
                <Label className="text-xs text-muted-foreground whitespace-nowrap">Image Width:</Label>
                <div className="flex gap-1">
                  {(["25%", "50%", "75%", "100%"] as const).map((width) => (
                    <Button
                      key={width}
                      type="button"
                      variant={block.metadata?.imageWidth === width ? "secondary" : "outline"}
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => updateMetadata({ imageWidth: width })}
                    >
                      {width}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// CheckpointEditor moved to top of file

// Preview components that match user-facing styling
// Preview components that match user-facing styling
function ContentBlockPreview({ block }: { block: ContentBlockFormData }) {
  const width = block.metadata?.width || "full";
  const basisClass = width === "1/3" ? "md:basis-[calc(33.333%-1.5rem)]" :
    width === "1/2" ? "md:basis-[calc(50%-1.5rem)]" : "basis-full";

  if (block.blockType === "split") {
    const ratio = block.metadata?.splitRatio || "50-50";
    const reverse = block.metadata?.reverseLayout || false;

    // Calculate grid columns based on ratio
    let gridCols = "grid-cols-1 md:grid-cols-2"; // Default 50-50
    if (ratio === "30-70") gridCols = "grid-cols-1 md:grid-cols-[3fr_7fr]";
    if (ratio === "70-30") gridCols = "grid-cols-1 md:grid-cols-[7fr_3fr]";

    return (
      <div className={cn("grid gap-8 items-start mb-8", gridCols, basisClass)} data-testid="content-block-preview">
        <div className={cn("prose prose-lg dark:prose-invert max-w-none", reverse && "md:order-2")}>
          <div dangerouslySetInnerHTML={{ __html: block.content }} />
        </div>
        <div className={cn("rounded-lg overflow-hidden border bg-muted", reverse && "md:order-1")}>
          {block.imageUrl ? (
            <img
              src={block.imageUrl}
              alt="Step content"
              style={{ width: block.metadata?.imageWidth || "100%" }}
              className="h-auto object-cover"
            />
          ) : (
            <div className="flex items-center justify-center p-12 text-muted-foreground bg-muted/50">
              <Image className="h-12 w-12 opacity-20" />
            </div>
          )}
        </div>
      </div>
    );
  }

  if (block.blockType === "image") {
    return (
      <div className={cn("mb-8", basisClass)} data-testid="content-block-preview">
        {block.imageUrl ? (
          <div className="rounded-lg overflow-hidden border bg-muted">
            <img
              src={block.imageUrl}
              alt="Step content"
              style={{ width: block.metadata?.imageWidth || "100%" }}
              className="h-auto max-h-[600px] object-contain mx-auto"
            />
          </div>
        ) : (
          <div className="flex items-center justify-center p-12 text-muted-foreground border rounded-lg bg-muted/50">
            <Image className="h-12 w-12 opacity-20" />
          </div>
        )}
      </div>
    );
  }

  // Default to text
  const columns = block.metadata?.columns || 1;
  const fontSize = block.metadata?.fontSize || "normal";

  const columnClass = columns === 3 ? "prose-columns-3" :
    columns === 2 ? "prose-columns-2" : "";

  const proseClass = fontSize === "small" ? "prose-sm" :
    fontSize === "large" ? "prose-lg" :
      fontSize === "xlarge" ? "prose-xl" :
        "prose-lg"; // default size

  return (
    <div className={cn("mb-8", basisClass)} data-testid="content-block-preview">
      {block.content && (
        <div
          className={cn(
            "prose dark:prose-invert max-w-none",
            proseClass,
            columnClass
          )}
          dangerouslySetInnerHTML={{ __html: block.content }}
        />
      )}
    </div>
  );
}

function CheckpointPreview({ checkpoint }: { checkpoint: CheckpointFormData }) {
  return (
    <Card className="border-primary/20 bg-primary/5 shadow-sm overflow-hidden mb-8">
      <CardHeader className="pb-3 flex-row items-center gap-3 space-y-0">
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
          <HelpCircle className="h-5 w-5" />
        </div>
        <div>
          <CardTitle className="text-lg">Checkpoint Question</CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">Test your understanding to continue</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-lg font-medium leading-tight">
          {checkpoint.question || "Untitled Question"}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {checkpoint.options.map((option, idx) => (
            <div
              key={idx}
              className={cn(
                "p-4 rounded-xl border-2 text-left transition-all flex items-center gap-3",
                idx === checkpoint.correctOptionIndex
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-muted bg-white/50"
              )}
            >
              <div className={cn(
                "h-6 w-6 rounded-full border-2 flex items-center justify-center text-xs font-bold",
                idx === checkpoint.correctOptionIndex
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-muted-foreground/30"
              )}>
                {String.fromCharCode(65 + idx)}
              </div>
              <span className="flex-1 font-medium">{option || `Option ${idx + 1}`}</span>
            </div>
          ))}
        </div>
        {checkpoint.explanation && (
          <div className="mt-4 p-4 rounded-lg bg-primary/5 border border-primary/10 text-sm italic">
            <strong>Explanation:</strong> {checkpoint.explanation}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StepPreview({ step, index }: { step: StepFormData; index: number }) {
  return (
    <Card className="border-0 shadow-none bg-transparent">
      <CardHeader className="px-0">
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="outline" className="text-primary border-primary/30 uppercase tracking-wider text-[10px] py-0 px-2">
            Step {index + 1}
          </Badge>
        </div>
        <CardTitle className="text-4xl font-black tracking-tight mb-2">
          {step.title || "Untitled Step"}
        </CardTitle>
        <Separator className="h-1 bg-primary/10 w-24 rounded-full" />
      </CardHeader>
      <CardContent className="px-0 pt-6">
        <div className="flex flex-wrap gap-x-6 gap-y-8">
          {step.items.map((item) => (
            item.itemType === "content" ? (
              <ContentBlockPreview key={item.tempId} block={item as ContentBlockFormData} />
            ) : (
              <CheckpointPreview key={item.tempId} checkpoint={item as CheckpointFormData} />
            )
          ))}
        </div>
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

  const handleItemChange = (itemIndex: number, data: Partial<ContentBlockFormData | CheckpointFormData>) => {
    const newItems = [...step.items];
    newItems[itemIndex] = { ...newItems[itemIndex], ...data } as any;
    onChange({ ...step, items: newItems });
  };

  const handleAddContentBlock = () => {
    onChange({
      ...step,
      items: [
        ...step.items,
        { tempId: generateTempId(), itemType: "content", blockType: "text", content: "", imageUrl: "" },
      ],
    });
  };

  const handleRemoveItem = (itemIndex: number) => {
    onChange({
      ...step,
      items: step.items.filter((_, i) => i !== itemIndex),
    });
  };

  const handleAddCheckpoint = () => {
    onChange({
      ...step,
      items: [
        ...step.items,
        {
          tempId: generateTempId(),
          itemType: "checkpoint",
          question: "",
          options: ["", "", "", ""],
          correctOptionIndex: 0,
          explanation: "",
          isEvaluated: true,
        },
      ],
    });
  };

  const handleItemDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = step.items.findIndex((b) => b.tempId === active.id);
      const newIndex = step.items.findIndex((b) => b.tempId === over.id);
      onChange({
        ...step,
        items: arrayMove(step.items, oldIndex, newIndex),
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
                {step.items.filter(i => i.itemType === 'checkpoint').length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    <HelpCircle className="h-3 w-3 mr-1" />
                    {step.items.filter(i => i.itemType === 'checkpoint').length} Question{step.items.filter(i => i.itemType === 'checkpoint').length > 1 ? 's' : ''}
                  </Badge>
                )}
                <Badge variant="outline" className="text-xs">
                  {step.items.filter(i => i.itemType === 'content').length} block{step.items.filter(i => i.itemType === 'content').length !== 1 ? "s" : ""}
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
                  <Label className="text-base font-medium">Step Content</Label>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAddContentBlock}
                      data-testid={`button-add-content-${index}`}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Content
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAddCheckpoint}
                      data-testid={`button-add-checkpoint-${index}`}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Question
                    </Button>
                  </div>
                </div>

                {step.items.length > 0 ? (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleItemDragEnd}
                  >
                    <SortableContext
                      items={step.items.map((i) => i.tempId)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-3">
                        {step.items.map((item, itemIndex) => {
                          if (item.itemType === 'content') {
                            return (
                              <SortableContentBlock
                                key={item.tempId}
                                block={item as ContentBlockFormData}
                                stepIndex={index}
                                blockIndex={itemIndex}
                                onChange={(data) => handleItemChange(itemIndex, data)}
                                onRemove={() => handleRemoveItem(itemIndex)}
                              />
                            );
                          } else {
                            return (
                              <SortableCheckpoint
                                key={item.tempId}
                                checkpoint={item as CheckpointFormData}
                                stepIndex={index}
                                itemIndex={itemIndex}
                                checkpointRequired={step.checkpointRequired}
                                onChange={(data) => handleItemChange(itemIndex, data)}
                                onRequiredChange={(required) => onChange({ ...step, checkpointRequired: required })}
                                onRemove={() => handleRemoveItem(itemIndex)}
                              />
                            );
                          }
                        })}
                      </div>
                    </SortableContext>
                  </DndContext>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4 border rounded-md border-dashed">
                    No items yet. Add text, images, or checkpoint questions.
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
        existingSteps.map((s) => {
          // Convert legacy checkpoint or new checkpoints array
          // Unify contentBlocks and checkpoints into items array
          let items: (ContentBlockFormData | CheckpointFormData)[] = [];

          if (s.contentBlocks) {
            items.push(...s.contentBlocks.map((b) => ({
              id: b.id,
              tempId: `existing-block-${b.id}`,
              itemType: "content" as const,
              order: b.order,
              blockType: b.blockType,
              content: b.content || "",
              imageUrl: b.imageUrl || "",
              metadata: b.metadata || {},
            })));
          }

          if (s.checkpoints && Array.isArray(s.checkpoints)) {
            items.push(...s.checkpoints.map((cp) => ({
              id: cp.id,
              tempId: `existing-cp-${cp.id}`,
              itemType: "checkpoint" as const,
              order: cp.order,
              question: cp.question,
              options: cp.options || ["", "", "", ""],
              correctOptionIndex: cp.correctOptionIndex,
              explanation: cp.explanation || "",
              isEvaluated: cp.isEvaluated !== undefined ? cp.isEvaluated : true,
            })));
          } else if (s.checkpoint) {
            items.push({
              id: s.checkpoint.id,
              tempId: `existing-cp-${s.checkpoint.id}`,
              itemType: "checkpoint" as const,
              order: s.checkpoint.order,
              question: s.checkpoint.question,
              options: s.checkpoint.options || ["", "", "", ""],
              correctOptionIndex: s.checkpoint.correctOptionIndex,
              explanation: s.checkpoint.explanation || "",
              isEvaluated: s.checkpoint.isEvaluated !== undefined ? s.checkpoint.isEvaluated : true,
            });
          }

          // Sort by order
          items.sort((a, b) => (a.order || 0) - (b.order || 0));

          return {
            id: s.id,
            tempId: `existing-${s.id}`,
            title: s.title,
            items,
            checkpointRequired: s.checkpointRequired !== undefined ? s.checkpointRequired : true,
          };
        })
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
          data.map((s) => {
            // Convert legacy checkpoint or new checkpoints array
            // Unify contentBlocks and checkpoints into items array
            let items: (ContentBlockFormData | CheckpointFormData)[] = [];

            if (s.contentBlocks) {
              items.push(...s.contentBlocks.map((b) => ({
                id: b.id,
                tempId: `existing-block-${b.id}`,
                itemType: "content" as const,
                order: b.order,
                blockType: b.blockType,
                content: b.content || "",
                imageUrl: b.imageUrl || "",
                metadata: b.metadata || {},
              })));
            }

            if (s.checkpoints && Array.isArray(s.checkpoints)) {
              items.push(...s.checkpoints.map((cp) => ({
                id: cp.id,
                tempId: `existing-cp-${cp.id}`,
                itemType: "checkpoint" as const,
                order: cp.order,
                question: cp.question,
                options: cp.options || ["", "", "", ""],
                correctOptionIndex: cp.correctOptionIndex,
                explanation: cp.explanation || "",
                isEvaluated: cp.isEvaluated !== undefined ? cp.isEvaluated : true,
              })));
            } else if (s.checkpoint) {
              items.push({
                id: s.checkpoint.id,
                tempId: `existing-cp-${s.checkpoint.id}`,
                itemType: "checkpoint" as const,
                order: s.checkpoint.order,
                question: s.checkpoint.question,
                options: s.checkpoint.options || ["", "", "", ""],
                correctOptionIndex: s.checkpoint.correctOptionIndex,
                explanation: s.checkpoint.explanation || "",
                isEvaluated: s.checkpoint.isEvaluated !== undefined ? s.checkpoint.isEvaluated : true,
              });
            }

            // Sort by order
            items.sort((a, b) => (a.order || 0) - (b.order || 0));

            return {
              id: s.id,
              tempId: `existing-${s.id}`,
              title: s.title,
              items,
              checkpointRequired: s.checkpointRequired !== undefined ? s.checkpointRequired : true,
            };
          })
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
      items: [],
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
