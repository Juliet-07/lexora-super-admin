import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Editor } from "@tiptap/react";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Send,
  Sparkles,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
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
import { RichTextEditor, RichTextView } from "@/components/RichTextEditor";
import { MergeFieldsSidePanel } from "@/components/contracts/MergeFieldsSidePanel";
import {
  CATEGORIES,
  TEMPLATE_MODULES,
  getModule,
  moduleLabel,
  areaLabel,
  type Category,
  type TemplateFolder,
  type TemplateInput,
  type TemplateStatus,
} from "@/lib/contract-template";
import {
  countTokens,
  fallbackRegistry,
  fetchMergeFieldRegistry,
  renderWithSamples,
  type RegistryField,
} from "@/lib/contract-merge-fields";
import { starterFor } from "@/lib/contract-template-starters";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Editing an existing template (vs creating a new one). */
  editing: boolean;
  /** Status of the template being edited; new templates are drafts. */
  currentStatus?: TemplateStatus;
  form: TemplateInput;
  setForm: (next: TemplateInput) => void;
  folders: TemplateFolder[];
  saving: boolean;
  onSave: (status: TemplateStatus) => void;
}

// A full-size workspace for writing a contract template: the document on
// the left, the merge fields to put in it on the right, and the details,
// preview and publish controls around them.
export function TemplateEditorWorkspace({
  open,
  onOpenChange,
  editing,
  currentStatus,
  form,
  setForm,
  folders,
  saving,
  onSave,
}: Props) {
  const [tab, setTab] = useState("body");
  const editorRef = useRef<Editor | null>(null);
  const touchedRef = useRef(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [confirmPublish, setConfirmPublish] = useState(false);

  // What the form looked like when the workspace opened — to know whether
  // closing would throw work away.
  const baseline = useRef("");
  useEffect(() => {
    if (open) {
      baseline.current = JSON.stringify(form);
      setTab("body");
      touchedRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  const dirty = open && JSON.stringify(form) !== baseline.current;

  // ── Fields (from the engine's registry) ─────────────────────
  const registryQuery = useQuery({
    queryKey: ["mergeFieldRegistry", form.moduleKey],
    queryFn: () => fetchMergeFieldRegistry(form.moduleKey),
    staleTime: 5 * 60 * 1000,
    retry: 1,
    enabled: open,
  });
  const offline =
    registryQuery.isError ||
    (registryQuery.isSuccess && !registryQuery.data.length);
  const fields: RegistryField[] = useMemo(
    () =>
      offline ? fallbackRegistry(form.moduleKey) : (registryQuery.data ?? []),
    [offline, registryQuery.data, form.moduleKey],
  );

  const known = useMemo(() => new Set(fields.map((f) => f.token)), [fields]);
  const counts = useMemo(() => countTokens(form.content), [form.content]);
  const unknown = useMemo(
    () =>
      registryQuery.isLoading
        ? []
        : Array.from(counts.keys()).filter((t) => !known.has(t)),
    [counts, known, registryQuery.isLoading],
  );
  const repeated = useMemo(
    () =>
      fields
        .filter((f) => f.singleUse && (counts.get(f.token) ?? 0) > 1)
        .map((f) => ({ token: f.token, count: counts.get(f.token) ?? 0 })),
    [fields, counts],
  );

  const insertField = (f: RegistryField) => {
    const editor = editorRef.current;
    if (!editor) return;
    // Until someone has clicked into the document, "the cursor" is the top
    // of an empty page — put the field at the end instead.
    const chain = editor.chain();
    if (!touchedRef.current && !editor.isFocused) chain.focus("end");
    else chain.focus();
    chain.insertContent({ type: "text", text: `{{${f.token}}}` }).run();
    touchedRef.current = true;
  };

  const handleEditorReady = (editor: Editor | null) => {
    editorRef.current = editor;
    editor?.on("focus", () => {
      touchedRef.current = true;
    });
  };

  const starter = starterFor(form.moduleKey, form.areaKey);
  const bodyEmpty = !form.content.replace(/<[^>]*>/g, "").trim();

  // ── Readiness ───────────────────────────────────────────────
  const errors: string[] = [];
  if (!form.title.trim()) errors.push("Add a title (Details tab).");
  if (bodyEmpty) errors.push("The template body is empty.");
  const warnings: string[] = [];
  if (!bodyEmpty && counts.size === 0)
    warnings.push(
      "No merge fields are used, so every contract generated from this will be identical.",
    );
  if (unknown.length)
    warnings.push(
      `${unknown.length} unknown field${unknown.length > 1 ? "s" : ""}: ${unknown
        .map((t) => `{{${t}}}`)
        .join(", ")} — they will stay as plain text.`,
    );
  repeated.forEach((r) =>
    warnings.push(
      `{{${r.token}}} is used ${r.count} times but expands into a whole list.`,
    ),
  );

  const requestClose = () =>
    dirty ? setConfirmClose(true) : onOpenChange(false);
  const publish = () => {
    if (errors.length) {
      setTab(!form.title.trim() ? "details" : "body");
      return;
    }
    if (warnings.length) setConfirmPublish(true);
    else onSave("Published");
  };

  const set = <K extends keyof TemplateInput>(k: K, v: TemplateInput[K]) =>
    setForm({ ...form, [k]: v });

  const previewHtml = useMemo(
    () => renderWithSamples(form.content, fields),
    [form.content, fields],
  );

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(o) => (o ? onOpenChange(true) : requestClose())}
      >
        <DialogContent
          className="flex h-[94vh] w-[96vw] max-w-[1500px] flex-col gap-0 overflow-hidden p-0"
          onInteractOutside={(e) => e.preventDefault()}
        >
          {/* ── Header ── */}
          <div className="flex flex-wrap items-center gap-3 border-b px-5 py-3 pr-14">
            <div className="min-w-[220px] flex-1">
              <DialogTitle className="sr-only">
                {editing ? "Edit template" : "New template"}
              </DialogTitle>
              <Input
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="Untitled template — give it a name"
                aria-label="Template title"
                className="h-9 border-transparent bg-transparent px-1 text-lg font-semibold shadow-none focus-visible:border-input"
              />
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5 px-1 text-xs text-muted-foreground">
                <Badge variant="outline">{moduleLabel(form.moduleKey)}</Badge>
                <span>{areaLabel(form.moduleKey, form.areaKey)}</span>
                <span>·</span>
                <span>v{form.version || "1.0"}</span>
                <Badge
                  variant={
                    currentStatus === "Published" ? "default" : "secondary"
                  }
                >
                  {editing ? (currentStatus ?? "Draft") : "New draft"}
                </Badge>
                {dirty && (
                  <span className="text-amber-500">· Unsaved changes</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                disabled={saving}
                onClick={() => {
                  if (!form.title.trim()) {
                    setTab("details");
                    return;
                  }
                  onSave("Draft");
                }}
              >
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save draft
              </Button>
              <Button
                className="gradient-primary"
                disabled={saving}
                onClick={publish}
              >
                <Send className="mr-2 h-4 w-4" />
                {currentStatus === "Published"
                  ? "Save & keep published"
                  : "Publish to tenants"}
              </Button>
            </div>
          </div>

          <Tabs
            value={tab}
            onValueChange={setTab}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="flex items-center justify-between gap-3 border-b px-5 py-2">
              <TabsList>
                <TabsTrigger value="body">Template body</TabsTrigger>
                <TabsTrigger value="details">
                  Details & settings
                  {!form.title.trim() && (
                    <span className="ml-1.5 h-1.5 w-1.5 rounded-full bg-amber-500" />
                  )}
                </TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
              </TabsList>
              <div className="flex items-center gap-2 text-xs">
                {errors.length === 0 && warnings.length === 0 ? (
                  <span className="flex items-center gap-1 text-emerald-600">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Ready to publish
                  </span>
                ) : (
                  <span
                    className={
                      errors.length
                        ? "flex items-center gap-1 text-destructive"
                        : "flex items-center gap-1 text-amber-500"
                    }
                    title={[...errors, ...warnings].join("\n")}
                  >
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {errors.length
                      ? errors[0]
                      : `${warnings.length} thing${warnings.length > 1 ? "s" : ""} to check`}
                  </span>
                )}
              </div>
            </div>

            {/* ── Body ── */}
            <TabsContent
              value="body"
              // Kept mounted so switching tabs doesn't reset the editor's undo history.
              forceMount
              className="m-0 min-h-0 flex-1 data-[state=active]:flex data-[state=active]:flex-col data-[state=inactive]:hidden"
            >
              <div className="grid min-h-0 flex-1 gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_360px]">
                <div className="flex min-h-0 flex-col gap-2">
                  {starter && bodyEmpty && (
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed border-primary/40 bg-primary/5 px-3 py-2 text-sm">
                      <span className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        Start from a {starter.label.toLowerCase()} already wired
                        to the deal's fields — or write your own.
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          editorRef.current
                            ?.chain()
                            .setContent(starter.html, { emitUpdate: true })
                            .focus("start")
                            .run();
                          // Back to the top of the document, not the cursor's end.
                          requestAnimationFrame(() =>
                            editorRef.current?.view.dom
                              .closest(".overflow-y-auto")
                              ?.scrollTo({ top: 0 }),
                          );
                        }}
                      >
                        Use the outline
                      </Button>
                    </div>
                  )}
                  <div className="min-h-0 flex-1">
                    <RichTextEditor
                      fill
                      value={form.content}
                      onChange={(html) => set("content", html)}
                      highlightTokens={
                        registryQuery.isLoading ? undefined : known
                      }
                      onEditorReady={handleEditorReady}
                    />
                  </div>
                </div>
                <div className="min-h-[320px] lg:min-h-0">
                  <MergeFieldsSidePanel
                    fields={fields}
                    loading={registryQuery.isLoading}
                    offline={offline}
                    counts={counts}
                    unknown={unknown}
                    repeated={repeated}
                    onInsert={insertField}
                  />
                </div>
              </div>
            </TabsContent>

            {/* ── Details ── */}
            <TabsContent
              value="details"
              className="m-0 min-h-0 flex-1 overflow-y-auto"
            >
              <div className="mx-auto max-w-3xl space-y-5 p-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Module</Label>
                    <Select
                      value={form.moduleKey}
                      onValueChange={(v) =>
                        setForm({
                          ...form,
                          moduleKey: v,
                          areaKey: getModule(v)?.areas[0]?.key ?? null,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TEMPLATE_MODULES.map((m) => (
                          <SelectItem key={m.key} value={m.key}>
                            {m.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {getModule(form.moduleKey)?.description}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Area</Label>
                    <Select
                      value={form.areaKey ?? ""}
                      onValueChange={(v) => set("areaKey", v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select an area" />
                      </SelectTrigger>
                      <SelectContent>
                        {(getModule(form.moduleKey)?.areas ?? []).map((a) => (
                          <SelectItem key={a.key} value={a.key}>
                            {a.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {form.moduleKey === "grc" && form.areaKey === "deals" && (
                      <p className="text-xs text-primary">
                        Published here, this template appears under “Generate
                        from template” on every GRC deal.
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
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
                    <Label htmlFor="jurisdiction">Jurisdiction</Label>
                    <Input
                      id="jurisdiction"
                      value={form.jurisdiction}
                      onChange={(e) => set("jurisdiction", e.target.value)}
                      placeholder="e.g. Rwanda"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="version">Version</Label>
                    <Input
                      id="version"
                      value={form.version}
                      onChange={(e) => set("version", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Folder</Label>
                    <Select
                      value={form.folderId ?? "uncategorized"}
                      onValueChange={(v) =>
                        set("folderId", v === "uncategorized" ? null : v)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="uncategorized">
                          Uncategorized
                        </SelectItem>
                        {folders.map((f) => (
                          <SelectItem key={f.id} value={f.id}>
                            {f.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={form.description}
                      onChange={(e) => set("description", e.target.value)}
                      placeholder="Short summary tenants will see in the template list"
                    />
                  </div>
                  {form.moduleKey === "hr" && (
                    <>
                      <div className="space-y-2">
                        <Label>Applies to</Label>
                        <Select
                          value={form.hrWorkerCategory ?? "either"}
                          onValueChange={(v) =>
                            set(
                              "hrWorkerCategory",
                              v === "either"
                                ? null
                                : (v as "employee" | "consultant"),
                            )
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="either">
                              Either (employees and consultants)
                            </SelectItem>
                            <SelectItem value="employee">
                              Employees only
                            </SelectItem>
                            <SelectItem value="consultant">
                              Consultants only
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Requires recipient signature?</Label>
                        <Select
                          value={form.hrRequiresSignature ? "yes" : "no"}
                          onValueChange={(v) =>
                            set("hrRequiresSignature", v === "yes")
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="yes">
                              Yes — a contract both parties sign
                            </SelectItem>
                            <SelectItem value="no">
                              No — a one-way letter the tenant issues (warnings,
                              suspension, etc.)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* ── Preview ── */}
            <TabsContent
              value="preview"
              className="m-0 min-h-0 flex-1 overflow-y-auto"
            >
              <div className="mx-auto max-w-3xl space-y-3 p-6">
                <p className="rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                  This is the template filled with <b>sample values</b>{" "}
                  (highlighted) so you can check the wording. A real contract
                  uses the deal's or the client's own data. Amber text is a
                  field the system doesn't recognise.
                </p>
                <article className="rounded-lg border bg-card p-8">
                  <h2 className="mb-1 text-xl font-bold">
                    {form.title || "Untitled template"}
                  </h2>
                  <p className="mb-5 text-xs text-muted-foreground">
                    {moduleLabel(form.moduleKey)} ·{" "}
                    {areaLabel(form.moduleKey, form.areaKey)}
                  </p>
                  <RichTextView html={bodyEmpty ? "" : previewHtml} />
                </article>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmClose} onOpenChange={setConfirmClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard your changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes to this template. Closing now will lose
              them.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmClose(false);
                onOpenChange(false);
              }}
            >
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmPublish} onOpenChange={setConfirmPublish}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Publish with warnings?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  Tenants will see this template straight away. Worth a second
                  look:
                </p>
                <ul className="list-disc space-y-1 pl-5 text-sm">
                  {warnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Go back</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmPublish(false);
                onSave("Published");
              }}
            >
              Publish anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
