import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Eye, Loader2, Save, Send, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { RichTextEditor } from "@/components/RichTextEditor";
import { EntryPreview } from "@/components/EntryPreviewDialog";
import {
  CATEGORIES,
  createEntry,
  emptyEntry,
  fetchEntry,
  setStatus,
  updateEntry,
  type Category,
  type EntryInput,
  type EntryStatus,
  type KnowledgeEntry,
} from "@/lib/knowledge";

export default function KnowledgeEntryEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isNew = !id || id === "new";

  const {
    data: existing,
    isLoading: loadingExisting,
    isError: loadError,
  } = useQuery({
    queryKey: ["knowledgeEntry", id],
    queryFn: () => fetchEntry(id as string),
    enabled: !isNew,
  });

  useEffect(() => {
    if (!isNew && loadError) navigate("/knowledge", { replace: true });
  }, [isNew, loadError, navigate]);

  const [entryId, setEntryId] = useState<string | undefined>(undefined);
  const [status, setLocalStatus] = useState<EntryStatus>("Draft");
  const [form, setForm] = useState<EntryInput>(emptyEntry);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hydrated, setHydrated] = useState(isNew);

  // Populate the form once the existing entry has actually loaded —
  // can't do this synchronously anymore now that it's a real fetch.
  useEffect(() => {
    if (existing && !hydrated) {
      setEntryId(existing.id);
      setLocalStatus(existing.status);
      setForm({
        title: existing.title,
        category: existing.category,
        practiceArea: existing.practiceArea,
        jurisdiction: existing.jurisdiction ?? "",
        summary: existing.summary,
        content: existing.content,
        reference: existing.reference ?? "",
        source: existing.source ?? "",
        externalLink: existing.externalLink ?? "",
      });
      setHydrated(true);
    }
  }, [existing, hydrated]);

  const set = <K extends keyof EntryInput>(key: K, value: EntryInput[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
  };

  const previewEntry = useMemo<KnowledgeEntry>(
    () => ({
      ...form,
      id: entryId ?? "preview",
      status,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      publishedAt: existing?.publishedAt,
    }),
    [form, entryId, status, existing],
  );

  const validate = (forPublish: boolean) => {
    const next: Record<string, string> = {};
    if (!form.title.trim()) next.title = "Title is required.";
    if (!form.practiceArea.trim())
      next.practiceArea = "Practice area is required.";
    if (form.title.length > 200)
      next.title = "Keep the title under 200 characters.";
    if (form.summary.length > 600)
      next.summary = "Keep the summary under 600 characters.";
    if (form.externalLink && !/^https?:\/\/\S+$/i.test(form.externalLink))
      next.externalLink = "Enter a valid URL starting with http:// or https://";
    if (forPublish) {
      if (!form.summary.trim())
        next.summary = "A summary is required before publishing.";
      const text = form.content.replace(/<[^>]*>/g, "").trim();
      if (!text) next.content = "Add content before publishing.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const saveMutation = useMutation({
    mutationFn: ({ nextStatus }: { nextStatus: EntryStatus }) =>
      entryId
        ? updateEntry(entryId, form, nextStatus)
        : createEntry(form, nextStatus),
    onSuccess: (saved, { nextStatus }) => {
      queryClient.invalidateQueries({ queryKey: ["knowledgeEntries"] });
      // Pre-populate the single-entry cache under the real id before
      // navigating off "/knowledge/new" — otherwise the id-change
      // would trigger a fresh fetch and flash the loading screen
      // right after the entry was just saved.
      queryClient.setQueryData(["knowledgeEntry", saved.id], saved);
      const wasNew = !entryId;
      setEntryId(saved.id);
      setLocalStatus(nextStatus);
      toast({
        title: nextStatus === "Published" ? "Entry published" : "Draft saved",
        description:
          nextStatus === "Published"
            ? `"${form.title}" is now live in the library.`
            : `"${form.title}" was saved as a draft.`,
      });
      if (wasNew) navigate(`/knowledge/${saved.id}`, { replace: true });
    },
    onError: (err: any) =>
      toast({
        title: "Failed to save",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  const persist = (nextStatus: EntryStatus) => {
    if (!validate(nextStatus === "Published")) {
      toast({
        title: "Check the form",
        description: "Some required fields still need your attention.",
        variant: "destructive",
      });
      return;
    }
    saveMutation.mutate({ nextStatus });
  };

  const unpublishMutation = useMutation({
    mutationFn: () => setStatus(entryId as string, "Draft"),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ["knowledgeEntries"] });
      queryClient.setQueryData(["knowledgeEntry", saved.id], saved);
      setLocalStatus("Draft");
      toast({
        title: "Entry unpublished",
        description: "It is now a draft again.",
      });
    },
  });

  if (!isNew && (loadingExisting || !hydrated)) {
    return (
      <div className="flex items-center justify-center h-64 gap-3 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Loading entry…</span>
      </div>
    );
  }

  const saving = saveMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/knowledge")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              {entryId ? "Edit entry" : "New library entry"}
            </h1>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant={status === "Published" ? "default" : "secondary"}>
                {status}
              </Badge>
              {existing && (
                <span>
                  Last updated{" "}
                  {new Date(existing.updatedAt).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {status === "Published" && entryId && (
            <Button
              variant="outline"
              disabled={unpublishMutation.isPending}
              onClick={() => unpublishMutation.mutate()}
            >
              {unpublishMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Undo2 className="mr-2 h-4 w-4" />
              )}
              Unpublish
            </Button>
          )}
          <Button
            variant="outline"
            disabled={saving}
            onClick={() => persist("Draft")}
          >
            <Save className="mr-2 h-4 w-4" />
            Save draft
          </Button>
          <Button disabled={saving} onClick={() => persist("Published")}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            {status === "Published" ? "Save & republish" : "Publish"}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="edit" className="space-y-4">
        <TabsList>
          <TabsTrigger value="edit">Edit</TabsTrigger>
          <TabsTrigger value="preview">
            <Eye className="mr-2 h-3.5 w-3.5" />
            Preview
          </TabsTrigger>
        </TabsList>

        <TabsContent value="edit" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Entry details</CardTitle>
                  <CardDescription>
                    Core information shown in the library list and search
                    results.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      maxLength={200}
                      value={form.title}
                      onChange={(e) => set("title", e.target.value)}
                      placeholder="e.g. Law N° 058/2021 on the Protection of Personal Data"
                    />
                    {errors.title && (
                      <p className="text-xs text-destructive">{errors.title}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="summary">Summary</Label>
                    <Textarea
                      id="summary"
                      rows={3}
                      maxLength={600}
                      value={form.summary}
                      onChange={(e) => set("summary", e.target.value)}
                      placeholder="A short abstract shown in list views and search results."
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span className="text-destructive">{errors.summary}</span>
                      <span>{form.summary.length}/600</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Content</CardTitle>
                  <CardDescription>
                    Full text with headings, lists, quotes and emphasis.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <RichTextEditor
                    value={form.content}
                    onChange={(html) => set("content", html)}
                  />
                  {errors.content && (
                    <p className="text-xs text-destructive">{errors.content}</p>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Classification</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Category *</Label>
                    <Select
                      value={form.category}
                      onValueChange={(v) => set("category", v as Category)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="area">Practice area *</Label>
                    <Input
                      id="area"
                      maxLength={100}
                      value={form.practiceArea}
                      onChange={(e) => set("practiceArea", e.target.value)}
                      placeholder="e.g. Data Protection"
                    />
                    {errors.practiceArea && (
                      <p className="text-xs text-destructive">
                        {errors.practiceArea}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="jurisdiction">Jurisdiction</Label>
                    <Input
                      id="jurisdiction"
                      maxLength={100}
                      value={form.jurisdiction}
                      onChange={(e) => set("jurisdiction", e.target.value)}
                      placeholder="Optional — e.g. Rwanda, EAC"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Citation</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reference">Reference</Label>
                    <Input
                      id="reference"
                      maxLength={120}
                      value={form.reference}
                      onChange={(e) => set("reference", e.target.value)}
                      placeholder="e.g. Law N° 058/2021, RCOMA 00021/2024"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="source">Source</Label>
                    <Input
                      id="source"
                      maxLength={160}
                      value={form.source}
                      onChange={(e) => set("source", e.target.value)}
                      placeholder="e.g. Official Gazette"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="link">External link</Label>
                    <Input
                      id="link"
                      type="url"
                      maxLength={500}
                      value={form.externalLink}
                      onChange={(e) => set("externalLink", e.target.value)}
                      placeholder="https://…"
                    />
                    {errors.externalLink && (
                      <p className="text-xs text-destructive">
                        {errors.externalLink}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="preview">
          <Card>
            <CardContent className="p-8">
              <EntryPreview entry={previewEntry} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
