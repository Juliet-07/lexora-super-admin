import { api } from "./api";

// ─────────────────────────────────────────────────────────────
// API client for GRC Policy Templates (super-admin/policy-templates).
// Same global, no-tenant-scoping resource shape as the Legal
// Knowledge Base (src/lib/knowledge.ts) — Draft/Published lifecycle,
// publishedAt set once on first publish. The one structural
// difference: content lives in a repeatable `sections[]` array
// (title + rich-text HTML per section) rather than a single
// `content` field, since a policy template is assembled from named
// sections (e.g. "Purpose", "Scope", "Enforcement") that a tenant
// then edits per-policy after selecting the template.
// ─────────────────────────────────────────────────────────────

// Mirrors POLICY_CATEGORIES in lexora-tenant's src/lib/grc/policy-api.ts —
// keep these two lists in sync so a template's category always matches
// something a tenant can filter/select by.
export const POLICY_CATEGORIES = [
  "Legal and Compliance",
  "IT, Data and Cyber",
  "Website and Client-Facing",
  "HR and People",
  "Operations and Finance",
] as const;

export type PolicyCategory = (typeof POLICY_CATEGORIES)[number];
export type PolicyTemplateStatus = "Draft" | "Published";

export interface PolicyTemplateSection {
  title: string;
  content: string; // HTML
}

export interface PolicyTemplate {
  id: string;
  title: string;
  category: string;
  description: string;
  sections: PolicyTemplateSection[];
  status: PolicyTemplateStatus;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export type PolicyTemplateInput = Omit<
  PolicyTemplate,
  "id" | "createdAt" | "updatedAt" | "publishedAt" | "status"
>;

export const emptySection: PolicyTemplateSection = { title: "", content: "" };

export const emptyPolicyTemplate: PolicyTemplateInput = {
  title: "",
  category: POLICY_CATEGORIES[0],
  description: "",
  sections: [{ ...emptySection }],
};

// Same defensive unwrap pattern as the rest of this app (see
// Modules.tsx / knowledge.ts) — backend wraps in { data }, but
// don't assume it.
const unwrap = (res: any) =>
  Array.isArray(res.data?.data)
    ? res.data.data
    : Array.isArray(res.data)
      ? res.data
      : (res.data?.data ?? res.data);

function normalize(raw: any): PolicyTemplate {
  return {
    id: raw._id ?? raw.id,
    title: raw.title,
    category: raw.category,
    description: raw.description || "",
    sections: Array.isArray(raw.sections)
      ? raw.sections.map((s: any) => ({
          title: s.title || "",
          content: s.content || "",
        }))
      : [],
    status: raw.status,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    publishedAt: raw.publishedAt || undefined,
  };
}

export async function fetchPolicyTemplates(): Promise<PolicyTemplate[]> {
  const res = await api.get("/super-admin/policy-templates");
  const d = unwrap(res);
  return Array.isArray(d) ? d.map(normalize) : [];
}

export async function fetchPolicyTemplate(id: string): Promise<PolicyTemplate> {
  const res = await api.get(`/super-admin/policy-templates/${id}`);
  return normalize(unwrap(res));
}

export async function createPolicyTemplate(
  input: PolicyTemplateInput,
  status: PolicyTemplateStatus,
): Promise<PolicyTemplate> {
  const res = await api.post("/super-admin/policy-templates", {
    ...input,
    status,
  });
  return normalize(unwrap(res));
}

export async function updatePolicyTemplate(
  id: string,
  input: PolicyTemplateInput,
  status: PolicyTemplateStatus,
): Promise<PolicyTemplate> {
  const res = await api.patch(`/super-admin/policy-templates/${id}`, {
    ...input,
    status,
  });
  return normalize(unwrap(res));
}

export async function setPolicyTemplateStatus(
  id: string,
  status: PolicyTemplateStatus,
): Promise<PolicyTemplate> {
  const res = await api.patch(`/super-admin/policy-templates/${id}/status`, {
    status,
  });
  return normalize(unwrap(res));
}

export async function deletePolicyTemplate(id: string): Promise<void> {
  await api.delete(`/super-admin/policy-templates/${id}`);
}
