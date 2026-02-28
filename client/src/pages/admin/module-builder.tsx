import { useState, useEffect, useRef, useCallback, Fragment } from "react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
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
  Layers,
  PanelLeftClose,
  Table2,
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Minus,
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
  items: (ContentBlockFormData | CheckpointFormData | TableBlockFormData)[];
  checkpointRequired: boolean;
}

interface ContentBlockFormData {
  id?: number;
  tempId: string;
  itemType: "content";
  order?: number;

  // Content slots
  content: string;
  imageUrl: string;

  // Layout
  arrangement: "stacked" | "side-by-side";
  mediaWidth: "25%" | "33%" | "50%" | "75%" | "100%";
  mediaPosition: "left" | "right";
  blockWidth: "1/3" | "1/2" | "2/3" | "full";

  // Text formatting
  fontSize: "small" | "normal" | "large" | "xlarge";
  columns: 1 | 2 | 3;

  // Legacy compat — used for DB serialization
  blockType?: string;
  metadata?: Record<string, any>;
}

interface TableCellData {
  content: string;
  imageUrl: string;
  bgColor: string;
  textColor: string;
  isBold?: boolean;
  isItalic?: boolean;
  textAlign?: "left" | "center" | "right";
}

interface TableBlockFormData {
  id?: number;
  tempId: string;
  itemType: "table";
  order?: number;
  blockType?: string;
  metadata?: Record<string, any>;
  rows: number;
  cols: number;
  headerRow: boolean;
  cells: Record<string, TableCellData>;
  colWidths: string[];
  rowHeights: string[];
  borderColor: string;
  rowBorderColors: string[];
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

// Maps a DB content block (with blockType + metadata bag) to the new flat form data
function mapDbBlockToFormData(b: any, tempIdPrefix: string): ContentBlockFormData | TableBlockFormData {
  const meta = b.metadata || {};

  // Table blocks
  if (b.blockType === "table" && meta.tableData) {
    const td = meta.tableData;
    return {
      id: b.id,
      tempId: `${tempIdPrefix}-${b.id}`,
      itemType: "table",
      order: b.order,
      rows: td.rows || 2,
      cols: td.cols || 2,
      headerRow: td.headerRow ?? false,
      cells: td.cells || {},
      colWidths: td.colWidths || Array(td.cols || 2).fill("auto"),
      rowHeights: td.rowHeights || Array(td.rows || 2).fill("auto"),
      borderColor: td.borderColor || "#e5e7eb",
      rowBorderColors: td.rowBorderColors || [],
      blockType: b.blockType,
      metadata: meta,
    };
  }

  // Determine arrangement from old blockType
  let arrangement: ContentBlockFormData["arrangement"] = "stacked";
  if (b.blockType === "split") {
    arrangement = "side-by-side";
  }

  // Determine media position from old reverseLayout / splitRatio
  let mediaPosition: ContentBlockFormData["mediaPosition"] = "left";
  if (meta.reverseLayout === false || !meta.reverseLayout) {
    mediaPosition = "right";
  }
  if (meta.reverseLayout === true) {
    mediaPosition = "left";
  }

  // Map old imageWidth to mediaWidth
  let mediaWidth: ContentBlockFormData["mediaWidth"] = meta.imageWidth || "100%";
  if (!(["25%", "33%", "50%", "75%", "100%"] as string[]).includes(mediaWidth)) {
    mediaWidth = "100%";
  }

  // Map old width to blockWidth
  let blockWidth: ContentBlockFormData["blockWidth"] = meta.width || "full";
  if (!(["1/3", "1/2", "2/3", "full"] as string[]).includes(blockWidth)) {
    blockWidth = "full";
  }

  return {
    id: b.id,
    tempId: `${tempIdPrefix}-${b.id}`,
    itemType: "content",
    order: b.order,
    content: b.content || "",
    imageUrl: b.imageUrl || "",
    arrangement,
    mediaWidth: mediaWidth as ContentBlockFormData["mediaWidth"],
    mediaPosition,
    blockWidth: blockWidth as ContentBlockFormData["blockWidth"],
    fontSize: meta.fontSize || "normal",
    columns: meta.columns || 1,
    blockType: b.blockType,
    metadata: meta,
  };
}

// Converts form data back to the DB-compatible format for saving
function formDataToDbBlock(block: ContentBlockFormData | TableBlockFormData) {
  // Table blocks
  if (block.itemType === "table") {
    const tb = block as TableBlockFormData;
    return {
      id: tb.id,
      itemType: tb.itemType,
      blockType: "table",
      content: null,
      imageUrl: null,
      metadata: {
        tableData: {
          rows: tb.rows,
          cols: tb.cols,
          headerRow: tb.headerRow,
          cells: tb.cells,
          colWidths: tb.colWidths,
          rowHeights: tb.rowHeights,
          borderColor: tb.borderColor,
          rowBorderColors: tb.rowBorderColors,
        },
      },
    };
  }

  const cb = block as ContentBlockFormData;
  // Determine blockType from content
  let blockType = "text";
  const hasImage = !!cb.imageUrl;
  const hasContent = !!cb.content;
  if (hasImage && hasContent && cb.arrangement === "side-by-side") {
    blockType = "split";
  } else if (hasImage && !hasContent) {
    blockType = "image";
  }

  return {
    id: cb.id,
    itemType: cb.itemType,
    blockType,
    content: cb.content,
    imageUrl: cb.imageUrl,
    metadata: {
      arrangement: cb.arrangement,
      mediaPosition: cb.mediaPosition,
      imageWidth: cb.mediaWidth,
      width: cb.blockWidth,
      fontSize: cb.fontSize !== "normal" ? cb.fontSize : undefined,
      columns: cb.columns !== 1 ? cb.columns : undefined,
      splitRatio: cb.arrangement === "side-by-side" ? "50-50" : undefined,
      reverseLayout: cb.arrangement === "side-by-side" ? cb.mediaPosition === "left" : undefined,
    },
  };
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

  const hasImage = !!block.imageUrl;
  const hasContent = !!block.content;
  const showArrangement = hasImage && hasContent;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn("group", isDragging && "z-50")}
    >
      <Card className="border" data-testid={`content-block-${stepIndex}-${blockIndex}`}>
        <CardContent className="pt-4 space-y-3">
          {/* Header with Drag Handle and Delete */}
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
                <Layers className="h-3 w-3 mr-1" />
                Content Block
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

          {/* Arrangement selector — only when both text + media are present */}
          {showArrangement && (
            <div className="flex items-center gap-4 bg-muted/30 p-2 rounded-md">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">Layout:</span>
                <div className="flex gap-1">
                  <Button
                    variant={block.arrangement === "stacked" ? "secondary" : "outline"}
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => onChange({ arrangement: "stacked" })}
                  >
                    <Layers className="h-3 w-3 mr-1" /> Stacked
                  </Button>
                  <Button
                    variant={block.arrangement === "side-by-side" ? "secondary" : "outline"}
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => onChange({ arrangement: "side-by-side" })}
                  >
                    <PanelLeftClose className="h-3 w-3 mr-1" /> Side by Side
                  </Button>
                </div>
              </div>
              {block.arrangement === "side-by-side" && (
                <>
                  <Separator orientation="vertical" className="h-4" />
                  <Button
                    variant={block.mediaPosition === "left" ? "secondary" : "outline"}
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => onChange({ mediaPosition: block.mediaPosition === "left" ? "right" : "left" })}
                  >
                    <ArrowRightLeft className="h-3 w-3 mr-1" />
                    {block.mediaPosition === "left" ? "Image Left" : "Image Right"}
                  </Button>
                </>
              )}
            </div>
          )}

          {/* Content Inputs — always show both sections */}
          <div className={cn(
            "grid gap-4",
            showArrangement && block.arrangement === "side-by-side" ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"
          )}>
            {/* Text Content */}
            <div className={cn(
              "space-y-2",
              showArrangement && block.arrangement === "side-by-side" && block.mediaPosition === "left" && "order-2"
            )}>
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-1">
                  <FileText className="h-3 w-3" /> Content
                </Label>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <Type className="h-3 w-3 text-muted-foreground" />
                    <select
                      className="text-xs border rounded px-1 py-0.5 bg-background h-6"
                      value={block.fontSize}
                      onChange={(e) => onChange({ fontSize: e.target.value as any })}
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
                      value={block.columns}
                      onChange={(e) => onChange({ columns: parseInt(e.target.value) as any })}
                    >
                      <option value={1}>1 Col</option>
                      <option value={2}>2 Cols</option>
                      <option value={3}>3 Cols</option>
                    </select>
                  </div>
                </div>
              </div>
              <RichTextEditor
                content={block.content}
                onChange={(html) => onChange({ content: html })}
                placeholder="Start typing your content..."
                className={cn(
                  "min-h-[150px]",
                  block.columns === 2 && "prose-columns-2",
                  block.columns === 3 && "prose-columns-3"
                )}
              />
            </div>

            {/* Image / Media */}
            <div className={cn(
              "space-y-2",
              showArrangement && block.arrangement === "side-by-side" && block.mediaPosition === "left" && "order-1"
            )}>
              <Label className="flex items-center gap-1">
                <Image className="h-3 w-3" /> Image
              </Label>
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
                      style={{ width: block.mediaWidth }}
                      className="h-auto object-cover"
                    />
                  </div>
                )}
              </div>

              {/* Image Width Control */}
              {block.imageUrl && (
                <div className="flex items-center gap-2 mt-2">
                  <Label className="text-xs text-muted-foreground whitespace-nowrap">Image Width:</Label>
                  <div className="flex gap-1">
                    {(["25%", "33%", "50%", "75%", "100%"] as const).map((width) => (
                      <Button
                        key={width}
                        type="button"
                        variant={block.mediaWidth === width ? "secondary" : "outline"}
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() => onChange({ mediaWidth: width })}
                      >
                        {width}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Block Width Control */}
          <div className="flex items-center gap-2 pt-1 border-t">
            <Label className="text-xs text-muted-foreground whitespace-nowrap">Block Width:</Label>
            <div className="flex gap-1">
              {(["full", "2/3", "1/2", "1/3"] as const).map((w) => (
                <Button
                  key={w}
                  type="button"
                  variant={block.blockWidth === w ? "secondary" : "outline"}
                  size="sm"
                  className="h-6 px-2 text-xs"
                  onClick={() => onChange({ blockWidth: w })}
                >
                  {w === "full" ? "Full" : w}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// CheckpointEditor moved to top of file

// ─── Table Block Editor ────────────────────────────────────────────────────────
// ─── Table Block Editor ────────────────────────────────────────────────────────
function SortableTableBlock({
  block,
  stepIndex,
  blockIndex,
  onChange,
  onRemove,
}: {
  block: TableBlockFormData;
  stepIndex: number;
  blockIndex: number;
  onChange: (data: Partial<TableBlockFormData>) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.tempId });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  const { toast } = useToast();
  const tableRef = useRef<HTMLTableElement>(null);

  // ── Drag-to-resize state ──
  const [resizingCol, setResizingCol] = useState<number | null>(null);
  const [resizingRow, setResizingRow] = useState<number | null>(null);
  const resizeStartRef = useRef<{ x: number; y: number; size: number }>({ x: 0, y: 0, size: 0 });

  const startColResize = (colIndex: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const table = tableRef.current;
    if (!table) return;
    const cols = table.querySelectorAll(`td:nth-child(${colIndex + 1}), th:nth-child(${colIndex + 1})`);
    const firstCell = cols[0] as HTMLElement;
    resizeStartRef.current = { x: e.clientX, y: 0, size: firstCell?.offsetWidth || 100 };
    setResizingCol(colIndex);
  };

  const startRowResize = (rowIndex: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const table = tableRef.current;
    if (!table) return;
    const rows = table.querySelectorAll("tbody > tr.table-data-row");
    const row = rows[rowIndex] as HTMLElement;
    resizeStartRef.current = { x: 0, y: e.clientY, size: row?.offsetHeight || 50 };
    setResizingRow(rowIndex);
  };

  useEffect(() => {
    if (resizingCol === null && resizingRow === null) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (resizingCol !== null) {
        const delta = e.clientX - resizeStartRef.current.x;
        const newWidth = Math.max(60, resizeStartRef.current.size + delta);
        const newColWidths = [...block.colWidths];
        newColWidths[resizingCol] = `${newWidth}px`;
        onChange({ colWidths: newColWidths });
      }
      if (resizingRow !== null) {
        const delta = e.clientY - resizeStartRef.current.y;
        const newHeight = Math.max(30, resizeStartRef.current.size + delta);
        const newRowHeights = [...block.rowHeights];
        newRowHeights[resizingRow] = `${newHeight}px`;
        onChange({ rowHeights: newRowHeights });
      }
    };

    const handleMouseUp = () => {
      setResizingCol(null);
      setResizingRow(null);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [resizingCol, resizingRow, block.colWidths, block.rowHeights, onChange]);

  // ── Cell helpers ──
  const getCellData = (r: number, c: number): TableCellData => {
    return block.cells[`${r}-${c}`] || { content: "", imageUrl: "", bgColor: "", textColor: "" };
  };

  // ── Multi-cell selection state ──
  const [selectionStart, setSelectionStart] = useState<{ r: number; c: number } | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<{ r: number; c: number } | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);

  const handleCellMouseDown = (r: number, c: number) => {
    setIsSelecting(true);
    setSelectionStart({ r, c });
    setSelectionEnd({ r, c });
  };

  const handleCellMouseEnter = (r: number, c: number) => {
    if (isSelecting) {
      setSelectionEnd({ r, c });
    }
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => setIsSelecting(false);
    document.addEventListener("mouseup", handleGlobalMouseUp);
    return () => document.removeEventListener("mouseup", handleGlobalMouseUp);
  }, []);

  const isCellSelected = (r: number, c: number) => {
    if (!selectionStart || !selectionEnd) return false;
    const minR = Math.min(selectionStart.r, selectionEnd.r);
    const maxR = Math.max(selectionStart.r, selectionEnd.r);
    const minC = Math.min(selectionStart.c, selectionEnd.c);
    const maxC = Math.max(selectionStart.c, selectionEnd.c);
    return r >= minR && r <= maxR && c >= minC && c <= maxC;
  };

  const getSelectedCells = () => {
    const cells: { r: number; c: number }[] = [];
    if (!selectionStart || !selectionEnd) return cells;
    const minR = Math.min(selectionStart.r, selectionEnd.r);
    const maxR = Math.max(selectionStart.r, selectionEnd.r);
    const minC = Math.min(selectionStart.c, selectionEnd.c);
    const maxC = Math.max(selectionStart.c, selectionEnd.c);
    for (let r = minR; r <= maxR; r++) {
      for (let c = minC; c <= maxC; c++) {
        cells.push({ r, c });
      }
    }
    return cells;
  };

  const hasSelection = selectionStart !== null && selectionEnd !== null;
  const selectedCells = getSelectedCells();
  // For single-cell states like current color / image
  const primarySel = hasSelection ? getCellData(selectionStart!.r, selectionStart!.c) : null;

  // Single cell update
  const updateCell = (r: number, c: number, updates: Partial<TableCellData>) => {
    const key = `${r}-${c}`;
    const existing = getCellData(r, c);
    onChange({
      cells: { ...block.cells, [key]: { ...existing, ...updates } },
    });
  };

  // Multi cell update
  const updateSelectedCells = (updates: Partial<TableCellData> | ((curr: TableCellData) => Partial<TableCellData>)) => {
    if (selectedCells.length === 0) return;
    const newCells = { ...block.cells };
    selectedCells.forEach(({ r, c }) => {
      const key = `${r}-${c}`;
      const existing = getCellData(r, c);
      const cellUpdates = typeof updates === "function" ? updates(existing) : updates;
      newCells[key] = { ...existing, ...cellUpdates };
    });
    onChange({ cells: newCells });
  };

  // Image upload
  const handleImageUpload = async (file: File) => {
    if (!primarySel || !selectionStart) return;
    const formData = new FormData();
    formData.append("image", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData, credentials: "include" });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      updateCell(selectionStart.r, selectionStart.c, { imageUrl: data.url });
      toast({ title: "Success", description: "Image uploaded" });
    } catch {
      toast({ title: "Error", description: "Failed to upload image", variant: "destructive" });
    }
  };

  // ── Row/Col management ──
  const addRow = () => {
    onChange({
      rows: block.rows + 1,
      rowHeights: [...block.rowHeights, "auto"],
      rowBorderColors: [...block.rowBorderColors, ""],
    });
  };

  const removeRow = (rowIdx: number) => {
    if (block.rows <= 1) return;
    const newCells = { ...block.cells };
    for (let c = 0; c < block.cols; c++) {
      delete newCells[`${rowIdx}-${c}`];
    }
    const shiftedCells: Record<string, TableCellData> = {};
    for (const [key, val] of Object.entries(newCells)) {
      const [r, c] = key.split("-").map(Number);
      if (r > rowIdx) {
        shiftedCells[`${r - 1}-${c}`] = val;
      } else {
        shiftedCells[key] = val;
      }
    }
    const newRowHeights = block.rowHeights.filter((_, i) => i !== rowIdx);
    const newRowBorderColors = block.rowBorderColors.filter((_, i) => i !== rowIdx);
    onChange({ rows: block.rows - 1, cells: shiftedCells, rowHeights: newRowHeights, rowBorderColors: newRowBorderColors });
  };

  const addCol = () => {
    onChange({
      cols: block.cols + 1,
      colWidths: [...block.colWidths, "auto"],
    });
  };

  const removeCol = (colIdx: number) => {
    if (block.cols <= 1) return;
    const newCells: Record<string, TableCellData> = {};
    for (const [key, val] of Object.entries(block.cells)) {
      const [r, c] = key.split("-").map(Number);
      if (c === colIdx) continue;
      if (c > colIdx) {
        newCells[`${r}-${c - 1}`] = val;
      } else {
        newCells[key] = val;
      }
    }
    const newColWidths = block.colWidths.filter((_, i) => i !== colIdx);
    onChange({ cols: block.cols - 1, cells: newCells, colWidths: newColWidths });
  };

  const updateRowBorderColor = (rowIdx: number, color: string) => {
    const newColors = [...block.rowBorderColors];
    while (newColors.length <= rowIdx) newColors.push("");
    newColors[rowIdx] = color;
    onChange({ rowBorderColors: newColors });
  };

  return (
    <div ref={setNodeRef} style={style} className={cn("group", isDragging && "z-50")}>
      <Card className="border" data-testid={`table-block-${stepIndex}-${blockIndex}`}>
        <CardContent className="pt-4 space-y-3">
          {/* Top toolbar with table controls AND text formatting */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2 flex-wrap bg-muted/30 p-2 rounded-md">
              <div className="flex items-center gap-2">
                <button
                  {...attributes}
                  {...listeners}
                  className="cursor-grab active:cursor-grabbing p-1 hover-elevate rounded"
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                </button>
                <Badge variant="outline" className="text-xs shrink-0">
                  <Table2 className="h-3 w-3 mr-1" />
                  Table ({block.rows}×{block.cols})
                </Badge>
              </div>

              {/* Text formatting toolbar (visible when cells selected) */}
              <div className={cn("flex items-center gap-1 transition-opacity", !hasSelection && "opacity-30 pointer-events-none")}>
                {hasSelection && (
                  <span className="text-xs font-medium text-muted-foreground mr-1">
                    {selectedCells.length} {selectedCells.length === 1 ? 'cell' : 'cells'}
                  </span>
                )}
                <Separator orientation="vertical" className="h-4 mx-1" />
                <button
                  className="p-1 rounded hover:bg-muted transition-colors"
                  onClick={() => updateSelectedCells((curr) => ({ isBold: !curr.isBold }))}
                  title="Bold"
                >
                  <Bold className="h-4 w-4" />
                </button>
                <button
                  className="p-1 rounded hover:bg-muted transition-colors"
                  onClick={() => updateSelectedCells((curr) => ({ isItalic: !curr.isItalic }))}
                  title="Italic"
                >
                  <Italic className="h-4 w-4" />
                </button>
                <Separator orientation="vertical" className="h-3 mx-1" />
                <button
                  className={cn("p-1 rounded hover:bg-muted transition-colors", primarySel?.textAlign === "left" && "bg-muted")}
                  onClick={() => updateSelectedCells({ textAlign: "left" })}
                  title="Align left"
                >
                  <AlignLeft className="h-4 w-4" />
                </button>
                <button
                  className={cn("p-1 rounded hover:bg-muted transition-colors", primarySel?.textAlign === "center" && "bg-muted")}
                  onClick={() => updateSelectedCells({ textAlign: "center" })}
                  title="Align center"
                >
                  <AlignCenter className="h-4 w-4" />
                </button>
                <button
                  className={cn("p-1 rounded hover:bg-muted transition-colors", primarySel?.textAlign === "right" && "bg-muted")}
                  onClick={() => updateSelectedCells({ textAlign: "right" })}
                  title="Align right"
                >
                  <AlignRight className="h-4 w-4" />
                </button>
                <Separator orientation="vertical" className="h-4 mx-1" />
                <div className="flex items-center gap-1">
                  <Label className="text-xs text-muted-foreground">BG:</Label>
                  <input
                    type="color"
                    value={primarySel?.bgColor || "#ffffff"}
                    onChange={(e) => updateSelectedCells({ bgColor: e.target.value })}
                    className="w-5 h-5 rounded cursor-pointer border-0"
                  />
                  {primarySel?.bgColor && (
                    <button
                      className="text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => updateSelectedCells({ bgColor: "" })}
                    >✕</button>
                  )}
                </div>
                <div className="flex items-center gap-1 ml-1">
                  <Label className="text-xs text-muted-foreground">Text:</Label>
                  <input
                    type="color"
                    value={primarySel?.textColor || "#000000"}
                    onChange={(e) => updateSelectedCells({ textColor: e.target.value })}
                    className="w-5 h-5 rounded cursor-pointer border-0"
                  />
                  {primarySel?.textColor && (
                    <button
                      className="text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => updateSelectedCells({ textColor: "" })}
                    >✕</button>
                  )}
                </div>
                <Separator orientation="vertical" className="h-4 mx-1" />
                <div className="flex items-center gap-1">
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) await handleImageUpload(file);
                      }}
                      disabled={selectedCells.length > 1}
                    />
                    <Badge variant="outline" className={cn("text-xs cursor-pointer hover:bg-muted", selectedCells.length > 1 && "opacity-50 cursor-not-allowed")}>
                      <Upload className="h-3 w-3 mr-1" />
                      {primarySel?.imageUrl ? "Replace" : "Image"}
                    </Badge>
                  </label>
                  {primarySel?.imageUrl && selectedCells.length === 1 && (
                    <button
                      className="text-xs text-destructive hover:text-destructive/80"
                      onClick={() => updateSelectedCells({ imageUrl: "" })}
                    >✕</button>
                  )}
                </div>
              </div>
            </div>

            {/* Layout controls */}
            <div className="flex items-center justify-end gap-1 flex-wrap">
              <Button variant="outline" size="sm" className="h-6 px-2 text-xs" onClick={addRow}>
                + Row
              </Button>
              <Button variant="outline" size="sm" className="h-6 px-2 text-xs" onClick={addCol}>
                + Col
              </Button>
              <Separator orientation="vertical" className="h-4 mx-1" />
              <div className="flex items-center gap-1.5">
                <Switch
                  id={`header-${block.tempId}`}
                  checked={block.headerRow}
                  onCheckedChange={(checked) => onChange({ headerRow: checked })}
                  className="scale-75"
                />
                <Label htmlFor={`header-${block.tempId}`} className="text-xs text-muted-foreground cursor-pointer">
                  Header
                </Label>
              </div>
              <Separator orientation="vertical" className="h-4 mx-1" />
              <div className="flex items-center gap-1">
                <Label className="text-xs text-muted-foreground">Border:</Label>
                <input
                  type="color"
                  value={block.borderColor || "#e5e7eb"}
                  onChange={(e) => onChange({ borderColor: e.target.value })}
                  className="w-5 h-5 rounded cursor-pointer border-0"
                  title="Default border color"
                />
              </div>
              <Separator orientation="vertical" className="h-4 mx-1" />
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onRemove}>
                <Trash2 className="h-3 w-3 text-destructive" />
              </Button>
            </div>
          </div>

          {/* Table Editor */}
          <div className="overflow-x-auto border rounded-md table-editor-wrapper select-none">
            <table
              ref={tableRef}
              className="module-table w-full"
              style={{ borderColor: block.borderColor || "#e5e7eb" }}
            >
              <colgroup>
                {Array.from({ length: block.cols }).map((_, c) => (
                  <col key={c} style={{ width: block.colWidths[c] || "auto" }} />
                ))}
              </colgroup>
              <tbody>
                {Array.from({ length: block.rows }).map((_, r) => {
                  const isHeader = block.headerRow && r === 0;
                  return (
                    <tr
                      key={r}
                      className="table-data-row relative"
                      style={{
                        borderBottom: `2px solid ${block.rowBorderColors[r] || block.borderColor || "#e5e7eb"}`,
                        height: block.rowHeights[r] || "auto",
                      }}
                    >
                      {Array.from({ length: block.cols }).map((_, c) => {
                        const cellData = getCellData(r, c);
                        const isSelected = isCellSelected(r, c);
                        return (
                          <td
                            key={c}
                            className={cn(
                              "relative p-2 align-top transition-all",
                              isSelected && "ring-2 ring-primary ring-inset bg-primary/5",
                              isHeader && "bg-muted/40"
                            )}
                            style={{
                              backgroundColor: cellData.bgColor || (isHeader ? undefined : "transparent"),
                              color: cellData.textColor || "inherit",
                              borderRight: c < block.cols - 1 ? `2px solid ${block.borderColor || "#e5e7eb"}` : "none",
                            }}
                            onMouseDown={() => handleCellMouseDown(r, c)}
                            onMouseEnter={() => handleCellMouseEnter(r, c)}
                          >
                            {/* Cell content */}
                            {cellData.imageUrl && (
                              <img
                                src={cellData.imageUrl}
                                alt=""
                                className="max-w-full h-auto max-h-24 object-contain mb-1 pointer-events-none"
                              />
                            )}
                            <div
                              contentEditable
                              suppressContentEditableWarning
                              className={cn(
                                "min-h-[1.5rem] text-sm outline-none focus:bg-background/80 rounded px-1 cursor-text",
                                cellData.isBold && "font-bold",
                                cellData.isItalic && "italic",
                                isHeader && !cellData.isBold && "font-bold"
                              )}
                              style={{ textAlign: cellData.textAlign || "left" }}
                              dangerouslySetInnerHTML={{ __html: cellData.content || "" }}
                              onBlur={(e) => updateCell(r, c, { content: e.currentTarget.innerHTML })}
                              onMouseDown={(e) => {
                                // Double click selects word via native behavior, but regular click selects cell
                                e.stopPropagation();
                                if (!isSelected) {
                                  handleCellMouseDown(r, c);
                                  setIsSelecting(false); // Single click focus, not drag
                                }
                              }}
                            />

                            {/* Column resize handle (right edge) */}
                            {c < block.cols - 1 && (
                              <div
                                className={cn(
                                  "table-col-resize-handle",
                                  resizingCol === c && "active"
                                )}
                                onMouseDown={(e) => startColResize(c, e)}
                              />
                            )}

                            {/* Row resize handle (bottom edge) */}
                            {r < block.rows - 1 && (
                              <div
                                className={cn(
                                  "table-row-resize-handle",
                                  resizingRow === r && "active"
                                )}
                                onMouseDown={(e) => startRowResize(r, e)}
                              />
                            )}
                          </td>
                        );
                      })}
                      {/* Row controls: border color + remove */}
                      <td className="p-1 border-0 w-8 align-middle bg-background z-10">
                        <div className="flex flex-col items-center gap-0.5">
                          <input
                            type="color"
                            value={block.rowBorderColors[r] || block.borderColor || "#e5e7eb"}
                            onChange={(e) => updateRowBorderColor(r, e.target.value)}
                            className="w-4 h-4 rounded cursor-pointer border-0"
                            title="Row border color"
                          />
                          {block.rows > 1 && (
                            <button
                              onClick={() => removeRow(r)}
                              className="text-destructive/60 hover:text-destructive"
                              title="Remove row"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {/* Column remove buttons */}
              <tfoot>
                <tr>
                  {Array.from({ length: block.cols }).map((_, c) => (
                    <td key={c} className="border-0 p-0 text-center bg-background">
                      {block.cols > 1 && (
                        <button
                          onClick={() => removeCol(c)}
                          className="text-destructive/60 hover:text-destructive p-0.5"
                          title="Remove column"
                        >
                          <Trash2 className="h-3 w-3 mx-auto" />
                        </button>
                      )}
                    </td>
                  ))}
                  <td className="border-0" />
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}




// Preview components that match user-facing styling
function ContentBlockPreview({ block }: { block: ContentBlockFormData }) {
  const basisClass = block.blockWidth === "1/3" ? "md:basis-[calc(33.333%-1.5rem)]" :
    block.blockWidth === "1/2" ? "md:basis-[calc(50%-1.5rem)]" :
      block.blockWidth === "2/3" ? "md:basis-[calc(66.666%-1.5rem)]" : "basis-full";

  const hasImage = !!block.imageUrl;
  const hasContent = !!block.content;

  const proseClass = block.fontSize === "small" ? "prose-sm" :
    block.fontSize === "large" ? "prose-lg" :
      block.fontSize === "xlarge" ? "prose-xl" : "prose-base";

  // Side-by-side arrangement: text and image in columns
  if (hasImage && hasContent && block.arrangement === "side-by-side") {
    // Smart grid proportions based on mediaWidth
    let gridCols = "grid-cols-1 md:grid-cols-2";
    if (block.mediaWidth === "25%") gridCols = "grid-cols-1 md:grid-cols-[1fr_3fr]";
    else if (block.mediaWidth === "33%") gridCols = "grid-cols-1 md:grid-cols-[1fr_2fr]";
    else if (block.mediaWidth === "75%") gridCols = "grid-cols-1 md:grid-cols-[3fr_1fr]";

    const imageOnLeft = block.mediaPosition === "left";

    // In side-by-side, suppress multi-column text
    return (
      <div className={cn("grid gap-8 items-start mb-8", gridCols, basisClass)} data-testid="content-block-preview">
        <div className={cn("prose dark:prose-invert max-w-none", proseClass, imageOnLeft && "md:order-2")}>
          <div dangerouslySetInnerHTML={{ __html: block.content }} />
        </div>
        <div className={cn("rounded-lg overflow-hidden", imageOnLeft && "md:order-1")}>
          <img
            src={block.imageUrl}
            alt="Step content"
            className="w-full h-auto object-cover rounded-lg"
          />
        </div>
      </div>
    );
  }

  // Stacked arrangement or single-content blocks
  const columnClass = block.columns === 3 ? "prose-columns-3" :
    block.columns === 2 ? "prose-columns-2" : "";

  return (
    <div className={cn("mb-8", basisClass)} data-testid="content-block-preview">
      {/* Image on top for stacked */}
      {hasImage && (
        <div className="rounded-lg overflow-hidden mb-4">
          <img
            src={block.imageUrl}
            alt="Step content"
            style={{ width: block.mediaWidth }}
            className={cn("h-auto object-contain mx-auto rounded-lg", !hasContent && "max-h-[600px]")}
          />
        </div>
      )}
      {hasContent && (
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

// Table preview (used in admin preview tab)
function TableBlockPreview({ block }: { block: TableBlockFormData }) {
  return (
    <div className="mb-8 basis-full" data-testid="table-block-preview">
      <div className="overflow-x-auto">
        <table className="module-table w-full" style={{ borderColor: block.borderColor || "#e5e7eb" }}>
          <colgroup>
            {Array.from({ length: block.cols }).map((_, c) => (
              <col key={c} style={{ width: block.colWidths[c] || "auto" }} />
            ))}
          </colgroup>
          <tbody>
            {Array.from({ length: block.rows }).map((_, r) => {
              const borderColor = block.rowBorderColors[r] || block.borderColor || "#e5e7eb";
              return (
                <tr key={r} style={{ borderBottom: `2px solid ${borderColor}`, height: block.rowHeights[r] || "auto" }}>
                  {Array.from({ length: block.cols }).map((_, c) => {
                    const cell = block.cells[`${r}-${c}`] || {};
                    const isHeader = block.headerRow && r === 0;
                    return (
                      <td
                        key={c}
                        className={cn(
                          "p-4 align-middle",
                          isHeader && "bg-muted/40",
                          cell.isBold && "font-bold",
                          cell.isItalic && "italic",
                          isHeader && !cell.isBold && "font-bold"
                        )}
                        style={{
                          backgroundColor: cell.bgColor || (isHeader ? undefined : "transparent"),
                          color: cell.textColor || "inherit",
                          borderRight: c < block.cols - 1 ? `2px solid ${block.borderColor || "#e5e7eb"}` : "none",
                          textAlign: (cell.textAlign as any) || "left",
                        }}
                      >
                        {cell.imageUrl && (
                          <img src={cell.imageUrl} alt="" className="max-w-full h-auto max-h-24 object-contain mb-2" />
                        )}
                        {cell.content && <div dangerouslySetInnerHTML={{ __html: cell.content }} />}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
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
            ) : item.itemType === "table" ? (
              <TableBlockPreview key={item.tempId} block={item as TableBlockFormData} />
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

  const handleItemChange = (itemIndex: number, data: Partial<ContentBlockFormData | CheckpointFormData | TableBlockFormData>) => {
    const newItems = [...step.items];
    newItems[itemIndex] = { ...newItems[itemIndex], ...data } as any;
    onChange({ ...step, items: newItems });
  };

  const handleAddContentBlock = () => {
    onChange({
      ...step,
      items: [
        ...step.items,
        {
          tempId: generateTempId(),
          itemType: "content" as const,
          content: "",
          imageUrl: "",
          arrangement: "stacked" as const,
          mediaWidth: "100%" as const,
          mediaPosition: "left" as const,
          blockWidth: "full" as const,
          fontSize: "normal" as const,
          columns: 1 as const,
        },
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

  // Table creation dialog state
  const [showTableDialog, setShowTableDialog] = useState(false);
  const [newTableRows, setNewTableRows] = useState(3);
  const [newTableCols, setNewTableCols] = useState(2);

  const handleCreateTable = () => {
    const rows = Math.max(1, Math.min(20, newTableRows));
    const cols = Math.max(1, Math.min(10, newTableCols));
    onChange({
      ...step,
      items: [
        ...step.items,
        {
          tempId: generateTempId(),
          itemType: "table" as const,
          rows,
          cols,
          headerRow: false,
          cells: {},
          colWidths: Array(cols).fill("auto"),
          rowHeights: Array(rows).fill("auto"),
          borderColor: "#e5e7eb",
          rowBorderColors: [],
        },
      ],
    });
    setShowTableDialog(false);
    setNewTableRows(3);
    setNewTableCols(2);
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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowTableDialog(true)}
                      data-testid={`button-add-table-${index}`}
                    >
                      <Table2 className="h-4 w-4 mr-1" />
                      Add Table
                    </Button>
                  </div>
                </div>

                {/* Table dimension picker dialog */}
                <Dialog open={showTableDialog} onOpenChange={setShowTableDialog}>
                  <DialogContent className="max-w-sm">
                    <DialogHeader>
                      <DialogTitle>Create Table</DialogTitle>
                      <DialogDescription>
                        Choose the number of rows and columns for your table.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-4 py-4">
                      <div className="space-y-2">
                        <Label>Rows</Label>
                        <Input
                          type="number"
                          min={1}
                          max={20}
                          value={newTableRows}
                          onChange={(e) => setNewTableRows(Number(e.target.value) || 1)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Columns</Label>
                        <Input
                          type="number"
                          min={1}
                          max={10}
                          value={newTableCols}
                          onChange={(e) => setNewTableCols(Number(e.target.value) || 1)}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Table2 className="h-4 w-4" />
                      Preview: {newTableRows} × {newTableCols} table
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowTableDialog(false)}>Cancel</Button>
                      <Button onClick={handleCreateTable}>Create Table</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

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
                          } else if (item.itemType === 'table') {
                            return (
                              <SortableTableBlock
                                key={item.tempId}
                                block={item as TableBlockFormData}
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
          let items: (ContentBlockFormData | CheckpointFormData | TableBlockFormData)[] = [];

          if (s.contentBlocks) {
            items.push(...s.contentBlocks.map((b: any) => mapDbBlockToFormData(b, "existing-block")));
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
      // Serialize content blocks to DB format before sending
      const serializedSteps = stepsToSave.map(step => ({
        ...step,
        items: step.items.map(item =>
          item.itemType === "content" ? formDataToDbBlock(item as ContentBlockFormData) :
            item.itemType === "table" ? formDataToDbBlock(item as TableBlockFormData) : item
        ),
      }));
      return await apiRequest<StepWithDetails[]>("PUT", `/api/admin/modules/${id}/steps`, { steps: serializedSteps });
    },
    onSuccess: (data) => {
      if (data && Array.isArray(data)) {
        setSteps(
          data.map((s) => {
            // Convert legacy checkpoint or new checkpoints array
            // Unify contentBlocks and checkpoints into items array
            let items: (ContentBlockFormData | CheckpointFormData | TableBlockFormData)[] = [];

            if (s.contentBlocks) {
              items.push(...s.contentBlocks.map((b: any) => mapDbBlockToFormData(b, "existing-block")));
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
