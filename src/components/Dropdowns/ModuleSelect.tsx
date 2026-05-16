import ReactSelect, { type MultiValue, type SingleValue } from "react-select";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────
type ApiModule = {
  _id: string;
  key: string;
  name: string;
  isActive: boolean;
};

export type ModuleOption = {
  value: string;
  label: string;
};

// ─── Shared react-select styles ───────────────────────────────
// Uses your CSS variables so it adapts to light/dark theme automatically
const selectStyles = {
  control: (base: any, state: any) => ({
    ...base,
    backgroundColor: "hsl(var(--background))",
    borderColor: state.isFocused ? "hsl(var(--ring))" : "hsl(var(--border))",
    boxShadow: state.isFocused ? "0 0 0 2px hsl(var(--ring) / 0.2)" : "none",
    borderRadius: "0.5rem",
    minHeight: "2.5rem",
    fontSize: "0.875rem",
    "&:hover": { borderColor: "hsl(var(--border))" },
  }),
  menu: (base: any) => ({
    ...base,
    backgroundColor: "hsl(var(--popover))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "0.5rem",
    boxShadow: "0 4px 24px hsl(var(--background) / 0.8)",
    zIndex: 50,
  }),
  option: (base: any, state: any) => ({
    ...base,
    backgroundColor: state.isFocused ? "hsl(var(--accent))" : "transparent",
    color: state.isFocused
      ? "hsl(var(--accent-foreground))"
      : "hsl(var(--foreground))",
    fontSize: "0.875rem",
    cursor: "pointer",
    "&:active": { backgroundColor: "hsl(var(--accent))" },
  }),
  multiValue: (base: any) => ({
    ...base,
    backgroundColor: "hsl(var(--primary) / 0.15)",
    borderRadius: "9999px",
    padding: "0 2px",
  }),
  multiValueLabel: (base: any) => ({
    ...base,
    color: "hsl(var(--primary))",
    fontSize: "0.75rem",
    fontWeight: 500,
  }),
  multiValueRemove: (base: any) => ({
    ...base,
    color: "hsl(var(--primary))",
    borderRadius: "9999px",
    "&:hover": {
      backgroundColor: "hsl(var(--destructive) / 0.15)",
      color: "hsl(var(--destructive))",
    },
  }),
  singleValue: (base: any) => ({
    ...base,
    color: "hsl(var(--foreground))",
  }),
  input: (base: any) => ({
    ...base,
    color: "hsl(var(--foreground))",
  }),
  placeholder: (base: any) => ({
    ...base,
    color: "hsl(var(--muted-foreground))",
  }),
  indicatorSeparator: () => ({ display: "none" }),
  dropdownIndicator: (base: any) => ({
    ...base,
    color: "hsl(var(--muted-foreground))",
    "&:hover": { color: "hsl(var(--foreground))" },
  }),
  clearIndicator: (base: any) => ({
    ...base,
    color: "hsl(var(--muted-foreground))",
    "&:hover": { color: "hsl(var(--destructive))" },
  }),
  valueContainer: (base: any) => ({
    ...base,
    padding: "2px 8px",
    gap: "4px",
  }),
  noOptionsMessage: (base: any) => ({
    ...base,
    color: "hsl(var(--muted-foreground))",
    fontSize: "0.875rem",
  }),
};

// ─── Shared props ─────────────────────────────────────────────
interface BaseProps {
  /** Only show active modules. Default: true */
  activeOnly?: boolean;
  isDisabled?: boolean;
  placeholder?: string;
  hint?: string;
}

// ─── Multi-select variant ─────────────────────────────────────
interface MultiProps extends BaseProps {
  multi: true;
  value: string[];
  onChange: (keys: string[]) => void;
}

// ─── Single-select variant ────────────────────────────────────
interface SingleProps extends BaseProps {
  multi?: false;
  value: string | null;
  onChange: (key: string | null) => void;
}

type ModuleSelectProps = MultiProps | SingleProps;

export function ModuleSelect(props: ModuleSelectProps) {
  const { activeOnly = true, isDisabled = false, placeholder, hint } = props;

  // ── Fetch modules ────────────────────────────────────────
  const { data: modules = [], isLoading } = useQuery<ApiModule[]>({
    queryKey: ["modules", activeOnly],
    queryFn: async () => {
      const res = await api.get("/super-admin/modules", {
        params: activeOnly ? {} : { includeInactive: true },
      });
      return Array.isArray(res.data?.data) ? res.data.data : [];
    },
    staleTime: 10 * 60 * 1000,
  });

  const options: ModuleOption[] = modules.map((m) => ({
    value: m.key,
    label: `${m.name} — ${m.key}`,
  }));

  // ── Multi ────────────────────────────────────────────────
  if (props.multi) {
    const selected = options.filter((o) => props.value.includes(o.value));

    const handleChange = (chosen: MultiValue<ModuleOption>) => {
      props.onChange(chosen.map((c) => c.value));
    };

    return (
      <div>
        <ReactSelect<ModuleOption, true>
          isMulti
          options={options}
          value={selected}
          onChange={handleChange}
          isLoading={isLoading}
          isDisabled={isDisabled}
          placeholder={placeholder ?? "Select modules…"}
          noOptionsMessage={() =>
            isLoading ? "Loading…" : "No modules found. Create one first."
          }
          styles={selectStyles}
          classNamePrefix="rselect"
        />
        {hint && <p className="text-xs text-muted-foreground mt-1.5">{hint}</p>}
      </div>
    );
  }

  // ── Single ───────────────────────────────────────────────
  const selected = options.find((o) => o.value === props.value) ?? null;
  const onChangeSingle = props.onChange as (key: string | null) => void;

  const handleChange = (chosen: SingleValue<ModuleOption>) => {
    onChangeSingle(chosen?.value ?? null);
  };

  return (
    <div>
      <ReactSelect<ModuleOption, false>
        options={options}
        value={selected}
        onChange={handleChange}
        isLoading={isLoading}
        isDisabled={isDisabled}
        isClearable
        placeholder={placeholder ?? "Select a module…"}
        noOptionsMessage={() =>
          isLoading ? "Loading…" : "No modules found. Create one first."
        }
        styles={selectStyles}
        classNamePrefix="rselect"
      />
      {hint && <p className="text-xs text-muted-foreground mt-1.5">{hint}</p>}
    </div>
  );
}
