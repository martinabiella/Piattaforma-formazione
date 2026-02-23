import { useEditor, EditorContent, NodeViewWrapper, NodeViewProps, ReactNodeViewRenderer } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Color from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Bold, List, Palette, Undo, Redo, Link as LinkIcon, Check, X, ImageIcon, Upload, Loader2, Trash2, AlignLeft, AlignCenter, AlignRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

// ─── Custom Image NodeView ──────────────────────────────────────────────────
// This renders each inline image with:
//  • Drag-to-resize handle (bottom-right corner)
//  • Alignment controls (float left / center / float right)
//  • Width preset buttons + delete

function ImageNodeView({ node, updateAttributes, selected, deleteNode }: NodeViewProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isResizing, setIsResizing] = useState(false);

    const width = node.attrs.width || "100%";
    const alignment = node.attrs.alignment || "center";

    // ─ Resize via mouse drag on the handle ─
    const handleResizeStart = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsResizing(true);

        const startX = e.clientX;
        const el = containerRef.current;
        if (!el) return;

        const startWidth = el.offsetWidth;
        // The parent is the ProseMirror content area — use it as the 100% reference
        const parentWidth = el.closest(".tiptap")?.clientWidth || el.parentElement?.clientWidth || 600;

        const onMouseMove = (ev: MouseEvent) => {
            const diff = ev.clientX - startX;
            const newWidth = Math.max(60, startWidth + diff);
            const pct = Math.min(100, Math.max(10, Math.round((newWidth / parentWidth) * 100)));
            updateAttributes({ width: `${pct}%` });
        };

        const onMouseUp = () => {
            setIsResizing(false);
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);
        };

        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
    }, [updateAttributes]);

    // Wrapper gets float or centering based on alignment
    const wrapperStyle: React.CSSProperties = {
        width,
        ...(alignment === "left" ? { float: "left", marginRight: "1rem", marginBottom: "0.5rem" } :
            alignment === "right" ? { float: "right", marginLeft: "1rem", marginBottom: "0.5rem" } :
                { margin: "0.75rem auto", display: "block" }),
    };

    return (
        <NodeViewWrapper
            as="div"
            className={cn(
                "inline-image-node",
                selected && "is-selected",
                isResizing && "is-resizing",
            )}
            style={wrapperStyle}
        >
            <div ref={containerRef} className="image-container" style={{ position: "relative", width: "100%" }}>
                <img
                    src={node.attrs.src}
                    alt={node.attrs.alt || ""}
                    draggable={false}
                    style={{ width: "100%", height: "auto", display: "block", borderRadius: "0.5rem" }}
                />

                {/* Resize handle — bottom-right corner */}
                {selected && (
                    <div
                        className="resize-handle"
                        onMouseDown={handleResizeStart}
                        style={{
                            position: "absolute",
                            bottom: 0,
                            right: 0,
                            width: 16,
                            height: 16,
                            cursor: "nwse-resize",
                            background: "hsl(var(--primary))",
                            borderRadius: "0.25rem 0 0.5rem 0",
                            opacity: 0.8,
                        }}
                    />
                )}

                {/* Controls bar — visible when selected */}
                {selected && !isResizing && (
                    <div
                        className="image-controls"
                        style={{
                            position: "absolute",
                            top: -40,
                            left: "50%",
                            transform: "translateX(-50%)",
                            display: "flex",
                            alignItems: "center",
                            gap: 2,
                            background: "hsl(var(--background))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "0.5rem",
                            padding: "2px 4px",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
                            zIndex: 10,
                            whiteSpace: "nowrap",
                        }}
                        contentEditable={false}
                    >
                        {/* Alignment */}
                        <Button
                            type="button"
                            variant={alignment === "left" ? "default" : "ghost"}
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => updateAttributes({ alignment: "left" })}
                            title="Float left"
                        >
                            <AlignLeft className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                            type="button"
                            variant={alignment === "center" ? "default" : "ghost"}
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => updateAttributes({ alignment: "center" })}
                            title="Center"
                        >
                            <AlignCenter className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                            type="button"
                            variant={alignment === "right" ? "default" : "ghost"}
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => updateAttributes({ alignment: "right" })}
                            title="Float right"
                        >
                            <AlignRight className="h-3.5 w-3.5" />
                        </Button>

                        <div style={{ width: 1, height: 16, background: "hsl(var(--border))", margin: "0 2px" }} />

                        {/* Width presets */}
                        {(["25%", "50%", "75%", "100%"] as const).map((w) => (
                            <Button
                                key={w}
                                type="button"
                                variant={width === w ? "default" : "ghost"}
                                size="sm"
                                className="h-6 px-1.5 text-[10px]"
                                onClick={() => updateAttributes({ width: w })}
                            >
                                {w}
                            </Button>
                        ))}

                        <div style={{ width: 1, height: 16, background: "hsl(var(--border))", margin: "0 2px" }} />

                        {/* Delete */}
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                            onClick={() => deleteNode()}
                            title="Delete image"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                )}
            </div>
        </NodeViewWrapper>
    );
}

// ─── Custom Image Extension ─────────────────────────────────────────────────
// Extends TipTap's Image with width + alignment attributes and our custom NodeView

const ResizableImage = Image.extend({
    addAttributes() {
        return {
            ...this.parent?.(),
            width: {
                default: "100%",
                parseHTML: (element: HTMLElement) => element.style.width || element.getAttribute("width") || "100%",
                renderHTML: (attributes: Record<string, any>) => {
                    return { style: `width: ${attributes.width || "100%"}` };
                },
            },
            alignment: {
                default: "center",
                parseHTML: (element: HTMLElement) => element.getAttribute("data-alignment") || "center",
                renderHTML: (attributes: Record<string, any>) => {
                    return { "data-alignment": attributes.alignment || "center" };
                },
            },
        };
    },
    addNodeView() {
        return ReactNodeViewRenderer(ImageNodeView);
    },
});


// ─── Preset Colors ──────────────────────────────────────────────────────────

const PRESET_COLORS = [
    { label: "Black", value: "#000000" },
    { label: "Dark Gray", value: "#4B5563" },
    { label: "Red", value: "#DC2626" },
    { label: "Orange", value: "#EA580C" },
    { label: "Green", value: "#16A34A" },
    { label: "Blue", value: "#2563EB" },
    { label: "Purple", value: "#9333EA" },
    { label: "Pink", value: "#DB2777" },
];

interface RichTextEditorProps {
    content: string;
    onChange: (html: string) => void;
    placeholder?: string;
    className?: string;
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function RichTextEditor({
    content,
    onChange,
    placeholder = "Start typing...",
    className,
}: RichTextEditorProps) {
    const [linkUrl, setLinkUrl] = useState("");
    const [isLinkPopoverOpen, setIsLinkPopoverOpen] = useState(false);
    const [imageUrl, setImageUrl] = useState("");
    const [isImagePopoverOpen, setIsImagePopoverOpen] = useState(false);
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const imageFileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                bulletList: {
                    keepMarks: true,
                    keepAttributes: false,
                },
            }),
            TextStyle,
            Color,
            Link.configure({
                openOnClick: false,
                HTMLAttributes: {
                    class: "text-primary underline cursor-pointer",
                },
            }),
            ResizableImage.configure({
                inline: false,
                allowBase64: false,
            }),
        ],
        content,
        editorProps: {
            attributes: {
                class:
                    cn("prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[100px] px-3 py-2", className),
            },
        },
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
    });

    // Sync external content changes (e.g., when switching blocks)
    useEffect(() => {
        if (editor && content !== editor.getHTML()) {
            editor.commands.setContent(content);
        }
    }, [content, editor]);

    // Sync className changes (e.g., when column count changes)
    useEffect(() => {
        if (editor) {
            editor.setOptions({
                editorProps: {
                    attributes: {
                        class: cn("prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[100px] px-3 py-2", className),
                    },
                },
            });
        }
    }, [className, editor]);

    const insertImage = (url: string) => {
        if (editor && url) {
            editor.chain().focus().setImage({ src: url, width: "100%" as any }).run();
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("image", file);

        setIsUploadingImage(true);
        try {
            const res = await fetch("/api/upload", {
                method: "POST",
                body: formData,
                credentials: "include",
            });

            if (!res.ok) throw new Error("Upload failed");

            const data = await res.json();
            insertImage(data.url);
            setIsImagePopoverOpen(false);
            toast({ title: "Success", description: "Image inserted" });
        } catch (error) {
            console.error(error);
            toast({
                title: "Error",
                description: "Failed to upload image",
                variant: "destructive",
            });
        } finally {
            setIsUploadingImage(false);
            if (imageFileInputRef.current) {
                imageFileInputRef.current.value = "";
            }
        }
    };

    if (!editor) return null;

    return (
        <div className="rounded-md border border-input bg-background">
            {/* Toolbar */}
            <div className="flex items-center gap-1 border-b px-2 py-1.5 flex-wrap">
                {/* Bold */}
                <Button
                    type="button"
                    variant={editor.isActive("bold") ? "secondary" : "ghost"}
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    title="Bold"
                >
                    <Bold className="h-3.5 w-3.5" />
                </Button>

                {/* Bullet List */}
                <Button
                    type="button"
                    variant={editor.isActive("bulletList") ? "secondary" : "ghost"}
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    title="Bullet List"
                >
                    <List className="h-3.5 w-3.5" />
                </Button>

                <div className="h-4 w-px bg-border mx-1" />

                {/* Headings */}
                <Button
                    type="button"
                    variant={editor.isActive("heading", { level: 1 }) ? "secondary" : "ghost"}
                    size="sm"
                    className="h-7 w-7 p-0 font-bold"
                    onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                    title="Heading 1"
                >
                    H1
                </Button>
                <Button
                    type="button"
                    variant={editor.isActive("heading", { level: 2 }) ? "secondary" : "ghost"}
                    size="sm"
                    className="h-7 w-7 p-0 font-bold"
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    title="Heading 2"
                >
                    H2
                </Button>
                <Button
                    type="button"
                    variant={editor.isActive("heading", { level: 3 }) ? "secondary" : "ghost"}
                    size="sm"
                    className="h-7 w-7 p-0 font-bold"
                    onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                    title="Heading 3"
                >
                    H3
                </Button>

                {/* Link */}
                <Popover open={isLinkPopoverOpen} onOpenChange={setIsLinkPopoverOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            type="button"
                            variant={editor.isActive("link") ? "secondary" : "ghost"}
                            size="sm"
                            className="h-7 w-7 p-0"
                            title="Link"
                            onClick={() => {
                                const previousUrl = editor.getAttributes("link").href;
                                setLinkUrl(previousUrl || "");
                            }}
                        >
                            <LinkIcon className="h-3.5 w-3.5" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-3" align="start">
                        <div className="flex gap-2">
                            <Input
                                value={linkUrl}
                                onChange={(e) => setLinkUrl(e.target.value)}
                                placeholder="https://example.com"
                                className="h-8"
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        if (linkUrl) {
                                            editor
                                                .chain()
                                                .focus()
                                                .extendMarkRange("link")
                                                .setLink({ href: linkUrl })
                                                .run();
                                        } else {
                                            editor.chain().focus().unsetLink().run();
                                        }
                                        setIsLinkPopoverOpen(false);
                                    }
                                }}
                            />
                            <Button
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => {
                                    if (linkUrl) {
                                        editor
                                            .chain()
                                            .focus()
                                            .extendMarkRange("link")
                                            .setLink({ href: linkUrl })
                                            .run();
                                    } else {
                                        editor.chain().focus().unsetLink().run();
                                    }
                                    setIsLinkPopoverOpen(false);
                                }}
                            >
                                <Check className="h-4 w-4" />
                            </Button>
                            {editor.isActive("link") && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                    onClick={() => {
                                        editor.chain().focus().unsetLink().run();
                                        setIsLinkPopoverOpen(false);
                                    }}
                                    title="Remove Link"
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    </PopoverContent>
                </Popover>

                {/* Insert Image */}
                <Popover open={isImagePopoverOpen} onOpenChange={setIsImagePopoverOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            title="Insert Image"
                            onClick={() => setImageUrl("")}
                        >
                            <ImageIcon className="h-3.5 w-3.5" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-3" align="start">
                        <div className="space-y-2">
                            <div className="flex gap-2">
                                <Input
                                    value={imageUrl}
                                    onChange={(e) => setImageUrl(e.target.value)}
                                    placeholder="https://example.com/image.jpg"
                                    className="h-8"
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && imageUrl) {
                                            insertImage(imageUrl);
                                            setIsImagePopoverOpen(false);
                                        }
                                    }}
                                />
                                <Button
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    disabled={!imageUrl}
                                    onClick={() => {
                                        insertImage(imageUrl);
                                        setIsImagePopoverOpen(false);
                                    }}
                                >
                                    <Check className="h-4 w-4" />
                                </Button>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="h-px flex-1 bg-border" />
                                <span className="text-xs text-muted-foreground">or</span>
                                <div className="h-px flex-1 bg-border" />
                            </div>
                            <input
                                type="file"
                                ref={imageFileInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={handleImageUpload}
                                disabled={isUploadingImage}
                            />
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="w-full h-8"
                                disabled={isUploadingImage}
                                onClick={() => imageFileInputRef.current?.click()}
                            >
                                {isUploadingImage ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : (
                                    <Upload className="h-4 w-4 mr-2" />
                                )}
                                {isUploadingImage ? "Uploading..." : "Upload from device"}
                            </Button>
                        </div>
                    </PopoverContent>
                </Popover>

                {/* Color Picker */}
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            title="Text Color"
                        >
                            <Palette className="h-3.5 w-3.5" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-2" align="start">
                        <div className="grid grid-cols-4 gap-1.5">
                            {PRESET_COLORS.map((color) => (
                                <button
                                    key={color.value}
                                    type="button"
                                    className={cn(
                                        "h-6 w-6 rounded-full border-2 transition-transform hover:scale-110",
                                        editor.isActive("textStyle", { color: color.value })
                                            ? "border-primary ring-2 ring-primary/30"
                                            : "border-muted-foreground/20"
                                    )}
                                    style={{ backgroundColor: color.value }}
                                    title={color.label}
                                    onClick={() =>
                                        editor.chain().focus().setColor(color.value).run()
                                    }
                                />
                            ))}
                        </div>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="w-full mt-2 h-7 text-xs"
                            onClick={() => editor.chain().focus().unsetColor().run()}
                        >
                            Reset Color
                        </Button>
                    </PopoverContent>
                </Popover>

                <div className="h-4 w-px bg-border mx-1" />

                {/* Undo / Redo */}
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => editor.chain().focus().undo().run()}
                    disabled={!editor.can().undo()}
                    title="Undo"
                >
                    <Undo className="h-3.5 w-3.5" />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => editor.chain().focus().redo().run()}
                    disabled={!editor.can().redo()}
                    title="Redo"
                >
                    <Redo className="h-3.5 w-3.5" />
                </Button>
            </div>

            {/* Editor Content */}
            <div className={cn(!content && "text-muted-foreground")}>
                <EditorContent editor={editor} />
            </div>

            {/* Placeholder + image styling */}
            <style>{`
        .tiptap p.is-editor-empty:first-child::before {
          content: '${placeholder}';
          float: left;
          color: hsl(var(--muted-foreground));
          pointer-events: none;
          height: 0;
        }
        .tiptap:focus {
          outline: none;
        }
        /* Image NodeView styles */
        .inline-image-node {
          position: relative;
          line-height: 0;
        }
        .inline-image-node.is-selected .image-container img {
          outline: 2px solid hsl(var(--primary));
          outline-offset: 2px;
        }
        .inline-image-node.is-resizing {
          user-select: none;
        }
        .inline-image-node .resize-handle:hover {
          opacity: 1 !important;
        }
        /* Float clearfix — prevents collapse of editor content area */
        .tiptap::after {
          content: '';
          display: table;
          clear: both;
        }
      `}</style>
        </div>
    );
}
