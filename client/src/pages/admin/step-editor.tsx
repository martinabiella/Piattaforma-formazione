import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useParams, useLocation } from "wouter";
import { AdminLayout } from "@/components/admin-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  HelpCircle,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Module, ModuleStep, StepContentBlock, StepCheckpoint } from "@shared/schema";

interface StepWithDetails extends ModuleStep {
  contentBlocks: StepContentBlock[];
  checkpoint: StepCheckpoint | null;
}

interface StepFormData {
  id?: number;
  title: string;
  contentBlocks: ContentBlockFormData[];
  checkpoint: CheckpointFormData | null;
}

interface ContentBlockFormData {
  id?: number;
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

function CheckpointEditor({
  checkpoint,
  onChange,
  onRemove,
}: {
  checkpoint: CheckpointFormData;
  onChange: (data: CheckpointFormData) => void;
  onRemove: () => void;
}) {
  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...checkpoint.options];
    newOptions[index] = value;
    onChange({ ...checkpoint, options: newOptions });
  };

  return (
    <Card className="border-2 border-primary/30 bg-primary/5" data-testid="checkpoint-editor">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">Checkpoint Question (Required)</span>
          </div>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={onRemove}
            data-testid="button-remove-checkpoint"
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Question</Label>
          <Textarea
            value={checkpoint.question}
            onChange={(e) => onChange({ ...checkpoint, question: e.target.value })}
            placeholder="Enter the checkpoint question"
            rows={2}
            data-testid="input-checkpoint-question"
          />
        </div>
        
        <div className="space-y-2">
          <Label>Answer Options (click to mark correct)</Label>
          {checkpoint.options.map((option, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onChange({ ...checkpoint, correctOptionIndex: idx })}
                className={cn(
                  "w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-medium shrink-0 transition-colors",
                  checkpoint.correctOptionIndex === idx
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : "border-muted-foreground/30 hover:border-primary"
                )}
                data-testid={`button-correct-option-${idx}`}
              >
                {String.fromCharCode(65 + idx)}
              </button>
              <Input
                value={option}
                onChange={(e) => handleOptionChange(idx, e.target.value)}
                placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                data-testid={`input-option-${idx}`}
              />
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <Label>Explanation (shown after answering)</Label>
          <Textarea
            value={checkpoint.explanation}
            onChange={(e) => onChange({ ...checkpoint, explanation: e.target.value })}
            placeholder="Explain the correct answer"
            rows={2}
            data-testid="input-checkpoint-explanation"
          />
        </div>
      </CardContent>
    </Card>
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
        { blockType: "text", content: "", imageUrl: "" },
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

  return (
    <Card className="border-2" data-testid={`step-editor-${index}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={onToggle}
            className="flex items-center gap-2 hover-elevate rounded p-1 -ml-1"
            data-testid={`button-toggle-step-${index}`}
          >
            <GripVertical className="h-5 w-5 text-muted-foreground/50 cursor-grab" />
            <Badge variant="outline">Step {index + 1}</Badge>
            <span className="font-medium">{step.title || "Untitled Step"}</span>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
          <div className="flex items-center gap-2">
            {step.checkpoint && (
              <Badge variant="secondary" className="text-xs">Has Checkpoint</Badge>
            )}
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
      
      {isExpanded && (
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
              <Label>Content Blocks</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddContentBlock}
                data-testid={`button-add-content-block-${index}`}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Content
              </Button>
            </div>

            {step.contentBlocks.map((block, blockIndex) => (
              <Card key={blockIndex} className="border" data-testid={`content-block-${index}-${blockIndex}`}>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs">
                      Content Block {blockIndex + 1}
                    </Badge>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleRemoveContentBlock(blockIndex)}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label>Content (HTML)</Label>
                    <Textarea
                      value={block.content}
                      onChange={(e) => handleContentBlockChange(blockIndex, { content: e.target.value })}
                      placeholder="Enter content (HTML supported)"
                      rows={4}
                      className="font-mono text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Image URL (optional)</Label>
                    <Input
                      value={block.imageUrl}
                      onChange={(e) => handleContentBlockChange(blockIndex, { imageUrl: e.target.value })}
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>
                </CardContent>
              </Card>
            ))}

            {step.contentBlocks.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No content blocks yet. Add some content to this step.
              </p>
            )}
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Checkpoint Question</Label>
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
                onChange={(data) => onChange({ ...step, checkpoint: data })}
                onRemove={handleRemoveCheckpoint}
              />
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No checkpoint question. Users need to answer a checkpoint to unlock the next step.
              </p>
            )}
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
  });

  const { data: stepsData, isLoading } = useQuery<StepWithDetails[]>({
    queryKey: ["/api/admin/modules", id, "steps"],
    enabled: !!id,
  });

  useEffect(() => {
    if (stepsData) {
      setSteps(stepsData.map(s => ({
        id: s.id,
        title: s.title,
        contentBlocks: (s.contentBlocks || []).map(b => ({
          id: b.id,
          blockType: b.blockType,
          content: b.content || "",
          imageUrl: b.imageUrl || "",
        })),
        checkpoint: s.checkpoint ? {
          question: s.checkpoint.question,
          options: s.checkpoint.options || ["", "", "", ""],
          correctOptionIndex: s.checkpoint.correctOptionIndex,
          explanation: s.checkpoint.explanation || "",
        } : null,
      })));
      setHasChanges(false);
    }
  }, [stepsData]);

  const saveSteps = useMutation({
    mutationFn: async (stepsToSave: StepFormData[]) => {
      const res = await apiRequest("PUT", `/api/admin/modules/${id}/steps`, { steps: stepsToSave }) as Response;
      if (!res.ok) throw new Error("Failed to save steps");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/modules", id, "steps"] });
      toast({ title: "Success", description: "Steps saved successfully" });
      setHasChanges(false);
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
      contentBlocks: [],
      checkpoint: null,
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
                Create learning steps with checkpoint questions
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
          <div className="fixed bottom-4 right-4 bg-background border shadow-lg rounded-lg p-4 flex items-center gap-4">
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
