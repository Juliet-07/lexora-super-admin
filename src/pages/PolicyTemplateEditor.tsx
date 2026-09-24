import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Eye,
  Loader2,
  Save,
  Send,
  Undo2,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { RichTextEditor, RichTextView } from "@/components/RichTextEditor";
import {
  POLICY_CATEGORIES,
  createPolicyTemplate,
  emptyPolicyTemplate,
  emptySection,
  fetchPolicyTemplate,
  setPolicyTemplateStatus,
  updatePolicyTemplate,
  type PolicyTemplateInput,
  type PolicyTemplateStatus,
} from "@/lib/policy-templates";

export default function PolicyTemplateEditor() {
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
    queryKey: ["policyTemplate", id],
    queryFn: () => fetchPolicyTemplate(id as string),
    enabled: !isNew,
  });

  useEffect(() => {
    if (!isNew && loadError) navigate("/policy-templates", { replace: true });
  }, [isNew, loadError, navigate]);

  const [templateId, setTemplateId] = useState<string | undefined>(undefined);
  const [status, setLocalStatus] = useState<PolicyTemplateStatus>("Draft");
  const [form, setForm] = useState<PolicyTemplateInput>(emptyPolicyTemplate);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hydrated, setHydrated] = useState(isNew);

  useEffect(() => {
    if (existing && !hydrated) {
      setTemplateId(existing.id);
      setLocalStatus(existing.status);
      setForm({
        title: existing.title,
        category: existing.category,
        description: existing.description,
        sections: existing.sections.length
          ? existing.sections
          : [{ ...emptySection }],
      });
      setHydrated(true);
    }
  }, [existing, hydrated]);

  const set = <K extends keyof PolicyTemplateInput>(
    key: K,
    value: PolicyTemplateInput[K],
  ) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
  };

  const setSection = (
    index: number,
    patch: Partial<{ title: string; content: string }>,
  ) => {
    setForm((f) => ({
      ...f,
      sections: f.sections.map((s, i) =>
        i === index ? { ...s, ...patch } : s,
      ),
    }));
    setErrors((e) => ({ ...e, [`section-${index}`]: "" }));
  };

  const addSection = () =>
    setForm((f) => ({ ...f, sections: [...f.sections, { ...emptySection }] }));

  const removeSection = (index: number) =>
    setForm((f) => ({
      ...f,
      sections: f.sections.filter((_, i) => i !== index),
    }));

  const moveSection = (index: number, dir: -1 | 1) =>
    setForm((f) => {
      const target = index + dir;
      if (target < 0 || target >= f.sections.length) return f;
      const next = [...f.sections];
      [next[index], next[target]] = [next[target], next[index]];
      return { ...f, sections: next };
    });

  const validate = (forPublish: boolean) => {
    const next: Record<string, string> = {};
    if (!form.title.trim()) next.title = "Title is required.";
    if (form.title.length > 200)
      next.title = "Keep the title under 200 characters.";
    if (!form.sections.length) {
      next.sections = "At least one section is required.";
    } else {
      form.sections.forEach((s, i) => {
        if (forPublish && !s.title.trim())
          next[`section-${i}`] = "Section title is required before publishing.";
      });
    }
    if (forPublish) {
      const anyContent = form.sections.some(
        (s) => s.content.replace(/<[^>]*>/g, "").trim().length > 0,
      );
      if (!anyContent) next.sections = "Add content before publishing.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const saveMutation = useMutation({
    mutationFn: ({ nextStatus }: { nextStatus: PolicyTemplateStatus }) =>
      templateId
        ? updatePolicyTemplate(templateId, form, nextStatus)
        : createPolicyTemplate(form, nextStatus),
    onSuccess: (saved, { nextStatus }) => {
      queryClient.invalidateQueries({ queryKey: ["policyTemplates"] });
      queryClient.setQueryData(["policyTemplate", saved.id], saved);
      const wasNew = !templateId;
      setTemplateId(saved.id);
      setLocalStatus(nextStatus);
      toast({
        title:
          nextStatus === "Published" ? "Template published" : "Draft saved",
        description:
          nextStatus === "Published"
            ? `"${form.title}" is now selectable by tenants.`
            : `"${form.title}" was saved as a draft.`,
      });
      if (wasNew) navigate(`/policy-templates/${saved.id}`, { replace: true });
    },
    onError: (err: any) =>
      toast({
        title: "Failed to save",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  const persist = (nextStatus: PolicyTemplateStatus) => {
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
    mutationFn: () => setPolicyTemplateStatus(templateId as string, "Draft"),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ["policyTemplates"] });
      queryClient.setQueryData(["policyTemplate", saved.id], saved);
      setLocalStatus("Draft");
      toast({
        title: "Template unpublished",
        description: "It is now a draft again.",
      });
    },
  });

  if (!isNew && (loadingExisting || !hydrated)) {
    return (
      <div className="flex items-center justify-center h-64 gap-3 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Loading template…</span>
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
            onClick={() => navigate("/policy-templates")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              {templateId ? "Edit template" : "New policy template"}
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
          {status === "Published" && templateId && (
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
                  <CardTitle className="text-base">
                    Sections{" "}
                    <span className="font-normal text-muted-foreground">
                      ({form.sections.length})
                    </span>
                  </CardTitle>
                  <CardDescription>
                    Built into the policy editor when a tenant selects this
                    template — they can still edit every section afterwards.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {errors.sections && (
                    <p className="text-xs text-destructive">
                      {errors.sections}
                    </p>
                  )}
                  {form.sections.map((section, i) => (
                    <div
                      key={i}
                      className="space-y-2 rounded-lg border bg-muted/20 p-3"
                    >
                      <div className="flex items-center gap-2">
                        <Input
                          value={section.title}
                          onChange={(e) =>
                            setSection(i, { title: e.target.value })
                          }
                          placeholder={`Section ${i + 1} title — e.g. "Purpose", "Scope", "Enforcement"`}
                          className="flex-1"
                        />
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              disabled={i === 0}
                              onClick={() => moveSection(i, -1)}
                            >
                              <ChevronUp className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Move up</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              disabled={i === form.sections.length - 1}
                              onClick={() => moveSection(i, 1)}
                            >
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Move down</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              disabled={form.sections.length <= 1}
                              onClick={() => removeSection(i)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Remove section</TooltipContent>
                        </Tooltip>
                      </div>
                      {errors[`section-${i}`] && (
                        <p className="text-xs text-destructive">
                          {errors[`section-${i}`]}
                        </p>
                      )}
                      <RichTextEditor
                        value={section.content}
                        onChange={(html) => setSection(i, { content: html })}
                      />
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={addSection}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add section
                  </Button>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Template details</CardTitle>
                  <CardDescription>
                    Shown to tenants when choosing a template for a new policy.
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
                      placeholder="e.g. Data Protection Policy"
                    />
                    {errors.title && (
                      <p className="text-xs text-destructive">{errors.title}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Category *</Label>
                    <Select
                      value={form.category}
                      onValueChange={(v) => set("category", v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {POLICY_CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      rows={4}
                      maxLength={600}
                      value={form.description}
                      onChange={(e) => set("description", e.target.value)}
                      placeholder="A short summary of what this template covers and when to use it."
                    />
                    <div className="flex justify-end text-xs text-muted-foreground">
                      <span>{form.description.length}/600</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="preview">
          <Card>
            <CardContent className="space-y-6 p-8">
              <div>
                <h2 className="text-2xl font-bold text-foreground">
                  {form.title || "Untitled template"}
                </h2>
                <div className="mt-2 flex items-center gap-2">
                  <Badge variant="outline">{form.category}</Badge>
                </div>
                {form.description && (
                  <p className="mt-3 text-sm text-muted-foreground">
                    {form.description}
                  </p>
                )}
              </div>
              <div className="space-y-6">
                {form.sections.map((s, i) => (
                  <div key={i}>
                    <h3 className="mb-2 text-lg font-semibold text-foreground">
                      {s.title || `Section ${i + 1}`}
                    </h3>
                    <RichTextView html={s.content} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
