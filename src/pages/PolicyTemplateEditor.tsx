import { useEffect, useMemo, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Eye,
  Loader2,
  Save,
  Send,
  Undo2,
  FileText,
  ListTree,
  BookOpen,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import { TemplatePagesPreview } from "@/components/contracts/TemplatePagesPreview";
import { hasText, outlineOf } from "@/lib/contract-structure";
import {
  POLICY_CATEGORIES,
  GOVERNANCE_CODE_CATEGORIES,
  POLICY_TEMPLATE_APPLIES_TO,
  createPolicyTemplate,
  emptyPolicyTemplate,
  POLICY_COVER_STARTER,
  fetchPolicyTemplate,
  setPolicyTemplateStatus,
  updatePolicyTemplate,
  type PolicyTemplateInput,
  type PolicyTemplateStatus,
  type PolicyTemplateAppliesTo,
  fetchPolicyMergeFields,
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

  // Fields an author can insert ({{tenantCompanyName}}, {{policyOwner}}…) —
  // served by the engine. If it can't be reached the editor still works,
  // just without the Insert field list.
  const { data: mergeFields = [] } = useQuery({
    queryKey: ["policyMergeFields"],
    queryFn: fetchPolicyMergeFields,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
  const knownTokens = useMemo(
    () => new Set(mergeFields.map((f) => f.token)),
    [mergeFields],
  );

  const [templateId, setTemplateId] = useState<string | undefined>(undefined);
  const [status, setLocalStatus] = useState<PolicyTemplateStatus>("Draft");
  const [form, setForm] = useState<PolicyTemplateInput>(emptyPolicyTemplate);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hydrated, setHydrated] = useState(isNew);
  // Which part of the document is being written, in the order a reader meets
  // them: the cover page, the contents page, then the body.
  const [part, setPart] = useState<"cover" | "toc" | "body">("body");
  const coverEditorRef = useRef<Editor | null>(null);
  const coverEmpty = !hasText(form.coverPage);
  // The contents page is read off the body's headings, so it can't disagree
  // with the policy.
  const outline = useMemo(() => outlineOf(form.body), [form.body]);

  useEffect(() => {
    if (existing && !hydrated) {
      setTemplateId(existing.id);
      setLocalStatus(existing.status);
      setForm({
        title: existing.title,
        category: existing.category,
        description: existing.description,
        body: existing.body,
        appliesTo: existing.appliesTo,
        coverPage: existing.coverPage,
        tocEnabled: existing.tocEnabled,
        tocTitle: existing.tocTitle,
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

  const categoryOptions: readonly string[] =
    form.appliesTo === "Governance Code"
      ? GOVERNANCE_CODE_CATEGORIES
      : POLICY_CATEGORIES;

  const setAppliesTo = (value: PolicyTemplateAppliesTo) => {
    const nextOptions =
      value === "Governance Code"
        ? GOVERNANCE_CODE_CATEGORIES
        : POLICY_CATEGORIES;
    setForm((f) => ({
      ...f,
      appliesTo: value,
      // The two category lists don't overlap, so a category valid
      // for the old appliesTo is never valid for the new one.
      category: (nextOptions as readonly string[]).includes(f.category)
        ? f.category
        : nextOptions[0],
    }));
  };

  const validate = (forPublish: boolean) => {
    const next: Record<string, string> = {};
    if (!form.title.trim()) next.title = "Title is required.";
    if (form.title.length > 200)
      next.title = "Keep the title under 200 characters.";
    if (forPublish && !hasText(form.body))
      next.body = "Add the policy body before publishing.";
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
              {/* The three parts, in the order a reader meets them. */}
              <div
                className="flex flex-wrap items-center gap-2"
                role="tablist"
                aria-label="Parts of the policy"
              >
                {(
                  [
                    [
                      "cover",
                      "1",
                      "Cover page",
                      FileText,
                      coverEmpty ? "empty" : "added",
                    ],
                    [
                      "toc",
                      "2",
                      "Table of contents",
                      ListTree,
                      form.tocEnabled
                        ? `${outline.length} entr${outline.length === 1 ? "y" : "ies"}`
                        : "off",
                    ],
                    [
                      "body",
                      "3",
                      "Body",
                      BookOpen,
                      hasText(form.body) ? "added" : "empty",
                    ],
                  ] as const
                ).map(([key, n, label, Icon, note]) => (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={part === key}
                    onClick={() => setPart(key)}
                    className={
                      part === key
                        ? "flex items-center gap-2 rounded-md border border-primary bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary"
                        : "flex items-center gap-2 rounded-md border bg-card px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
                    }
                  >
                    <span className="flex h-5 w-5 items-center justify-center rounded-full border text-[11px]">
                      {n}
                    </span>
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                    <span className="text-[11px] font-normal opacity-70">
                      {note}
                    </span>
                  </button>
                ))}
              </div>

              {part === "cover" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Cover page</CardTitle>
                    <CardDescription>
                      The first page of every policy made from this template:
                      its title, the company, the reference. It is centred on
                      the page automatically — just write the lines. Use merge
                      fields so each policy fills itself in.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {coverEmpty && (
                      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed border-primary/40 bg-primary/5 px-3 py-2 text-sm">
                        <span className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-primary" />
                          Start from a standard cover page — title, company,
                          reference and owner.
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            coverEditorRef.current
                              ?.chain()
                              .setContent(POLICY_COVER_STARTER, {
                                emitUpdate: true,
                              })
                              .focus("start")
                              .run()
                          }
                        >
                          Use the standard cover
                        </Button>
                      </div>
                    )}
                    <RichTextEditor
                      value={form.coverPage}
                      onChange={(html) => set("coverPage", html)}
                      mergeFields={mergeFields}
                      highlightTokens={
                        mergeFields.length ? knownTokens : undefined
                      }
                      onEditorReady={(ed) => {
                        coverEditorRef.current = ed;
                      }}
                    />
                  </CardContent>
                </Card>
              )}

              {part === "toc" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Table of contents
                    </CardTitle>
                    <CardDescription>
                      It goes on its own page after the cover and before the
                      body, and is built automatically from the headings
                      (Heading 1–3) you use in it — you never type it, so it
                      can't fall out of step with the policy.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <Label
                        htmlFor="toc-enabled"
                        className="text-sm font-semibold"
                      >
                        Add a table of contents page
                      </Label>
                      <Switch
                        id="toc-enabled"
                        checked={form.tocEnabled}
                        onCheckedChange={(v) => set("tocEnabled", v)}
                      />
                    </div>
                    {form.tocEnabled && (
                      <>
                        <div className="space-y-1.5">
                          <Label htmlFor="toc-title">Page heading</Label>
                          <Input
                            id="toc-title"
                            value={form.tocTitle}
                            onChange={(e) => set("tocTitle", e.target.value)}
                            placeholder="Table of Contents"
                          />
                        </div>
                        <div className="rounded-lg border bg-muted/20 p-4">
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            What it will list
                          </p>
                          {outline.length ? (
                            <ol className="list-decimal space-y-1 pl-5 text-sm">
                              {outline.map((e, i) => (
                                <li key={i}>{e.text}</li>
                              ))}
                            </ol>
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              Nothing yet — use Heading 1–3 in the body and they
                              appear here.
                            </p>
                          )}
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              )}

              {part === "body" && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Body</CardTitle>
                    <CardDescription>
                      The policy itself, written as one document. Use Heading
                      1–3 for the parts you want in the table of contents — when
                      a tenant starts a policy from this template, each heading
                      becomes a section they can still edit.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {errors.body && (
                      <p className="text-xs text-destructive">{errors.body}</p>
                    )}
                    <RichTextEditor
                      value={form.body}
                      onChange={(html) => set("body", html)}
                      mergeFields={mergeFields}
                      highlightTokens={
                        mergeFields.length ? knownTokens : undefined
                      }
                    />
                  </CardContent>
                </Card>
              )}
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
                    <Label>Applies to *</Label>
                    <Select
                      value={form.appliesTo}
                      onValueChange={(v) =>
                        setAppliesTo(v as PolicyTemplateAppliesTo)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {POLICY_TEMPLATE_APPLIES_TO.map((a) => (
                          <SelectItem key={a} value={a}>
                            {a === "Policy" ? "Policies" : "Governance Codes"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Which tenant-side page this template is selectable from.
                    </p>
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
                        {categoryOptions.map((c) => (
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
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold text-foreground">
                {form.title || "Untitled template"}
              </h2>
              <div className="mt-2 flex items-center gap-2">
                <Badge variant="outline">{form.category}</Badge>
                <Badge variant="secondary">
                  {form.appliesTo === "Governance Code"
                    ? "Governance Codes"
                    : "Policies"}
                </Badge>
              </div>
              {form.description && (
                <p className="mt-3 text-sm text-muted-foreground">
                  {form.description}
                </p>
              )}
              <p className="mt-3 text-xs text-muted-foreground">
                The policy as a reader will meet it: the cover page, then the
                table of contents, then the body.
              </p>
            </div>
            <TemplatePagesPreview
              coverHtml={form.coverPage}
              tocEnabled={form.tocEnabled}
              tocTitle={form.tocTitle}
              bodyHtml={form.body}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
