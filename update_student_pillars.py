import re

with open("client/src/pages/module-steps.tsx", "r") as f:
    content = f.read()

# 1. Update StepBlockRenderer
block_renderer_replacement = r"""function StepBlockRenderer({ block }: { block: any }) { 
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
      <div className={cn("grid gap-8 items-start mb-8", gridCols, basisClass)} data-testid={`content-block-${block.id}`}>
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
              <span className="text-sm">No image</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (block.blockType === "image") {
    return (
      <div className={cn("mb-8", basisClass)} data-testid={`content-block-${block.id}`}>
        {block.imageUrl && (
          <div className="rounded-lg overflow-hidden border bg-muted">
            <img
              src={block.imageUrl}
              alt="Step content"
              style={{ width: block.metadata?.imageWidth || "100%" }}
              className="h-auto max-h-[600px] object-contain mx-auto"
            />
          </div>
        )}
      </div>
    );
  }

  // Default to text (or legacy blocks)
  const columns = block.metadata?.columns || 1;
  const fontSize = block.metadata?.fontSize || "normal";

  const columnClass = columns === 3 ? "prose-columns-3" :
    columns === 2 ? "prose-columns-2" : "";

  const proseClass = fontSize === "small" ? "prose-sm" :
    fontSize === "large" ? "prose-lg" :
      fontSize === "xlarge" ? "prose-xl" :
        "prose-lg"; // default size

  return (
    <div className={cn("mb-8", basisClass)} data-testid={`content-block-${block.id}`}>
      {/* Legacy support: if it has image but no specific type, show it top like before */}
      {(!block.blockType || block.blockType === 'text') && block.imageUrl && (
        <div className="mb-6 rounded-lg overflow-hidden">
          <img
            src={block.imageUrl}
            alt="Step content"
            className="w-full h-auto max-h-96 object-cover"
          />
        </div>
      )}

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
}"""

content = re.sub(r"function StepBlockRenderer.*?\}\n\}", block_renderer_replacement, content, flags=re.DOTALL)

# 2. Update CardContent and mixedItems container
content = content.replace('<CardContent className="space-y-6">', '<CardContent className="flex flex-wrap gap-x-6 gap-y-8">')
content = content.replace('<div className="space-y-8">', '<div className="flex flex-wrap gap-x-6 gap-y-8 w-full">')

# 3. Add basis-full to Checkpoint wrapper
content = content.replace('className={isLegacySectionStart ? "pt-6 border-t" : ""}', 'className={cn("basis-full", isLegacySectionStart ? "pt-6 border-t" : "")}')

with open("client/src/pages/module-steps.tsx", "w") as f:
    f.write(content)
print("done")
