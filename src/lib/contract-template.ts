import { api } from "./api";

// ─────────────────────────────────────────────────────────────
// Real API client for Platform Contract Templates. Same shape as
// knowledge.ts (super-admin/contract-templates, fully global — no
// tenant scoping). Published templates become available to every
// tenant; a tenant's own templates are a separate real collection
// on the tenant side, never written into this one.
// ─────────────────────────────────────────────────────────────

export const CATEGORIES = [
  "Employment",
  "Commercial",
  "Property",
  "NDA",
  "Services",
  "Corporate",
] as const;

export type Category = (typeof CATEGORIES)[number];
export type TemplateStatus = "Draft" | "Published";
export type SourceType = "authored" | "uploaded";

export interface ContractTemplate {
  id: string;
  title: string;
  category: Category;
  jurisdiction?: string;
  description: string;
  sourceType: SourceType;
  content: string; // HTML — authored directly, or extracted from an uploaded Word doc
  fileUrl?: string;
  fileName?: string;
  fileMimeType?: string;
  version: string;
  status: TemplateStatus;
  createdAt: string;
  updatedAt: string;
}

export type TemplateInput = Omit<
  ContractTemplate,
  | "id"
  | "createdAt"
  | "updatedAt"
  | "status"
  | "sourceType"
  | "fileUrl"
  | "fileName"
  | "fileMimeType"
>;

export const emptyTemplate: TemplateInput = {
  title: "",
  category: "Employment",
  jurisdiction: "",
  description: "",
  content: "",
  version: "1.0",
};

const unwrap = (res: any) =>
  Array.isArray(res.data?.data)
    ? res.data.data
    : Array.isArray(res.data)
      ? res.data
      : (res.data?.data ?? res.data);

function normalize(raw: any): ContractTemplate {
  return {
    id: raw._id ?? raw.id,
    title: raw.title,
    category: raw.category,
    jurisdiction: raw.jurisdiction || undefined,
    description: raw.description,
    sourceType: raw.sourceType ?? "authored",
    content: raw.content ?? "",
    fileUrl: raw.fileUrl || undefined,
    fileName: raw.fileName || undefined,
    fileMimeType: raw.fileMimeType || undefined,
    version: raw.version,
    status: raw.status,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

export async function fetchTemplates(): Promise<ContractTemplate[]> {
  const res = await api.get("/super-admin/contract-templates");
  const d = unwrap(res);
  return Array.isArray(d) ? d.map(normalize) : [];
}

export async function fetchTemplate(id: string): Promise<ContractTemplate> {
  const res = await api.get(`/super-admin/contract-templates/${id}`);
  return normalize(unwrap(res));
}

export async function createTemplate(
  input: TemplateInput,
): Promise<ContractTemplate> {
  const res = await api.post("/super-admin/contract-templates", input);
  return normalize(unwrap(res));
}

export async function updateTemplate(
  id: string,
  input: TemplateInput,
): Promise<ContractTemplate> {
  const res = await api.patch(`/super-admin/contract-templates/${id}`, input);
  return normalize(unwrap(res));
}

export async function setStatus(
  id: string,
  status: TemplateStatus,
): Promise<ContractTemplate> {
  const res = await api.post(`/super-admin/contract-templates/${id}/status`, {
    status,
  });
  return normalize(unwrap(res));
}

export async function deleteTemplate(id: string): Promise<void> {
  await api.delete(`/super-admin/contract-templates/${id}`);
}

// Real multipart upload — a Word document's real, extracted content
// becomes the template's real content (extracted server-side via
// mammoth), so it can be previewed and merge-field substituted the
// same way an authored template is. Only Word documents are
// accepted — no PDF.
export interface UploadTemplateMeta {
  title: string;
  category: Category;
  jurisdiction?: string;
  description?: string;
  version?: string;
}

export async function uploadTemplate(
  file: File,
  meta: UploadTemplateMeta,
): Promise<ContractTemplate> {
  const form = new FormData();
  form.append("file", file);
  form.append("title", meta.title);
  form.append("category", meta.category);
  if (meta.jurisdiction) form.append("jurisdiction", meta.jurisdiction);
  if (meta.description) form.append("description", meta.description);
  if (meta.version) form.append("version", meta.version);
  const res = await api.post("/super-admin/contract-templates/upload", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return normalize(unwrap(res));
}

export async function replaceTemplateFile(
  id: string,
  file: File,
): Promise<ContractTemplate> {
  const form = new FormData();
  form.append("file", file);
  const res = await api.post(
    `/super-admin/contract-templates/${id}/replace-file`,
    form,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return normalize(unwrap(res));
}
