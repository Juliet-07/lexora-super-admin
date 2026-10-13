import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Mail,
  Plus,
  ArrowLeft,
  Loader2,
  Send,
  CalendarClock,
  Trash2,
  Pencil,
  Users,
  X,
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
import { useToast } from "@/hooks/use-toast";
import {
  TEMPLATES,
  TEMPLATE_LABELS,
  emptyTemplateData,
  fetchCampaigns,
  fetchCampaign,
  fetchSubscriberStats,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  scheduleCampaign,
  unscheduleCampaign,
  sendCampaignTest,
  sendCampaignNow,
  type Campaign,
  type Template,
} from "@/lib/newsletter";

const formatDate = (value?: string) =>
  value
    ? new Date(value).toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "—";

const statusVariant = (s: Campaign["status"]) =>
  s === "Sent"
    ? "default"
    : s === "Sending"
      ? "default"
      : s === "Scheduled"
        ? "secondary"
        : "outline";

// ── Small helpers for editing an array of string/object fields ──

function StringListEditor({
  values,
  onChange,
  placeholder,
}: {
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      {values.map((v, i) => (
        <div key={i} className="flex gap-2">
          <Input
            value={v}
            placeholder={placeholder}
            onChange={(e) => {
              const next = [...values];
              next[i] = e.target.value;
              onChange(next);
            }}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onChange(values.filter((_, j) => j !== i))}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange([...values, ""])}
      >
        <Plus className="mr-1 h-3.5 w-3.5" />
        Add item
      </Button>
    </div>
  );
}

function ObjectListEditor({
  values,
  fields,
  onChange,
}: {
  values: Record<string, string>[];
  fields: { key: string; label: string; wide?: boolean }[];
  onChange: (next: Record<string, string>[]) => void;
}) {
  return (
    <div className="space-y-3">
      {values.map((row, i) => (
        <div key={i} className="rounded-md border p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              #{i + 1}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onChange(values.filter((_, j) => j !== i))}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {fields.map((f) => (
              <div
                key={f.key}
                className={f.wide ? "sm:col-span-2 space-y-1" : "space-y-1"}
              >
                <Label className="text-xs">{f.label}</Label>
                <Input
                  value={row[f.key] ?? ""}
                  onChange={(e) => {
                    const next = [...values];
                    next[i] = { ...next[i], [f.key]: e.target.value };
                    onChange(next);
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() =>
          onChange([
            ...values,
            Object.fromEntries(fields.map((f) => [f.key, ""])),
          ])
        }
      >
        <Plus className="mr-1 h-3.5 w-3.5" />
        Add row
      </Button>
    </div>
  );
}

function TemplateFields({
  template,
  data,
  onChange,
}: {
  template: Template;
  data: Record<string, any>;
  onChange: (next: Record<string, any>) => void;
}) {
  const set = (key: string, value: any) => onChange({ ...data, [key]: value });

  if (template === "RegulatoryAlert") {
    return (
      <div className="space-y-4">
        <div className="space-y-1">
          <Label>Reference tag</Label>
          <Input
            value={data.refTag ?? ""}
            onChange={(e) => set("refTag", e.target.value)}
            placeholder="e.g. REF: BNR/AML-CFT/2026-04"
          />
        </div>
        <div className="space-y-1">
          <Label>Heading *</Label>
          <Input
            value={data.heading ?? ""}
            onChange={(e) => set("heading", e.target.value)}
            placeholder="e.g. New BNR AML/CFT requirements are now in effect"
          />
        </div>
        <div className="space-y-1">
          <Label>Subtext</Label>
          <Input
            value={data.subtext ?? ""}
            onChange={(e) => set("subtext", e.target.value)}
            placeholder="e.g. Effective 1 August 2026 · Affects 4 of your registered entities"
          />
        </div>
        <div className="space-y-1">
          <Label>Alert text *</Label>
          <Textarea
            rows={4}
            value={data.alertText ?? ""}
            onChange={(e) => set("alertText", e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label>Checklist</Label>
          <StringListEditor
            values={data.checklist ?? []}
            onChange={(v) => set("checklist", v)}
            placeholder="e.g. Beneficial ownership records must be re-verified within 30 days."
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>CTA label</Label>
            <Input
              value={data.ctaLabel ?? ""}
              onChange={(e) => set("ctaLabel", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>CTA URL</Label>
            <Input
              value={data.ctaUrl ?? ""}
              onChange={(e) => set("ctaUrl", e.target.value)}
              placeholder="https://…"
            />
          </div>
        </div>
        <div className="space-y-1">
          <Label>Fine print</Label>
          <Input
            value={data.fineText ?? ""}
            onChange={(e) => set("fineText", e.target.value)}
          />
        </div>
      </div>
    );
  }

  if (template === "QuarterlyRoundup") {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>Eyebrow</Label>
            <Input
              value={data.eyebrow ?? ""}
              onChange={(e) => set("eyebrow", e.target.value)}
              placeholder="e.g. Q2 2026 · QUARTERLY ROUND-UP"
            />
          </div>
          <div className="space-y-1">
            <Label>Heading *</Label>
            <Input
              value={data.heading ?? ""}
              onChange={(e) => set("heading", e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-1">
          <Label>Intro *</Label>
          <Textarea
            rows={3}
            value={data.intro ?? ""}
            onChange={(e) => set("intro", e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label>Sections *</Label>
          <ObjectListEditor
            values={data.sections ?? []}
            fields={[
              { key: "num", label: "Number label" },
              { key: "heading", label: "Heading" },
              { key: "body", label: "Body", wide: true },
              { key: "linkLabel", label: "Link label" },
              { key: "linkUrl", label: "Link URL" },
            ]}
            onChange={(v) => set("sections", v)}
          />
        </div>
        <div className="space-y-1">
          <Label>Also from Lexora (optional)</Label>
          <ObjectListEditor
            values={data.blogItems ?? []}
            fields={[
              { key: "label", label: "Label", wide: true },
              { key: "meta", label: "Meta" },
              { key: "url", label: "URL" },
            ]}
            onChange={(v) => set("blogItems", v)}
          />
        </div>
      </div>
    );
  }

  if (template === "ArticleSpotlight") {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>Hero label</Label>
            <Input
              value={data.heroLabel ?? ""}
              onChange={(e) => set("heroLabel", e.target.value)}
              placeholder="e.g. GOVERNANCE ADVISORY"
            />
          </div>
          <div className="space-y-1">
            <Label>Eyebrow</Label>
            <Input
              value={data.eyebrow ?? ""}
              onChange={(e) => set("eyebrow", e.target.value)}
              placeholder="e.g. FEATURED ARTICLE"
            />
          </div>
        </div>
        <div className="space-y-1">
          <Label>Heading *</Label>
          <Input
            value={data.heading ?? ""}
            onChange={(e) => set("heading", e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label>Byline</Label>
          <Input
            value={data.byline ?? ""}
            onChange={(e) => set("byline", e.target.value)}
            placeholder="e.g. By Amara Ndikumana, Senior Associate · 6 min read"
          />
        </div>
        <div className="space-y-1">
          <Label>Excerpt *</Label>
          <Textarea
            rows={4}
            value={data.excerpt ?? ""}
            onChange={(e) => set("excerpt", e.target.value)}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>CTA label</Label>
            <Input
              value={data.ctaLabel ?? ""}
              onChange={(e) => set("ctaLabel", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>CTA URL *</Label>
            <Input
              value={data.ctaUrl ?? ""}
              onChange={(e) => set("ctaUrl", e.target.value)}
              placeholder="https://…"
            />
          </div>
        </div>
        <div className="space-y-1">
          <Label>More from the series (optional)</Label>
          <ObjectListEditor
            values={data.moreItems ?? []}
            fields={[
              { key: "title", label: "Title", wide: true },
              { key: "meta", label: "Meta" },
            ]}
            onChange={(v) => set("moreItems", v)}
          />
        </div>
      </div>
    );
  }

  // EventInvite
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1">
          <Label>Day *</Label>
          <Input
            value={data.day ?? ""}
            onChange={(e) => set("day", e.target.value)}
            placeholder="18"
          />
        </div>
        <div className="space-y-1">
          <Label>Month *</Label>
          <Input
            value={data.month ?? ""}
            onChange={(e) => set("month", e.target.value)}
            placeholder="SEP"
          />
        </div>
        <div className="space-y-1">
          <Label>Location</Label>
          <Input
            value={data.location ?? ""}
            onChange={(e) => set("location", e.target.value)}
            placeholder="e.g. Kigali Marriott · In-person"
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label>Heading *</Label>
        <Input
          value={data.heading ?? ""}
          onChange={(e) => set("heading", e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <Label>Body text</Label>
        <Textarea
          rows={3}
          value={data.bodyText ?? ""}
          onChange={(e) => set("bodyText", e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <Label>Info row (Date / Time / Format)</Label>
        <ObjectListEditor
          values={data.infoRows ?? []}
          fields={[
            { key: "label", label: "Label" },
            { key: "value", label: "Value" },
          ]}
          onChange={(v) => set("infoRows", v)}
        />
      </div>
      <div className="space-y-1">
        <Label>Agenda</Label>
        <ObjectListEditor
          values={data.agenda ?? []}
          fields={[
            { key: "time", label: "Time" },
            { key: "label", label: "Item", wide: true },
          ]}
          onChange={(v) => set("agenda", v)}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label>CTA label</Label>
          <Input
            value={data.ctaLabel ?? ""}
            onChange={(e) => set("ctaLabel", e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label>CTA URL</Label>
          <Input
            value={data.ctaUrl ?? ""}
            onChange={(e) => set("ctaUrl", e.target.value)}
          />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label>Calendar link label</Label>
          <Input
            value={data.calendarLabel ?? ""}
            onChange={(e) => set("calendarLabel", e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label>Calendar link URL</Label>
          <Input
            value={data.calendarUrl ?? ""}
            onChange={(e) => set("calendarUrl", e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}

function CampaignComposer({
  campaign,
  onClose,
}: {
  campaign: Campaign | null;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [template, setTemplate] = useState<Template>(
    campaign?.template ?? "RegulatoryAlert",
  );
  const [subject, setSubject] = useState(campaign?.subject ?? "");
  const [previewText, setPreviewText] = useState(campaign?.previewText ?? "");
  const [data, setData] = useState<Record<string, any>>(
    campaign?.templateData ?? emptyTemplateData(template),
  );
  const [testEmail, setTestEmail] = useState("");
  const [scheduleAt, setScheduleAt] = useState("");
  const [savedId, setSavedId] = useState<string | undefined>(campaign?.id);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["newsletter-campaigns"] });

  const switchTemplate = (next: Template) => {
    setTemplate(next);
    if (!campaign) setData(emptyTemplateData(next));
  };

  const saveMut = useMutation({
    mutationFn: () => {
      const input = { subject, previewText, template, templateData: data };
      return savedId ? updateCampaign(savedId, input) : createCampaign(input);
    },
    onSuccess: (saved) => {
      setSavedId(saved.id);
      invalidate();
      toast({ title: "Draft saved" });
    },
    onError: (err: any) =>
      toast({
        title: "Failed to save",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  const sendTestMut = useMutation({
    mutationFn: async () => {
      const id = savedId ?? (await saveMut.mutateAsync()).id;
      return sendCampaignTest(id, testEmail);
    },
    onSuccess: () =>
      toast({ title: "Test sent", description: `Sent to ${testEmail}.` }),
    onError: (err: any) =>
      toast({
        title: "Failed to send test",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  const scheduleMut = useMutation({
    mutationFn: async () => {
      const id = savedId ?? (await saveMut.mutateAsync()).id;
      // `scheduleAt` is a naive datetime-local string — convert to an
      // unambiguous UTC instant in the browser before sending, same
      // fix applied to the CRM Tools newsletter scheduler.
      return scheduleCampaign(id, new Date(scheduleAt).toISOString());
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Campaign scheduled" });
      onClose();
    },
    onError: (err: any) =>
      toast({
        title: "Failed to schedule",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  const sendNowMut = useMutation({
    mutationFn: async () => {
      const id = savedId ?? (await saveMut.mutateAsync()).id;
      return sendCampaignNow(id);
    },
    onSuccess: (sent) => {
      invalidate();
      toast({
        title: "Campaign sent",
        description: `Delivered to ${sent.recipientCount} subscriber${sent.recipientCount === 1 ? "" : "s"}.`,
      });
      onClose();
    },
    onError: (err: any) =>
      toast({
        title: "Failed to send",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  const locked =
    campaign && campaign.status !== "Draft" && campaign.status !== "Scheduled";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onClose}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          {campaign ? "Edit campaign" : "New newsletter campaign"}
        </h1>
        {campaign && (
          <Badge variant={statusVariant(campaign.status)}>
            {campaign.status}
          </Badge>
        )}
      </div>

      {locked && (
        <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          This campaign has already sent — it's shown read-only.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Campaign details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label>Subject *</Label>
                <Input
                  disabled={!!locked}
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Your Q2 regulatory round-up is here"
                />
              </div>
              <div className="space-y-1">
                <Label>Preview text</Label>
                <Input
                  disabled={!!locked}
                  value={previewText}
                  onChange={(e) => setPreviewText(e.target.value)}
                  placeholder="Shown as the inbox preview snippet"
                />
              </div>
              <div className="space-y-1">
                <Label>Template</Label>
                <Select
                  value={template}
                  onValueChange={(v) => switchTemplate(v as Template)}
                  disabled={!!locked}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TEMPLATES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {TEMPLATE_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {TEMPLATE_LABELS[template]} content
              </CardTitle>
              <CardDescription>
                Fields marked * are required before this can send.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <fieldset disabled={!!locked}>
                <TemplateFields
                  template={template}
                  data={data}
                  onChange={setData}
                />
              </fieldset>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Save</CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                className="w-full"
                disabled={!!locked || saveMut.isPending || !subject.trim()}
                onClick={() => saveMut.mutate()}
              >
                {saveMut.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Save draft
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Send a test</CardTitle>
              <CardDescription>
                See exactly how it renders before it goes to subscribers.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Input
                type="email"
                placeholder="you@example.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
              />
              <Button
                variant="outline"
                className="w-full"
                disabled={
                  !testEmail.trim() || !subject.trim() || sendTestMut.isPending
                }
                onClick={() => sendTestMut.mutate()}
              >
                {sendTestMut.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Send test
              </Button>
            </CardContent>
          </Card>

          {!locked && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Schedule</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Input
                  type="datetime-local"
                  value={scheduleAt}
                  onChange={(e) => setScheduleAt(e.target.value)}
                />
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={!scheduleAt || scheduleMut.isPending}
                  onClick={() => scheduleMut.mutate()}
                >
                  {scheduleMut.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CalendarClock className="mr-2 h-4 w-4" />
                  )}
                  Schedule send
                </Button>
              </CardContent>
            </Card>
          )}

          {!locked && (
            <Card className="border-primary/40">
              <CardHeader>
                <CardTitle className="text-base">Send now</CardTitle>
                <CardDescription>
                  Goes out immediately to every active subscriber.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  className="w-full"
                  disabled={!subject.trim() || sendNowMut.isPending}
                  onClick={() => sendNowMut.mutate()}
                >
                  {sendNowMut.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  Send to all subscribers
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default function NewsletterPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [composing, setComposing] = useState<Campaign | null | undefined>(
    undefined,
  );
  const [pendingDelete, setPendingDelete] = useState<Campaign | null>(null);

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["newsletter-campaigns"],
    queryFn: fetchCampaigns,
    staleTime: 30 * 1000,
  });

  const { data: stats } = useQuery({
    queryKey: ["newsletter-subscriber-stats"],
    queryFn: fetchSubscriberStats,
    staleTime: 60 * 1000,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["newsletter-campaigns"] });

  const unscheduleMut = useMutation({
    mutationFn: (id: string) => unscheduleCampaign(id),
    onSuccess: () => {
      invalidate();
      toast({ title: "Campaign unscheduled", description: "Back to draft." });
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteCampaign(id),
    onSuccess: () => {
      invalidate();
      toast({ title: "Campaign deleted" });
      setPendingDelete(null);
    },
    onError: (err: any) =>
      toast({
        title: "Failed to delete",
        description: err?.response?.data?.message,
        variant: "destructive",
      }),
  });

  if (composing !== undefined) {
    return (
      <CampaignComposer
        campaign={composing}
        onClose={() => setComposing(undefined)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="gradient-primary rounded-lg p-2.5 shadow-glow">
            <Mail className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Newsletter
            </h1>
            <p className="text-sm text-muted-foreground">
              Sent to everyone who subscribed via the public website.
            </p>
          </div>
        </div>
        <Button onClick={() => setComposing(null)}>
          <Plus className="mr-2 h-4 w-4" />
          New campaign
        </Button>
      </div>

      {stats && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <div className="text-2xl font-bold">{stats.active}</div>
                <div className="text-xs text-muted-foreground">
                  Active subscribers
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <Users className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="text-2xl font-bold">{stats.unsubscribed}</div>
                <div className="text-xs text-muted-foreground">
                  Unsubscribed
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <Users className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="text-xs text-muted-foreground">
                  All-time signups
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center gap-3 py-16 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Loading campaigns…</span>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[32%]">Subject</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Scheduled / sent</TableHead>
                  <TableHead>Delivered</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="align-top font-medium">
                      {c.subject}
                    </TableCell>
                    <TableCell className="align-top text-sm">
                      {TEMPLATE_LABELS[c.template]}
                    </TableCell>
                    <TableCell className="align-top">
                      <Badge variant={statusVariant(c.status)}>
                        {c.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="align-top text-sm text-muted-foreground">
                      {c.status === "Scheduled"
                        ? formatDate(c.scheduledAt)
                        : c.status === "Sent"
                          ? formatDate(c.sentAt)
                          : "—"}
                    </TableCell>
                    <TableCell className="align-top text-sm text-muted-foreground">
                      {c.status === "Sent"
                        ? `${c.recipientCount} sent${c.failedCount ? `, ${c.failedCount} failed` : ""}`
                        : "—"}
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="flex items-center justify-end gap-1">
                        {c.status === "Scheduled" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={unscheduleMut.isPending}
                            onClick={() => unscheduleMut.mutate(c.id)}
                          >
                            Unschedule
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setComposing(c)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {c.status !== "Sent" && c.status !== "Sending" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setPendingDelete(c)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {campaigns.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-16 text-center">
                      <p className="text-sm text-muted-foreground">
                        No campaigns yet — create one to get started.
                      </p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(o) => !o && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this campaign?</AlertDialogTitle>
            <AlertDialogDescription>
              "{pendingDelete?.subject}" will be permanently removed. This
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteMut.isPending}
              onClick={() =>
                pendingDelete && deleteMut.mutate(pendingDelete.id)
              }
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMut.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Delete campaign"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
