import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { RichTextView } from "@/components/RichTextEditor";
import { hasText, outlineOf } from "@/lib/contract-structure";

interface Props {
  coverHtml: string;
  tocEnabled: boolean;
  tocTitle: string;
  bodyHtml: string;
  /** Turns {{fields}} into what the preview shows (sample values, chips…). */
  transform?: (html: string) => string;
  className?: string;
}

// A template as a reader will meet it: the cover page first, the contents
// page next, then the body — each on its own page.
export function TemplatePagesPreview({
  coverHtml,
  tocEnabled,
  tocTitle,
  bodyHtml,
  transform = (h) => h,
  className,
}: Props) {
  const outline = useMemo(() => outlineOf(bodyHtml), [bodyHtml]);
  const showCover = hasText(coverHtml);
  const showToc = tocEnabled && outline.length > 0;
  const bodyEmpty = !hasText(bodyHtml);

  const Page = ({
    label,
    children,
    centre,
  }: {
    label: string;
    children: React.ReactNode;
    centre?: boolean;
  }) => (
    <section aria-label={label} className="space-y-1.5">
      <p className="px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <div
        className={cn(
          "min-h-[520px] rounded-lg border bg-card p-10 shadow-sm",
          centre && "flex flex-col items-center justify-center text-center",
        )}
      >
        {children}
      </div>
    </section>
  );

  return (
    <div className={cn("space-y-6", className)}>
      {showCover && (
        <Page label="Cover page" centre>
          <RichTextView html={transform(coverHtml)} className="text-center" />
        </Page>
      )}
      {showToc && (
        <Page label="Table of contents">
          <h2 className="mb-5 text-xl font-bold">
            {tocTitle || "Table of Contents"}
          </h2>
          <ul className="space-y-1.5 text-sm">
            {outline.map((e, i) => (
              <li
                key={i}
                style={{ paddingLeft: `${(e.level - 1) * 20}px` }}
                className={cn(e.level === 1 && "font-semibold")}
                dangerouslySetInnerHTML={{ __html: transform(e.html) }}
              />
            ))}
          </ul>
        </Page>
      )}
      <Page label="Body">
        <RichTextView html={bodyEmpty ? "" : transform(bodyHtml)} />
      </Page>
    </div>
  );
}
