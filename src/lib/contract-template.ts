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

// ─────────────────────────────────────────────────────────────
// Templates are scoped per platform module (and, where a module
// has them, per sub-area). Dummy taxonomy for now — the backend
// simply round-trips moduleKey/areaKey when it supports them.
// ─────────────────────────────────────────────────────────────
export interface ModuleArea {
  key: string;
  name: string;
}

export interface TemplateModule {
  key: string;
  name: string;
  description: string;
  areas: ModuleArea[];
}

export const TEMPLATE_MODULES: TemplateModule[] = [
  {
    key: "crm",
    name: "CRM",
    description: "Client-facing matter and contract templates",
    areas: [
      { key: "adr-litigation", name: "ADR & Litigation" },
      { key: "contracts", name: "Contracts" },
    ],
  },
  {
    key: "hr",
    name: "HR",
    description: "People, employment and workplace templates",
    areas: [
      { key: "employment", name: "Employment" },
      { key: "policies", name: "Policies & Handbooks" },
    ],
  },
  {
    key: "grc",
    name: "GRC",
    description: "Governance, risk and compliance templates",
    areas: [
      { key: "compliance", name: "Compliance" },
      { key: "risk", name: "Risk & Audit" },
    ],
  },
];

export const getModule = (key?: string | null) =>
  TEMPLATE_MODULES.find((m) => m.key === key);

export const moduleLabel = (key?: string | null) =>
  getModule(key)?.name ?? "Unassigned";

export const areaLabel = (moduleKey?: string | null, areaKey?: string | null) =>
  getModule(moduleKey)?.areas.find((a) => a.key === areaKey)?.name ?? "—";

export type Category = (typeof CATEGORIES)[number];
export type TemplateStatus = "Draft" | "Published";
export type SourceType = "authored" | "uploaded";

export interface ContractTemplate {
  id: string;
  title: string;
  category: Category;
  /** Platform module this template belongs to, e.g. "crm" | "hr" | "grc". */
  moduleKey: string;
  /** Sub-area within the module, e.g. "adr-litigation". */
  areaKey?: string | null;
  jurisdiction?: string;
  description: string;
  sourceType: SourceType;
  content: string; // HTML — authored directly, or extracted from an uploaded Word doc
  fileUrl?: string;
  fileName?: string;
  fileMimeType?: string;
  version: string;
  status: TemplateStatus;
  // Null/undefined means uncategorized — sits outside any folder.
  folderId?: string | null;
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
  folderId: null,
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
    folderId: raw.folderId ? String(raw.folderId) : null,
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
  folderId?: string | null;
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
  if (meta.folderId) form.append("folderId", meta.folderId);
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

// Works for either source type — folder placement doesn't touch a
// template's content, so this is available even for uploaded
// templates that update() itself refuses to edit.
export async function setTemplateFolder(
  id: string,
  folderId: string | null,
): Promise<ContractTemplate> {
  const res = await api.patch(`/super-admin/contract-templates/${id}/folder`, {
    folderId: folderId ?? "",
  });
  return normalize(unwrap(res));
}

// ─────────────────────────────────────────────────────────────
// Folders — organize the template library for browsing. Not
// tenant-scoped, same as templates themselves: one real folder
// structure, shown identically to every tenant.
// ─────────────────────────────────────────────────────────────

export interface TemplateFolder {
  id: string;
  name: string;
  description?: string;
  templateCount: number;
  createdAt: string;
  updatedAt: string;
}

function normalizeFolder(raw: any): TemplateFolder {
  return {
    id: raw._id ?? raw.id,
    name: raw.name,
    description: raw.description || undefined,
    templateCount: raw.templateCount ?? 0,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

export async function fetchFolders(): Promise<TemplateFolder[]> {
  const res = await api.get("/super-admin/contract-template-folders");
  const d = unwrap(res);
  return Array.isArray(d) ? d.map(normalizeFolder) : [];
}

export async function createFolder(input: {
  name: string;
  description?: string;
}): Promise<TemplateFolder> {
  const res = await api.post("/super-admin/contract-template-folders", input);
  return normalizeFolder(unwrap(res));
}

export async function updateFolder(
  id: string,
  input: { name: string; description?: string },
): Promise<TemplateFolder> {
  const res = await api.patch(
    `/super-admin/contract-template-folders/${id}`,
    input,
  );
  return normalizeFolder(unwrap(res));
}

// Backend refuses this if the folder still has templates in it —
// the error surfaces through the caller's own error handling.
export async function deleteFolder(id: string): Promise<void> {
  await api.delete(`/super-admin/contract-template-folders/${id}`);
}
