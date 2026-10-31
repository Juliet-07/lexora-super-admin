import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Editor } from "@tiptap/react";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  FileText,
  ListTree,
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
import { Switch } from "@/components/ui/switch";
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
import { RichTextEditor } from "@/components/RichTextEditor";
import { TemplatePagesPreview } from "./TemplatePagesPreview";
import { hasText, outlineOf } from "@/lib/contract-structure";
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
  fetchMergeFieldIndex,
  fetchMergeFieldRegistry,
  type FieldIndexEntry,
  renderWithSamples,
  type RegistryField,
} from "@/lib/contract-merge-fields";
import { useToast } from "@/hooks/use-toast";
import {
  COVER_PAGE_STARTER,
  starterFor,
} from "@/lib/contract-template-starters";

type Part = "cover" | "toc" | "body";

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
  const { toast } = useToast();
  const [tab, setTab] = useState("body");
  // Which part of the document is being written: the cover page, the table
  // of contents settings, or the body.
  const [part, setPart] = useState<Part>("body");
  const [previewMode, setPreviewMode] = useState<"fields" | "samples">(
    "fields",
  );
  const titleRef = useRef<HTMLInputElement | null>(null);
  const bodyEditorRef = useRef<Editor | null>(null);
  const coverEditorRef = useRef<Editor | null>(null);
  const touchedRef = useRef(false);
  // The editor being typed in. The contents part has none, so a field added
  // from the panel goes to the body.
  const activeEditor = () =>
    part === "cover" ? coverEditorRef.current : bodyEditorRef.current;
  const [confirmClose, setConfirmClose] = useState(false);
  const [confirmPublish, setConfirmPublish] = useState(false);

  // What the form looked like when the workspace opened — to know whether
  // closing would throw work away.
  const baseline = useRef("");
  useEffect(() => {
    if (open) {
      baseline.current = JSON.stringify(form);
      setTab("body");
      setPart("body");
      touchedRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  const dirty = open && JSON.stringify(form) !== baseline.current;

  // Fields are counted across the cover page and the body (the contents page
  // is built from headings, so it adds none of its own).
  const counts = useMemo(
    () => countTokens(`${form.coverPage}${form.content}`),
    [form.coverPage, form.content],
  );

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
  // Every field of the module — what counts as "a real field" ...
  const allFields: RegistryField[] = useMemo(
    () =>
      offline ? fallbackRegistry(form.moduleKey) : (registryQuery.data ?? []),
    [offline, registryQuery.data, form.moduleKey],
  );
  // ... and the ones offered for this template's area (GRC deal contracts
  // are offered the deal fields, not the governance ones). Older names kept
  // for existing templates stay valid but are not listed.
  const inArea = useMemo(
    () =>
      allFields.filter(
        (f) =>
          !form.areaKey || !f.areas.length || f.areas.includes(form.areaKey),
      ),
    [allFields, form.areaKey],
  );
  const fields = useMemo(() => inArea.filter((f) => !f.hidden), [inArea]);
  // Older names this template still uses, and what to use instead.
  const legacy = useMemo(() => {
    const labels = new Map(allFields.map((f) => [f.token, f.label]));
    return inArea
      .filter((f) => f.hidden && f.aliasOf && counts.has(f.token))
      .map((f) => ({
        token: f.token,
        count: counts.get(f.token) ?? 0,
        useToken: f.aliasOf as string,
        useLabel: labels.get(f.aliasOf as string) ?? (f.aliasOf as string),
      }));
  }, [inArea, allFields, counts]);

  // Every field in EVERY module. The product owner's list files a field
  // under one module, but a template in another may use it (a deal contract
  // using partyAName), so "known" has to mean known anywhere.
  const indexQuery = useQuery({
    queryKey: ["mergeFieldIndex"],
    queryFn: fetchMergeFieldIndex,
    staleTime: 10 * 60 * 1000,
    retry: 1,
    enabled: open,
  });
  const index: FieldIndexEntry[] = useMemo(
    () =>
      indexQuery.data?.length
        ? indexQuery.data
        : allFields.map((f) => ({
            token: f.token,
            label: f.label,
            group: f.group,
          })),
    [indexQuery.data, allFields],
  );
  const known = useMemo(() => new Set(index.map((f) => f.token)), [index]);
  const offered = useMemo(() => new Set(inArea.map((f) => f.token)), [inArea]);
  const checking = registryQuery.isLoading || indexQuery.isLoading;
  const unknown = useMemo(
    () =>
      checking
        ? []
        : Array.from(counts.entries())
            .filter(([t]) => !known.has(t))
            .map(([token, count]) => ({ token, count })),
    [counts, known, checking],
  );
  // Real fields used here that belong to another module or area.
  const elsewhere = useMemo(() => {
    if (checking) return [];
    const labels = new Map(index.map((f) => [f.token, f.label]));
    return Array.from(counts.entries())
      .filter(([t]) => known.has(t) && !offered.has(t))
      .map(([token, count]) => ({
        token,
        count,
        label: labels.get(token) ?? token,
      }));
  }, [counts, known, offered, index, checking]);
  const repeated = useMemo(
    () =>
      fields
        .filter((f) => f.singleUse && (counts.get(f.token) ?? 0) > 1)
        .map((f) => ({ token: f.token, count: counts.get(f.token) ?? 0 })),
    [fields, counts],
  );

  // ── Fixing fields already in the document ───────────────────
  const tokenRanges = (editor: Editor, token: string) => {
    const ranges: { from: number; to: number }[] = [];
    const needle = `{{${token}}}`;
    editor.state.doc.descendants((node, pos) => {
      if (!node.isText || !node.text) return;
      let at = node.text.indexOf(needle);
      while (at !== -1) {
        ranges.push({ from: pos + at, to: pos + at + needle.length });
        at = node.text.indexOf(needle, at + needle.length);
      }
    });
    return ranges;
  };
  const findCursor = useRef<Record<string, number>>({});
  // The parts of the document that hold text, the one being written first.
  const editorsInOrder = (): [Part, Editor | null][] => {
    const all: [Part, Editor | null][] = [
      ["body", bodyEditorRef.current],
      ["cover", coverEditorRef.current],
    ];
    return all.sort((x, y) => (x[0] === part ? -1 : y[0] === part ? 1 : 0));
  };
  // Selects the next occurrence (and the one after, on the next click),
  // switching to the cover page or the body if that is where it is.
  const findToken = (token: string) => {
    const hit = editorsInOrder().find(
      ([, e]) => e && tokenRanges(e, token).length,
    );
    if (!hit || !hit[1]) return;
    const [where, editor] = hit;
    const ranges = tokenRanges(editor, token);
    const i = (findCursor.current[token] ?? -1) + 1;
    const r = ranges[i % ranges.length];
    findCursor.current[token] = i % ranges.length;
    touchedRef.current = true;
    if (where !== part) setPart(where);
    // Focus first, then select on a later frame — selecting in the same
    // tick as the focus can lose to the editor restoring its old cursor, and
    // a part that was hidden needs a render before it can take focus.
    requestAnimationFrame(() => {
      editor.commands.focus();
      requestAnimationFrame(() =>
        editor
          .chain()
          .setTextSelection({ from: r.from, to: r.to })
          .scrollIntoView()
          .run(),
      );
    });
  };
  const replaceToken = (from: string, to: string | null) => {
    let total = 0;
    for (const [, editor] of editorsInOrder()) {
      if (!editor) continue;
      const ranges = tokenRanges(editor, from);
      if (!ranges.length) continue;
      const tr = editor.state.tr;
      // Back to front so earlier positions stay valid.
      for (const r of ranges.reverse()) {
        if (to === null) tr.delete(r.from, r.to);
        else tr.insertText(`{{${to}}}`, r.from, r.to);
      }
      editor.view.dispatch(tr);
      total += ranges.length;
    }
    if (!total) return;
    toast({
      title:
        to === null
          ? `Removed {{${from}}}`
          : `Replaced {{${from}}} with {{${to}}}`,
      description: `${total} place${total > 1 ? "s" : ""} updated.`,
    });
  };

  const insertField = (f: RegistryField) => {
    const editor = activeEditor();
    if (!editor) return;
    // Until someone has clicked into the document, "the cursor" is the top
    // of an empty page — put the field at the end instead.
    const chain = editor.chain();
    if (!touchedRef.current && !editor.isFocused) chain.focus("end");
    else chain.focus();
    chain.insertContent({ type: "text", text: `{{${f.token}}}` }).run();
    touchedRef.current = true;
  };

  const readyHandler =
    (ref: React.MutableRefObject<Editor | null>) => (editor: Editor | null) => {
      ref.current = editor;
      editor?.on("focus", () => {
        touchedRef.current = true;
      });
    };
  const handleBodyReady = readyHandler(bodyEditorRef);
  const handleCoverReady = readyHandler(coverEditorRef);

  const starter = starterFor(form.moduleKey, form.areaKey);
  const bodyEmpty = !form.content.replace(/<[^>]*>/g, "").trim();
  const outline = useMemo(() => outlineOf(form.content), [form.content]);
  const coverEmpty = !hasText(form.coverPage);

  // ── Readiness ───────────────────────────────────────────────
  const errors: string[] = [];
  if (!form.title.trim()) errors.push("Add a title");
  if (bodyEmpty) errors.push("The template body is empty.");
  const warnings: string[] = [];
  if (form.tocEnabled && !bodyEmpty && outline.length === 0)
    warnings.push(
      "The table of contents is on, but the body has no headings (Heading 1–3) — the contents page will be left out.",
    );
  if (!bodyEmpty && counts.size === 0)
    warnings.push(
      "No merge fields are used, so every contract generated from this will be identical.",
    );
  if (unknown.length)
    warnings.push(
      `${unknown.length} unknown field${unknown.length > 1 ? "s" : ""}: ${unknown
        .slice(0, 6)
        .map((u) => `{{${u.token}}}`)
        .join(
          ", ",
        )}${unknown.length > 6 ? ` and ${unknown.length - 6} more` : ""} — they will stay as plain text.`,
    );
  repeated.forEach((r) =>
    warnings.push(
      `{{${r.token}}} is used ${r.count} times but expands into a whole list.`,
    ),
  );

  // The title box lives in the header, visible on every tab.
  const focusTitle = () => {
    toast({
      title: "Give the template a title first",
      description: "Type it in the title box at the top-left.",
      variant: "destructive",
    });
    titleRef.current?.focus();
  };

  const requestClose = () =>
    dirty ? setConfirmClose(true) : onOpenChange(false);
  const publish = () => {
    if (!form.title.trim()) {
      focusTitle();
      return;
    }
    if (errors.length) {
      setTab("body");
      setPart("body");
      return;
    }
    if (warnings.length) setConfirmPublish(true);
    else onSave("Published");
  };

  const set = <K extends keyof TemplateInput>(k: K, v: TemplateInput[K]) =>
    setForm({ ...form, [k]: v });

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
                placeholder="Template title, e.g. Share Purchase Agreement"
                aria-label="Template title"
                ref={titleRef}
                className="h-10 text-base font-semibold"
              />
              <div className="mt-2 flex flex-wrap items-center gap-1.5 px-1 text-xs text-muted-foreground">
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
                    focusTitle();
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
                <TabsTrigger value="body">Document</TabsTrigger>
                <TabsTrigger value="details">Details & settings</TabsTrigger>
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
                        ? "flex cursor-pointer items-center gap-1 text-destructive"
                        : "flex items-center gap-1 text-amber-500"
                    }
                    title={[...errors, ...warnings].join("\n")}
                    onClick={() =>
                      !form.title.trim() && titleRef.current?.focus()
                    }
                  >
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {errors.length
                      ? errors[0]
                      : `${warnings.length} thing${warnings.length > 1 ? "s" : ""} to check`}
                  </span>
                )}
              </div>
            </div>

            {/* ── Document: cover page, table of contents, body ── */}
            <TabsContent
              value="body"
              // Kept mounted so switching tabs doesn't reset the editor's undo history.
              forceMount
              className="m-0 min-h-0 flex-1 data-[state=active]:flex data-[state=active]:flex-col data-[state=inactive]:hidden"
            >
              {/* The three parts, in the order a reader meets them. */}
              <div
                className="flex flex-wrap items-center gap-2 border-b bg-muted/30 px-5 py-2"
                role="tablist"
                aria-label="Parts of the document"
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
                      bodyEmpty ? "empty" : "written",
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

              <div
                className={
                  part === "toc"
                    ? "min-h-0 flex-1 overflow-y-auto p-4"
                    : "grid min-h-0 flex-1 gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_360px]"
                }
              >
                {/* Cover page */}
                <div
                  className={
                    part === "cover" ? "flex min-h-0 flex-col gap-2" : "hidden"
                  }
                >
                  <p className="text-xs text-muted-foreground">
                    The first page of every contract: its title, the parties,
                    the date. It is centred on the page automatically — just
                    write the lines. Use merge fields so each contract fills
                    itself in.
                  </p>
                  {coverEmpty && (
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed border-primary/40 bg-primary/5 px-3 py-2 text-sm">
                      <span className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        Start from a standard cover page — title, parties, date
                        and reference.
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          coverEditorRef.current
                            ?.chain()
                            .setContent(COVER_PAGE_STARTER, {
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
                  <div className="min-h-0 flex-1">
                    <RichTextEditor
                      fill
                      value={form.coverPage}
                      onChange={(html) => set("coverPage", html)}
                      highlightTokens={
                        registryQuery.isLoading ? undefined : known
                      }
                      onEditorReady={handleCoverReady}
                    />
                  </div>
                </div>

                {/* Table of contents */}
                {part === "toc" && (
                  <div className="mx-auto w-full max-w-2xl space-y-4">
                    <div className="space-y-3 rounded-lg border bg-card p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <Label
                            htmlFor="toc-enabled"
                            className="text-sm font-semibold"
                          >
                            Add a table of contents page
                          </Label>
                          <p className="mt-1 text-xs text-muted-foreground">
                            It goes on its own page after the cover and before
                            the body, and is built automatically from the
                            headings in the body — you never type it, so it
                            can't fall out of step with the text.
                          </p>
                        </div>
                        <Switch
                          id="toc-enabled"
                          checked={form.tocEnabled}
                          onCheckedChange={(v) => set("tocEnabled", v)}
                        />
                      </div>
                      {form.tocEnabled && (
                        <div className="space-y-1.5">
                          <Label htmlFor="toc-title">Page heading</Label>
                          <Input
                            id="toc-title"
                            value={form.tocTitle}
                            onChange={(e) => set("tocTitle", e.target.value)}
                            placeholder="Table of Contents"
                          />
                        </div>
                      )}
                    </div>
                    {form.tocEnabled && (
                      <div className="rounded-lg border bg-card p-4">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          What it will list
                        </p>
                        {outline.length ? (
                          <ul className="space-y-1 text-sm">
                            {outline.map((e, i) => (
                              <li
                                key={i}
                                style={{
                                  paddingLeft: `${(e.level - 1) * 20}px`,
                                }}
                                className={e.level === 1 ? "font-semibold" : ""}
                              >
                                {e.text}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            Nothing yet — the body has no headings. Mark the
                            section titles in the body as Heading 1, 2 or 3 and
                            they appear here.
                          </p>
                        )}
                        <Button
                          variant="link"
                          size="sm"
                          className="mt-2 h-auto p-0"
                          onClick={() => setPart("body")}
                        >
                          Edit the body
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* Body */}
                <div
                  className={
                    part === "body" ? "flex min-h-0 flex-col gap-2" : "hidden"
                  }
                >
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
                          bodyEditorRef.current
                            ?.chain()
                            .setContent(starter.html, { emitUpdate: true })
                            .focus("start")
                            .run();
                          // Back to the top of the document, not the cursor's end.
                          requestAnimationFrame(() =>
                            bodyEditorRef.current?.view.dom
                              .closest(".overflow-y-auto")
                              ?.scrollTo({ top: 0 }),
                          );
                        }}
                      >
                        Use the outline
                      </Button>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    The agreement itself. Use Heading 1, 2 and 3 for the section
                    titles — they build the table of contents.
                  </p>
                  <div className="min-h-0 flex-1">
                    <RichTextEditor
                      fill
                      value={form.content}
                      onChange={(html) => set("content", html)}
                      highlightTokens={
                        registryQuery.isLoading ? undefined : known
                      }
                      onEditorReady={handleBodyReady}
                    />
                  </div>
                </div>

                {part !== "toc" && (
                  <div className="min-h-[320px] lg:min-h-0">
                    <MergeFieldsSidePanel
                      fields={fields}
                      loading={registryQuery.isLoading}
                      offline={offline}
                      counts={counts}
                      unknown={unknown}
                      elsewhere={elsewhere}
                      legacy={legacy}
                      index={index}
                      onFind={findToken}
                      onReplace={replaceToken}
                      onRemove={(t) => replaceToken(t, null)}
                      repeated={repeated}
                      onInsert={insertField}
                    />
                  </div>
                )}
              </div>
            </TabsContent>

            {/* ── Details ── */}
            <TabsContent
              value="details"
              className="m-0 min-h-0 flex-1 overflow-y-auto"
            >
              <div className="mx-auto max-w-3xl space-y-5 p-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="tpl-title">Title</Label>
                    <Input
                      id="tpl-title"
                      value={form.title}
                      onChange={(e) => set("title", e.target.value)}
                      placeholder="e.g. Share Purchase Agreement"
                    />
                  </div>
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
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">
                    {previewMode === "fields"
                      ? "Each merge field is shown as itself — a tenant's contract fills it from the deal or form. Amber is a field the system doesn't recognise."
                      : "Sample values are shown only to help you check the wording — real contracts use the deal's own data."}
                  </p>
                  <div className="flex shrink-0 gap-1 text-xs">
                    {(
                      [
                        ["fields", "Merge fields"],
                        ["samples", "Sample values"],
                      ] as const
                    ).map(([mode, label]) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setPreviewMode(mode)}
                        className={
                          previewMode === mode
                            ? "rounded-full border border-primary bg-primary/10 px-2.5 py-0.5 text-primary"
                            : "rounded-full border px-2.5 py-0.5 text-muted-foreground hover:text-foreground"
                        }
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="px-1 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {form.title || "Untitled template"}
                  </span>{" "}
                  · {moduleLabel(form.moduleKey)} ·{" "}
                  {areaLabel(form.moduleKey, form.areaKey)} — cover page, then
                  the table of contents, then the body.
                </p>
                <TemplatePagesPreview
                  coverHtml={form.coverPage}
                  tocEnabled={form.tocEnabled}
                  tocTitle={form.tocTitle}
                  bodyHtml={form.content}
                  transform={(h) =>
                    renderWithSamples(h, allFields, previewMode)
                  }
                />
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
                <ul className="max-h-60 list-disc space-y-1 overflow-y-auto pl-5 text-sm">
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
