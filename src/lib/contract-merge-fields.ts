// ─────────────────────────────────────────────────────────────
// Merge-field vocabulary for the template editor's fields panel.
//
// The engine owns the vocabulary (src/common/utils/contract-merge-registry.ts)
// and serves it at GET /super-admin/contract-templates/merge-fields, so a
// field the product owner adds there appears in the editor with no change
// here. CRM_MERGE_FIELDS / HR_MERGE_FIELDS below are only an offline
// fallback for when that endpoint can't be reached (for instance an older
// engine build) — they are no longer the source of truth.
// ─────────────────────────────────────────────────────────────
import { api } from "./api";

export interface MergeFieldDef {
  token: string;
  label: string;
  description: string;
}

export const CRM_MERGE_FIELDS: MergeFieldDef[] = [
  {
    token: "title",
    label: "Contract title",
    description: "The contract title as entered on the drafting form",
  },
  {
    token: "counterpartyName",
    label: "Counterparty name",
    description:
      "The resolved counterparty: a registered client's real name, a registered vendor's contact (falling back to its legal name), or an external party's typed name",
  },
  {
    token: "recipientName",
    label: "Recipient name",
    description:
      'Alias of counterparty name — reads more naturally when addressing a person directly, e.g. "Dear {{recipientName}},"',
  },
  {
    token: "recipientEmail",
    label: "Recipient email",
    description: "The resolved counterparty's email address",
  },
  {
    token: "scopeOfWork",
    label: "Scope of work",
    description:
      "Free-text deliverables entered on the drafting form (one per line) — expands into a real numbered list. Insert this once; don't repeat it per item, and don't hand-number the items yourself.",
  },
  {
    token: "tenantCompanyName",
    label: "Tenant company name",
    description: "This tenant's own registered business name",
  },
  {
    token: "contractValue",
    label: "Contract value",
    description: "The contract value entered on the drafting form",
  },
  {
    token: "contractCurrency",
    label: "Contract currency",
    description: "The contract currency entered on the drafting form",
  },
  {
    token: "effectiveDate",
    label: "Effective date",
    description: "Today's date, used as the contract's effective date",
  },
  {
    token: "expiryDate",
    label: "Expiry date",
    description: "The expiry date entered on the drafting form",
  },
  {
    token: "todayDate",
    label: "Today's date",
    description: "Today's date",
  },
  {
    token: "tenantCompanyJurisdiction",
    label: "Tenant company jurisdiction",
    description:
      'The firm\'s own jurisdiction of incorporation, as typed on the drafting form (e.g. "the Republic of Rwanda") — blank if left empty',
  },
  {
    token: "clientJurisdiction",
    label: "Client jurisdiction",
    description:
      "The counterparty's jurisdiction of incorporation, as typed on the drafting form",
  },
  {
    token: "leadProfessionalName",
    label: "Lead professional name",
    description:
      "The individual leading this engagement on the firm's side, as typed on the drafting form",
  },
  {
    token: "leadProfessionalTitle",
    label: "Lead professional title",
    description: "That person's title/role",
  },
  {
    token: "clientRepresentativeName",
    label: "Client representative name",
    description: "The client's authorised representative for this engagement",
  },
  {
    token: "clientRepresentativeTitle",
    label: "Client representative title",
    description: "That person's title/role",
  },
  {
    token: "commencementDate",
    label: "Commencement date",
    description:
      "When the engagement starts, as picked on the drafting form — distinct from the effective date (today), since an engagement often starts on a different date than the contract is signed",
  },
  {
    token: "engagementDuration",
    label: "Engagement duration",
    description:
      'Free text describing how long the engagement runs, e.g. "12 months" or "until completion of the audit"',
  },
  {
    token: "tenantRegisteredAddress",
    label: "Tenant registered address",
    description:
      "The firm's own registered office address, as typed on the drafting form",
  },
  {
    token: "clientRegisteredAddress",
    label: "Client registered address",
    description:
      "The counterparty's registered office address, as typed on the drafting form",
  },
  {
    token: "serviceCategory",
    label: "Service category",
    description:
      'The category/type of professional service being provided (e.g. "company secretarial", "tax advisory"), as typed on the drafting form',
  },
];

// Mirrors AVAILABLE_MERGE_FIELDS in the backend (lexora-engine:
// src/modules/hr/schemas/contract-template.schema.ts) by hand, same
// caveat as CRM_MERGE_FIELDS above — keep the two in sync manually.
export const HR_MERGE_FIELDS: MergeFieldDef[] = [
  {
    token: "employeeName",
    label: "Employee name",
    description: "The employee's (or candidate's) full name",
  },
  {
    token: "jobTitle",
    label: "Job title",
    description:
      "The employee's job title, or the role a candidate applied for",
  },
  {
    token: "startDate",
    label: "Start date",
    description: "The employee's start date — blank for a candidate",
  },
  {
    token: "salary",
    label: "Salary",
    description: "The employee's salary amount — blank for a candidate",
  },
  {
    token: "salaryCurrency",
    label: "Salary currency",
    description: "The employee's salary currency",
  },
  {
    token: "noticePeriod",
    label: "Notice period",
    description: "Not currently tracked on the employee record — stays blank",
  },
  {
    token: "workerCategory",
    label: "Worker category",
    description: '"employee" or "consultant"',
  },
  {
    token: "tenantCompanyName",
    label: "Tenant company name",
    description: "This tenant's own registered business name",
  },
  {
    token: "todayDate",
    label: "Today's date",
    description: "Today's date",
  },
  {
    token: "reason",
    label: "Reason",
    description:
      "For letters — e.g. the grounds for a suspension, as entered on the generate form",
  },
  {
    token: "effectiveDate",
    label: "Effective date",
    description:
      "For letters — e.g. a suspension's start date, as entered on the generate form",
  },
  {
    token: "endDate",
    label: "End date",
    description:
      "For letters — e.g. a suspension's end date, as entered on the generate form",
  },
  {
    token: "scopeOfWork",
    label: "Scope of work",
    description:
      "Free-text deliverables entered on the generate form (one per line) — expands into a real numbered list. Insert this once; don't repeat it per item. Mainly relevant for a consultant/contractor template.",
  },
];

// Which modules' published templates are actually consumed by a real
// generation pipeline today, and with which vocabulary. CRM and
// KYC/AML both funnel through the exact same backend pipeline
// (ContractService.generateFromTemplate — vendor, plain CRM client,
// and KYC onboarding contracts are all the same code path under the
// hood, just tagged with a different origin), so they share one
// vocabulary. HR has its own, separate pipeline and vocabulary
// (hr/services/contract.service.ts) but IS wired to templates
// published here under module "hr" — a tenant no longer authors
// employment-contract templates themselves, they pick from the
// published HR library. GRC deal contracts don't use a template at
// all yet — surfaced honestly instead of showing a token picker that
// looks like it works but doesn't.
export function getMergeFieldsForModule(moduleKey: string | null | undefined): {
  fields: MergeFieldDef[];
  note: string | null;
} {
  switch (moduleKey) {
    case "crm":
    case "kyc_aml":
      return { fields: CRM_MERGE_FIELDS, note: null };
    case "hr":
      return { fields: HR_MERGE_FIELDS, note: null };
    case "grc":
      // Deal contracts (area "Deal contracts") are generated from published
      // templates; the full list comes from the registry endpoint.
      return { fields: CRM_MERGE_FIELDS, note: null };
    default:
      return { fields: [], note: null };
  }
}

// Tokens that expand into a whole block (currently just scopeOfWork,
// which becomes a full <ol> list) rather than one inline value —
// placing the token more than once in a template duplicates that
// entire block into every slot instead of splitting it across them,
// since the backend has no way to know the author meant "one item
// per occurrence." Flagging this in the editor (see
// findRepeatedSingleUseTokens below) catches it before a tenant sees
// a document with the same list repeated several times over.
export const SINGLE_USE_TOKENS = [
  "scopeOfWork",
  "partiesList",
  "signatoriesList",
];

// Scans a template's HTML body for any SINGLE_USE_TOKENS token that
// appears more than once, returning the offending tokens with their
// counts. Deliberately a plain substring count of "{{token}}", not a
// full HTML/DOM parse — templates are stored and rendered as HTML,
// but the token itself is always inserted as literal text (see
// insertMergeField in RichTextEditor.tsx), so it can never be split
// across tags.
export function findRepeatedSingleUseTokens(
  html: string,
): { token: string; count: number }[] {
  const offenders: { token: string; count: number }[] = [];
  for (const token of SINGLE_USE_TOKENS) {
    const matches = html.match(new RegExp(`\\{\\{${token}\\}\\}`, "g"));
    if (matches && matches.length > 1) {
      offenders.push({ token, count: matches.length });
    }
  }
  return offenders;
}

// ─────────────────────────────────────────────────────────────
// Registry client
// ─────────────────────────────────────────────────────────────

export type MergeFieldInputKind =
  | "text"
  | "textarea"
  | "date"
  | "currency"
  | "number";

export interface RegistryField extends MergeFieldDef {
  /** Heading the field is listed under in the panel. */
  group: string;
  input: MergeFieldInputKind;
  /** Sample value, used by "Preview with sample data". */
  example: string;
  /** Expands into a whole list — should appear in a template once. */
  singleUse: boolean;
  /** Template areas the field is offered in; empty = every area. */
  areas: string[];
  /** The system has no value for it — it's completed on the contract. */
  clause: boolean;
  /** Offered in every module (title, parties, dates, our company, value). */
  common: boolean;
  /** An older name kept so existing templates still fill; not listed. */
  hidden: boolean;
  /** For a hidden older name: the field to use instead. */
  aliasOf?: string;
}

/** Groups of the common fields, in the order the panel shows them. */
export const COMMON_GROUPS = [
  "Agreement",
  "Parties",
  "Our company",
  "Dates",
  "Value",
];

export const MERGE_GROUP_ORDER = [
  // Common to every module — shown first, in their own block
  ...COMMON_GROUPS,
  // Module-specific
  "Engagement",
  "Deal",
  "Deal parties",
  "Deal dates",
  "Term sheet",
  "Signing",
  "Person",
  "Employment",
  "Pay",
  "Letter",
  // Clause-level fields from the product owner's list
  "Deal & transaction clauses",
  "Governance, risk & compliance clauses",
  "Contract clauses",
  "Dispute resolution & ADR clauses",
  "AML & KYC clauses",
  "HR clauses",
  "Finance clauses",
];

export const orderGroups = (groups: string[]): string[] =>
  Array.from(new Set(groups)).sort((a, b) => {
    const ia = MERGE_GROUP_ORDER.indexOf(a);
    const ib = MERGE_GROUP_ORDER.indexOf(b);
    return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib) || a.localeCompare(b);
  });

const unwrapList = (res: { data?: unknown }): Record<string, unknown>[] => {
  const d = res?.data as { data?: unknown } | unknown[] | undefined;
  const rows = Array.isArray(d) ? d : d && Array.isArray(d.data) ? d.data : [];
  return rows as Record<string, unknown>[];
};

export async function fetchMergeFieldRegistry(
  moduleKey: string,
): Promise<RegistryField[]> {
  const res = await api.get("/super-admin/contract-templates/merge-fields", {
    params: { moduleKey },
  });
  return unwrapList(res).map((f) => ({
    token: String(f.token),
    label: String(f.label ?? f.token),
    description: String(f.description ?? ""),
    group: String(f.group ?? "Other"),
    input: (f.input ?? "text") as MergeFieldInputKind,
    example: String(f.example ?? ""),
    singleUse: !!f.singleUse,
    areas: Array.isArray(f.areas) ? (f.areas as string[]) : [],
    clause: f.source === "clause",
    common: !!f.common,
    hidden: !!f.hidden,
    aliasOf: typeof f.aliasOf === "string" ? f.aliasOf : undefined,
  }));
}

/** One entry of the slim all-modules index (token → label). */
export interface FieldIndexEntry {
  token: string;
  label: string;
  group: string;
  /** An older name — still valid, but not worth suggesting. */
  hidden?: boolean;
  aliasOf?: string;
}

/** Every field in every module — to tell "valid, from elsewhere" from "not a field". */
export async function fetchMergeFieldIndex(): Promise<FieldIndexEntry[]> {
  const res = await api.get("/super-admin/contract-templates/merge-fields", {
    params: { compact: true },
  });
  return unwrapList(res).map((f) => ({
    token: String(f.token),
    label: String(f.label ?? f.token),
    group: String(f.group ?? ""),
    hidden: f.hidden ? true : undefined,
    aliasOf: typeof f.aliasOf === "string" ? f.aliasOf : undefined,
  }));
}

const words = (token: string) =>
  token
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

/**
 * The fields closest in name to `token` — "buyerEntityName" suggests
 * "buyerName" and "partyBEntityType" before anything unrelated. A score of
 * shared words, with a bonus when one name contains the other.
 */
export function suggestFields(
  token: string,
  index: FieldIndexEntry[],
  limit = 5,
): FieldIndexEntry[] {
  const a = new Set(words(token));
  const lower = token.toLowerCase();
  return index
    .filter((f) => f.token !== token && !f.hidden)
    .map((f) => {
      const b = new Set(words(f.token));
      const shared = [...a].filter((w) => b.has(w)).length;
      const union = new Set([...a, ...b]).size;
      let score = union ? shared / union : 0;
      const fl = f.token.toLowerCase();
      if (fl.includes(lower) || lower.includes(fl)) score += 0.5;
      return { f, score };
    })
    .filter((x) => x.score > 0.2)
    .sort((x, y) => y.score - x.score)
    .slice(0, limit)
    .map((x) => x.f);
}

// The common fields, kept here too so the editor still offers them when the
// engine can't be reached. The engine's registry
// (contract-merge-common-fields.ts) is the source of truth.
type Seed = [
  token: string,
  label: string,
  group: string,
  example: string,
  input?: MergeFieldInputKind,
];
const COMMON_SEEDS: Seed[] = [
  ["title", "Contract title", "Agreement", "Share Purchase Agreement"],
  ["contractReference", "Contract reference", "Agreement", "CON-2026-014"],
  ["governingLaw", "Governing law", "Agreement", "Rwanda"],
  [
    "scopeOfWork",
    "Scope of work",
    "Agreement",
    "Draft the documents",
    "textarea",
  ],
  ["partyAName", "Party A — name", "Parties", "Wekraft Ltd"],
  ["partyAAddress", "Party A — address", "Parties", "KG 7 Ave, Kigali"],
  ["partyARepresentative", "Party A — signatory", "Parties", "Julie Ohankwere"],
  ["partyARepresentativeTitle", "Party A — signatory title", "Parties", "CTO"],
  ["partyBName", "Party B — name", "Parties", "Roselyn Designs Ltd"],
  ["partyBAddress", "Party B — address", "Parties", "Plot 12, Kigali"],
  ["partyBEmail", "Party B — email", "Parties", "legal@roselyn.example"],
  ["partyBRepresentative", "Party B — signatory", "Parties", "Aline Uwase"],
  ["partyBRepresentativeTitle", "Party B — signatory title", "Parties", "MD"],
  ["tenantCompanyName", "Our company name", "Our company", "Wekraft Ltd"],
  [
    "tenantRegisteredAddress",
    "Our registered address",
    "Our company",
    "KG 7 Ave, Kigali",
  ],
  ["tenantCompanyJurisdiction", "Our jurisdiction", "Our company", "Rwanda"],
  [
    "tenantCompanyRegistrationNumber",
    "Our registration number",
    "Our company",
    "123456789",
  ],
  ["tenantCompanyTaxId", "Our tax ID", "Our company", "102345678"],
  [
    "tenantCompanyEmail",
    "Our contact email",
    "Our company",
    "legal@wekraft.example",
  ],
  [
    "tenantCompanyPhone",
    "Our contact phone",
    "Our company",
    "+250 788 000 000",
  ],
  ["effectiveDate", "Effective date", "Dates", "2026-11-02", "date"],
  ["expiryDate", "Expiry date", "Dates", "2027-11-02", "date"],
  ["todayDate", "Today's date", "Dates", "2026-11-02", "date"],
  ["contractValue", "Contract value", "Value", "250000", "number"],
  ["contractCurrency", "Contract currency", "Value", "USD", "currency"],
];
const ALIAS_SEEDS: [string, string][] = [
  ["counterpartyName", "partyBName"],
  ["recipientName", "partyBName"],
  ["recipientEmail", "partyBEmail"],
  ["clientRegisteredAddress", "partyBAddress"],
  ["clientRepresentativeName", "partyBRepresentative"],
  ["clientRepresentativeTitle", "partyBRepresentativeTitle"],
  ["leadProfessionalName", "partyARepresentative"],
  ["leadProfessionalTitle", "partyARepresentativeTitle"],
];

const base = (): Omit<
  RegistryField,
  "token" | "label" | "description" | "group" | "input" | "example"
> => ({
  singleUse: false,
  areas: [],
  clause: false,
  common: false,
  hidden: false,
});

/** The offline fallback, shaped like registry fields. */
export function fallbackRegistry(moduleKey: string): RegistryField[] {
  const common: RegistryField[] = COMMON_SEEDS.map(
    ([token, label, group, example, input]) => ({
      ...base(),
      token,
      label,
      description: "",
      group,
      input: input ?? "text",
      example,
      singleUse: SINGLE_USE_TOKENS.includes(token),
      common: true,
    }),
  );
  const labels = new Map(COMMON_SEEDS.map((c) => [c[0], c[1]]));
  const aliases: RegistryField[] = ALIAS_SEEDS.map(([token, of]) => ({
    ...base(),
    token,
    label: token,
    description: `Older name for ${labels.get(of)}`,
    group: "Parties",
    input: "text" as const,
    example: "",
    common: true,
    hidden: true,
    aliasOf: of,
  }));
  const taken = new Set([...common, ...aliases].map((f) => f.token));
  const specific: RegistryField[] = getMergeFieldsForModule(moduleKey)
    .fields.filter((f) => !taken.has(f.token))
    .map((f) => ({
      ...base(),
      ...f,
      group: "Other fields",
      input: "text" as const,
      example: f.label,
      singleUse: SINGLE_USE_TOKENS.includes(f.token),
    }));
  return [...common, ...aliases, ...specific];
}

/** Every {{token}} in a template body with how many times it appears. */
export function countTokens(html: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const m of (html ?? "").matchAll(/\{\{(\w+)\}\}/g)) {
    counts.set(m[1], (counts.get(m[1]) ?? 0) + 1);
  }
  return counts;
}

const escapeHtml = (v: string) =>
  v
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/**
 * The template body with each known {{token}} swapped for its sample value
 * (highlighted) and each unknown one flagged — what "Preview with sample
 * data" shows. List fields get one numbered line per row.
 */
export function renderWithSamples(
  html: string,
  fields: RegistryField[],
  mode: "fields" | "samples" = "samples",
): string {
  const byToken = new Map(fields.map((f) => [f.token, f]));
  return (html ?? "").replace(/\{\{(\w+)\}\}/g, (_m, token: string) => {
    const f = byToken.get(token);
    if (!f) {
      return `<mark class="tpl-unknown" title="Not a known field">{{${token}}}</mark>`;
    }
    // The merge field itself — exactly what a tenant's contract will fill in.
    if (mode === "fields") {
      return `<mark class="tpl-field" title="${escapeHtml(f.label)}">{{${token}}}</mark>`;
    }
    const lines = (f.example || f.label).split("\n").filter(Boolean);
    const body =
      f.singleUse && lines.length > 1
        ? lines.map((l, i) => `${i + 1}. ${escapeHtml(l)}`).join("<br>")
        : lines.map(escapeHtml).join("<br>");
    return `<mark class="tpl-sample" title="${escapeHtml(f.label)}">${body}</mark>`;
  });
}
