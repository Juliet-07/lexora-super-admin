import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Crosshair,
  GripVertical,
  Loader2,
  Plus,
  Replace,
  Search,
  Trash2,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  COMMON_GROUPS,
  orderGroups,
  suggestFields,
  type FieldIndexEntry,
  type RegistryField,
} from "@/lib/contract-merge-fields";

// Module groups start closed. A group this big also shows only its first
// rows — the clause lists run to hundreds of fields, where search is the way in.
const BIG_GROUP = 40;
const PAGE = 60;

interface Props {
  fields: RegistryField[];
  loading?: boolean;
  /** The list is the built-in fallback, not the live registry. */
  offline?: boolean;
  /** token → times it appears in the template body */
  counts: Map<string, number>;
  /** {{tokens}} in the body that are not a field in any module */
  unknown: { token: string; count: number }[];
  /** Real fields from another module / area, used in this template */
  elsewhere: { token: string; label: string; count: number }[];
  /** Older field names the template uses, and the current name for each */
  legacy: {
    token: string;
    count: number;
    useToken: string;
    useLabel: string;
  }[];
  /** Every field in every module — what a bad field can be replaced with */
  index: FieldIndexEntry[];
  /** Select the next occurrence of a token in the document */
  onFind: (token: string) => void;
  /** Swap every occurrence of one token for another */
  onReplace: (from: string, to: string) => void;
  /** Delete every occurrence of a token */
  onRemove: (token: string) => void;
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
  elsewhere,
  legacy,
  index,
  onFind,
  onReplace,
  onRemove,
  repeated,
  onInsert,
}: Props) {
  const [query, setQuery] = useState("");
  const [onlyUsed, setOnlyUsed] = useState(false);
  const [commonOpen, setCommonOpen] = useState(true);
  const [justAdded, setJustAdded] = useState<string | null>(null);
  // Module groups the author has opened (they start closed), and how many
  // rows of a big one are showing.
  const [opened, setOpened] = useState<Set<string>>(new Set());
  const [shown, setShown] = useState<Record<string, number>>({});

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

  // The common fields come first, in one block — the same for every module
  // and role. Everything else is that module's own, grouped and collapsed.
  const common = useMemo(() => {
    const items = filtered.filter((f) => f.common);
    return COMMON_GROUPS.map((g) => ({
      group: g,
      items: items.filter((f) => f.group === g),
    })).filter((g) => g.items.length);
  }, [filtered]);
  const commonTotal = useMemo(
    () => fields.filter((f) => f.common).length,
    [fields],
  );
  const commonUsed = useMemo(
    () => fields.filter((f) => f.common && counts.has(f.token)).length,
    [fields, counts],
  );

  const groups = useMemo(() => {
    const own = filtered.filter((f) => !f.common);
    const allOwn = fields.filter((f) => !f.common);
    return orderGroups(own.map((f) => f.group)).map((g) => ({
      group: g,
      items: own.filter((f) => f.group === g),
      total: allOwn.filter((f) => f.group === g).length,
      used: allOwn.filter((f) => f.group === g && counts.has(f.token)).length,
    }));
  }, [filtered, fields, counts]);

  const searching = query.trim().length > 0;
  const nothing = !common.length && !groups.length;

  const insert = (f: RegistryField) => {
    onInsert(f);
    setJustAdded(f.token);
    window.setTimeout(
      () => setJustAdded((cur) => (cur === f.token ? null : cur)),
      1200,
    );
  };

  const toggle = (g: string) =>
    setOpened((prev) => {
      const next = new Set(prev);
      if (next.has(g)) next.delete(g);
      else next.add(g);
      return next;
    });

  const row = (f: RegistryField) => (
    <FieldRow
      key={f.token}
      field={f}
      n={counts.get(f.token) ?? 0}
      justAdded={justAdded === f.token}
      onInsert={insert}
    />
  );

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

      {offline && (
        <p className="mx-3 mt-3 flex gap-1.5 rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1.5 text-xs text-amber-600 dark:text-amber-400">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Couldn't load the live field list — showing a built-in subset.
        </p>
      )}
      {(unknown.length > 0 || repeated.length > 0) && (
        <AttentionBox
          unknown={unknown}
          repeated={repeated}
          index={index}
          onFind={onFind}
          onReplace={onReplace}
          onRemove={onRemove}
        />
      )}
      {legacy.length > 0 && (
        <LegacyBox legacy={legacy} onFind={onFind} onReplace={onReplace} />
      )}

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading fields…
          </div>
        ) : nothing ? (
          <p className="px-3 py-10 text-center text-xs text-muted-foreground">
            {onlyUsed && !searching
              ? "No fields used yet — pick one from the list."
              : `No fields match “${query}”.`}
          </p>
        ) : (
          <>
            {common.length > 0 && (
              <section
                className="mb-2 rounded-md border border-primary/20 bg-primary/5 p-1"
                aria-label="Common fields"
              >
                <button
                  type="button"
                  onClick={() => setCommonOpen((o) => !o)}
                  aria-expanded={commonOpen || searching}
                  className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left hover:bg-primary/10"
                >
                  <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-primary">
                    <ChevronDown
                      className={cn(
                        "h-3.5 w-3.5 transition-transform",
                        !(commonOpen || searching) && "-rotate-90",
                      )}
                    />
                    Common fields
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {commonUsed > 0 ? `${commonUsed}/` : ""}
                    {commonTotal}
                  </span>
                </button>
                {(commonOpen || searching) && (
                  <div className="pb-1">
                    <p className="px-2 pb-1 text-[11px] text-muted-foreground">
                      In every contract, whatever the role — the basics.
                    </p>
                    {common.map(({ group, items }) => (
                      <div key={group}>
                        <p className="px-2 pt-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">
                          {group}
                        </p>
                        <ul className="space-y-0.5">
                          {items.map((f) => (
                            <li key={f.token}>{row(f)}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {groups.length > 0 && (
              <p className="px-2 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">
                For this module
              </p>
            )}
            {groups.map(({ group, items, total, used }) => {
              const big = total > BIG_GROUP;
              const open = searching || opened.has(group);
              const limit = shown[group] ?? PAGE;
              const visible = big ? items.slice(0, limit) : items;
              return (
                <section key={group} className="mb-0.5">
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
                    <ul className="space-y-0.5 pb-1">
                      {visible.map((f) => (
                        <li key={f.token}>{row(f)}</li>
                      ))}
                    </ul>
                  )}
                  {open && big && items.length > visible.length && (
                    <button
                      type="button"
                      onClick={() =>
                        setShown((s) => ({ ...s, [group]: limit + PAGE }))
                      }
                      className="mb-1 ml-2 text-xs text-primary hover:underline"
                    >
                      Show {Math.min(PAGE, items.length - visible.length)} more
                      ({items.length - visible.length} hidden) — or search above
                    </button>
                  )}
                </section>
              );
            })}
          </>
        )}
        {onlyUsed && !searching && elsewhere.length > 0 && (
          <section className="mt-2 border-t pt-2">
            <p className="px-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              From other modules ({elsewhere.length})
            </p>
            <p className="px-2 pb-1.5 text-[11px] text-muted-foreground">
              Real fields, just not in this module's own list. They stay visible
              in the contract and are filled in there.
            </p>
            <ul className="space-y-0.5">
              {elsewhere.map((e) => (
                <li
                  key={e.token}
                  className="flex items-center justify-between gap-2 rounded-md px-2 py-1 hover:bg-muted/50"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-medium">
                      {e.label}
                      {e.count > 1 && (
                        <span className="ml-1 text-[10px] text-muted-foreground">
                          ×{e.count}
                        </span>
                      )}
                    </span>
                    <code className="font-mono text-[11px] text-primary">{`{{${e.token}}}`}</code>
                  </span>
                  <button
                    type="button"
                    onClick={() => onFind(e.token)}
                    title="Find in the document"
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-muted-foreground hover:border-primary hover:text-primary"
                  >
                    <Crosshair className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </aside>
  );
}

// One field: its name and token, with the description and a sample value on
// hover instead of printed under every row — which is what made the list
// long. Click + (or drag the row) to put it in the document.
function FieldRow({
  field: f,
  n,
  justAdded,
  onInsert,
}: {
  field: RegistryField;
  n: number;
  justAdded: boolean;
  onInsert: (f: RegistryField) => void;
}) {
  const tip = [f.description, f.example && `e.g. ${f.example.split("\n")[0]}`]
    .filter(Boolean)
    .join("\n");
  return (
    <div
      draggable
      title={tip || undefined}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", `{{${f.token}}}`);
        e.dataTransfer.effectAllowed = "copy";
      }}
      className={cn(
        "group flex items-center gap-1.5 rounded-md border border-transparent px-1.5 py-1 hover:border-border hover:bg-muted/50",
        n > 0 && "bg-primary/5",
      )}
    >
      <GripVertical className="h-3.5 w-3.5 shrink-0 cursor-grab text-muted-foreground/40 group-hover:text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium">{f.label}</span>
          {n > 0 && (
            <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
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
        <code className="block truncate font-mono text-[11px] text-primary">{`{{${f.token}}}`}</code>
      </div>
      <button
        type="button"
        onClick={() => onInsert(f)}
        aria-label={`Insert ${f.label}`}
        title="Insert at cursor"
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground",
          justAdded && "border-emerald-500 bg-emerald-500/15 text-emerald-600",
        )}
      >
        {justAdded ? (
          <Check className="h-3.5 w-3.5" />
        ) : (
          <Plus className="h-3.5 w-3.5" />
        )}
      </button>
    </div>
  );
}

// Older field names the template still uses. They keep working, so this is
// a tidy-up suggestion rather than a warning: switch each to the current
// name so the template reads the same way as every other one.
function LegacyBox({
  legacy,
  onFind,
  onReplace,
}: {
  legacy: Props["legacy"];
  onFind: (token: string) => void;
  onReplace: (from: string, to: string) => void;
}) {
  return (
    <div className="border-b bg-muted/30 px-3 py-2">
      <p className="pb-1 text-[11px] font-semibold text-muted-foreground">
        {legacy.length} older field name{legacy.length > 1 ? "s" : ""} — still
        work
      </p>
      <div className="max-h-32 space-y-1 overflow-y-auto">
        {legacy.map((l) => (
          <div
            key={l.token}
            className="flex items-center justify-between gap-1.5 text-[11px]"
          >
            <button
              type="button"
              onClick={() => onFind(l.token)}
              title="Find in the document"
              className="min-w-0 truncate text-left hover:underline"
            >
              <code className="font-mono">{`{{${l.token}}}`}</code>
              {l.count > 1 && ` ×${l.count}`}
            </button>
            <button
              type="button"
              onClick={() => onReplace(l.token, l.useToken)}
              title={`Replace with {{${l.useToken}}}`}
              aria-label={`Switch ${l.token} to ${l.useLabel}`}
              className="flex shrink-0 items-center gap-1 rounded-md border px-1.5 py-0.5 text-muted-foreground hover:border-primary hover:text-primary"
            >
              <Replace className="h-3 w-3" /> Use {l.useLabel}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// Fields in the template that aren't a field at all (a typo, or a name the
// system has never heard of), and single-use fields repeated. Each can be
// found in the document, swapped for a real field, or removed. The list
// scrolls inside a capped box so a template with dozens of them never
// pushes the field list off the screen.
function AttentionBox({
  unknown,
  repeated,
  index,
  onFind,
  onReplace,
  onRemove,
}: {
  unknown: { token: string; count: number }[];
  repeated: { token: string; count: number }[];
  index: FieldIndexEntry[];
  onFind: (token: string) => void;
  onReplace: (from: string, to: string) => void;
  onRemove: (token: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const total = unknown.length + repeated.length;
  return (
    <div className="border-b bg-amber-500/5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs font-semibold text-amber-600 dark:text-amber-400"
      >
        <span className="flex items-center gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5" />
          {unknown.length > 0 &&
            `${unknown.length} unknown field${unknown.length > 1 ? "s" : ""}`}
          {unknown.length > 0 && repeated.length > 0 && " · "}
          {repeated.length > 0 && `${repeated.length} repeated`}
        </span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 transition-transform",
            !open && "-rotate-90",
          )}
        />
      </button>
      {open && (
        <div className="max-h-56 space-y-1 overflow-y-auto px-2 pb-2">
          {total > 0 && unknown.length > 0 && (
            <p className="px-1 pb-1 text-[11px] text-muted-foreground">
              These aren't fields the system knows, so they'd stay as plain
              text. Find them in the document, swap each for a real field, or
              remove them.
            </p>
          )}
          {unknown.map((u) => (
            <UnknownRow
              key={u.token}
              token={u.token}
              count={u.count}
              index={index}
              onFind={onFind}
              onReplace={onReplace}
              onRemove={onRemove}
            />
          ))}
          {repeated.map((r) => (
            <div
              key={r.token}
              className="flex items-center justify-between gap-2 rounded-md border border-amber-500/30 bg-background/60 px-2 py-1.5 text-xs"
            >
              <span className="min-w-0">
                <code className="font-mono text-amber-600 dark:text-amber-400">{`{{${r.token}}}`}</code>{" "}
                appears {r.count} times — it expands into a whole list, so use
                it once.
              </span>
              <button
                type="button"
                onClick={() => onFind(r.token)}
                title="Find in the document"
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-muted-foreground hover:border-primary hover:text-primary"
              >
                <Crosshair className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function UnknownRow({
  token,
  count,
  index,
  onFind,
  onReplace,
  onRemove,
}: {
  token: string;
  count: number;
  index: FieldIndexEntry[];
  onFind: (token: string) => void;
  onReplace: (from: string, to: string) => void;
  onRemove: (token: string) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [q, setQ] = useState("");
  const suggestions = useMemo(
    () => (pickerOpen ? suggestFields(token, index, 5) : []),
    [pickerOpen, token, index],
  );
  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return [];
    return index
      .filter(
        (f) =>
          f.token.toLowerCase().includes(needle) ||
          f.label.toLowerCase().includes(needle),
      )
      .slice(0, 30);
  }, [q, index]);

  const choose = (to: string) => {
    onReplace(token, to);
    setPickerOpen(false);
    setQ("");
  };

  const Option = ({ f }: { f: FieldIndexEntry }) => (
    <button
      type="button"
      onClick={() => choose(f.token)}
      className="flex w-full flex-col items-start rounded-md px-2 py-1.5 text-left hover:bg-muted"
    >
      <span className="text-xs font-medium">{f.label}</span>
      <code className="font-mono text-[11px] text-primary">{`{{${f.token}}}`}</code>
    </button>
  );

  return (
    <div className="flex items-center justify-between gap-1.5 rounded-md border border-amber-500/30 bg-background/60 px-2 py-1.5">
      <span className="min-w-0 flex-1">
        <code
          className="block truncate font-mono text-xs text-amber-600 dark:text-amber-400"
          title={`{{${token}}}`}
        >{`{{${token}}}`}</code>
        <span className="text-[10px] text-muted-foreground">
          used {count} time{count > 1 ? "s" : ""}
        </span>
      </span>
      <button
        type="button"
        onClick={() => onFind(token)}
        title="Find in the document"
        aria-label={`Find ${token}`}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-muted-foreground hover:border-primary hover:text-primary"
      >
        <Crosshair className="h-3.5 w-3.5" />
      </button>
      <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            title="Replace with a real field"
            aria-label={`Replace ${token}`}
            className="flex h-6 shrink-0 items-center gap-1 rounded-md border px-1.5 text-[11px] text-muted-foreground hover:border-primary hover:text-primary"
          >
            <Replace className="h-3.5 w-3.5" /> Replace
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-72 p-2">
          <p className="px-1 pb-1.5 text-[11px] text-muted-foreground">
            Replace every <code className="font-mono">{`{{${token}}}`}</code>{" "}
            with:
          </p>
          <Input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search all fields…"
            className="mb-1.5 h-8 text-xs"
            aria-label="Search replacement field"
          />
          <div className="max-h-56 overflow-y-auto">
            {q.trim() ? (
              results.length ? (
                results.map((f) => <Option key={f.token} f={f} />)
              ) : (
                <p className="px-2 py-3 text-center text-xs text-muted-foreground">
                  No field matches “{q}”.
                </p>
              )
            ) : suggestions.length ? (
              <>
                <p className="px-2 pb-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Closest matches
                </p>
                {suggestions.map((f) => (
                  <Option key={f.token} f={f} />
                ))}
              </>
            ) : (
              <p className="px-2 py-3 text-center text-xs text-muted-foreground">
                No close match — search above.
              </p>
            )}
          </div>
        </PopoverContent>
      </Popover>
      <button
        type="button"
        onClick={() => onRemove(token)}
        title="Remove from the document"
        aria-label={`Remove ${token}`}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-muted-foreground hover:border-destructive hover:text-destructive"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
