// The parts of a contract template: a cover page, a table of contents and
// the body. The contents page is never typed — it is read off the body's
// Heading 1–3 lines, so it cannot disagree with the text.

export interface OutlineEntry {
  /** 1–3, relative to the shallowest heading in use. */
  level: number;
  /** The heading's html (text, plus any {{field}}). */
  html: string;
  text: string;
}

export function outlineOf(bodyHtml: string): OutlineEntry[] {
  if (!bodyHtml?.trim() || typeof DOMParser === "undefined") return [];
  const doc = new DOMParser().parseFromString(bodyHtml, "text/html");
  const rows = Array.from(doc.querySelectorAll("h1, h2, h3"))
    .map((h) => ({
      level: Number(h.tagName.slice(1)),
      html: h.innerHTML.trim(),
      text: (h.textContent ?? "").trim(),
    }))
    .filter((r) => r.text);
  if (!rows.length) return [];
  const top = Math.min(...rows.map((r) => r.level));
  return rows.map((r) => ({ ...r, level: r.level - top + 1 }));
}

export const hasText = (html: string) =>
  /<img\b/i.test(html) || !!html.replace(/<[^>]*>/g, "").trim();
