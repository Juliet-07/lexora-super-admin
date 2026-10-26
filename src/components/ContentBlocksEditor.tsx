import {
  ArrowDown,
  ArrowUp,
  Image as ImageIcon,
  Minus,
  Quote as QuoteIcon,
  Type,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ImageUploadField } from "@/components/ImageUploadField";

// ── Extra content blocks ────────────────────────────────────────
// Text sections, images, pull quotes and dividers the author places
// between the template's own content. Rendered by the engine in the
// order given, in the email, the preview and the portals.

type ContentBlock = {
  type: "text" | "image" | "quote" | "divider";
  heading?: string;
  text?: string;
  url?: string;
  alt?: string;
  caption?: string;
  linkUrl?: string;
  author?: string;
  label?: string;
};

const BLOCK_LABEL: Record<ContentBlock["type"], string> = {
  text: "Text",
  image: "Image",
  quote: "Quote",
  divider: "Section divider",
};
const BLOCK_ICON = {
  text: Type,
  image: ImageIcon,
  quote: QuoteIcon,
  divider: Minus,
};

export function ContentBlocksEditor({
  blocks,
  onChange,
}: {
  blocks: ContentBlock[];
  onChange: (next: ContentBlock[]) => void;
}) {
  const patch = (i: number, p: Partial<ContentBlock>) =>
    onChange(blocks.map((b, j) => (j === i ? { ...b, ...p } : b)));
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= blocks.length) return;
    const next = [...blocks];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  const add = (type: ContentBlock["type"]) => onChange([...blocks, { type }]);

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium">Extra content</p>
        <p className="text-xs text-muted-foreground">
          Add images, quotes, section dividers or more text. They appear in this
          order, below the content above — so you can break up a long newsletter
          with pictures.
        </p>
      </div>

      {blocks.map((b, i) => {
        const Icon = BLOCK_ICON[b.type] ?? Type;
        return (
          <div key={i} className="rounded-md border p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Icon className="h-3.5 w-3.5" />
                {BLOCK_LABEL[b.type]} · #{i + 1}
              </span>
              <div className="flex items-center">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                  aria-label="Move up"
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  disabled={i === blocks.length - 1}
                  onClick={() => move(i, 1)}
                  aria-label="Move down"
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => onChange(blocks.filter((_, j) => j !== i))}
                  aria-label="Remove"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {b.type === "text" && (
              <div className="space-y-2">
                <Input
                  placeholder="Heading (optional)"
                  value={b.heading ?? ""}
                  onChange={(e) => patch(i, { heading: e.target.value })}
                />
                <Textarea
                  rows={4}
                  placeholder="Write your text…"
                  value={b.text ?? ""}
                  onChange={(e) => patch(i, { text: e.target.value })}
                />
              </div>
            )}

            {b.type === "image" && (
              <div className="space-y-2">
                <ImageUploadField
                  label="Image / GIF"
                  value={b.url ?? ""}
                  onChange={(url) => patch(i, { url })}
                />
                <div className="grid gap-2 sm:grid-cols-2">
                  <Input
                    placeholder="Caption (optional)"
                    value={b.caption ?? ""}
                    onChange={(e) => patch(i, { caption: e.target.value })}
                  />
                  <Input
                    placeholder="Alt text — describes the image"
                    value={b.alt ?? ""}
                    onChange={(e) => patch(i, { alt: e.target.value })}
                  />
                  <Input
                    className="sm:col-span-2"
                    type="url"
                    placeholder="Link when clicked (optional) https://…"
                    value={b.linkUrl ?? ""}
                    onChange={(e) => patch(i, { linkUrl: e.target.value })}
                  />
                </div>
              </div>
            )}

            {b.type === "quote" && (
              <div className="space-y-2">
                <Textarea
                  rows={3}
                  placeholder="The quote…"
                  value={b.text ?? ""}
                  onChange={(e) => patch(i, { text: e.target.value })}
                />
                <Input
                  placeholder="Who said it (optional) — e.g. Amina Yusuf, CEO"
                  value={b.author ?? ""}
                  onChange={(e) => patch(i, { author: e.target.value })}
                />
              </div>
            )}

            {b.type === "divider" && (
              <Input
                placeholder="Label in the middle of the line (optional) — e.g. Next steps"
                value={b.label ?? ""}
                onChange={(e) => patch(i, { label: e.target.value })}
              />
            )}
          </div>
        );
      })}

      <div className="flex flex-wrap gap-2">
        {(["image", "quote", "divider", "text"] as const).map((t) => {
          const Icon = BLOCK_ICON[t];
          return (
            <Button
              key={t}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => add(t)}
            >
              <Icon className="mr-1.5 h-3.5 w-3.5" />
              {t === "divider" ? "Insert section divider" : `Insert ${t}`}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
