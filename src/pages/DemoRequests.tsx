import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CalendarClock,
  Clock,
  Inbox,
  Loader2,
  Mail,
  Plus,
  Search,
  Trash2,
  CheckCircle2,
  XCircle,
  Building2,
  Link2,
  CalendarCheck,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  WEEKDAYS,
  type Weekday,
  type DemoRequest,
  type DemoRequestStatus,
  type Availability,
  fetchDemoRequests,
  fetchAvailability,
  saveAvailability,
  confirmSchedule,
  rescheduleRequest,
  cancelRequest,
  completeRequest,
  updateRequestNotes,
} from "@/lib/demo-requests";

const STATUSES: DemoRequestStatus[] = [
  "Scheduled",
  "Rescheduled",
  "Cancelled",
  "Completed",
];

const DAY_LABELS: Record<Weekday, string> = {
  Mon: "Monday",
  Tue: "Tuesday",
  Wed: "Wednesday",
  Thu: "Thursday",
  Fri: "Friday",
  Sat: "Saturday",
  Sun: "Sunday",
};

const statusStyle: Record<DemoRequestStatus, string> = {
  Scheduled: "bg-secondary text-secondary-foreground border-border",
  Rescheduled: "bg-accent/15 text-accent-foreground border-accent/30",
  Completed: "bg-muted text-foreground border-border",
  Cancelled: "bg-destructive/15 text-destructive border-destructive/30",
};

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

type PendingAction = "confirm" | "reschedule" | "cancel" | "complete" | null;

export default function DemoRequests() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | DemoRequestStatus>(
    "all",
  );
  const [selected, setSelected] = useState<DemoRequest | null>(null);
  const [action, setAction] = useState<PendingAction>(null);
  const [meetingLink, setMeetingLink] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [notesDraft, setNotesDraft] = useState("");

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["demo-requests"],
    queryFn: fetchDemoRequests,
    staleTime: 30 * 1000,
  });

  const { data: serverAvail, isLoading: availLoading } = useQuery({
    queryKey: ["demo-availability"],
    queryFn: fetchAvailability,
  });

  const [avail, setAvail] = useState<Availability | null>(null);
  const [newSlot, setNewSlot] = useState<Record<string, string>>({});

  useEffect(() => {
    if (serverAvail && !avail) setAvail(serverAvail);
  }, [serverAvail, avail]);

  // Re-hydrate the selected request from the latest list after any
  // mutation invalidates it, so the dialog reflects the new status
  // without needing its own refetch.
  useEffect(() => {
    if (selected) {
      const fresh = requests.find((r) => r.id === selected.id);
      if (fresh && fresh !== selected) setSelected(fresh);
    }
  }, [requests, selected]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return requests
      .filter((r) => statusFilter === "all" || r.status === statusFilter)
      .filter(
        (r) =>
          !q ||
          `${r.firstName} ${r.lastName} ${r.email} ${r.company} ${r.subject}`
            .toLowerCase()
            .includes(q),
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [requests, search, statusFilter]);

  const count = (s: DemoRequestStatus) =>
    requests.filter((r) => r.status === s).length;

  const openRequest = (r: DemoRequest) => {
    setSelected(r);
    setAction(null);
    setMeetingLink(r.meetingLink || "");
    setCancelReason("");
    setNotesDraft(r.notes || "");
  };

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["demo-requests"] });

  const confirmMut = useMutation({
    mutationFn: ({ id, link }: { id: string; link: string }) =>
      confirmSchedule(id, link),
    onSuccess: (updated) => {
      invalidate();
      setSelected(updated);
      setAction(null);
      toast.success("Booking confirmed — the requester has been emailed.");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || "Failed to confirm booking"),
  });

  const rescheduleMut = useMutation({
    mutationFn: (id: string) => rescheduleRequest(id),
    onSuccess: (updated) => {
      invalidate();
      setSelected(updated);
      setAction(null);
      toast.success("Requester notified of the new time.");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || "Failed to reschedule"),
  });

  const cancelMut = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      cancelRequest(id, reason),
    onSuccess: (updated) => {
      invalidate();
      setSelected(updated);
      setAction(null);
      toast("Request cancelled — the requester has been emailed.");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || "Failed to cancel"),
  });

  const completeMut = useMutation({
    mutationFn: (id: string) => completeRequest(id),
    onSuccess: (updated) => {
      invalidate();
      setSelected(updated);
      setAction(null);
      toast.success("Marked as completed.");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || "Failed to mark completed"),
  });

  const notesMut = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) =>
      updateRequestNotes(id, notes),
    onSuccess: (updated) => {
      invalidate();
      setSelected(updated);
      toast.success("Notes saved");
    },
  });

  const availMut = useMutation({
    mutationFn: (input: Availability) => saveAvailability(input),
    onSuccess: (saved) => {
      setAvail(saved);
      toast.success("Weekly availability saved");
    },
    onError: (err: any) =>
      toast.error(
        err?.response?.data?.message || "Failed to save availability",
      ),
  });

  const setDayField = <K extends keyof Availability["days"][number]>(
    day: Weekday,
    key: K,
    value: Availability["days"][number][K],
  ) => {
    setAvail((a) =>
      a
        ? {
            ...a,
            days: a.days.map((d) =>
              d.day === day ? { ...d, [key]: value } : d,
            ),
          }
        : a,
    );
  };

  const addSlot = (day: Weekday) => {
    const t = newSlot[day];
    if (!t || !avail) return;
    const d = avail.days.find((x) => x.day === day);
    if (d?.slots.includes(t)) {
      toast.error("That time already exists");
      return;
    }
    setDayField(day, "slots", [...(d?.slots ?? []), t].sort());
    setNewSlot((n) => ({ ...n, [day]: "" }));
  };

  const removeSlot = (day: Weekday, t: string) => {
    const d = avail?.days.find((x) => x.day === day);
    setDayField(
      day,
      "slots",
      (d?.slots ?? []).filter((s) => s !== t),
    );
  };

  const totalSlots =
    avail?.days.reduce((n, d) => n + (d.enabled ? d.slots.length : 0), 0) ?? 0;

  // What the Super Admin is allowed to do next, given the request's
  // current state — mirrors the Oct 2026 spec exactly: Completed is
  // only reachable from an already-confirmed Scheduled meeting, a
  // Reschedule only offered while there's still an unused alternate
  // date on file, and Cancelled/Completed are terminal.
  const availableActions = (r: DemoRequest): PendingAction[] => {
    if (r.status === "Cancelled" || r.status === "Completed") return [];
    const actions: PendingAction[] = [];
    if (r.status === "Scheduled" && r.confirmedAt) {
      actions.push("complete");
    } else {
      actions.push("confirm");
    }
    if (r.alternateDate && r.alternateTime) actions.push("reschedule");
    actions.push("cancel");
    return actions;
  };

  const actionLabel: Record<Exclude<PendingAction, null>, string> = {
    confirm: "Confirm booking",
    reschedule: "Reschedule",
    cancel: "Cancel booking",
    complete: "Mark completed",
  };

  const applyAction = () => {
    if (!selected || !action) return;
    if (action === "confirm") {
      if (!meetingLink.trim()) return toast.error("Add a meeting link first.");
      confirmMut.mutate({ id: selected.id, link: meetingLink.trim() });
    } else if (action === "reschedule") {
      rescheduleMut.mutate(selected.id);
    } else if (action === "cancel") {
      if (!cancelReason.trim())
        return toast.error("A reason is required to cancel.");
      cancelMut.mutate({ id: selected.id, reason: cancelReason.trim() });
    } else if (action === "complete") {
      completeMut.mutate(selected.id);
    }
  };

  const applying =
    confirmMut.isPending ||
    rescheduleMut.isPending ||
    cancelMut.isPending ||
    completeMut.isPending;

  const isTerminal =
    selected &&
    (selected.status === "Cancelled" || selected.status === "Completed");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Contact Requests</h1>
        <p className="text-muted-foreground">
          Demo and contact requests submitted from the Lexora website.
        </p>
      </div>

      <Tabs defaultValue="requests">
        <TabsList>
          <TabsTrigger value="requests">
            <Inbox className="h-4 w-4 mr-2" />
            Requests
          </TabsTrigger>
          <TabsTrigger value="availability">
            <CalendarClock className="h-4 w-4 mr-2" />
            Weekly availability
          </TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(statusFilter === s ? "all" : s)}
                className={cn(
                  "rounded-lg border bg-card p-4 text-left transition-colors hover:border-primary/50",
                  statusFilter === s && "border-primary",
                )}
              >
                <p className="text-xs text-muted-foreground">{s}</p>
                <p className="text-2xl font-bold">{count(s)}</p>
              </button>
            ))}
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search name, email, company…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as any)}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center gap-3 py-16 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-sm">Loading requests…</span>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Contact</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Requested slot</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Submitted</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((r) => (
                      <TableRow
                        key={r.id}
                        className="cursor-pointer"
                        onClick={() => openRequest(r)}
                      >
                        <TableCell>
                          <p className="font-medium">
                            {r.firstName} {r.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {r.email}
                          </p>
                        </TableCell>
                        <TableCell>{r.company || "—"}</TableCell>
                        <TableCell>{r.subject}</TableCell>
                        <TableCell>
                          {fmtDate(r.requestedDate)} · {r.requestedTime}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge
                              variant="outline"
                              className={statusStyle[r.status]}
                            >
                              {r.status}
                            </Badge>
                            {r.status === "Scheduled" && (
                              <Badge variant="outline" className="text-[10px]">
                                {r.confirmedAt
                                  ? "Confirmed"
                                  : "Awaiting confirmation"}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {new Date(r.createdAt).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                    {filtered.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-center text-muted-foreground py-8"
                        >
                          No requests found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="availability" className="space-y-4 mt-4">
          {availLoading || !avail ? (
            <div className="flex items-center justify-center gap-3 py-16 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Loading availability…</span>
            </div>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Booking settings</CardTitle>
                  <CardDescription>
                    These slots are shown to visitors on the website's "Select a
                    time" step, every week.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Time zone</Label>
                    <Select
                      value={avail.timezone}
                      onValueChange={(v) =>
                        setAvail((a) => (a ? { ...a, timezone: v } : a))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["CAT", "WAT", "EAT", "GMT"].map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Session length</Label>
                    <Select
                      value={String(avail.durationMinutes)}
                      onValueChange={(v) =>
                        setAvail((a) =>
                          a ? { ...a, durationMinutes: Number(v) } : a,
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["15", "30", "45", "60"].map((d) => (
                          <SelectItem key={d} value={d}>
                            {d} minutes
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="rounded-lg bg-muted p-4 flex items-center gap-3">
                    <Clock className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium">
                        {totalSlots} slots per week
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {avail.durationMinutes}-min sessions · {avail.timezone}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                {WEEKDAYS.map((day) => {
                  const d = avail.days.find((x) => x.day === day) ?? {
                    day,
                    enabled: false,
                    slots: [],
                  };
                  return (
                    <Card key={day} className={cn(!d.enabled && "opacity-60")}>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                        <CardTitle className="text-base">
                          {DAY_LABELS[day]}
                        </CardTitle>
                        <Switch
                          checked={d.enabled}
                          onCheckedChange={(v) =>
                            setDayField(day, "enabled", v)
                          }
                        />
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {d.enabled ? (
                          <>
                            <div className="flex flex-wrap gap-2">
                              {d.slots.length === 0 && (
                                <p className="text-sm text-muted-foreground">
                                  No slots yet
                                </p>
                              )}
                              {d.slots.map((t) => (
                                <span
                                  key={t}
                                  className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-sm"
                                >
                                  {t}
                                  <button
                                    onClick={() => removeSlot(day, t)}
                                    aria-label={`Remove ${t}`}
                                    className="text-muted-foreground hover:text-destructive"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </span>
                              ))}
                            </div>
                            <div className="flex gap-2">
                              <Input
                                type="time"
                                value={newSlot[day] ?? ""}
                                onChange={(e) =>
                                  setNewSlot((n) => ({
                                    ...n,
                                    [day]: e.target.value,
                                  }))
                                }
                              />
                              <Button
                                size="icon"
                                variant="outline"
                                onClick={() => addSlot(day)}
                                aria-label="Add slot"
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          </>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            Unavailable
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              <div className="flex justify-end">
                <Button
                  disabled={availMut.isPending}
                  onClick={() => avail && availMut.mutate(avail)}
                >
                  {availMut.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : null}
                  Save availability
                </Button>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        {selected && (
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selected.firstName} {selected.lastName}
                <Badge
                  variant="outline"
                  className={statusStyle[selected.status]}
                >
                  {selected.status}
                </Badge>
              </DialogTitle>
              <DialogDescription>
                Submitted {new Date(selected.createdAt).toLocaleString()}
              </DialogDescription>
            </DialogHeader>

            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a
                  className="text-primary hover:underline"
                  href={`mailto:${selected.email}`}
                >
                  {selected.email}
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                {selected.company || "—"} · {selected.industry || "—"} ·{" "}
                {selected.companySize || "—"}
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Subject</p>
                {selected.subject}
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Requested slot</p>
                {fmtDate(selected.requestedDate)} at {selected.requestedTime}
              </div>
            </div>

            {selected.alternateDate && selected.alternateTime && (
              <p className="text-xs text-muted-foreground">
                Alternate date on file: {fmtDate(selected.alternateDate)} at{" "}
                {selected.alternateTime}
              </p>
            )}

            <div>
              <p className="text-muted-foreground text-xs mb-2">Interests</p>
              <div className="flex flex-wrap gap-2">
                {selected.interests.map((i) => (
                  <Badge key={i} variant="outline">
                    {i}
                  </Badge>
                ))}
              </div>
            </div>

            {selected.goals && (
              <div>
                <p className="text-muted-foreground text-xs mb-1">Goals</p>
                <p className="rounded-md bg-muted p-3 text-sm">
                  {selected.goals}
                </p>
              </div>
            )}

            {isTerminal ? (
              // Terminal state — Cancelled or Completed — is a
              // read-only details view per the Oct 2026 spec: no
              // confirm-booking form, just what happened and why.
              <div className="space-y-3">
                {selected.status === "Cancelled" && (
                  <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
                    <p className="text-xs text-muted-foreground mb-1">
                      Cancellation reason
                    </p>
                    <p className="text-sm">
                      {selected.cancellationReason || "—"}
                    </p>
                  </div>
                )}
                {selected.status === "Completed" && selected.meetingLink && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Link2 className="h-4 w-4" />
                    <span>Met via {selected.meetingLink}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3 rounded-lg border p-4">
                <Label>Action</Label>
                <Select
                  value={action ?? undefined}
                  onValueChange={(v) => setAction(v as PendingAction)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose what to do with this request" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableActions(selected).map((a) => (
                      <SelectItem key={a as string} value={a as string}>
                        {actionLabel[a as Exclude<PendingAction, null>]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {action === "confirm" && (
                  <div className="space-y-2">
                    <Label>Meeting link</Label>
                    <Input
                      placeholder="https://zoom.us/j/… or Teams/Google Meet link"
                      value={meetingLink}
                      onChange={(e) => setMeetingLink(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      The requester will receive a confirmation email with this
                      link.
                    </p>
                  </div>
                )}

                {action === "reschedule" && (
                  <div className="flex items-center gap-2 rounded-md bg-muted p-3 text-sm">
                    <CalendarCheck className="h-4 w-4 text-primary" />
                    <span>
                      Moves this meeting to{" "}
                      {selected.alternateDate &&
                        fmtDate(selected.alternateDate)}{" "}
                      at {selected.alternateTime} — the alternate time the
                      requester gave us.
                    </span>
                  </div>
                )}

                {action === "cancel" && (
                  <div className="space-y-2">
                    <Label>Reason for cancelling</Label>
                    <Textarea
                      rows={3}
                      placeholder="This is included in the email sent to the requester…"
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                    />
                  </div>
                )}

                {action === "complete" && (
                  <p className="text-sm text-muted-foreground">
                    Marks this meeting as completed. No email is sent.
                  </p>
                )}

                {action && (
                  <div className="flex justify-end">
                    <Button disabled={applying} onClick={applyAction}>
                      {applying ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : action === "cancel" ? (
                        <XCircle className="h-4 w-4 mr-2" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                      )}
                      {actionLabel[action]}
                    </Button>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label>Internal notes</Label>
              <Textarea
                rows={3}
                value={notesDraft}
                onChange={(e) => setNotesDraft(e.target.value)}
                placeholder="Add notes for the team…"
              />
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={notesMut.isPending || notesDraft === selected.notes}
                  onClick={() =>
                    notesMut.mutate({ id: selected.id, notes: notesDraft })
                  }
                >
                  Save notes
                </Button>
              </div>
            </div>

            <DialogFooter>
              <Button variant="ghost" onClick={() => setSelected(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
