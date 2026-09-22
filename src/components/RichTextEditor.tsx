import { useEffect } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Italic,
  Strikethrough,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Undo2,
  Redo2,
  Code2,
  Minus,
  Braces,
  ChevronDown,
} from "lucide-react";
import { Toggle } from "@/components/ui/toggle";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { MergeFieldDef } from "@/lib/contract-merge-fields";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  className?: string;
  // When provided (and non-empty), the toolbar gains an "Insert
  // field" dropdown that types a {{token}} at the cursor — so a
  // template author doesn't have to know the exact spelling from
  // memory. Omit (or pass []) where no real generation pipeline
  // consumes these tokens yet.
  mergeFields?: MergeFieldDef[];
}

// Inserted as plain text, not parsed as HTML — a token like
// {{scopeOfWork}} has no special HTML characters, but going through
// insertContent's HTML parser for an arbitrary string is needless
// risk; this guarantees exactly the literal characters land in the
// document for the backend's {{token}} regex to match later.
function insertMergeField(editor: Editor, token: string) {
  editor
    .chain()
    .focus()
    .insertContent({ type: "text", text: `{{${token}}}` })
    .run();
}

function MergeFieldPicker({
  editor,
  mergeFields,
}: {
  editor: Editor;
  mergeFields: MergeFieldDef[];
}) {
  if (!mergeFields.length) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="gap-1">
          <Braces className="h-4 w-4" />
          Insert field
          <ChevronDown className="h-3.5 w-3.5 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        // Radix caps the content at the space actually available
        // between the trigger and the viewport edge via this CSS var,
        // but doesn't apply it as a max-height itself — on a short
        // screen (or a dialog with little room below the toolbar) the
        // field list can run past the viewport with nothing to scroll
        // it. Capping height and adding overflow-y-auto here makes it
        // scroll instead of clipping / pushing the dialog off-screen.
        className="w-80 max-h-[min(24rem,var(--radix-dropdown-menu-content-available-height))] overflow-y-auto"
      >
        <DropdownMenuLabel>
          Click to insert — filled in automatically when a contract is drafted
          from this template
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {mergeFields.map((f) => (
          <DropdownMenuItem
            key={f.token}
            onSelect={(e) => {
              e.preventDefault(); // keep the editor focused/selection intact
              insertMergeField(editor, f.token);
            }}
            className="flex flex-col items-start gap-0.5 py-2"
          >
            <span className="font-mono text-xs text-primary">
              {"{{"}
              {f.token}
              {"}}"}
            </span>
            <span className="text-xs text-muted-foreground">
              {f.label} — {f.description}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Toolbar({
  editor,
  mergeFields,
}: {
  editor: Editor;
  mergeFields: MergeFieldDef[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-1 border-b bg-muted/40 px-2 py-1.5">
      <Toggle
        size="sm"
        pressed={editor.isActive("bold")}
        onPressedChange={() => editor.chain().focus().toggleBold().run()}
        aria-label="Bold"
      >
        <Bold className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive("italic")}
        onPressedChange={() => editor.chain().focus().toggleItalic().run()}
        aria-label="Italic"
      >
        <Italic className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive("strike")}
        onPressedChange={() => editor.chain().focus().toggleStrike().run()}
        aria-label="Strikethrough"
      >
        <Strikethrough className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive("code")}
        onPressedChange={() => editor.chain().focus().toggleCode().run()}
        aria-label="Inline code"
      >
        <Code2 className="h-4 w-4" />
      </Toggle>

      <Separator orientation="vertical" className="mx-1 h-6" />

      <Toggle
        size="sm"
        pressed={editor.isActive("heading", { level: 2 })}
        onPressedChange={() =>
          editor.chain().focus().toggleHeading({ level: 2 }).run()
        }
        aria-label="Heading 2"
      >
        <Heading2 className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive("heading", { level: 3 })}
        onPressedChange={() =>
          editor.chain().focus().toggleHeading({ level: 3 }).run()
        }
        aria-label="Heading 3"
      >
        <Heading3 className="h-4 w-4" />
      </Toggle>

      <Separator orientation="vertical" className="mx-1 h-6" />

      <Toggle
        size="sm"
        pressed={editor.isActive("bulletList")}
        onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
        aria-label="Bullet list"
      >
        <List className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive("orderedList")}
        onPressedChange={() => editor.chain().focus().toggleOrderedList().run()}
        aria-label="Numbered list"
      >
        <ListOrdered className="h-4 w-4" />
      </Toggle>
      <Toggle
        size="sm"
        pressed={editor.isActive("blockquote")}
        onPressedChange={() => editor.chain().focus().toggleBlockquote().run()}
        aria-label="Quote"
      >
        <Quote className="h-4 w-4" />
      </Toggle>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        aria-label="Divider"
      >
        <Minus className="h-4 w-4" />
      </Button>

      <div className="ml-auto flex items-center gap-1">
        {mergeFields.length > 0 && (
          <>
            <MergeFieldPicker editor={editor} mergeFields={mergeFields} />
            <Separator orientation="vertical" className="mx-1 h-6" />
          </>
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          aria-label="Undo"
        >
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          aria-label="Redo"
        >
          <Redo2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function RichTextEditor({
  value,
  onChange,
  className,
  mergeFields = [],
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value || "",
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-invert prose-sm sm:prose-base max-w-none px-4 py-4 focus:outline-none",
          "prose-headings:text-foreground prose-p:text-foreground/90 prose-strong:text-foreground",
          "prose-li:text-foreground/90 prose-blockquote:border-primary prose-blockquote:text-muted-foreground",
          "min-h-[420px]",
        ),
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  if (!editor) return null;

  return (
    <div className={cn("rounded-lg border bg-card overflow-hidden", className)}>
      <Toolbar editor={editor} mergeFields={mergeFields} />
      <EditorContent editor={editor} />
    </div>
  );
}

export function RichTextView({
  html,
  className,
}: {
  html: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "prose prose-invert prose-sm sm:prose-base max-w-none",
        "prose-headings:text-foreground prose-p:text-foreground/90 prose-strong:text-foreground",
        "prose-li:text-foreground/90 prose-blockquote:border-primary prose-blockquote:text-muted-foreground",
        className,
      )}
      dangerouslySetInnerHTML={{
        __html: html || "<p><em>No content yet.</em></p>",
      }}
    />
  );
}
