import { api } from "./api";

// Tickets tenants raise with the platform team, including tickets a tenant
// escalated from one of their own clients' Portal-access tickets.
//
// Privacy: nothing here describes a tenant's clients. An escalated ticket only
// carries what the tenant chose to write; the engine strips the link back to
// the client ticket before it reaches this app. Problems are solved through the
// tenant, who passes updates on to their client.

export type SupportStatus =
  "Open" | "In Progress" | "Waiting on Tenant" | "Resolved" | "Closed";
export type SupportPriority = "Low" | "Medium" | "High" | "Urgent";

export const SUPPORT_STATUSES: SupportStatus[] = [
  "Open",
  "In Progress",
  "Waiting on Tenant",
  "Resolved",
  "Closed",
];
export const SUPPORT_PRIORITIES: SupportPriority[] = [
  "Low",
  "Medium",
  "High",
  "Urgent",
];

export interface SupportMessage {
  _id: string;
  authorType: "tenant" | "platform";
  authorName: string;
  body: string;
  /** Platform-only note — the tenant never sees it. */
  internal: boolean;
  at: string;
}

export interface SupportTicket {
  _id: string;
  ref: string;
  tenantId: string;
  tenantName: string;
  raisedByName: string;
  subject: string;
  description: string;
  category: string;
  priority: SupportPriority;
  status: SupportStatus;
  source: "tenant" | "escalated";
  escalated: boolean;
  assignedToName: string;
  messages?: SupportMessage[];
  lastActor: "tenant" | "platform";
  lastActivityAt: string;
  createdAt: string;
}

export interface SupportStats {
  open: number;
  needsReply: number;
  urgent: number;
  resolved: number;
}

const unwrap = (res: any) => res.data?.data ?? res.data;

export const fetchSupportTickets = async (params?: {
  status?: SupportStatus;
  priority?: SupportPriority;
  source?: "tenant" | "escalated";
  needsReply?: boolean;
  q?: string;
}): Promise<SupportTicket[]> => {
  const d = unwrap(await api.get("/super-admin/support-tickets", { params }));
  return Array.isArray(d) ? d : [];
};

export const fetchSupportStats = async (): Promise<SupportStats> =>
  unwrap(await api.get("/super-admin/support-tickets/stats"));

export const fetchSupportTicket = async (id: string): Promise<SupportTicket> =>
  unwrap(await api.get(`/super-admin/support-tickets/${id}`));

export const replySupportTicket = async (
  id: string,
  body: string,
  internal: boolean,
): Promise<SupportTicket> =>
  unwrap(
    await api.post(`/super-admin/support-tickets/${id}/messages`, {
      body,
      internal,
    }),
  );

export const setSupportStatus = async (
  id: string,
  status: SupportStatus,
): Promise<SupportTicket> =>
  unwrap(
    await api.patch(`/super-admin/support-tickets/${id}/status`, { status }),
  );

export const assignSupportToMe = async (id: string): Promise<SupportTicket> =>
  unwrap(await api.post(`/super-admin/support-tickets/${id}/assign`));
