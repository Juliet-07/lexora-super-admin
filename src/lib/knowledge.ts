import { useSyncExternalStore } from "react";

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

const iso = (d: string) => new Date(d).toISOString();

const seed: KnowledgeEntry[] = [
  {
    id: "kb-1001",
    title: "Law N° 058/2021 on the Protection of Personal Data and Privacy",
    category: "Statute",
    practiceArea: "Data Protection",
    jurisdiction: "Rwanda",
    summary:
      "Rwanda's primary data protection statute establishing lawful bases for processing, data subject rights and the powers of the supervisory authority.",
    content: `<h2>Scope of application</h2><p>The law applies to any <strong>data controller</strong> or <strong>data processor</strong> established in Rwanda, as well as to entities outside Rwanda that process the personal data of data subjects located in Rwanda.</p><h3>Lawful bases for processing</h3><ul><li>Consent of the data subject</li><li>Performance of a contract</li><li>Compliance with a legal obligation</li><li>Protection of vital interests</li><li>Public interest or official authority</li></ul><h3>Data subject rights</h3><ol><li>Right of access</li><li>Right to rectification</li><li>Right to erasure</li><li>Right to object to processing</li><li>Right to data portability</li></ol><blockquote>Registration with the National Cyber Security Authority is mandatory for controllers and processors.</blockquote>`,
    reference: "Law N° 058/2021",
    source: "Official Gazette n° Special of 15/10/2021",
    externalLink: "https://www.minict.gov.rw",
    status: "Published",
    createdAt: iso("2025-11-02"),
    updatedAt: iso("2026-06-18"),
    publishedAt: iso("2025-11-10"),
  },
  {
    id: "kb-1002",
    title: "BNR Regulation on Anti-Money Laundering and Countering Terrorism Financing",
    category: "Regulation",
    practiceArea: "AML / KYC",
    jurisdiction: "Rwanda",
    summary:
      "Supervisory regulation setting customer due diligence, record keeping and suspicious transaction reporting duties for financial institutions.",
    content: `<h2>Customer due diligence</h2><p>Institutions must identify and verify the identity of every customer <em>before</em> establishing a business relationship.</p><ul><li>Simplified CDD for low-risk relationships</li><li>Enhanced CDD for politically exposed persons</li><li>Ongoing monitoring throughout the relationship</li></ul><h3>Reporting</h3><p>Suspicious transaction reports must be filed with the Financial Intelligence Centre <strong>within 48 hours</strong> of forming the suspicion.</p>`,
    reference: "Regulation N° 2400/2023",
    source: "National Bank of Rwanda",
    status: "Published",
    createdAt: iso("2026-01-14"),
    updatedAt: iso("2026-07-22"),
    publishedAt: iso("2026-01-20"),
  },
  {
    id: "kb-1003",
    title: "Nsengiyumva v. Rwanda Revenue Authority",
    category: "Case Law",
    practiceArea: "Tax",
    jurisdiction: "Rwanda",
    summary:
      "Court of Appeal decision clarifying the burden of proof in VAT assessments raised on the basis of estimated turnover.",
    content: `<h2>Facts</h2><p>The appellant challenged an estimated VAT assessment issued after the tax administration rejected his accounting records.</p><h2>Holding</h2><p>The Court held that once the administration establishes a <strong>prima facie</strong> basis for an estimated assessment, the burden shifts to the taxpayer to produce reliable contrary evidence.</p><h3>Practical takeaways</h3><ul><li>Maintain contemporaneous sales records</li><li>Object within the 30-day statutory window</li><li>Estimated assessments are not immune from judicial review</li></ul>`,
    reference: "RCOMA 00021/2024/CA",
    source: "Court of Appeal Bulletin",
    status: "Published",
    createdAt: iso("2026-03-05"),
    updatedAt: iso("2026-05-30"),
    publishedAt: iso("2026-03-11"),
  },
  {
    id: "kb-1004",
    title: "EAC Common Market Protocol — Free Movement of Services",
    category: "International",
    practiceArea: "Corporate Law",
    jurisdiction: "EAC",
    summary:
      "Regional framework governing cross-border provision of professional services within the East African Community partner states.",
    content: `<h2>Overview</h2><p>The Protocol guarantees the free movement of services across partner states, subject to scheduled commitments per sector.</p><h3>Professional services</h3><ol><li>Mutual recognition of qualifications</li><li>Non-discriminatory licensing conditions</li><li>Progressive removal of market access restrictions</li></ol>`,
    reference: "EAC/CMP/2010",
    source: "East African Community Secretariat",
    externalLink: "https://www.eac.int",
    status: "Published",
    createdAt: iso("2025-09-19"),
    updatedAt: iso("2026-02-08"),
    publishedAt: iso("2025-09-25"),
  },
  {
    id: "kb-1005",
    title: "Practical Guide to Board Governance under the Companies Act",
    category: "Commentary",
    practiceArea: "Corporate Law",
    jurisdiction: "Rwanda",
    summary:
      "In-house commentary on director duties, conflicts of interest and board meeting formalities for private companies.",
    content: `<h2>Director duties</h2><p>Directors owe duties of <strong>loyalty</strong>, <strong>care</strong> and <strong>good faith</strong> to the company.</p><h3>Conflicts of interest</h3><p>A director with a material interest in a transaction must declare it and abstain from voting.</p><blockquote>Draft note — pending review by the compliance team before release.</blockquote>`,
    source: "Lexora Legal Research",
    status: "Draft",
    createdAt: iso("2026-06-02"),
    updatedAt: iso("2026-07-30"),
  },
  {
    id: "kb-1006",
    title: "Update: New Beneficial Ownership Filing Deadlines",
    category: "Update",
    practiceArea: "Compliance",
    jurisdiction: "Rwanda",
    summary:
      "Registrar General shortens the beneficial ownership declaration window from 30 to 14 days for newly incorporated entities.",
    content: `<h2>What changed</h2><p>Newly incorporated companies must now file beneficial ownership particulars within <strong>14 days</strong> of registration.</p><h3>Action required</h3><ul><li>Update internal onboarding checklists</li><li>Notify affected clients before the effective date</li></ul>`,
    source: "Rwanda Development Board",
    status: "Draft",
    createdAt: iso("2026-07-28"),
    updatedAt: iso("2026-08-04"),
  },
  {
    id: "kb-1007",
    title: "Ministerial Order Determining Labour Inspection Procedures",
    category: "Regulation",
    practiceArea: "Employment Law",
    jurisdiction: "Rwanda",
    summary:
      "Sets out how labour inspections are initiated, conducted and appealed, including employer record-keeping obligations.",
    content: `<h2>Inspection procedure</h2><ol><li>Notice of inspection (except for unannounced inspections)</li><li>On-site verification of registers and contracts</li><li>Inspection report and remediation notice</li></ol><p>Employers may appeal a remediation notice within <em>15 working days</em>.</p>`,
    reference: "MO N° 003/19.20",
    source: "Official Gazette",
    status: "Published",
    createdAt: iso("2025-12-11"),
    updatedAt: iso("2026-04-16"),
    publishedAt: iso("2025-12-18"),
  },
];

let entries: KnowledgeEntry[] = seed;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const getSnapshot = () => entries;

export function useKnowledgeEntries() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function getEntry(id: string) {
  return entries.find((e) => e.id === id);
}

export function practiceAreas() {
  return Array.from(new Set(entries.map((e) => e.practiceArea).filter(Boolean))).sort();
}

export type EntryInput = Omit<
  KnowledgeEntry,
  "id" | "createdAt" | "updatedAt" | "publishedAt" | "status"
>;

export function createEntry(input: EntryInput, status: EntryStatus): KnowledgeEntry {
  const now = new Date().toISOString();
  const entry: KnowledgeEntry = {
    ...input,
    id: `kb-${Math.random().toString(36).slice(2, 8)}`,
    status,
    createdAt: now,
    updatedAt: now,
    publishedAt: status === "Published" ? now : undefined,
  };
  entries = [entry, ...entries];
  emit();
  return entry;
}

export function updateEntry(id: string, input: EntryInput, status: EntryStatus) {
  const now = new Date().toISOString();
  entries = entries.map((e) =>
    e.id === id
      ? {
          ...e,
          ...input,
          status,
          updatedAt: now,
          publishedAt:
            status === "Published" ? e.publishedAt ?? now : e.publishedAt,
        }
      : e,
  );
  emit();
}

export function setStatus(id: string, status: EntryStatus) {
  const now = new Date().toISOString();
  entries = entries.map((e) =>
    e.id === id
      ? {
          ...e,
          status,
          updatedAt: now,
          publishedAt: status === "Published" ? e.publishedAt ?? now : e.publishedAt,
        }
      : e,
  );
  emit();
}

export function deleteEntry(id: string) {
  entries = entries.filter((e) => e.id !== id);
  emit();
}

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
