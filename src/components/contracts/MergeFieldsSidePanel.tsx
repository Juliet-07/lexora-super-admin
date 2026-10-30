import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  GripVertical,
  Loader2,
  Plus,
  Search,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { orderGroups, type RegistryField } from "@/lib/contract-merge-fields";

interface Props {
  fields: RegistryField[];
  loading?: boolean;
  /** The list is the built-in fallback, not the live registry. */
  offline?: boolean;
  /** token → times it appears in the template body */
  counts: Map<string, number>;
  /** {{tokens}} in the body that are not in the field list */
  unknown: string[];
  /** Single-use fields that appear more than once */
  repeated: { token: string; count: number }[];
  onInsert: (field: RegistryField) => void;
}

// The "pick a field, drop it in the document" half of the template editor.
// Click a field to put it where the cursor is, or drag it into the text.
export function MergeFieldsSidePanel({
  fields,
  loading,
  offline,
  counts,
  unknown,
  repeated,
  onInsert,
}: Props) {
  const [query, setQuery] = useState("");
  const [onlyUsed, setOnlyUsed] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [justAdded, setJustAdded] = useState<string | null>(null);

  const usedCount = useMemo(
    () => fields.filter((f) => counts.has(f.token)).length,
    [fields, counts],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return fields.filter((f) => {
      if (onlyUsed && !counts.has(f.token)) return false;
      if (!q) return true;
      return (
        f.token.toLowerCase().includes(q) ||
        f.label.toLowerCase().includes(q) ||
        f.description.toLowerCase().includes(q) ||
        f.group.toLowerCase().includes(q)
      );
    });
  }, [fields, query, onlyUsed, counts]);

  const groups = useMemo(
    () =>
      orderGroups(filtered.map((f) => f.group)).map((g) => ({
        group: g,
        items: filtered.filter((f) => f.group === g),
        total: fields.filter((f) => f.group === g).length,
        used: fields.filter((f) => f.group === g && counts.has(f.token)).length,
      })),
    [filtered, fields, counts],
  );

  const searching = query.trim().length > 0;

  const insert = (f: RegistryField) => {
    onInsert(f);
    setJustAdded(f.token);
    window.setTimeout(
      () => setJustAdded((cur) => (cur === f.token ? null : cur)),
      1200,
    );
  };

  const toggle = (g: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(g)) next.delete(g);
      else next.add(g);
      return next;
    });

  return (
    <aside
      className="flex h-full min-h-0 flex-col rounded-lg border bg-card"
      aria-label="Merge fields"
    >
      <div className="space-y-2 border-b p-3">
        <div className="flex items-baseline justify-between">
          <h3 className="text-sm font-semibold">Fields</h3>
          <span className="text-xs text-muted-foreground">
            {usedCount} of {fields.length} used
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Click a field to add it where your cursor is, or drag it into the
          text. Each one is filled in automatically when a contract is
          generated.
        </p>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search fields…"
            className="h-8 pl-7 text-xs"
            aria-label="Search fields"
          />
        </div>
        <div className="flex gap-1 text-xs">
          <button
            type="button"
            onClick={() => setOnlyUsed(false)}
            className={cn(
              "rounded-full border px-2.5 py-0.5",
              !onlyUsed
                ? "border-primary bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            All fields
          </button>
          <button
            type="button"
            onClick={() => setOnlyUsed(true)}
            className={cn(
              "rounded-full border px-2.5 py-0.5",
              onlyUsed
                ? "border-primary bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            In this template ({usedCount})
          </button>
        </div>
      </div>

      {(unknown.length > 0 || repeated.length > 0 || offline) && (
        <div className="space-y-1.5 border-b p-3 text-xs">
          {offline && (
            <p className="flex gap-1.5 rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1.5 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Couldn't load the live field list — showing a built-in subset.
            </p>
          )}
          {unknown.length > 0 && (
            <p className="flex gap-1.5 rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1.5 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                Not a known field:{" "}
                {unknown.map((t, i) => (
                  <span key={t}>
                    {i > 0 && ", "}
                    <code className="font-mono">{`{{${t}}}`}</code>
                  </span>
                ))}
                . It would stay as plain text in generated contracts.
              </span>
            </p>
          )}
          {repeated.map((r) => (
            <p
              key={r.token}
              className="flex gap-1.5 rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1.5 text-amber-600 dark:text-amber-400"
            >
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                <code className="font-mono">{`{{${r.token}}}`}</code> appears{" "}
                {r.count} times. It expands into a whole list, so use it once.
              </span>
            </p>
          ))}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading fields…
          </div>
        ) : !groups.length ? (
          <p className="px-3 py-10 text-center text-xs text-muted-foreground">
            {onlyUsed && !searching
              ? "No fields used yet — pick one from the list."
              : `No fields match “${query}”.`}
          </p>
        ) : (
          groups.map(({ group, items, total, used }) => {
            const open = searching || !collapsed.has(group);
            return (
              <section key={group} className="mb-1">
                <button
                  type="button"
                  onClick={() => toggle(group)}
                  aria-expanded={open}
                  className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left hover:bg-muted/60"
                >
                  <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    <ChevronDown
                      className={cn(
                        "h-3.5 w-3.5 transition-transform",
                        !open && "-rotate-90",
                      )}
                    />
                    {group}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {used > 0 ? `${used}/` : ""}
                    {total}
                  </span>
                </button>
                {open && (
                  <ul className="space-y-1 pb-1">
                    {items.map((f) => {
                      const n = counts.get(f.token) ?? 0;
                      return (
                        <li key={f.token}>
                          <div
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.setData(
                                "text/plain",
                                `{{${f.token}}}`,
                              );
                              e.dataTransfer.effectAllowed = "copy";
                            }}
                            className={cn(
                              "group flex items-start gap-1.5 rounded-md border border-transparent px-1.5 py-1.5 hover:border-border hover:bg-muted/50",
                              n > 0 && "bg-primary/5",
                            )}
                          >
                            <GripVertical className="mt-0.5 h-3.5 w-3.5 shrink-0 cursor-grab text-muted-foreground/40 group-hover:text-muted-foreground" />
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-xs font-medium">
                                  {f.label}
                                </span>
                                {n > 0 && (
                                  <Badge
                                    variant="secondary"
                                    className="h-4 px-1.5 text-[10px]"
                                  >
                                    ×{n}
                                  </Badge>
                                )}
                                {f.singleUse && (
                                  <Badge
                                    variant="outline"
                                    className="h-4 px-1.5 text-[10px]"
                                    title="Expands into a whole list — use it once"
                                  >
                                    use once
                                  </Badge>
                                )}
                              </div>
                              <code className="font-mono text-[11px] text-primary">{`{{${f.token}}}`}</code>
                              {f.description && (
                                <p
                                  className="line-clamp-2 text-[11px] text-muted-foreground"
                                  title={f.description}
                                >
                                  {f.description}
                                </p>
                              )}
                              {f.example && (
                                <p className="line-clamp-1 text-[11px] italic text-muted-foreground/80">
                                  e.g. {f.example.split("\n")[0]}
                                </p>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => insert(f)}
                              aria-label={`Insert ${f.label}`}
                              title="Insert at cursor"
                              className={cn(
                                "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground",
                                justAdded === f.token &&
                                  "border-emerald-500 bg-emerald-500/15 text-emerald-600",
                              )}
                            >
                              {justAdded === f.token ? (
                                <Check className="h-3.5 w-3.5" />
                              ) : (
                                <Plus className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            );
          })
        )}
      </div>
    </aside>
  );
}
