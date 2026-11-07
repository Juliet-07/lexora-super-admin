import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  Inbox,
  Loader2,
  MessageSquareReply,
  Search,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  fetchSupportTickets,
  fetchSupportStats,
  fetchSupportTicket,
  replySupportTicket,
  setSupportStatus,
  assignSupportToMe,
  SUPPORT_STATUSES,
  SUPPORT_PRIORITIES,
  type SupportStatus,
  type SupportTicket,
} from "@/lib/support-tickets";

const statusClass: Record<SupportStatus, string> = {
  Open: "bg-primary/10 text-primary border-primary/20",
  "In Progress": "bg-info/10 text-info border-info/20",
  "Waiting on Tenant": "bg-warning/10 text-warning border-warning/20",
  Resolved: "bg-success/10 text-success border-success/20",
  Closed: "bg-muted text-muted-foreground",
};
const priorityClass: Record<string, string> = {
  Low: "bg-muted text-muted-foreground",
  Medium: "bg-primary/10 text-primary",
  High: "bg-warning/10 text-warning",
  Urgent: "bg-destructive/10 text-destructive",
};

const isDone = (t: SupportTicket) => ["Resolved", "Closed"].includes(t.status);

export default function SupportTickets() {
  const qc = useQueryClient();
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");
  const [source, setSource] = useState("all");
  const [needsReply, setNeedsReply] = useState(false);
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filters = {
    status: status === "all" ? undefined : (status as SupportStatus),
    priority: priority === "all" ? undefined : (priority as any),
    source: source === "all" ? undefined : (source as any),
    needsReply: needsReply || undefined,
    q: q.trim() || undefined,
  };
  const { data: list = [], isLoading } = useQuery({
    queryKey: ["support-tickets", filters],
    queryFn: () => fetchSupportTickets(filters),
  });
  const { data: stats } = useQuery({
    queryKey: ["support-stats"],
    queryFn: fetchSupportStats,
  });
  const { data: selected } = useQuery({
    queryKey: ["support-ticket", selectedId],
    queryFn: () => fetchSupportTicket(selectedId as string),
    enabled: !!selectedId,
  });

  const [body, setBody] = useState("");
  const [internal, setInternal] = useState(false);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["support-tickets"] });
    qc.invalidateQueries({ queryKey: ["support-stats"] });
    if (selectedId)
      qc.invalidateQueries({ queryKey: ["support-ticket", selectedId] });
  };
  const onErr = (title: string) => (err: any) =>
    toast.error(title, { description: err?.response?.data?.message });

  const replyMut = useMutation({
    mutationFn: () => replySupportTicket(selectedId!, body.trim(), internal),
    onSuccess: () => {
      refresh();
      setBody("");
      toast.success(
        internal ? "Internal note saved" : "Reply sent to the tenant",
      );
    },
    onError: onErr("Couldn't send"),
  });
  const statusMut = useMutation({
    mutationFn: (s: SupportStatus) => setSupportStatus(selectedId!, s),
    onSuccess: refresh,
    onError: onErr("Couldn't change the status"),
  });
  const assignMut = useMutation({
    mutationFn: () => assignSupportToMe(selectedId!),
    onSuccess: refresh,
    onError: onErr("Couldn't assign"),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Support tickets
        </h1>
        <p className="text-sm text-muted-foreground">
          Tickets tenants raise with the platform team, and client Portal-access
          problems escalated.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { l: "Open", v: stats?.open, icon: Inbox },
          {
            l: "Awaiting reply",
            v: stats?.needsReply,
            icon: MessageSquareReply,
          },
          { l: "Urgent open", v: stats?.urgent, icon: AlertTriangle },
          { l: "Resolved / closed", v: stats?.resolved, icon: CheckCircle2 },
        ].map((k) => (
          <Card key={k.l}>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-xs text-muted-foreground">{k.l}</p>
                <p className="mt-1 text-xl font-bold">{k.v ?? "—"}</p>
              </div>
              <k.icon className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="w-64 pl-8"
            placeholder="Search subject, ref or tenant"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {SUPPORT_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={priority} onValueChange={setPriority}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            {SUPPORT_PRIORITIES.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={source} onValueChange={setSource}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sources</SelectItem>
            <SelectItem value="tenant">Raised by tenant</SelectItem>
            <SelectItem value="escalated">Escalated (Portal)</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Switch
            checked={needsReply}
            onCheckedChange={setNeedsReply}
            id="needs-reply"
          />
          <Label htmlFor="needs-reply" className="text-sm">
            Needs reply
          </Label>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ticket</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Handled by</TableHead>
                <TableHead>Last activity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    Loading…
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && list.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    No tickets match.
                  </TableCell>
                </TableRow>
              )}
              {list.map((t) => (
                <TableRow
                  key={t._id}
                  className="cursor-pointer"
                  onClick={() => setSelectedId(t._id)}
                >
                  <TableCell>
                    <p className="text-sm font-medium">{t.subject}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.ref} · {t.category}
                      {t.escalated && " · escalated"}
                    </p>
                  </TableCell>
                  <TableCell className="text-sm">{t.tenantName}</TableCell>
                  <TableCell>
                    <Badge className={priorityClass[t.priority]}>
                      {t.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge
                        variant="outline"
                        className={statusClass[t.status]}
                      >
                        {t.status}
                      </Badge>
                      {t.lastActor === "tenant" && !isDone(t) && (
                        <Badge className="bg-destructive/10 text-destructive">
                          Needs reply
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {t.assignedToName || "Unassigned"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(t.lastActivityAt).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Sheet
        open={!!selectedId}
        onOpenChange={(o) => !o && setSelectedId(null)}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.subject}</SheetTitle>
                <p className="text-sm text-muted-foreground">
                  {selected.ref} · {selected.tenantName} · {selected.category}
                </p>
              </SheetHeader>
              <div className="mt-4 space-y-4">
                {selected.escalated && (
                  <div className="flex items-start gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs">
                    <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                    <p>
                      Escalated by the tenant from one of their clients' Portal
                      tickets.
                    </p>
                  </div>
                )}
                <p className="whitespace-pre-wrap text-sm">
                  {selected.description}
                </p>
                <p className="text-xs text-muted-foreground">
                  Raised by {selected.raisedByName} ·{" "}
                  {new Date(selected.createdAt).toLocaleString()}
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Status</Label>
                    <Select
                      value={selected.status}
                      onValueChange={(v) =>
                        statusMut.mutate(v as SupportStatus)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SUPPORT_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Handled by</Label>
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      disabled={assignMut.isPending}
                      onClick={() => assignMut.mutate()}
                    >
                      <UserCheck className="mr-2 h-4 w-4" />
                      {selected.assignedToName || "Assign to me"}
                    </Button>
                  </div>
                </div>

                <h4 className="text-sm font-semibold">Conversation</h4>
                <div className="space-y-2">
                  {(selected.messages ?? []).length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No messages yet.
                    </p>
                  )}
                  {(selected.messages ?? []).map((m) => (
                    <div
                      key={m._id}
                      className={cn(
                        "rounded-lg border p-3",
                        m.internal
                          ? "border-warning/40 bg-warning/5"
                          : m.authorType === "platform"
                            ? "border-primary/30 bg-primary/5"
                            : "bg-card",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">
                          {m.authorName}
                        </span>
                        <Badge variant="outline" className="text-[10px]">
                          {m.internal
                            ? "Internal note"
                            : m.authorType === "platform"
                              ? "Platform team"
                              : "Tenant"}
                        </Badge>
                      </div>
                      <p className="mt-1 whitespace-pre-wrap text-sm">
                        {m.body}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Date(m.at).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <Textarea
                    rows={4}
                    placeholder={
                      internal
                        ? "Internal note (the tenant won't see this)…"
                        : "Reply to the tenant…"
                    }
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                  />
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={internal}
                        onCheckedChange={setInternal}
                        id="internal"
                      />
                      <Label htmlFor="internal" className="text-xs">
                        {internal ? "Internal note" : "Send to tenant"}
                      </Label>
                    </div>
                    <Button
                      size="sm"
                      disabled={!body.trim() || replyMut.isPending}
                      onClick={() => replyMut.mutate()}
                    >
                      {replyMut.isPending && (
                        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                      )}
                      {internal ? "Save note" : "Send reply"}
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
