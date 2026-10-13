import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CalendarClock, Clock, Inbox, Mail, Plus, Search, Trash2, CheckCircle2, XCircle, Building2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Status = "New" | "Contacted" | "Scheduled" | "Completed" | "Cancelled";
const STATUSES: Status[] = ["New", "Contacted", "Scheduled", "Completed", "Cancelled"];

interface DemoRequest {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  company?: string;
  industry?: string;
  companySize?: string;
  subject: string;
  interests: string[];
  goals?: string;
  slotDate: string; // YYYY-MM-DD
  slotTime: string; // HH:mm
  status: Status;
  notes: string;
  submittedAt: string;
}

const seed: DemoRequest[] = [
  { id: "r1", firstName: "Amara", lastName: "Okafor", email: "amara@zenithlegal.com", company: "Zenith Legal", industry: "Legal services", companySize: "51-200", subject: "Product demo", interests: ["Lexora Projects (CRM)", "Lexora GRC"], goals: "Want to centralise matter management and compliance tracking.", slotDate: "2026-10-14", slotTime: "09:00", status: "New", notes: "", submittedAt: "2026-10-12T14:22:00" },
  { id: "r2", firstName: "Jean", lastName: "Mugisha", email: "jean.m@kigalibank.rw", company: "Kigali Bank", industry: "Financial services", companySize: "500+", subject: "AML/KYC", interests: ["Lexora AML/KYC", "Lexora Finance"], goals: "Automate onboarding checks.", slotDate: "2026-10-15", slotTime: "11:00", status: "Scheduled", notes: "Invite sent with Teams link.", submittedAt: "2026-10-11T09:05:00" },
  { id: "r3", firstName: "Sarah", lastName: "Kimani", email: "sarah@brightpeople.co.ke", company: "BrightPeople", industry: "HR consulting", companySize: "11-50", subject: "Partnership", interests: ["Lexora HR", "Capacity building"], slotDate: "2026-10-16", slotTime: "14:00", status: "Contacted", notes: "Emailed pricing deck.", submittedAt: "2026-10-10T16:40:00" },
  { id: "r4", firstName: "David", lastName: "Mensah", email: "d.mensah@accraco.gh", company: "AccraCo", industry: "Energy", companySize: "201-500", subject: "Product demo", interests: ["Full platform overview"], goals: "Board asked for an org health review.", slotDate: "2026-10-08", slotTime: "10:00", status: "Completed", notes: "Strong fit. Follow up with proposal.", submittedAt: "2026-10-03T11:12:00" },
  { id: "r5", firstName: "Lina", lastName: "Haddad", email: "lina@deallab.io", company: "DealLab", industry: "Investment", companySize: "11-50", subject: "Product demo", interests: ["Deal / transaction mgt", "Advisory"], slotDate: "2026-10-09", slotTime: "15:00", status: "Cancelled", notes: "Asked to reschedule next quarter.", submittedAt: "2026-10-02T08:30:00" },
  { id: "r6", firstName: "Tomás", lastName: "Silva", email: "tomas@northstar.pt", company: "Northstar", industry: "Manufacturing", companySize: "51-200", subject: "Org. health assessment", interests: ["Org. health assessment", "Lexora GRC"], slotDate: "2026-10-17", slotTime: "09:00", status: "New", notes: "", submittedAt: "2026-10-13T07:58:00" },
];

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
type DayAvail = { enabled: boolean; slots: string[] };
const seedAvail: Record<string, DayAvail> = {
  Monday: { enabled: true, slots: ["09:00", "11:00", "14:00"] },
  Tuesday: { enabled: true, slots: ["10:00", "14:00", "16:00"] },
  Wednesday: { enabled: true, slots: ["09:00", "11:00", "15:00"] },
  Thursday: { enabled: true, slots: ["10:00", "13:00", "15:00"] },
  Friday: { enabled: true, slots: ["09:00", "11:00", "14:00"] },
  Saturday: { enabled: false, slots: [] },
  Sunday: { enabled: false, slots: [] },
};

const statusStyle: Record<Status, string> = {
  New: "bg-primary/15 text-primary border-primary/30",
  Contacted: "bg-accent/15 text-accent-foreground border-accent/30",
  Scheduled: "bg-secondary text-secondary-foreground border-border",
  Completed: "bg-muted text-foreground border-border",
  Cancelled: "bg-destructive/15 text-destructive border-destructive/30",
};

const fmtDate = (d: string) => new Date(d + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });

export default function DemoRequests() {
  const [requests, setRequests] = useState(seed);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Status>("all");
  const [selected, setSelected] = useState<DemoRequest | null>(null);
  const [avail, setAvail] = useState(seedAvail);
  const [timezone, setTimezone] = useState("CAT (UTC+2)");
  const [duration, setDuration] = useState("30");
  const [newSlot, setNewSlot] = useState<Record<string, string>>({});

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return requests
      .filter((r) => statusFilter === "all" || r.status === statusFilter)
      .filter((r) => !q || `${r.firstName} ${r.lastName} ${r.email} ${r.company} ${r.subject}`.toLowerCase().includes(q))
      .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  }, [requests, search, statusFilter]);

  const count = (s: Status) => requests.filter((r) => r.status === s).length;

  const update = (id: string, patch: Partial<DemoRequest>) => {
    setRequests((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    setSelected((s) => (s && s.id === id ? { ...s, ...patch } : s));
  };

  const addSlot = (day: string) => {
    const t = newSlot[day];
    if (!t) return;
    if (avail[day].slots.includes(t)) return toast.error("That time already exists");
    setAvail((a) => ({ ...a, [day]: { ...a[day], slots: [...a[day].slots, t].sort() } }));
    setNewSlot((n) => ({ ...n, [day]: "" }));
  };

  const removeSlot = (day: string, t: string) =>
    setAvail((a) => ({ ...a, [day]: { ...a[day], slots: a[day].slots.filter((s) => s !== t) } }));

  const totalSlots = DAYS.reduce((n, d) => n + (avail[d].enabled ? avail[d].slots.length : 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Contact Requests</h1>
        <p className="text-muted-foreground">Demo and contact requests submitted from the Lexora website.</p>
      </div>

      <Tabs defaultValue="requests">
        <TabsList>
          <TabsTrigger value="requests"><Inbox className="h-4 w-4 mr-2" />Requests</TabsTrigger>
          <TabsTrigger value="availability"><CalendarClock className="h-4 w-4 mr-2" />Weekly availability</TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {STATUSES.map((s) => (
              <button key={s} onClick={() => setStatusFilter(statusFilter === s ? "all" : s)}
                className={cn("rounded-lg border bg-card p-4 text-left transition-colors hover:border-primary/50", statusFilter === s && "border-primary")}>
                <p className="text-xs text-muted-foreground">{s}</p>
                <p className="text-2xl font-bold">{count(s)}</p>
              </button>
            ))}
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9" placeholder="Search name, email, company…" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
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
                    <TableRow key={r.id} className="cursor-pointer" onClick={() => setSelected(r)}>
                      <TableCell>
                        <p className="font-medium">{r.firstName} {r.lastName}</p>
                        <p className="text-xs text-muted-foreground">{r.email}</p>
                      </TableCell>
                      <TableCell>{r.company ?? "—"}</TableCell>
                      <TableCell>{r.subject}</TableCell>
                      <TableCell>{fmtDate(r.slotDate)} · {r.slotTime}</TableCell>
                      <TableCell><Badge variant="outline" className={statusStyle[r.status]}>{r.status}</Badge></TableCell>
                      <TableCell className="text-muted-foreground text-sm">{new Date(r.submittedAt).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No requests found.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="availability" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Booking settings</CardTitle>
              <CardDescription>These slots are shown to visitors on the website's "Select a time" step, every week.</CardDescription>
            </CardHeader>
            <CardContent className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Time zone</Label>
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["CAT (UTC+2)", "WAT (UTC+1)", "EAT (UTC+3)", "GMT (UTC+0)"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Session length</Label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["15", "30", "45", "60"].map((d) => <SelectItem key={d} value={d}>{d} minutes</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="rounded-lg bg-muted p-4 flex items-center gap-3">
                <Clock className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">{totalSlots} slots per week</p>
                  <p className="text-xs text-muted-foreground">{duration}-min sessions · {timezone}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {DAYS.map((day) => {
              const d = avail[day];
              return (
                <Card key={day} className={cn(!d.enabled && "opacity-60")}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                    <CardTitle className="text-base">{day}</CardTitle>
                    <Switch checked={d.enabled} onCheckedChange={(v) => setAvail((a) => ({ ...a, [day]: { ...a[day], enabled: v } }))} />
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {d.enabled ? (
                      <>
                        <div className="flex flex-wrap gap-2">
                          {d.slots.length === 0 && <p className="text-sm text-muted-foreground">No slots yet</p>}
                          {d.slots.map((t) => (
                            <span key={t} className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-sm">
                              {t}
                              <button onClick={() => removeSlot(day, t)} aria-label={`Remove ${t}`} className="text-muted-foreground hover:text-destructive">
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <Input type="time" value={newSlot[day] ?? ""} onChange={(e) => setNewSlot((n) => ({ ...n, [day]: e.target.value }))} />
                          <Button size="icon" variant="outline" onClick={() => addSlot(day)} aria-label="Add slot"><Plus className="h-4 w-4" /></Button>
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">Unavailable</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <div className="flex justify-end">
            <Button onClick={() => toast.success("Weekly availability saved")}>Save availability</Button>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        {selected && (
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selected.firstName} {selected.lastName}</DialogTitle>
              <DialogDescription>Submitted {new Date(selected.submittedAt).toLocaleString()}</DialogDescription>
            </DialogHeader>
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" /><a className="text-primary hover:underline" href={`mailto:${selected.email}`}>{selected.email}</a></div>
              <div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-muted-foreground" />{selected.company ?? "—"} · {selected.industry ?? "—"} · {selected.companySize ?? "—"}</div>
              <div><p className="text-muted-foreground text-xs">Subject</p>{selected.subject}</div>
              <div><p className="text-muted-foreground text-xs">Requested slot</p>{fmtDate(selected.slotDate)} at {selected.slotTime} ({timezone})</div>
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-2">Interests</p>
              <div className="flex flex-wrap gap-2">{selected.interests.map((i) => <Badge key={i} variant="outline">{i}</Badge>)}</div>
            </div>
            {selected.goals && (
              <div><p className="text-muted-foreground text-xs mb-1">Goals</p><p className="rounded-md bg-muted p-3 text-sm">{selected.goals}</p></div>
            )}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={selected.status} onValueChange={(v) => update(selected.id, { status: v as Status })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Reschedule</Label>
                <div className="flex gap-2">
                  <Input type="date" value={selected.slotDate} onChange={(e) => update(selected.id, { slotDate: e.target.value })} />
                  <Input type="time" className="w-32" value={selected.slotTime} onChange={(e) => update(selected.id, { slotTime: e.target.value })} />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Internal notes</Label>
              <Textarea rows={3} value={selected.notes} onChange={(e) => update(selected.id, { notes: e.target.value })} placeholder="Add notes for the team…" />
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => { update(selected.id, { status: "Cancelled" }); toast("Request cancelled"); }}>
                <XCircle className="h-4 w-4 mr-2" />Cancel
              </Button>
              <Button onClick={() => { update(selected.id, { status: "Scheduled" }); toast.success("Meeting confirmed"); }}>
                <CheckCircle2 className="h-4 w-4 mr-2" />Confirm meeting
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
