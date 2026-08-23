import { useMemo, useState } from "react";
import {
  FileText,
  Plus,
  Search,
  Pencil,
  Trash2,
  Eye,
  Send,
  Undo2,
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
import { RichTextEditor, RichTextView } from "@/components/RichTextEditor";

const CATEGORIES = [
  "Employment",
  "Commercial",
  "Property",
  "NDA",
  "Services",
  "Corporate",
] as const;

type Category = (typeof CATEGORIES)[number];
type Status = "Draft" | "Published";

interface ContractTemplate {
  id: string;
  title: string;
  category: Category;
  jurisdiction: string;
  description: string;
  content: string;
  version: string;
  status: Status;
  updatedAt: string;
}

const emptyForm = {
  title: "",
  category: "Employment" as Category,
  jurisdiction: "",
  description: "",
  content: "",
  version: "1.0",
};

const seed: ContractTemplate[] = [
  {
    id: "tpl-1",
    title: "Standard Employment Agreement",
    category: "Employment",
    jurisdiction: "Rwanda",
    description:
      "Full-time employment contract covering remuneration, probation and termination.",
    content:
      "<h2>Employment Agreement</h2><p>This Agreement is made between <strong>[Employer]</strong> and <strong>[Employee]</strong>.</p><h3>1. Position</h3><p>The Employee shall serve as [Job Title].</p><h3>2. Remuneration</h3><p>The Employee shall be paid [Amount] per month.</p>",
    version: "2.1",
    status: "Published",
    updatedAt: "2026-07-14T10:00:00.000Z",
  },
  {
    id: "tpl-2",
    title: "Mutual Non-Disclosure Agreement",
    category: "NDA",
    jurisdiction: "International",
    description: "Two-way confidentiality agreement for commercial discussions.",
    content:
      "<h2>Mutual NDA</h2><p>Each party may disclose confidential information to the other.</p><h3>Term</h3><p>This Agreement remains in effect for three (3) years.</p>",
    version: "1.3",
    status: "Published",
    updatedAt: "2026-08-02T09:30:00.000Z",
  },
  {
    id: "tpl-3",
    title: "Commercial Lease Agreement",
    category: "Property",
    jurisdiction: "Kenya",
    description: "Lease of commercial premises with renewal and rent review terms.",
    content:
      "<h2>Commercial Lease</h2><p>The Landlord lets and the Tenant takes the Premises described below.</p>",
    version: "1.0",
    status: "Draft",
    updatedAt: "2026-08-18T15:45:00.000Z",
  },
];

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

export default function ContractTemplates() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<ContractTemplate[]>(seed);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [preview, setPreview] = useState<ContractTemplate | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ContractTemplate | null>(
    null,
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return templates
      .filter((t) => (category === "all" ? true : t.category === category))
      .filter((t) => (status === "all" ? true : t.status === status))
      .filter((t) =>
        q
          ? t.title.toLowerCase().includes(q) ||
            t.description.toLowerCase().includes(q) ||
            t.jurisdiction.toLowerCase().includes(q)
          : true,
      )
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [templates, search, category, status]);

  const published = templates.filter((t) => t.status === "Published").length;

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setEditorOpen(true);
  };

  const openEdit = (t: ContractTemplate) => {
    setEditingId(t.id);
    setForm({
      title: t.title,
      category: t.category,
      jurisdiction: t.jurisdiction,
      description: t.description,
      content: t.content,
      version: t.version,
    });
    setEditorOpen(true);
  };

  const save = (nextStatus: Status) => {
    if (!form.title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    const now = new Date().toISOString();
    if (editingId) {
      setTemplates((prev) =>
        prev.map((t) =>
          t.id === editingId
            ? { ...t, ...form, status: nextStatus, updatedAt: now }
            : t,
        ),
      );
    } else {
      setTemplates((prev) => [
        {
          id: `tpl-${Date.now()}`,
          ...form,
          status: nextStatus,
          updatedAt: now,
        },
        ...prev,
      ]);
    }
    setEditorOpen(false);
    toast({
      title:
        nextStatus === "Published"
          ? "Template published to tenants"
          : "Draft saved",
    });
  };

  const toggleStatus = (t: ContractTemplate) => {
    const next: Status = t.status === "Published" ? "Draft" : "Published";
    setTemplates((prev) =>
      prev.map((x) =>
        x.id === t.id
          ? { ...x, status: next, updatedAt: new Date().toISOString() }
          : x,
      ),
    );
    toast({
      title:
        next === "Published"
          ? "Template is now visible to tenants"
          : "Template unpublished",
    });
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    setTemplates((prev) => prev.filter((t) => t.id !== pendingDelete.id));
    setPendingDelete(null);
    toast({ title: "Template deleted" });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Contract Templates
          </h1>
          <p className="text-sm text-muted-foreground">
            Publish reusable contract templates for tenants to use in their
            workspaces.
          </p>
        </div>
        <Button onClick={openCreate} className="gradient-primary">
          <Plus className="mr-2 h-4 w-4" /> New template
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <FileText className="h-5 w-5 text-primary" />
            <div>
              <p className="text-2xl font-bold text-foreground">
                {templates.length}
              </p>
              <p className="text-xs text-muted-foreground">Total templates</p>
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
                {templates.length - published}
              </p>
              <p className="text-xs text-muted-foreground">Drafts</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
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
                <TableHead>Category</TableHead>
                <TableHead>Jurisdiction</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    No templates match your filters.
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>
                    <p className="font-medium text-foreground">{t.title}</p>
                    <p className="line-clamp-1 text-xs text-muted-foreground">
                      {t.description}
                    </p>
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
                      variant={t.status === "Published" ? "default" : "secondary"}
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
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(t)}
                        aria-label="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleStatus(t)}
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

      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit template" : "New contract template"}
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
            <Button variant="outline" onClick={() => save("Draft")}>
              Save draft
            </Button>
            <Button className="gradient-primary" onClick={() => save("Published")}>
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

      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(o) => !o && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete template?</AlertDialogTitle>
            <AlertDialogDescription>
              “{pendingDelete?.title}” will be removed and tenants will no
              longer see it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
