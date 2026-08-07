import { api } from "./api";

// ─────────────────────────────────────────────────────────────
// Real API client for the Legal Knowledge Base. Replaces the
// former in-memory/useSyncExternalStore prototype now that the
// backend module exists (super-admin/knowledge, fully global —
// no tenant scoping). Types are preserved exactly so
// EntryPreviewDialog.tsx and RichTextEditor.tsx need no changes.
// ─────────────────────────────────────────────────────────────

export const CATEGORIES = [
  "Statute",
  "Regulation",
  "Case Law",
  "International",
  "Commentary",
  "Update",
] as const;

export type Category = (typeof CATEGORIES)[number];
export type EntryStatus = "Draft" | "Published";

export interface KnowledgeEntry {
  id: string;
  title: string;
  category: Category;
  practiceArea: string;
  jurisdiction?: string;
  summary: string;
  content: string; // HTML
  reference?: string;
  source?: string;
  externalLink?: string;
  status: EntryStatus;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export type EntryInput = Omit<
  KnowledgeEntry,
  "id" | "createdAt" | "updatedAt" | "publishedAt" | "status"
>;

export const emptyEntry: EntryInput = {
  title: "",
  category: "Statute",
  practiceArea: "",
  jurisdiction: "",
  summary: "",
  content: "",
  reference: "",
  source: "",
  externalLink: "",
};

// Same defensive unwrap pattern as the rest of this app (see
// Modules.tsx) — backend wraps in { data }, but don't assume it.
const unwrap = (res: any) =>
  Array.isArray(res.data?.data)
    ? res.data.data
    : Array.isArray(res.data)
      ? res.data
      : (res.data?.data ?? res.data);

// Backend returns Mongo's _id and empty-string optionals; normalize
// to the frontend's id + undefined-when-blank shape so every
// existing consumer (EntryPreviewDialog, both pages) works unchanged.
function normalize(raw: any): KnowledgeEntry {
  return {
    id: raw._id ?? raw.id,
    title: raw.title,
    category: raw.category,
    practiceArea: raw.practiceArea,
    jurisdiction: raw.jurisdiction || undefined,
    summary: raw.summary,
    content: raw.content,
    reference: raw.reference || undefined,
    source: raw.source || undefined,
    externalLink: raw.externalLink || undefined,
    status: raw.status,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    publishedAt: raw.publishedAt || undefined,
  };
}

export async function fetchEntries(): Promise<KnowledgeEntry[]> {
  const res = await api.get("/super-admin/knowledge");
  const d = unwrap(res);
  return Array.isArray(d) ? d.map(normalize) : [];
}

export async function fetchEntry(id: string): Promise<KnowledgeEntry> {
  const res = await api.get(`/super-admin/knowledge/${id}`);
  return normalize(unwrap(res));
}

export async function createEntry(
  input: EntryInput,
  status: EntryStatus,
): Promise<KnowledgeEntry> {
  const res = await api.post("/super-admin/knowledge", { ...input, status });
  return normalize(unwrap(res));
}

export async function updateEntry(
  id: string,
  input: EntryInput,
  status: EntryStatus,
): Promise<KnowledgeEntry> {
  const res = await api.patch(`/super-admin/knowledge/${id}`, {
    ...input,
    status,
  });
  return normalize(unwrap(res));
}

export async function setStatus(
  id: string,
  status: EntryStatus,
): Promise<KnowledgeEntry> {
  const res = await api.patch(`/super-admin/knowledge/${id}/status`, {
    status,
  });
  return normalize(unwrap(res));
}

export async function deleteEntry(id: string): Promise<void> {
  await api.delete(`/super-admin/knowledge/${id}`);
}

export function practiceAreas(entries: KnowledgeEntry[]): string[] {
  return Array.from(
    new Set(entries.map((e) => e.practiceArea).filter(Boolean)),
  ).sort();
}
