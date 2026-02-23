import re

with open("client/src/pages/admin/module-builder.tsx", "r") as f:
    content = f.read()

# 1. Interfaces
content = content.replace("""interface StepFormData {
  id?: number;
  tempId: string;
  title: string;
  contentBlocks: ContentBlockFormData[];
  checkpoints: CheckpointFormData[];
  checkpointRequired: boolean;
}""", """interface StepFormData {
  id?: number;
  tempId: string;
  title: string;
  items: (ContentBlockFormData | CheckpointFormData)[];
  checkpointRequired: boolean;
}""")

content = content.replace("""interface ContentBlockFormData {
  id?: number;
  tempId: string;
  blockType: string;""", """interface ContentBlockFormData {
  id?: number;
  tempId: string;
  itemType: "content";
  order?: number;
  blockType: string;""")

content = content.replace("""interface CheckpointFormData {
  question: string;
  options: string[];""", """interface CheckpointFormData {
  id?: number;
  tempId: string;
  itemType: "checkpoint";
  order?: number;
  question: string;
  options: string[];""")

# 2. Add SortableCheckpoint component just above CheckpointEditor
sortable_checkpoint = """
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

"""
content = content.replace("function CheckpointEditor({", sortable_checkpoint + "function CheckpointEditor({")

# 3. StepPreview
step_preview_old = """      <CardContent className="space-y-6">
        {step.contentBlocks.length === 0 && step.checkpoints.length === 0 && (
          <p className="text-muted-foreground italic">No content added to this step yet.</p>
        )}

        {step.contentBlocks.map((block, blockIndex) => (
          <ContentBlockPreview key={block.tempId || blockIndex} block={block} />
        ))}

        {step.checkpoints.map((checkpoint, cpIndex) => (
          <div key={cpIndex} className="mt-8 pt-6 border-t">
            <CheckpointPreview checkpoint={checkpoint} stepIndex={index} />
          </div>
        ))}
      </CardContent>"""

step_preview_new = """      <CardContent className="space-y-6">
        {step.items.length === 0 && (
          <p className="text-muted-foreground italic">No content added to this step yet.</p>
        )}

        {step.items.map((item, itemIndex) => {
          if (item.itemType === 'content') {
            return <ContentBlockPreview key={item.tempId || itemIndex} block={item as ContentBlockFormData} />;
          } else {
            return (
              <div key={item.tempId || itemIndex} className="mt-8 pt-6 border-t">
                <CheckpointPreview checkpoint={item as CheckpointFormData} stepIndex={index} />
              </div>
            );
          }
        })}
      </CardContent>"""
content = content.replace(step_preview_old, step_preview_new)

# 4. SortableStep body
content = content.replace("""  const handleContentBlockChange = (blockIndex: number, data: Partial<ContentBlockFormData>) => {
    const newBlocks = [...step.contentBlocks];
    newBlocks[blockIndex] = { ...newBlocks[blockIndex], ...data };
    onChange({ ...step, contentBlocks: newBlocks });
  };""", """  const handleItemChange = (itemIndex: number, data: Partial<ContentBlockFormData | CheckpointFormData>) => {
    const newItems = [...step.items];
    newItems[itemIndex] = { ...newItems[itemIndex], ...data } as any;
    onChange({ ...step, items: newItems });
  };""")

content = content.replace("""  const handleAddContentBlock = () => {
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
      checkpoints: [
        ...step.checkpoints,
        {
          question: "",
          options: ["", "", "", ""],
          correctOptionIndex: 0,
          explanation: "",
          isEvaluated: true,
        },
      ],
    });
  };

  const handleRemoveCheckpoint = (checkpointIndex: number) => {
    onChange({
      ...step,
      checkpoints: step.checkpoints.filter((_, i) => i !== checkpointIndex),
    });
  };

  const handleCheckpointChange = (checkpointIndex: number, data: CheckpointFormData) => {
    const newCheckpoints = [...step.checkpoints];
    newCheckpoints[checkpointIndex] = data;
    onChange({ ...step, checkpoints: newCheckpoints });
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
  };""", """  const handleAddContentBlock = () => {
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
  };""")

# 5. SortableStep render header counts
header_old = """              <div className="flex items-center gap-2">
                {step.checkpoints.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    <HelpCircle className="h-3 w-3 mr-1" />
                    {step.checkpoints.length} Question{step.checkpoints.length > 1 ? 's' : ''}
                  </Badge>
                )}
                <Badge variant="outline" className="text-xs">
                  {step.contentBlocks.length} block{step.contentBlocks.length !== 1 ? "s" : ""}
                </Badge>"""
header_new = """              <div className="flex items-center gap-2">
                {step.items.filter(i => i.itemType === 'checkpoint').length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    <HelpCircle className="h-3 w-3 mr-1" />
                    {step.items.filter(i => i.itemType === 'checkpoint').length} Question{step.items.filter(i => i.itemType === 'checkpoint').length > 1 ? 's' : ''}
                  </Badge>
                )}
                <Badge variant="outline" className="text-xs">
                  {step.items.filter(i => i.itemType === 'content').length} block{step.items.filter(i => i.itemType === 'content').length !== 1 ? "s" : ""}
                </Badge>"""
content = content.replace(header_old, header_new)

# 6. SortableStep content blocks & checkpoints -> unified DndContext list
step_content_old = """              <div className="space-y-4">
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
                  <Label className="text-base font-medium">Checkpoint Questions ({step.checkpoints.length})</Label>
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

                {step.checkpoints.length > 0 ? (
                  <div className="space-y-4">
                    {step.checkpoints.map((checkpoint, cpIndex) => (
                      <CheckpointEditor
                        key={cpIndex}
                        checkpoint={checkpoint}
                        stepIndex={index}
                        checkpointIndex={cpIndex}
                        checkpointRequired={step.checkpointRequired}
                        onChange={(data) => handleCheckpointChange(cpIndex, data)}
                        onRequiredChange={(required) => onChange({ ...step, checkpointRequired: required })}
                        onRemove={() => handleRemoveCheckpoint(cpIndex)}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4 border rounded-md border-dashed">
                    No questions. Add questions to gate access to the next step.
                  </p>
                )}
              </div>"""

step_content_new = """              <div className="space-y-4">
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
              </div>"""
content = content.replace(step_content_old, step_content_new)

# 7. useEffect for init data mapping
init_mapping_old = """          let checkpointsArray: CheckpointFormData[] = [];
          if (s.checkpoints && Array.isArray(s.checkpoints)) {
            checkpointsArray = s.checkpoints.map((cp) => ({
              question: cp.question,
              options: cp.options || ["", "", "", ""],
              correctOptionIndex: cp.correctOptionIndex,
              explanation: cp.explanation || "",
              isEvaluated: cp.isEvaluated !== undefined ? cp.isEvaluated : true,
            }));
          } else if (s.checkpoint) {
            // Legacy single checkpoint
            checkpointsArray = [{
              question: s.checkpoint.question,
              options: s.checkpoint.options || ["", "", "", ""],
              correctOptionIndex: s.checkpoint.correctOptionIndex,
              explanation: s.checkpoint.explanation || "",
              isEvaluated: s.checkpoint.isEvaluated !== undefined ? s.checkpoint.isEvaluated : true,
            }];
          }

          return {
            id: s.id,
            tempId: `existing-${s.id}`,
            title: s.title,
            contentBlocks: (s.contentBlocks || []).map((b) => ({
              id: b.id,
              tempId: `existing-block-${b.id}`,
              blockType: b.blockType,
              content: b.content || "",
              imageUrl: b.imageUrl || "",
              metadata: b.metadata || {},
            })),
            checkpoints: checkpointsArray,
            checkpointRequired: s.checkpointRequired !== undefined ? s.checkpointRequired : true,
          };"""

init_mapping_new = """          // Unify contentBlocks and checkpoints into items array
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
          };"""
content = content.replace(init_mapping_old, init_mapping_new)

# 8. saveSteps mapping
save_mapping_old = """            let checkpointsArray: CheckpointFormData[] = [];
            if (s.checkpoints && Array.isArray(s.checkpoints)) {
              checkpointsArray = s.checkpoints.map((cp: any) => ({
                question: cp.question,
                options: cp.options || ["", "", "", ""],
                correctOptionIndex: cp.correctOptionIndex,
                explanation: cp.explanation || "",
                isEvaluated: cp.isEvaluated !== undefined ? cp.isEvaluated : true,
              }));
            } else if (s.checkpoint) {
              checkpointsArray = [{
                question: s.checkpoint.question,
                options: s.checkpoint.options || ["", "", "", ""],
                correctOptionIndex: s.checkpoint.correctOptionIndex,
                explanation: s.checkpoint.explanation || "",
                isEvaluated: s.checkpoint.isEvaluated !== undefined ? s.checkpoint.isEvaluated : true,
              }];
            }

            return {
              id: s.id,
              tempId: `existing-${s.id}`,
              title: s.title,
              contentBlocks: (s.contentBlocks || []).map((b: any) => ({
                id: b.id,
                tempId: `existing-block-${b.id}`,
                blockType: b.blockType,
                content: b.content || "",
                imageUrl: b.imageUrl || "",
                metadata: b.metadata || {},
              })),
              checkpoints: checkpointsArray,
              checkpointRequired: s.checkpointRequired ?? true,
            };"""
save_mapping_new = init_mapping_new  # Re-use the same init mapping payload
content = content.replace(save_mapping_old, save_mapping_new)


# 9. handleAddStep
add_step_old = """  const handleAddStep = () => {
    const newStep: StepFormData = {
      tempId: generateTempId(),
      title: `Step ${steps.length + 1}`,
      contentBlocks: [],
      checkpoints: [],
      checkpointRequired: true,
    };"""
add_step_new = """  const handleAddStep = () => {
    const newStep: StepFormData = {
      tempId: generateTempId(),
      title: `Step ${steps.length + 1}`,
      items: [],
      checkpointRequired: true,
    };"""
content = content.replace(add_step_old, add_step_new)

with open("client/src/pages/admin/module-builder.tsx", "w") as f:
    f.write(content)
print("done")
