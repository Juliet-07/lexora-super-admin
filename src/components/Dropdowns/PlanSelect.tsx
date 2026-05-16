import ReactSelect, { type MultiValue, type SingleValue } from "react-select";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

type ApiPlan = {
  _id: string;
  plan: string;
  name: string;
  isActive: boolean;
};

export type PlanOption = {
  value: string;
  label: string;
};

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
  singleValue: (base: any) => ({ ...base, color: "hsl(var(--foreground))" }),
  input: (base: any) => ({ ...base, color: "hsl(var(--foreground))" }),
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
  valueContainer: (base: any) => ({ ...base, padding: "2px 8px", gap: "4px" }),
  noOptionsMessage: (base: any) => ({
    ...base,
    color: "hsl(var(--muted-foreground))",
    fontSize: "0.875rem",
  }),
};

interface BaseProps {
  isDisabled?: boolean;
  placeholder?: string;
  hint?: string;
}

interface MultiProps extends BaseProps {
  multi: true;
  value: string[];
  onChange: (keys: string[]) => void;
}

interface SingleProps extends BaseProps {
  multi?: false;
  value: string | null;
  onChange: (key: string | null) => void;
}

type PlanSelectProps = MultiProps | SingleProps;

export function PlanSelect(props: PlanSelectProps) {
  const { isDisabled = false, placeholder, hint } = props;

  const { data: plans = [], isLoading } = useQuery<ApiPlan[]>({
    queryKey: ["plans"],
    queryFn: async () => {
      const res = await api.get("/super-admin/plans");
      return Array.isArray(res.data?.data) ? res.data.data : [];
    },
    staleTime: 10 * 60 * 1000,
  });

  const options: PlanOption[] = plans.map((p) => ({
    value: p.plan,
    label: `${p.name} (${p.plan})`,
  }));

  if (props.multi) {
    const selected = options.filter((o) => props.value.includes(o.value));
    return (
      <div>
        <ReactSelect<PlanOption, true>
          isMulti
          options={options}
          value={selected}
          onChange={(chosen: MultiValue<PlanOption>) =>
            props.onChange(chosen.map((c) => c.value))
          }
          isLoading={isLoading}
          isDisabled={isDisabled}
          placeholder={placeholder ?? "Select plans…"}
          noOptionsMessage={() =>
            isLoading ? "Loading…" : "No plans found. Create a plan first."
          }
          styles={selectStyles}
          classNamePrefix="rselect"
        />
        {hint && <p className="text-xs text-muted-foreground mt-1.5">{hint}</p>}
      </div>
    );
  }

  const selected = options.find((o) => o.value === props.value) ?? null;
  const onChangeSingle = props.onChange as (key: string | null) => void;
  return (
    <div>
      <ReactSelect<PlanOption, false>
        options={options}
        value={selected}
        onChange={(chosen: SingleValue<PlanOption>) =>
          onChangeSingle(chosen?.value ?? null)
        }
        isLoading={isLoading}
        isDisabled={isDisabled}
        isClearable
        placeholder={placeholder ?? "Select a plan…"}
        noOptionsMessage={() =>
          isLoading ? "Loading…" : "No plans found. Create a plan first."
        }
        styles={selectStyles}
        classNamePrefix="rselect"
      />
      {hint && <p className="text-xs text-muted-foreground mt-1.5">{hint}</p>}
    </div>
  );
}
