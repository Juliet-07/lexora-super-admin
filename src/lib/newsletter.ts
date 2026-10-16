import { api } from "./api";

// ─────────────────────────────────────────────────────────────
// API client for the platform-level SuperAdmin Newsletter —
// composes/sends to public-website subscribers (see insights.ts for
// the sibling Insights feature these subscribers come from). Same
// defensive unwrap pattern as the rest of this app.
// ─────────────────────────────────────────────────────────────

export const TEMPLATES = [
  "RegulatoryAlert",
  "QuarterlyRoundup",
  "ArticleSpotlight",
  "EventInvite",
] as const;
export type Template = (typeof TEMPLATES)[number];

export const TEMPLATE_LABELS: Record<Template, string> = {
  RegulatoryAlert: "Regulatory alert",
  QuarterlyRoundup: "Quarterly round-up",
  ArticleSpotlight: "Article spotlight",
  EventInvite: "Event invite",
};

export type CampaignStatus = "Draft" | "Scheduled" | "Sending" | "Sent";

export interface Campaign {
  id: string;
  subject: string;
  previewText?: string;
  template: Template;
  templateData: Record<string, any>;
  status: CampaignStatus;
  scheduledAt?: string;
  sentAt?: string;
  recipientCount: number;
  failedCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Subscriber {
  id: string;
  email: string;
  status: "Active" | "Unsubscribed";
  source: string;
  createdAt: string;
  unsubscribedAt?: string;
}

export interface SubscriberStats {
  active: number;
  unsubscribed: number;
  total: number;
}

const unwrap = (res: any) =>
  Array.isArray(res.data?.data)
    ? res.data.data
    : Array.isArray(res.data)
      ? res.data
      : (res.data?.data ?? res.data);

function normalizeCampaign(raw: any): Campaign {
  return {
    id: raw._id ?? raw.id,
    subject: raw.subject,
    previewText: raw.previewText || undefined,
    template: raw.template,
    templateData: raw.templateData ?? {},
    status: raw.status,
    scheduledAt: raw.scheduledAt || undefined,
    sentAt: raw.sentAt || undefined,
    recipientCount: raw.recipientCount ?? 0,
    failedCount: raw.failedCount ?? 0,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

function normalizeSubscriber(raw: any): Subscriber {
  return {
    id: raw._id ?? raw.id,
    email: raw.email,
    status: raw.status,
    source: raw.source,
    createdAt: raw.createdAt,
    unsubscribedAt: raw.unsubscribedAt || undefined,
  };
}

export async function fetchCampaigns(): Promise<Campaign[]> {
  const res = await api.get("/super-admin/newsletter/campaigns");
  const d = unwrap(res);
  return Array.isArray(d) ? d.map(normalizeCampaign) : [];
}

export async function fetchCampaign(id: string): Promise<Campaign> {
  const res = await api.get(`/super-admin/newsletter/campaigns/${id}`);
  return normalizeCampaign(unwrap(res));
}

export async function createCampaign(input: {
  subject: string;
  previewText?: string;
  template: Template;
  templateData: Record<string, any>;
}): Promise<Campaign> {
  const res = await api.post("/super-admin/newsletter/campaigns", input);
  return normalizeCampaign(unwrap(res));
}

export async function updateCampaign(
  id: string,
  input: {
    subject: string;
    previewText?: string;
    template: Template;
    templateData: Record<string, any>;
  },
): Promise<Campaign> {
  const res = await api.patch(`/super-admin/newsletter/campaigns/${id}`, input);
  return normalizeCampaign(unwrap(res));
}

export async function deleteCampaign(id: string): Promise<void> {
  await api.delete(`/super-admin/newsletter/campaigns/${id}`);
}

export async function scheduleCampaign(
  id: string,
  scheduledAt: string,
): Promise<Campaign> {
  const res = await api.post(
    `/super-admin/newsletter/campaigns/${id}/schedule`,
    { scheduledAt },
  );
  return normalizeCampaign(unwrap(res));
}

export async function unscheduleCampaign(id: string): Promise<Campaign> {
  const res = await api.post(
    `/super-admin/newsletter/campaigns/${id}/unschedule`,
  );
  return normalizeCampaign(unwrap(res));
}

export async function sendCampaignTest(id: string, to: string): Promise<void> {
  await api.post(`/super-admin/newsletter/campaigns/${id}/send-test`, { to });
}

export async function sendCampaignNow(id: string): Promise<Campaign> {
  const res = await api.post(
    `/super-admin/newsletter/campaigns/${id}/send-now`,
  );
  return normalizeCampaign(unwrap(res));
}

export async function fetchSubscribers(): Promise<Subscriber[]> {
  const res = await api.get("/super-admin/newsletter/subscribers");
  const d = unwrap(res);
  return Array.isArray(d) ? d.map(normalizeSubscriber) : [];
}

export async function fetchSubscriberStats(): Promise<SubscriberStats> {
  const res = await api.get("/super-admin/newsletter/subscribers/stats");
  return unwrap(res);
}

// Per-template default field shapes, used by the composer to seed a
// new campaign's templateData with the right keys for that design.
export function emptyTemplateData(template: Template): Record<string, any> {
  switch (template) {
    case "RegulatoryAlert":
      return {
        refTag: "",
        heading: "",
        subtext: "",
        alertText: "",
        checklist: [""],
        ctaLabel: "Read the full advisory",
        ctaUrl: "",
        fineText: "",
        imageUrl: "",
        imageAlt: "",
      };
    case "QuarterlyRoundup":
      return {
        eyebrow: "",
        heading: "Regulatory Round-Up",
        intro: "",
        sections: [
          { num: "01", heading: "", body: "", linkLabel: "", linkUrl: "" },
        ],
        blogItems: [],
        imageUrl: "",
        imageAlt: "",
      };
    case "ArticleSpotlight":
      return {
        heroLabel: "",
        eyebrow: "FEATURED ARTICLE",
        heading: "",
        byline: "",
        excerpt: "",
        ctaLabel: "Read the full article",
        ctaUrl: "",
        moreItems: [],
        imageUrl: "",
        imageAlt: "",
      };
    case "EventInvite":
      return {
        day: "",
        month: "",
        heading: "",
        location: "",
        bodyText: "",
        infoRows: [
          { label: "Date", value: "" },
          { label: "Time", value: "" },
          { label: "Format", value: "" },
        ],
        agenda: [{ time: "", label: "" }],
        ctaLabel: "Reserve my seat",
        ctaUrl: "",
        calendarLabel: "Add to calendar",
        calendarUrl: "",
        imageUrl: "",
        imageAlt: "",
      };
  }
}
