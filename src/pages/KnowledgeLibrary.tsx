import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  Plus,
  Search,
  Pencil,
  Trash2,
  Eye,
  Send,
  Undo2,
  ExternalLink,
  ArrowUpDown,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import {
  CATEGORIES,
  deleteEntry,
  fetchEntries,
  practiceAreas,
  setStatus,
  type KnowledgeEntry,
} from "@/lib/knowledge";
import { EntryPreviewDialog } from "@/components/EntryPreviewDialog";

const formatDate = (value?: string) =>
  value
    ? new Date(value).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "—";

type SortKey = "updated" | "published" | "title";

export default function KnowledgeLibrary() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    data: entries = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["knowledgeEntries"],
    queryFn: fetchEntries,
    staleTime: 60 * 1000,
  });

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [area, setArea] = useState("all");
  const [status, setStatusFilter] = useState("all");
  const [sort, setSort] = useState<SortKey>("updated");
  const [previewEntry, setPreviewEntry] = useState<KnowledgeEntry | null>(null);
  const [pendingDelete, setPendingDelete] = useState<KnowledgeEntry | null>(
    null,
  );

  const areas = useMemo(() => practiceAreas(entries), [entries]);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["knowledgeEntries"] });

  const statusMutation = useMutation({
    mutationFn: ({ id, next }: { id: string; next: "Draft" | "Published" }) =>
      setStatus(id, next),
    onSuccess: () => invalidate(),
    onError: (err: any) =>
      toast({
        title: "Failed to update status",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteEntry(id),
    onSuccess: () => {
      invalidate();
      toast({
        title: "Entry deleted",
        description: `"${pendingDelete?.title}" has been removed from the library.`,
      });
      setPendingDelete(null);
    },
    onError: (err: any) =>
      toast({
        title: "Failed to delete entry",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = entries.filter((e) => {
      const matchesSearch =
        !q ||
        e.title.toLowerCase().includes(q) ||
        e.summary.toLowerCase().includes(q) ||
        e.practiceArea.toLowerCase().includes(q);
      const matchesCategory = category === "all" || e.category === category;
      const matchesArea = area === "all" || e.practiceArea === area;
      const matchesStatus = status === "all" || e.status === status;
      return matchesSearch && matchesCategory && matchesArea && matchesStatus;
    });

    return [...list].sort((a, b) => {
      if (sort === "title") return a.title.localeCompare(b.title);
      if (sort === "published")
        return (
          new Date(b.publishedAt ?? 0).getTime() -
          new Date(a.publishedAt ?? 0).getTime()
        );
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [entries, search, category, area, status, sort]);

  const published = entries.filter((e) => e.status === "Published").length;

  const toggleStatus = (entry: KnowledgeEntry) => {
    const next = entry.status === "Published" ? "Draft" : "Published";
    statusMutation.mutate(
      { id: entry.id, next },
      {
        onSuccess: () =>
          toast({
            title:
              next === "Published" ? "Entry published" : "Entry unpublished",
            description:
              next === "Published"
                ? `"${entry.title}" is now visible to tenants.`
                : `"${entry.title}" is back to draft and hidden from tenants.`,
          }),
      },
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 gap-3 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Loading knowledge library…</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-64 text-destructive text-sm">
        Failed to load the knowledge library. Check your connection and try
        again.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="gradient-primary rounded-lg p-2.5 shadow-glow">
            <BookOpen className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Legal Knowledge Library
            </h1>
            <p className="text-sm text-muted-foreground">
              {entries.length} entries · {published} published ·{" "}
              {entries.length - published} draft
            </p>
          </div>
        </div>
        <Button onClick={() => navigate("/knowledge/new")}>
          <Plus className="mr-2 h-4 w-4" />
          Add entry
        </Button>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <div className="relative min-w-[240px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search title, summary or practice area…"
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={area} onValueChange={setArea}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Practice area" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All practice areas</SelectItem>
              {areas.map((a) => (
                <SelectItem key={a} value={a}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={status} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="Published">Published</SelectItem>
              <SelectItem value="Draft">Draft</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger className="w-[180px]">
              <ArrowUpDown className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="updated">Last updated</SelectItem>
              <SelectItem value="published">Published date</SelectItem>
              <SelectItem value="title">Title (A–Z)</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[38%]">Entry</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Practice area</TableHead>
                <TableHead>Jurisdiction</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="align-top">
                    <div className="font-medium text-foreground">
                      {entry.title}
                    </div>
                    <p className="mt-1 line-clamp-2 max-w-xl text-xs text-muted-foreground">
                      {entry.summary}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                      {entry.reference && <span>Ref: {entry.reference}</span>}
                      {entry.source && <span>· {entry.source}</span>}
                      {entry.externalLink && (
                        <a
                          href={entry.externalLink}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                        >
                          Source link <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="align-top">
                    <Badge variant="outline">{entry.category}</Badge>
                  </TableCell>
                  <TableCell className="align-top text-sm">
                    {entry.practiceArea}
                  </TableCell>
                  <TableCell className="align-top text-sm text-muted-foreground">
                    {entry.jurisdiction || "—"}
                  </TableCell>
                  <TableCell className="align-top">
                    <Badge
                      variant={
                        entry.status === "Published" ? "default" : "secondary"
                      }
                    >
                      {entry.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="align-top text-sm text-muted-foreground">
                    <div>{formatDate(entry.updatedAt)}</div>
                    {entry.publishedAt && (
                      <div className="text-[11px]">
                        Pub. {formatDate(entry.publishedAt)}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="align-top">
                    <div className="flex items-center justify-end gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setPreviewEntry(entry)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Preview</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(`/knowledge/${entry.id}`)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Edit</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={statusMutation.isPending}
                            onClick={() => toggleStatus(entry)}
                          >
                            {entry.status === "Published" ? (
                              <Undo2 className="h-4 w-4" />
                            ) : (
                              <Send className="h-4 w-4" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {entry.status === "Published"
                            ? "Unpublish"
                            : "Publish"}
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setPendingDelete(entry)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Delete</TooltipContent>
                      </Tooltip>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-16 text-center">
                    <p className="text-sm text-muted-foreground">
                      No entries match your filters.
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <EntryPreviewDialog
        entry={previewEntry}
        open={!!previewEntry}
        onOpenChange={(o) => !o && setPreviewEntry(null)}
      />

      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(o) => !o && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
            <AlertDialogDescription>
              "{pendingDelete?.title}" will be permanently removed from the
              knowledge library. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteMutation.isPending}
              onClick={() =>
                pendingDelete && deleteMutation.mutate(pendingDelete.id)
              }
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Delete entry"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
