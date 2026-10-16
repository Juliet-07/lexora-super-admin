import { api } from "./api";

// ─────────────────────────────────────────────────────────────
// API client for the "Contact management" flow — the public
// website's contact/book-a-demo form, through to the Super Admin
// reviewing, scheduling, rescheduling, cancelling, or completing each
// request. Same defensive unwrap pattern as the rest of this app.
// ─────────────────────────────────────────────────────────────

export const WEEKDAYS = [
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun",
] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export type DemoRequestStatus =
  | "Scheduled"
  | "Rescheduled"
  | "Cancelled"
  | "Completed";

export interface DemoRequest {
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
  requestedDay: Weekday;
  requestedDate: string;
  requestedTime: string;
  alternateDate?: string | null;
  alternateTime?: string | null;
  status: DemoRequestStatus;
  confirmedAt?: string | null;
  meetingLink: string;
  cancellationReason: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface DayAvailability {
  day: Weekday;
  enabled: boolean;
  slots: string[];
}

export interface Availability {
  days: DayAvailability[];
  timezone: string;
  durationMinutes: number;
}

const unwrap = (res: any) =>
  Array.isArray(res.data?.data)
    ? res.data.data
    : Array.isArray(res.data)
      ? res.data
      : (res.data?.data ?? res.data);

function normalize(raw: any): DemoRequest {
  return {
    id: raw._id ?? raw.id,
    firstName: raw.firstName,
    lastName: raw.lastName,
    email: raw.email,
    company: raw.company || undefined,
    industry: raw.industry || undefined,
    companySize: raw.companySize || undefined,
    subject: raw.subject,
    interests: raw.interests ?? [],
    goals: raw.goals || undefined,
    requestedDay: raw.requestedDay,
    requestedDate: raw.requestedDate,
    requestedTime: raw.requestedTime,
    alternateDate: raw.alternateDate || null,
    alternateTime: raw.alternateTime || null,
    status: raw.status,
    confirmedAt: raw.confirmedAt || null,
    meetingLink: raw.meetingLink || "",
    cancellationReason: raw.cancellationReason || "",
    notes: raw.notes || "",
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

function normalizeAvailability(raw: any): Availability {
  return {
    days: Array.isArray(raw.days) ? raw.days : [],
    timezone: raw.timezone ?? "CAT",
    durationMinutes: raw.durationMinutes ?? 30,
  };
}

export async function fetchDemoRequests(): Promise<DemoRequest[]> {
  const res = await api.get("/super-admin/demo-requests");
  const d = unwrap(res);
  return Array.isArray(d) ? d.map(normalize) : [];
}

export async function fetchAvailability(): Promise<Availability> {
  const res = await api.get("/super-admin/demo-requests/availability");
  return normalizeAvailability(unwrap(res));
}

export async function saveAvailability(
  input: Availability,
): Promise<Availability> {
  const res = await api.post("/super-admin/demo-requests/availability", input);
  return normalizeAvailability(unwrap(res));
}

export async function confirmSchedule(
  id: string,
  meetingLink: string,
): Promise<DemoRequest> {
  const res = await api.post(`/super-admin/demo-requests/${id}/schedule`, {
    meetingLink,
  });
  return normalize(unwrap(res));
}

export async function rescheduleRequest(id: string): Promise<DemoRequest> {
  const res = await api.post(`/super-admin/demo-requests/${id}/reschedule`, {});
  return normalize(unwrap(res));
}

export async function cancelRequest(
  id: string,
  reason: string,
): Promise<DemoRequest> {
  const res = await api.post(`/super-admin/demo-requests/${id}/cancel`, {
    reason,
  });
  return normalize(unwrap(res));
}

export async function completeRequest(id: string): Promise<DemoRequest> {
  const res = await api.post(`/super-admin/demo-requests/${id}/complete`);
  return normalize(unwrap(res));
}

export async function updateRequestNotes(
  id: string,
  notes: string,
): Promise<DemoRequest> {
  const res = await api.patch(`/super-admin/demo-requests/${id}/notes`, {
    notes,
  });
  return normalize(unwrap(res));
}
