import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ShieldCheck,
  Plus,
  Search,
  Pencil,
  Trash2,
  Send,
  Undo2,
  ArrowUpDown,
  Loader2,
  Layers,
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
  POLICY_CATEGORIES,
  deletePolicyTemplate,
  fetchPolicyTemplates,
  setPolicyTemplateStatus,
  type PolicyTemplate,
} from "@/lib/policy-templates";

const formatDate = (value?: string) =>
  value
    ? new Date(value).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "—";

type SortKey = "updated" | "published" | "title";

export default function PolicyTemplates() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    data: templates = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["policyTemplates"],
    queryFn: fetchPolicyTemplates,
    staleTime: 60 * 1000,
  });

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatusFilter] = useState("all");
  const [sort, setSort] = useState<SortKey>("updated");
  const [pendingDelete, setPendingDelete] = useState<PolicyTemplate | null>(
    null,
  );

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["policyTemplates"] });

  const statusMutation = useMutation({
    mutationFn: ({ id, next }: { id: string; next: "Draft" | "Published" }) =>
      setPolicyTemplateStatus(id, next),
    onSuccess: () => invalidate(),
    onError: (err: any) =>
      toast({
        title: "Failed to update status",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePolicyTemplate(id),
    onSuccess: () => {
      invalidate();
      toast({
        title: "Template deleted",
        description: `"${pendingDelete?.title}" has been removed.`,
      });
      setPendingDelete(null);
    },
    onError: (err: any) =>
      toast({
        title: "Failed to delete template",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = templates.filter((t) => {
      const matchesSearch =
        !q ||
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q);
      const matchesCategory = category === "all" || t.category === category;
      const matchesStatus = status === "all" || t.status === status;
      return matchesSearch && matchesCategory && matchesStatus;
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
  }, [templates, search, category, status, sort]);

  const published = templates.filter((t) => t.status === "Published").length;

  const toggleStatus = (template: PolicyTemplate) => {
    const next = template.status === "Published" ? "Draft" : "Published";
    statusMutation.mutate(
      { id: template.id, next },
      {
        onSuccess: () =>
          toast({
            title:
              next === "Published"
                ? "Template published"
                : "Template unpublished",
            description:
              next === "Published"
                ? `"${template.title}" is now selectable by tenants.`
                : `"${template.title}" is back to draft and hidden from tenants.`,
          }),
      },
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 gap-3 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Loading policy templates…</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-64 text-destructive text-sm">
        Failed to load policy templates. Check your connection and try again.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          {/* <div className="gradient-primary rounded-lg p-2.5 shadow-glow">
            <ShieldCheck className="h-5 w-5 text-primary-foreground" />
          </div> */}
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Policy Templates
            </h1>
            <p className="text-sm text-muted-foreground">
              {templates.length} templates · {published} published ·{" "}
              {templates.length - published} draft
            </p>
          </div>
        </div>
        <Button onClick={() => navigate("/policy-templates/new")}>
          <Plus className="mr-2 h-4 w-4" />
          Add template
        </Button>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <div className="relative min-w-[240px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search title or description…"
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {POLICY_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
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
                <TableHead className="w-[40%]">Template</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Sections</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((template) => (
                <TableRow key={template.id}>
                  <TableCell className="align-top">
                    <div className="font-medium text-foreground">
                      {template.title}
                    </div>
                    {template.description && (
                      <p className="mt-1 line-clamp-2 max-w-xl text-xs text-muted-foreground">
                        {template.description}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="align-top">
                    <Badge variant="outline">{template.category}</Badge>
                  </TableCell>
                  <TableCell className="align-top text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5" />
                      {template.sections.length}
                    </div>
                  </TableCell>
                  <TableCell className="align-top">
                    <Badge
                      variant={
                        template.status === "Published"
                          ? "default"
                          : "secondary"
                      }
                    >
                      {template.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="align-top text-sm text-muted-foreground">
                    <div>{formatDate(template.updatedAt)}</div>
                    {template.publishedAt && (
                      <div className="text-[11px]">
                        Pub. {formatDate(template.publishedAt)}
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
                            onClick={() =>
                              navigate(`/policy-templates/${template.id}`)
                            }
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
                            onClick={() => toggleStatus(template)}
                          >
                            {template.status === "Published" ? (
                              <Undo2 className="h-4 w-4" />
                            ) : (
                              <Send className="h-4 w-4" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {template.status === "Published"
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
                            onClick={() => setPendingDelete(template)}
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
                  <TableCell colSpan={6} className="py-16 text-center">
                    <p className="text-sm text-muted-foreground">
                      No templates match your filters.
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(o) => !o && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this template?</AlertDialogTitle>
            <AlertDialogDescription>
              "{pendingDelete?.title}" will be permanently removed. Policies
              already created from it are not affected, but tenants will no
              longer be able to select it for new policies. This cannot be
              undone.
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
                "Delete template"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
