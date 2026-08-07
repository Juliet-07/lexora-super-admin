import { ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RichTextView } from "@/components/RichTextEditor";
import type { KnowledgeEntry } from "@/lib/knowledge";

interface Props {
  entry: KnowledgeEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EntryPreview({ entry }: { entry: KnowledgeEntry | null }) {
  if (!entry) return null;
  return (
    <article className="space-y-5">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{entry.category}</Badge>
          {entry.practiceArea && (
            <Badge variant="secondary">{entry.practiceArea}</Badge>
          )}
          {entry.jurisdiction && (
            <Badge variant="secondary">{entry.jurisdiction}</Badge>
          )}
          <Badge variant={entry.status === "Published" ? "default" : "secondary"}>
            {entry.status}
          </Badge>
        </div>
        <h2 className="text-2xl font-bold leading-tight text-foreground">
          {entry.title || "Untitled entry"}
        </h2>
        {entry.summary && (
          <p className="text-sm leading-relaxed text-muted-foreground">
            {entry.summary}
          </p>
        )}
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
          {entry.reference && <span>Reference: {entry.reference}</span>}
          {entry.source && <span>Source: {entry.source}</span>}
          {entry.externalLink && (
            <a
              href={entry.externalLink}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              External link <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </header>
      <Separator />
      <RichTextView html={entry.content} />
    </article>
  );
}

export function EntryPreviewDialog({ entry, open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-sm font-normal text-muted-foreground">
            Preview — how tenants will see this entry
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] pr-4">
          <EntryPreview entry={entry} />
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
