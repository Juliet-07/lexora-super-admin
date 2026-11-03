import { useEffect, useMemo, useReducer, useState } from "react";
import {
  EditorContent,
  Extension,
  Mark,
  Node,
  mergeAttributes,
  useEditor,
  type Editor,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
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
  Search,
  ImagePlus,
  Type,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
} from "lucide-react";
import { Toggle } from "@/components/ui/toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ImageUploadField } from "@/components/ImageUploadField";
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
  // Adds an "Insert" group (image, quote, divider) to the toolbar —
  // for long-form public content such as Insights.
  images?: boolean;
  // When given, every {{token}} typed or inserted in the body is shown as
  // a chip — blue when it is in this set, amber when it isn't (a typo, or
  // a field this kind of template can't use).
  highlightTokens?: Set<string>;
  // Hands the editor to the parent once it exists (null when it goes
  // away) — lets a side panel insert at the cursor.
  onEditorReady?: (editor: Editor | null) => void;
  // Fill the parent's height and scroll the document inside, instead of
  // growing with the content.
  fill?: boolean;
}

// Shows each {{token}} as a chip. Purely visual — it adds a class around
// the characters and never changes the stored HTML, so a template saves
// exactly as typed. The set of known tokens lives in storage so the
// parent can change it (when the field list finishes loading) without
// rebuilding the editor.
const MergeTokenHighlight = Extension.create({
  name: "mergeTokenHighlight",
  addStorage() {
    return { known: undefined as Set<string> | undefined };
  },
  addProseMirrorPlugins() {
    const storage = this.storage;
    return [
      new Plugin({
        key: new PluginKey("mergeTokenHighlight"),
        props: {
          decorations(state) {
            const known = storage.known;
            if (!known) return DecorationSet.empty;
            const decorations: Decoration[] = [];
            state.doc.descendants((node, pos) => {
              if (!node.isText || !node.text) return;
              for (const m of node.text.matchAll(/\{\{(\w+)\}\}/g)) {
                const from = pos + (m.index ?? 0);
                decorations.push(
                  Decoration.inline(from, from + m[0].length, {
                    class: known.has(m[1])
                      ? "merge-token"
                      : "merge-token merge-token-unknown",
                    title: known.has(m[1])
                      ? undefined
                      : "Not a known merge field — it will stay as {{" +
                        m[1] +
                        "}} in generated contracts",
                  }),
                );
              }
            });
            return DecorationSet.create(state.doc, decorations);
          },
        },
      }),
    ];
  },
});

// Paragraph and heading alignment, stored as an inline `text-align`
// style on the block so it survives wherever the HTML is rendered or
// turned into a PDF. Left is the default and is stored as nothing.
const ALIGNABLE = ["paragraph", "heading"];
const TextAlign = Extension.create({
  name: "textAlign",
  addGlobalAttributes() {
    return [
      {
        types: ALIGNABLE,
        attributes: {
          textAlign: {
            default: null,
            parseHTML: (el: HTMLElement) => el.style.textAlign || null,
            renderHTML: (attrs: { textAlign?: string | null }) =>
              attrs.textAlign
                ? { style: `text-align: ${attrs.textAlign}` }
                : {},
          },
        },
      },
    ];
  },
});

type Align = "left" | "center" | "right" | "justify";
const ALIGNMENTS: { value: Align; label: string; Icon: typeof AlignLeft }[] = [
  { value: "left", label: "Align left", Icon: AlignLeft },
  { value: "center", label: "Align center", Icon: AlignCenter },
  { value: "right", label: "Align right", Icon: AlignRight },
  { value: "justify", label: "Justify", Icon: AlignJustify },
];
const setAlign = (editor: Editor, value: Align) => {
  const textAlign = value === "left" ? null : value;
  editor
    .chain()
    .focus()
    .updateAttributes("paragraph", { textAlign })
    .updateAttributes("heading", { textAlign })
    .run();
};
const isAlign = (editor: Editor, value: Align) =>
  value === "left"
    ? !["center", "right", "justify"].some((a) =>
        editor.isActive({ textAlign: a }),
      )
    : editor.isActive({ textAlign: value });

// Font size, stored as <span style="font-size: 18px"> — plain HTML that
// the tenant app's editor, previews and emails already understand. Written
// here rather than pulled from a package so the editor needs no new
// dependency. `setMark("fontSize", { size: "18px" })` applies it to the
// selection; `unsetMark("fontSize")` returns to the default.
const FontSize = Mark.create({
  name: "fontSize",
  addAttributes() {
    return {
      size: {
        default: null,
        parseHTML: (el: HTMLElement) => el.style.fontSize || null,
        renderHTML: (attrs: { size?: string | null }) =>
          attrs.size ? { style: `font-size: ${attrs.size}` } : {},
      },
    };
  },
  parseHTML() {
    return [
      {
        tag: "span",
        getAttrs: (el: HTMLElement | string) =>
          typeof el !== "string" && el.style.fontSize ? null : false,
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ["span", HTMLAttributes, 0];
  },
});

const FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32, 36, 48];

// A block-level picture with an optional caption. Stored as plain
// <figure><img><figcaption> HTML, so it renders as-is on the public
// site and in email — no editor-specific markup.
const ImageBlock = Node.create({
  name: "image",
  group: "block",
  atom: true,
  draggable: true,
  addAttributes() {
    return {
      src: { default: null },
      alt: { default: "" },
      caption: { default: "" },
    };
  },
  parseHTML() {
    return [
      {
        tag: "figure",
        priority: 60,
        getAttrs: (el) => {
          const img = (el as HTMLElement).querySelector("img");
          if (!img) return false;
          return {
            src: img.getAttribute("src"),
            alt: img.getAttribute("alt") ?? "",
            caption:
              (el as HTMLElement).querySelector("figcaption")?.textContent ??
              "",
          };
        },
      },
      {
        tag: "img[src]",
        getAttrs: (el) => ({
          src: (el as HTMLElement).getAttribute("src"),
          alt: (el as HTMLElement).getAttribute("alt") ?? "",
        }),
      },
    ];
  },
  renderHTML({ node }) {
    const img = [
      "img",
      mergeAttributes({ src: node.attrs.src, alt: node.attrs.alt || "" }),
    ];
    return node.attrs.caption
      ? ["figure", {}, img, ["figcaption", {}, node.attrs.caption]]
      : ["figure", {}, img];
  },
});

function InsertImageDialog({
  editor,
  open,
  onOpenChange,
}: {
  editor: Editor;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [url, setUrl] = useState("");
  const [alt, setAlt] = useState("");
  const [caption, setCaption] = useState("");
  const reset = () => {
    setUrl("");
    setAlt("");
    setCaption("");
  };
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Insert image</DialogTitle>
          <DialogDescription>
            Upload a picture or GIF — it is placed where your cursor is.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <ImageUploadField label="Image" value={url} onChange={setUrl} />
          <div className="space-y-1">
            <label className="text-sm font-medium">
              Alt text (describes the image)
            </label>
            <Input value={alt} onChange={(e) => setAlt(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Caption (optional)</label>
            <Input
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!/^https?:\/\//i.test(url.trim())}
            onClick={() => {
              editor
                .chain()
                .focus()
                .insertContent({
                  type: "image",
                  attrs: {
                    src: url.trim(),
                    alt: alt.trim(),
                    caption: caption.trim(),
                  },
                })
                .run();
              onOpenChange(false);
              reset();
            }}
          >
            Insert
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
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
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  // Matches the token, label, or description — the list has grown
  // past 20 entries, so a tenant author scanning by eye for e.g.
  // "jurisdiction" shouldn't have to know it's spelled
  // "tenantCompanyJurisdiction" to find it.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return mergeFields;
    return mergeFields.filter(
      (f) =>
        f.token.toLowerCase().includes(q) ||
        f.label.toLowerCase().includes(q) ||
        f.description.toLowerCase().includes(q),
    );
  }, [mergeFields, query]);

  if (!mergeFields.length) return null;

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery(""); // start fresh the next time it opens
      }}
    >
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
        // it. Capping height here and making only the list (below)
        // scroll keeps the search box pinned in view.
        className="flex w-80 max-h-[min(24rem,var(--radix-dropdown-menu-content-available-height))] flex-col overflow-hidden p-0"
        // Radix would otherwise move focus back to the trigger button
        // when the menu closes after inserting a field — fine, but
        // combined with autoFocus below it also fights the search
        // input for focus on open in some browsers. Left to Radix's
        // default (focus first item) on open, autoFocus here takes
        // over explicitly.
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <div className="sticky top-0 z-10 border-b bg-popover p-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              // Radix's DropdownMenu listens for printable-character
              // keydowns anywhere inside it to do its own type-ahead
              // (jump to the item starting with that letter), which
              // would otherwise steal every keystroke typed here
              // instead of letting them reach this input.
              onKeyDown={(e) => e.stopPropagation()}
              placeholder="Search fields…"
              className="h-8 pl-7 text-xs"
            />
          </div>
        </div>
        <DropdownMenuLabel className="px-2 pt-2 text-xs">
          Click to insert — filled in automatically when a document is created
          from this template
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs text-muted-foreground">
              No fields match &ldquo;{query}&rdquo;
            </div>
          ) : (
            filtered.map((f) => (
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
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Toolbar({
  editor,
  mergeFields,
  images,
}: {
  editor: Editor;
  mergeFields: MergeFieldDef[];
  images?: boolean;
}) {
  const [imageOpen, setImageOpen] = useState(false);
  // The editor doesn't re-render React on selection moves, so without this
  // the pressed state of the toolbar buttons (alignment, bold, headings…)
  // stays stuck on whatever it was after the last edit.
  const [, refresh] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    editor.on("transaction", refresh);
    return () => {
      editor.off("transaction", refresh);
    };
  }, [editor]);
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

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 gap-1 px-2 text-xs"
            aria-label="Font size"
          >
            <Type className="h-4 w-4" />
            {(
              editor.getAttributes("fontSize").size as string | undefined
            )?.replace("px", "") ?? "Size"}
            <ChevronDown className="h-3 w-3 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="max-h-72 overflow-y-auto">
          <DropdownMenuLabel>Font size</DropdownMenuLabel>
          <DropdownMenuItem
            onSelect={() =>
              editor
                .chain()
                .focus()
                .unsetMark("fontSize", { extendEmptyMarkRange: true })
                .run()
            }
          >
            Default
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {FONT_SIZES.map((px) => (
            <DropdownMenuItem
              key={px}
              onSelect={() =>
                editor
                  .chain()
                  .focus()
                  .setMark("fontSize", { size: `${px}px` })
                  .run()
              }
            >
              <span style={{ fontSize: Math.min(px, 24) }}>{px}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

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

      {ALIGNMENTS.map(({ value, label, Icon }) => (
        <Toggle
          key={value}
          size="sm"
          pressed={isAlign(editor, value)}
          onPressedChange={() => setAlign(editor, value)}
          aria-label={label}
          title={label}
        >
          <Icon className="h-4 w-4" />
        </Toggle>
      ))}

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

      {images && (
        <>
          <Separator orientation="vertical" className="mx-1 h-6" />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() => setImageOpen(true)}
          >
            <ImagePlus className="h-4 w-4" />
            Image
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
          >
            <Quote className="h-4 w-4" />
            Insert quote
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
          >
            <Minus className="h-4 w-4" />
            Section divider
          </Button>
          <InsertImageDialog
            editor={editor}
            open={imageOpen}
            onOpenChange={setImageOpen}
          />
        </>
      )}

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
  images = false,
  highlightTokens,
  onEditorReady,
  fill = false,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      FontSize,
      TextAlign,
      ...(images ? [ImageBlock] : []),
      MergeTokenHighlight,
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-invert prose-sm sm:prose-base max-w-none px-4 py-4 focus:outline-none",
          "prose-headings:text-foreground prose-p:text-foreground/90 prose-strong:text-foreground",
          "prose-li:text-foreground/90 prose-blockquote:border-primary prose-blockquote:text-muted-foreground",
          "prose-img:rounded-lg prose-img:mx-auto prose-hr:my-8",
          fill ? "min-h-full" : "min-h-[420px]",
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

  useEffect(() => {
    if (!editor) return;
    onEditorReady?.(editor);
    return () => onEditorReady?.(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  // Keep the chips in step with the field list (it arrives after the
  // editor does, and changes with the template's module).
  useEffect(() => {
    if (!editor) return;
    (
      editor.storage as unknown as Record<string, { known?: Set<string> }>
    ).mergeTokenHighlight.known = highlightTokens;
    editor.view.dispatch(editor.state.tr.setMeta("mergeTokenHighlight", true));
  }, [editor, highlightTokens]);

  if (!editor) return null;

  return (
    <div
      className={cn(
        "rounded-lg border bg-card overflow-hidden",
        fill && "flex h-full min-h-0 flex-col",
        className,
      )}
    >
      <Toolbar editor={editor} mergeFields={mergeFields} images={images} />
      {fill ? (
        <div
          className="min-h-0 flex-1 cursor-text overflow-y-auto"
          onClick={(e) => {
            // Clicking the empty page below the text still puts the cursor
            // at the end instead of doing nothing.
            if (e.target === e.currentTarget) editor.commands.focus("end");
          }}
        >
          <EditorContent editor={editor} className="min-h-full" />
        </div>
      ) : (
        <EditorContent editor={editor} />
      )}
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
