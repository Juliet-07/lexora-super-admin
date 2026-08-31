import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileText,
  Plus,
  Search,
  Pencil,
  Trash2,
  Eye,
  Send,
  Undo2,
  Upload,
  FileUp,
  Download,
  Folder,
  FolderPlus,
  Settings2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { RichTextEditor, RichTextView } from "@/components/RichTextEditor";
import {
  CATEGORIES,
  emptyTemplate,
  fetchTemplates,
  createTemplate,
  updateTemplate,
  setStatus as setTemplateStatus,
  deleteTemplate,
  uploadTemplate,
  replaceTemplateFile,
  fetchFolders,
  createFolder,
  updateFolder,
  deleteFolder,
  setTemplateFolder,
  type ContractTemplate,
  type Category,
  type TemplateStatus,
  type TemplateFolder,
  TEMPLATE_MODULES,
  getModule,
  moduleLabel,
  areaLabel,
} from "@/lib/contract-template";

const WORD_ACCEPT =
  ".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

export default function ContractTemplates() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["contractTemplates"],
    queryFn: fetchTemplates,
    staleTime: 60 * 1000,
  });
  const { data: folders = [] } = useQuery({
    queryKey: ["contractTemplateFolders"],
    queryFn: fetchFolders,
    staleTime: 60 * 1000,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["contractTemplates"] });
  const invalidateFolders = () =>
    queryClient.invalidateQueries({ queryKey: ["contractTemplateFolders"] });

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  // "all" | "uncategorized" | a real folder id
  const [selectedFolder, setSelectedFolder] = useState("all");
  // Module scoping — templates exist per platform module (CRM, HR, GRC…)
  const [selectedModule, setSelectedModule] = useState("all");
  const [selectedArea, setSelectedArea] = useState("all");

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyTemplate);
  const [preview, setPreview] = useState<ContractTemplate | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ContractTemplate | null>(
    null,
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return templates
      .filter((t) =>
        selectedModule === "all" ? true : t.moduleKey === selectedModule,
      )
      .filter((t) =>
        selectedArea === "all" || selectedModule === "all"
          ? true
          : (t.areaKey ?? "") === selectedArea,
      )
      .filter((t) => (category === "all" ? true : t.category === category))
      .filter((t) => (status === "all" ? true : t.status === status))
      .filter((t) => {
        if (selectedFolder === "all") return true;
        if (selectedFolder === "uncategorized") return !t.folderId;
        return t.folderId === selectedFolder;
      })
      .filter((t) =>
        q
          ? t.title.toLowerCase().includes(q) ||
            t.description.toLowerCase().includes(q) ||
            (t.jurisdiction ?? "").toLowerCase().includes(q)
          : true,
      )
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [
    templates,
    search,
    category,
    status,
    selectedFolder,
    selectedModule,
    selectedArea,
  ]);

  const moduleScoped = useMemo(
    () =>
      selectedModule === "all"
        ? templates
        : templates.filter((t) => t.moduleKey === selectedModule),
    [templates, selectedModule],
  );
  const published = moduleScoped.filter((t) => t.status === "Published").length;
  const activeModule = getModule(selectedModule);

  const openCreate = () => {
    setEditingId(null);
    const mod = selectedModule === "all" ? "crm" : selectedModule;
    setForm({
      ...emptyTemplate,
      moduleKey: mod,
      areaKey:
        selectedArea !== "all"
          ? selectedArea
          : (getModule(mod)?.areas[0]?.key ?? null),
    });
    setEditorOpen(true);
  };

  const openEdit = (t: ContractTemplate) => {
    setEditingId(t.id);
    setForm({
      title: t.title,
      category: t.category,
      moduleKey: t.moduleKey,
      areaKey: t.areaKey ?? null,
      jurisdiction: t.jurisdiction ?? "",
      description: t.description,
      content: t.content,
      version: t.version,
      folderId: t.folderId ?? null,
    });
    setEditorOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: ({ nextStatus }: { nextStatus: TemplateStatus }) =>
      editingId
        ? updateTemplate(editingId, form).then((t) =>
            t.status === nextStatus ? t : setTemplateStatus(t.id, nextStatus),
          )
        : createTemplate(form).then((t) =>
            nextStatus === "Published"
              ? setTemplateStatus(t.id, nextStatus)
              : t,
          ),
    onSuccess: (_t, vars) => {
      invalidate();
      setEditorOpen(false);
      toast({
        title:
          vars.nextStatus === "Published"
            ? "Template published to tenants"
            : "Draft saved",
      });
    },
    onError: (err: any) =>
      toast({
        title: "Failed to save template",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  const save = (nextStatus: TemplateStatus) => {
    if (!form.title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    saveMutation.mutate({ nextStatus });
  };

  const statusMutation = useMutation({
    mutationFn: (t: ContractTemplate) =>
      setTemplateStatus(t.id, t.status === "Published" ? "Draft" : "Published"),
    onSuccess: (t) => {
      invalidate();
      toast({
        title:
          t.status === "Published"
            ? "Template is now visible to tenants"
            : "Template unpublished",
      });
    },
    onError: (err: any) =>
      toast({
        title: "Failed to update status",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTemplate(id),
    onSuccess: () => {
      invalidate();
      toast({ title: "Template deleted" });
      setPendingDelete(null);
    },
    onError: (err: any) =>
      toast({
        title: "Failed to delete template",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  // ── Folders ───────────────────────────────────────────────
  const [folderManagerOpen, setFolderManagerOpen] = useState(false);
  const [folderDraft, setFolderDraft] = useState({ name: "", description: "" });
  const [editingFolder, setEditingFolder] = useState<TemplateFolder | null>(
    null,
  );
  const [pendingDeleteFolder, setPendingDeleteFolder] =
    useState<TemplateFolder | null>(null);

  const resetFolderDraft = () => {
    setEditingFolder(null);
    setFolderDraft({ name: "", description: "" });
  };

  const folderSaveMutation = useMutation({
    mutationFn: () =>
      editingFolder
        ? updateFolder(editingFolder.id, folderDraft)
        : createFolder(folderDraft),
    onSuccess: () => {
      invalidateFolders();
      resetFolderDraft();
      toast({ title: editingFolder ? "Folder updated" : "Folder created" });
    },
    onError: (err: any) =>
      toast({
        title: "Failed to save folder",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  const folderDeleteMutation = useMutation({
    mutationFn: (id: string) => deleteFolder(id),
    onSuccess: () => {
      invalidateFolders();
      setPendingDeleteFolder(null);
      toast({ title: "Folder deleted" });
    },
    onError: (err: any) => {
      toast({
        title: "Couldn't delete folder",
        description: err?.response?.data?.message,
        variant: "destructive",
      });
      setPendingDeleteFolder(null);
    },
  });

  // Quick move — used from the table row, doesn't require opening
  // the full edit dialog. Works on uploaded templates too, since
  // folder placement is separate from content.
  const moveFolderMutation = useMutation({
    mutationFn: ({ id, folderId }: { id: string; folderId: string | null }) =>
      setTemplateFolder(id, folderId),
    onSuccess: () => {
      invalidate();
      toast({ title: "Moved" });
    },
    onError: (err: any) =>
      toast({
        title: "Failed to move template",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  // ── Upload ────────────────────────────────────────────────
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadMeta, setUploadMeta] = useState({
    title: "",
    category: "Employment" as Category,
    moduleKey: "crm",
    areaKey: "contracts" as string | null,
    jurisdiction: "",
    description: "",
    version: "1.0",
    folderId: null as string | null,
  });
  const [replaceTarget, setReplaceTarget] = useState<ContractTemplate | null>(
    null,
  );

  const openUpload = () => {
    setUploadFiles([]);
    setUploadMeta({
      title: "",
      category: "Employment",
      moduleKey: selectedModule === "all" ? "crm" : selectedModule,
      areaKey:
        selectedArea !== "all"
          ? selectedArea
          : (getModule(selectedModule === "all" ? "crm" : selectedModule)
              ?.areas[0]?.key ?? null),
      jurisdiction: "",
      description: "",
      version: "1.0",
      folderId: null,
    });
    setUploadOpen(true);
  };

  const uploadMutation = useMutation({
    mutationFn: () => uploadTemplate(uploadFiles, uploadMeta),
    onSuccess: (created) => {
      invalidate();
      setUploadOpen(false);
      toast({
        title:
          created.length === 1
            ? "Template uploaded"
            : `${created.length} templates uploaded`,
        description: "Saved as draft — publish when ready.",
      });
    },
    onError: (err: any) =>
      toast({
        title: "Failed to upload template",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  const replaceFileMutation = useMutation({
    mutationFn: (file: File) => replaceTemplateFile(replaceTarget!.id, file),
    onSuccess: () => {
      invalidate();
      setReplaceTarget(null);
      toast({ title: "File replaced" });
    },
    onError: (err: any) =>
      toast({
        title: "Failed to replace file",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Templates
          </h1>
          <p className="text-sm text-muted-foreground">
            Publish reusable templates per module — CRM, HR and GRC — for
            tenants to use in their workspaces.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={openUpload}>
            <Upload className="mr-2 h-4 w-4" /> Upload template
          </Button>
          <Button onClick={openCreate} className="gradient-primary">
            <Plus className="mr-2 h-4 w-4" /> New template
          </Button>
        </div>
      </div>

      {/* Module scope */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {[{ key: "all", name: "All modules" }, ...TEMPLATE_MODULES].map(
            (m) => {
              const active = selectedModule === m.key;
              return (
                <button
                  key={m.key}
                  onClick={() => {
                    setSelectedModule(m.key);
                    setSelectedArea("all");
                  }}
                  className={cn(
                    "rounded-full border px-4 py-1.5 text-sm transition-colors",
                    active
                      ? "border-primary bg-primary/15 font-medium text-primary"
                      : "border-border text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  )}
                >
                  {m.name}
                  <span className="ml-2 text-xs opacity-70">
                    {m.key === "all"
                      ? templates.length
                      : templates.filter((t) => t.moduleKey === m.key).length}
                  </span>
                </button>
              );
            },
          )}
        </div>
        {activeModule && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {activeModule.description}:
            </span>
            {[{ key: "all", name: "All areas" }, ...activeModule.areas].map(
              (a) => {
                const active = selectedArea === a.key;
                return (
                  <button
                    key={a.key}
                    onClick={() => setSelectedArea(a.key)}
                    className={cn(
                      "rounded-md px-2.5 py-1 text-xs transition-colors",
                      active
                        ? "bg-primary/15 font-medium text-primary"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                    )}
                  >
                    {a.name}
                  </button>
                );
              },
            )}
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <FileText className="h-5 w-5 text-primary" />
            <div>
              <p className="text-2xl font-bold text-foreground">
                {moduleScoped.length}
              </p>
              <p className="text-xs text-muted-foreground">
                {selectedModule === "all"
                  ? "Total templates"
                  : `${moduleLabel(selectedModule)} templates`}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Send className="h-5 w-5 text-primary" />
            <div>
              <p className="text-2xl font-bold text-foreground">{published}</p>
              <p className="text-xs text-muted-foreground">
                Published to tenants
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Pencil className="h-5 w-5 text-primary" />
            <div>
              <p className="text-2xl font-bold text-foreground">
                {moduleScoped.length - published}
              </p>
              <p className="text-xs text-muted-foreground">Drafts</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* Folder list */}
        <Card className="w-full shrink-0 lg:w-72">
          <CardContent className="p-3">
            <div className="flex items-center justify-between px-2 pb-2 pt-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Folders
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-muted-foreground"
                onClick={() => {
                  resetFolderDraft();
                  setFolderManagerOpen(true);
                }}
              >
                <Settings2 className="mr-1.5 h-3.5 w-3.5" /> Manage
              </Button>
            </div>
            <nav className="space-y-0.5">
              {[
                {
                  id: "all",
                  name: "All templates",
                  count: moduleScoped.length,
                  icon: FileText,
                },
                {
                  id: "uncategorized",
                  name: "Uncategorized",
                  count: moduleScoped.filter((t) => !t.folderId).length,
                  icon: Folder,
                },
                ...folders.map((f) => ({
                  id: f.id,
                  name: f.name,
                  count: moduleScoped.filter((t) => t.folderId === f.id).length,
                  icon: Folder,
                })),
              ].map((item) => {
                const active = selectedFolder === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setSelectedFolder(item.id)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                      active
                        ? "bg-primary/15 font-medium text-primary"
                        : "text-foreground/80 hover:bg-muted/60 hover:text-foreground",
                    )}
                  >
                    <item.icon
                      className={cn(
                        "h-4 w-4 shrink-0",
                        active ? "text-primary" : "text-muted-foreground",
                      )}
                    />
                    <span className="flex-1 truncate text-left">
                      {item.name}
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs",
                        active
                          ? "bg-primary/20 text-primary"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {item.count}
                    </span>
                  </button>
                );
              })}
            </nav>
            {folders.length === 0 && (
              <p className="px-3 py-2 text-xs text-muted-foreground">
                No folders yet — create one from Manage.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Templates table */}
        <Card className="min-w-0 flex-1">
          <CardContent className="space-y-4 p-4">
            <div className="flex flex-wrap gap-3">
              <div className="relative min-w-[220px] flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search templates..."
                  className="pl-9"
                />
              </div>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-[180px]">
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
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="Published">Published</SelectItem>
                  <SelectItem value="Draft">Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Template</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead>Folder</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Jurisdiction</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      Loading templates…
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && filtered.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      No templates match your filters.
                    </TableCell>
                  </TableRow>
                )}
                {filtered.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {t.sourceType === "uploaded" && (
                          <span title="Uploaded Word document">
                            <FileUp className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          </span>
                        )}
                        <p className="font-medium text-foreground">{t.title}</p>
                      </div>
                      <p className="line-clamp-1 text-xs text-muted-foreground">
                        {t.description}
                      </p>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <Badge variant="secondary" className="w-fit">
                          {moduleLabel(t.moduleKey)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {areaLabel(t.moduleKey, t.areaKey)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={t.folderId ?? "uncategorized"}
                        onValueChange={(v) =>
                          moveFolderMutation.mutate({
                            id: t.id,
                            folderId: v === "uncategorized" ? null : v,
                          })
                        }
                      >
                        <SelectTrigger className="h-8 w-[160px] text-xs">
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
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{t.category}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {t.jurisdiction || "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      v{t.version}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          t.status === "Published" ? "default" : "secondary"
                        }
                      >
                        {t.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(t.updatedAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setPreview(t)}
                          aria-label="Preview"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {t.sourceType === "uploaded" && t.fileUrl && (
                          <Button
                            variant="ghost"
                            size="icon"
                            asChild
                            aria-label="Download original file"
                          >
                            <a
                              href={t.fileUrl}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <Download className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        {t.sourceType === "uploaded" ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setReplaceTarget(t)}
                            aria-label="Replace file"
                          >
                            <Upload className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(t)}
                            aria-label="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={statusMutation.isPending}
                          onClick={() => statusMutation.mutate(t)}
                          aria-label={
                            t.status === "Published" ? "Unpublish" : "Publish"
                          }
                        >
                          {t.status === "Published" ? (
                            <Undo2 className="h-4 w-4" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setPendingDelete(t)}
                          aria-label="Delete"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit template" : "New template"}
            </DialogTitle>
            <DialogDescription>
              Published templates become available to every tenant.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[65vh] pr-4">
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={form.title}
                    onChange={(e) =>
                      setForm({ ...form, title: e.target.value })
                    }
                    placeholder="e.g. Standard Employment Agreement"
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
                </div>
                <div className="space-y-2">
                  <Label>Area</Label>
                  <Select
                    value={form.areaKey ?? ""}
                    onValueChange={(v) => setForm({ ...form, areaKey: v })}
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
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={form.category}
                    onValueChange={(v) =>
                      setForm({ ...form, category: v as Category })
                    }
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
                    onChange={(e) =>
                      setForm({ ...form, jurisdiction: e.target.value })
                    }
                    placeholder="e.g. Rwanda"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="version">Version</Label>
                  <Input
                    id="version"
                    value={form.version}
                    onChange={(e) =>
                      setForm({ ...form, version: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Folder</Label>
                  <Select
                    value={form.folderId ?? "uncategorized"}
                    onValueChange={(v) =>
                      setForm({
                        ...form,
                        folderId: v === "uncategorized" ? null : v,
                      })
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
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                    placeholder="Short summary tenants will see in the template list"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Template body</Label>
                <RichTextEditor
                  value={form.content}
                  onChange={(html) => setForm({ ...form, content: html })}
                />
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={saveMutation.isPending}
              onClick={() => save("Draft")}
            >
              Save draft
            </Button>
            <Button
              className="gradient-primary"
              disabled={saveMutation.isPending}
              onClick={() => save("Published")}
            >
              <Send className="mr-2 h-4 w-4" /> Publish to tenants
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-normal text-muted-foreground">
              Preview — how tenants will see this template
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-4">
            {preview && (
              <article className="space-y-5">
                <header className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">
                      {moduleLabel(preview.moduleKey)}
                      {preview.areaKey
                        ? ` · ${areaLabel(preview.moduleKey, preview.areaKey)}`
                        : ""}
                    </Badge>
                    <Badge variant="outline">{preview.category}</Badge>
                    {preview.jurisdiction && (
                      <Badge variant="secondary">{preview.jurisdiction}</Badge>
                    )}
                    <Badge
                      variant={
                        preview.status === "Published" ? "default" : "secondary"
                      }
                    >
                      {preview.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      v{preview.version}
                    </span>
                    {preview.sourceType === "uploaded" && (
                      <Badge variant="outline" className="gap-1">
                        <FileUp className="h-3 w-3" /> From uploaded Word
                        document
                      </Badge>
                    )}
                  </div>
                  <h2 className="text-2xl font-bold leading-tight text-foreground">
                    {preview.title}
                  </h2>
                  {preview.description && (
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {preview.description}
                    </p>
                  )}
                </header>
                <Separator />
                <RichTextView html={preview.content} />
              </article>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Upload template */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload contract template</DialogTitle>
            <DialogDescription>
              A Word document's real content is extracted automatically and
              becomes the template's text — previewable and
              editable-per-contract the same way an authored template is. Only
              .doc/.docx files are accepted.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="upload-file">
                Word document(s) (.doc, .docx) — select multiple to upload
                several templates at once
              </Label>
              <Input
                id="upload-file"
                type="file"
                accept={WORD_ACCEPT}
                multiple
                onChange={(e) =>
                  setUploadFiles(Array.from(e.target.files ?? []))
                }
              />
              {uploadFiles.length > 0 && (
                <div className="space-y-1 rounded-md border p-2">
                  {uploadFiles.map((f, i) => (
                    <div
                      key={`${f.name}-${i}`}
                      className="flex items-center justify-between gap-2 text-xs text-muted-foreground"
                    >
                      <span className="truncate">
                        {f.name} · {(f.size / 1024 / 1024).toFixed(2)} MB
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setUploadFiles((prev) =>
                            prev.filter((_, idx) => idx !== i),
                          )
                        }
                        className="shrink-0 text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="upload-title">
                  Title
                  {uploadFiles.length > 1 && (
                    <span className="ml-1.5 font-normal text-muted-foreground">
                      (ignored — each file's own name is used instead)
                    </span>
                  )}
                </Label>
                <Input
                  id="upload-title"
                  value={uploadMeta.title}
                  disabled={uploadFiles.length > 1}
                  onChange={(e) =>
                    setUploadMeta({ ...uploadMeta, title: e.target.value })
                  }
                  placeholder="e.g. Standard Employment Agreement"
                />
              </div>
              <div className="space-y-2">
                <Label>Module</Label>
                <Select
                  value={uploadMeta.moduleKey}
                  onValueChange={(v) =>
                    setUploadMeta({
                      ...uploadMeta,
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
              </div>
              <div className="space-y-2">
                <Label>Area</Label>
                <Select
                  value={uploadMeta.areaKey ?? ""}
                  onValueChange={(v) =>
                    setUploadMeta({ ...uploadMeta, areaKey: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an area" />
                  </SelectTrigger>
                  <SelectContent>
                    {(getModule(uploadMeta.moduleKey)?.areas ?? []).map((a) => (
                      <SelectItem key={a.key} value={a.key}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={uploadMeta.category}
                  onValueChange={(v) =>
                    setUploadMeta({ ...uploadMeta, category: v as Category })
                  }
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
                <Label htmlFor="upload-jurisdiction">Jurisdiction</Label>
                <Input
                  id="upload-jurisdiction"
                  value={uploadMeta.jurisdiction}
                  onChange={(e) =>
                    setUploadMeta({
                      ...uploadMeta,
                      jurisdiction: e.target.value,
                    })
                  }
                  placeholder="e.g. Rwanda"
                />
              </div>
              <div className="space-y-2">
                <Label>Folder</Label>
                <Select
                  value={uploadMeta.folderId ?? "uncategorized"}
                  onValueChange={(v) =>
                    setUploadMeta({
                      ...uploadMeta,
                      folderId: v === "uncategorized" ? null : v,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="uncategorized">Uncategorized</SelectItem>
                    {folders.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="upload-description">Description</Label>
                <Textarea
                  id="upload-description"
                  value={uploadMeta.description}
                  onChange={(e) =>
                    setUploadMeta({
                      ...uploadMeta,
                      description: e.target.value,
                    })
                  }
                  placeholder="Short summary tenants will see in the template list"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              className="gradient-primary"
              disabled={
                uploadFiles.length === 0 ||
                (uploadFiles.length === 1 && !uploadMeta.title.trim()) ||
                uploadMutation.isPending
              }
              onClick={() => uploadMutation.mutate()}
            >
              <Upload className="mr-2 h-4 w-4" />
              {uploadFiles.length > 1
                ? `Upload ${uploadFiles.length} as drafts`
                : "Upload as draft"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Replace an uploaded template's file */}
      <Dialog
        open={!!replaceTarget}
        onOpenChange={(o) => !o && setReplaceTarget(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Replace file — {replaceTarget?.title}</DialogTitle>
            <DialogDescription>
              The new document's content will be re-extracted, replacing the
              current preview text.
            </DialogDescription>
          </DialogHeader>
          <Input
            type="file"
            accept={WORD_ACCEPT}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) replaceFileMutation.mutate(file);
            }}
          />
          {replaceFileMutation.isPending && (
            <p className="text-xs text-muted-foreground">Uploading…</p>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(o) => !o && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete template?</AlertDialogTitle>
            <AlertDialogDescription>
              "{pendingDelete?.title}" will be removed and tenants will no
              longer see it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteMutation.isPending}
              onClick={() =>
                pendingDelete && deleteMutation.mutate(pendingDelete.id)
              }
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Manage folders */}
      <Dialog
        open={folderManagerOpen}
        onOpenChange={(o) => {
          setFolderManagerOpen(o);
          if (!o) resetFolderDraft();
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Manage folders</DialogTitle>
            <DialogDescription>
              Folders organize the template library — tenants browse templates
              grouped the same way.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2 rounded-lg border p-3">
              <Label htmlFor="folder-name">
                {editingFolder
                  ? `Rename "${editingFolder.name}"`
                  : "New folder"}
              </Label>
              <Input
                id="folder-name"
                value={folderDraft.name}
                onChange={(e) =>
                  setFolderDraft({ ...folderDraft, name: e.target.value })
                }
                placeholder="e.g. Employment Agreements"
              />
              <Input
                value={folderDraft.description}
                onChange={(e) =>
                  setFolderDraft({
                    ...folderDraft,
                    description: e.target.value,
                  })
                }
                placeholder="Description (optional)"
              />
              <div className="flex justify-end gap-2">
                {editingFolder && (
                  <Button variant="ghost" size="sm" onClick={resetFolderDraft}>
                    Cancel
                  </Button>
                )}
                <Button
                  size="sm"
                  disabled={
                    !folderDraft.name.trim() || folderSaveMutation.isPending
                  }
                  onClick={() => folderSaveMutation.mutate()}
                >
                  <FolderPlus className="mr-2 h-4 w-4" />
                  {editingFolder ? "Save" : "Create folder"}
                </Button>
              </div>
            </div>

            <ScrollArea className="max-h-64">
              <div className="space-y-2 pr-3">
                {folders.map((f) => (
                  <div
                    key={f.id}
                    className="flex items-center justify-between rounded-lg border p-2.5"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{f.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {f.templateCount} template
                          {f.templateCount === 1 ? "" : "s"}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Rename"
                        onClick={() => {
                          setEditingFolder(f);
                          setFolderDraft({
                            name: f.name,
                            description: f.description ?? "",
                          });
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Delete"
                        onClick={() => setPendingDeleteFolder(f)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {!folders.length && (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    No folders yet.
                  </p>
                )}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!pendingDeleteFolder}
        onOpenChange={(o) => !o && setPendingDeleteFolder(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete folder?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDeleteFolder && pendingDeleteFolder.templateCount > 0
                ? `"${pendingDeleteFolder.name}" has ${pendingDeleteFolder.templateCount} template(s) in it — move or delete them first.`
                : `"${pendingDeleteFolder?.name}" will be removed.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={
                folderDeleteMutation.isPending ||
                !!(pendingDeleteFolder && pendingDeleteFolder.templateCount > 0)
              }
              onClick={() =>
                pendingDeleteFolder &&
                folderDeleteMutation.mutate(pendingDeleteFolder.id)
              }
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
