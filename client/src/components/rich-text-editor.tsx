import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Color from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import Link from "@tiptap/extension-link";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Bold, List, Palette, Undo, Redo, Link as LinkIcon, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

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

export function RichTextEditor({
    content,
    onChange,
    placeholder = "Start typing...",
    className,
}: RichTextEditorProps) {
    const [linkUrl, setLinkUrl] = useState("");
    const [isLinkPopoverOpen, setIsLinkPopoverOpen] = useState(false);

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

            {/* Placeholder styling */}
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
      `}</style>
        </div>
    );
}
