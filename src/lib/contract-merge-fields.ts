// ─────────────────────────────────────────────────────────────
// Merge-field vocabulary for the template body editor's "Insert
// field" picker. A template author shouldn't have to know the
// exact {{token}} spelling from memory — this is what lets them
// insert one with a click instead.
//
// This list mirrors CONTRACT_MERGE_FIELDS in the backend
// (lexora-engine: src/modules/crm/tools/schemas/contract.schema.ts)
// exactly. There's no way for this app to import that backend
// constant directly, so if a field is ever added/removed/renamed
// there, update CRM_MERGE_FIELDS below to match by hand — the two
// lists silently drifting apart is exactly the bug this file exists
// to prevent for a template author.
// ─────────────────────────────────────────────────────────────

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

// Which modules' published templates are actually consumed by a real
// generation pipeline today, and with which vocabulary. CRM and
// KYC/AML both funnel through the exact same backend pipeline
// (ContractService.generateFromTemplate — vendor, plain CRM client,
// and KYC onboarding contracts are all the same code path under the
// hood, just tagged with a different origin), so they share one
// vocabulary. HR and GRC are NOT wired to a template published from
// here yet — HR generates from its own, separately-authored
// tenant-side templates (Tenant app → HR → Contract templates, which
// already has its own token picker), and GRC deal contracts don't
// use a template at all yet. Surface that honestly instead of
// showing a token picker that looks like it works but doesn't.
export function getMergeFieldsForModule(moduleKey: string | null | undefined): {
  fields: MergeFieldDef[];
  note: string | null;
} {
  switch (moduleKey) {
    case "crm":
    case "kyc_aml":
      return { fields: CRM_MERGE_FIELDS, note: null };
    case "hr":
      return {
        fields: [],
        note: "HR contracts are generated from templates authored directly in the tenant app (HR → Contract templates), which has its own field picker — a template published here under HR isn't currently used by HR's contract generation.",
      };
    case "grc":
      return {
        fields: [],
        note: "GRC deal contracts aren't generated from a published template yet — they're currently built directly from the deal's own terms. Merge fields for GRC are coming in a later update.",
      };
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
export const SINGLE_USE_TOKENS = ["scopeOfWork"];

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
