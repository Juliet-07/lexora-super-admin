import { api } from "./api";

// ─────────────────────────────────────────────────────────────
// API client for the public-website "Insights" blog. Same
// shape/conventions as knowledge.ts (that module's comment explains
// the pattern this mirrors) — fully global, authored only here by
// Super Admin, read by the public marketing site with no auth.
// ─────────────────────────────────────────────────────────────

export const CATEGORIES = [
  "Governance",
  "Compliance",
  "ESG",
  "Finance",
  "Risk",
  "Technology",
] as const;

export type Category = (typeof CATEGORIES)[number];
export type InsightStatus = "Draft" | "Published";

export interface Insight {
  id: string;
  title: string;
  slug: string;
  category: Category;
  excerpt: string;
  content: string; // HTML
  coverImage?: string;
  author?: string;
  status: InsightStatus;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export type InsightInput = Omit<
  Insight,
  "id" | "slug" | "createdAt" | "updatedAt" | "publishedAt" | "status"
> & { slug?: string };

export const emptyInsight: InsightInput = {
  title: "",
  category: "Governance",
  excerpt: "",
  content: "",
  coverImage: "",
  author: "",
};

// Same defensive unwrap pattern as the rest of this app (see
// Modules.tsx / knowledge.ts) — backend wraps in { data }, but don't
// assume it.
const unwrap = (res: any) =>
  Array.isArray(res.data?.data)
    ? res.data.data
    : Array.isArray(res.data)
      ? res.data
      : (res.data?.data ?? res.data);

function normalize(raw: any): Insight {
  return {
    id: raw._id ?? raw.id,
    title: raw.title,
    slug: raw.slug,
    category: raw.category,
    excerpt: raw.excerpt,
    content: raw.content,
    coverImage: raw.coverImage || undefined,
    author: raw.author || undefined,
    status: raw.status,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    publishedAt: raw.publishedAt || undefined,
  };
}

export async function fetchInsights(): Promise<Insight[]> {
  const res = await api.get("/super-admin/insights");
  const d = unwrap(res);
  return Array.isArray(d) ? d.map(normalize) : [];
}

export async function fetchInsight(id: string): Promise<Insight> {
  const res = await api.get(`/super-admin/insights/${id}`);
  return normalize(unwrap(res));
}

export async function createInsight(
  input: InsightInput,
  status: InsightStatus,
): Promise<Insight> {
  const res = await api.post("/super-admin/insights", { ...input, status });
  return normalize(unwrap(res));
}

export async function updateInsight(
  id: string,
  input: InsightInput,
  status: InsightStatus,
): Promise<Insight> {
  const res = await api.patch(`/super-admin/insights/${id}`, {
    ...input,
    status,
  });
  return normalize(unwrap(res));
}

export async function setInsightStatus(
  id: string,
  status: InsightStatus,
): Promise<Insight> {
  const res = await api.patch(`/super-admin/insights/${id}/status`, {
    status,
  });
  return normalize(unwrap(res));
}

export async function deleteInsight(id: string): Promise<void> {
  await api.delete(`/super-admin/insights/${id}`);
}
