import re

with open("client/src/pages/admin/module-builder.tsx", "r") as f:
    content = f.read()

# 1. Add width selector to SortableContentBlock
width_selector = r"""                  )}
                </div>
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
                </div>"""

# Insert after the Type/Columns selectors in SortableContentBlock
content = content.replace("                      </div>\n                    </div>\n                  )}", width_selector)

# 2. Refactor ContentBlockPreview to match StepBlockRenderer
block_renderer_alignment = r"""function ContentBlockPreview({ block }: { block: ContentBlockFormData }) {
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
}"""

# Use a regex to find the old ContentBlockPreview function and replace it
content = re.sub(r"function ContentBlockPreview.*?\}\s+\}", block_renderer_alignment, content, flags=re.DOTALL)

# 3. Update StepPreview to use flex flex-wrap
content = content.replace('<CardContent className="space-y-6">', '<CardContent className="flex flex-wrap gap-x-6 gap-y-8">')

with open("client/src/pages/admin/module-builder.tsx", "w") as f:
    f.write(content)
print("done")
