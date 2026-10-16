import { useEffect, useState } from "react";
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
import { ImageUploadField } from "@/components/ImageUploadField";
import {
  CATEGORIES,
  createInsight,
  emptyInsight,
  fetchInsight,
  setInsightStatus,
  updateInsight,
  type Category,
  type Insight,
  type InsightInput,
  type InsightStatus,
} from "@/lib/insights";

export default function InsightEditor() {
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
    queryKey: ["insight", id],
    queryFn: () => fetchInsight(id as string),
    enabled: !isNew,
  });

  useEffect(() => {
    if (!isNew && loadError) navigate("/insights", { replace: true });
  }, [isNew, loadError, navigate]);

  const [insightId, setInsightId] = useState<string | undefined>(undefined);
  const [status, setLocalStatus] = useState<InsightStatus>("Draft");
  const [form, setForm] = useState<InsightInput>(emptyInsight);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hydrated, setHydrated] = useState(isNew);
  const [slug, setSlug] = useState<string | undefined>(undefined);

  // Populate the form once the existing article has actually loaded.
  useEffect(() => {
    if (existing && !hydrated) {
      setInsightId(existing.id);
      setLocalStatus(existing.status);
      setSlug(existing.slug);
      setForm({
        title: existing.title,
        category: existing.category,
        excerpt: existing.excerpt,
        content: existing.content,
        coverImage: existing.coverImage ?? "",
        author: existing.author ?? "",
      });
      setHydrated(true);
    }
  }, [existing, hydrated]);

  const set = <K extends keyof InsightInput>(
    key: K,
    value: InsightInput[K],
  ) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
  };

  const validate = (forPublish: boolean) => {
    const next: Record<string, string> = {};
    if (!form.title.trim()) next.title = "Title is required.";
    if (form.title.length > 200)
      next.title = "Keep the title under 200 characters.";
    if (form.excerpt.length > 400)
      next.excerpt = "Keep the excerpt under 400 characters.";
    if (forPublish) {
      if (!form.excerpt.trim())
        next.excerpt = "An excerpt is required before publishing.";
      const text = form.content.replace(/<[^>]*>/g, "").trim();
      if (!text) next.content = "Add content before publishing.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const saveMutation = useMutation({
    mutationFn: ({ nextStatus }: { nextStatus: InsightStatus }) =>
      insightId
        ? updateInsight(insightId, form, nextStatus)
        : createInsight(form, nextStatus),
    onSuccess: (saved, { nextStatus }) => {
      queryClient.invalidateQueries({ queryKey: ["insights"] });
      queryClient.setQueryData(["insight", saved.id], saved);
      const wasNew = !insightId;
      setInsightId(saved.id);
      setLocalStatus(nextStatus);
      setSlug(saved.slug);
      toast({
        title: nextStatus === "Published" ? "Article published" : "Draft saved",
        description:
          nextStatus === "Published"
            ? `"${form.title}" is now live on the public Insights page.`
            : `"${form.title}" was saved as a draft.`,
      });
      if (wasNew) navigate(`/insights/${saved.id}`, { replace: true });
    },
    onError: (err: any) =>
      toast({
        title: "Failed to save",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  const persist = (nextStatus: InsightStatus) => {
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
    mutationFn: () => setInsightStatus(insightId as string, "Draft"),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ["insights"] });
      queryClient.setQueryData(["insight", saved.id], saved);
      setLocalStatus("Draft");
      toast({
        title: "Article unpublished",
        description: "It is now a draft again and hidden from the public.",
      });
    },
  });

  if (!isNew && (loadingExisting || !hydrated)) {
    return (
      <div className="flex items-center justify-center h-64 gap-3 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Loading article…</span>
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
            onClick={() => navigate("/insights")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              {insightId ? "Edit article" : "New Insights article"}
            </h1>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant={status === "Published" ? "default" : "secondary"}>
                {status}
              </Badge>
              {slug && <span>/insights/{slug}</span>}
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
          {status === "Published" && insightId && (
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
                  <CardTitle className="text-base">Article details</CardTitle>
                  <CardDescription>
                    Shown on the public Insights grid and at the top of the
                    article.
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
                      placeholder="e.g. Why African boards need governance frameworks before they need growth strategies"
                    />
                    {errors.title && (
                      <p className="text-xs text-destructive">{errors.title}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="excerpt">Excerpt</Label>
                    <Textarea
                      id="excerpt"
                      rows={3}
                      maxLength={400}
                      value={form.excerpt}
                      onChange={(e) => set("excerpt", e.target.value)}
                      placeholder="A short teaser shown on the Insights grid."
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span className="text-destructive">{errors.excerpt}</span>
                      <span>{form.excerpt.length}/400</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Content</CardTitle>
                  <CardDescription>
                    Full article body with headings, lists, quotes and emphasis.
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
                    <Label htmlFor="author">Author</Label>
                    <Input
                      id="author"
                      maxLength={100}
                      value={form.author}
                      onChange={(e) => set("author", e.target.value)}
                      placeholder="Optional — e.g. Lexora Africa Research Desk"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Cover image</CardTitle>
                  <CardDescription>
                    Shown behind the article's category icon on the Insights
                    grid. Leave blank to use the category's default icon tile.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ImageUploadField
                    label="Cover image"
                    value={form.coverImage}
                    onChange={(url) => set("coverImage", url)}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="preview">
          <Card>
            <CardContent className="space-y-4 p-8">
              <span className="text-xs font-bold uppercase text-primary">
                {form.category}
              </span>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                {form.title || "Untitled article"}
              </h1>
              {form.author && (
                <p className="text-sm text-muted-foreground">
                  By {form.author}
                </p>
              )}
              <p className="text-base text-muted-foreground">{form.excerpt}</p>
              <div
                className="prose prose-sm max-w-none"
                // Rich-text editor output, authored by Super Admin only.
                dangerouslySetInnerHTML={{ __html: form.content }}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
