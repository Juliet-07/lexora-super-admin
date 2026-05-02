import { useState, useEffect } from "react";
import {
  CreditCard,
  TrendingUp,
  Users,
  Plus,
  Pencil,
  Trash2,
  X,
  Loader2,
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ModuleSelect } from "@/components/Dropdowns/ModuleSelect";

// ─── Types ────────────────────────────────────────────────────
type ApiPlan = {
  _id: string;
  plan: string;
  name: string;
  description: string;
  includedModules: string[];
  priceMonthly: number;
  priceAnnually: number;
  maxUsers: number;
  maxClients: number;
  maxStorageGb: number;
  features: Record<string, any>;
  isActive: boolean;
  createdAt: string;
};

type CreatePlanPayload = {
  plan: string;
  name: string;
  description: string;
  includedModules: string[];
  priceMonthly: number;
  priceAnnually: number;
  maxUsers: number;
  maxClients: number;
  maxStorageGb: number;
  features: Record<string, any>;
};

type TenantSubscription = {
  _id: string;
  tenantId: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    status: string;
    tenantProfile?: { businessName?: string; industry?: string };
  } | null;
  plan: string;
  status: string;
  activeModules: string[];
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  createdAt: string;
};

type PaginatedSubs = {
  items: TenantSubscription[];
  total: number;
  page: number;
  totalPages: number;
};

const PLAN_OPTIONS = ["free", "starter", "professional", "enterprise"];

const planStatusColor = (s: string) =>
  s === "active"
    ? "bg-success/15 text-success"
    : s === "trial"
      ? "bg-info/15 text-info"
      : s === "cancelled"
        ? "bg-destructive/15 text-destructive"
        : "bg-muted text-muted-foreground";

const tenantStatusColor = (s: string) =>
  s === "active"
    ? "bg-success/15 text-success"
    : s === "suspended"
      ? "bg-warning/15 text-warning"
      : "bg-muted text-muted-foreground";

type FormState = {
  plan: string;
  name: string;
  description: string;
  includedModules: string[];
  moduleInput: string;
  priceMonthly: string;
  priceAnnually: string;
  maxUsers: string;
  maxClients: string;
  maxStorageGb: string;
};

const emptyForm: FormState = {
  plan: "",
  name: "",
  description: "",
  includedModules: [],
  moduleInput: "",
  priceMonthly: "",
  priceAnnually: "",
  maxUsers: "",
  maxClients: "",
  maxStorageGb: "",
};

// ─── Component ────────────────────────────────────────────────
export default function Subscriptions() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [subsPage, setSubsPage] = useState(1);

  // ── Fetch plans ───────────────────────────────────────────
  const { data: plans = [], isLoading: plansLoading } = useQuery<ApiPlan[]>({
    queryKey: ["plans"],
    queryFn: async () => {
      const res = await api.get("/super-admin/plans", {
        params: { includeInactive: true },
      });
      return Array.isArray(res.data?.data) ? res.data.data : [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // ── Fetch subscriptions ───────────────────────────────────
  const { data: subsData, isLoading: subsLoading } = useQuery<PaginatedSubs>({
    queryKey: ["subscriptions", subsPage],
    queryFn: async () => {
      const res = await api.get("/super-admin/subscriptions", {
        params: { page: subsPage, limit: 10 },
      });
      return res.data?.data ?? res.data;
    },
    staleTime: 2 * 60 * 1000,
    // keepPreviousData: true,
  });

  const subscriptions = subsData?.items ?? [];
  const totalSubPages = subsData?.totalPages ?? 1;
  const totalSubs = subsData?.total ?? 0;

  // ── Create plan ───────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (payload: CreatePlanPayload) =>
      api.post("/super-admin/plans", payload),
    onSuccess: (_, payload) => {
      queryClient.invalidateQueries({ queryKey: ["plans"] });
      setOpen(false);
      setForm(emptyForm);
      toast.success(`Plan "${payload.name}" created successfully.`);
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to create plan"),
  });

  // ── Update plan ───────────────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: ({
      planKey,
      payload,
    }: {
      planKey: string;
      payload: Partial<CreatePlanPayload>;
    }) => api.patch(`/super-admin/plans/${planKey}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plans"] });
      setOpen(false);
      setEditingPlan(null);
      setForm(emptyForm);
      toast.success("Plan updated successfully.");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to update plan"),
  });

  // ── Helpers ───────────────────────────────────────────────
  const openCreate = () => {
    setEditingPlan(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (p: ApiPlan) => {
    setEditingPlan(p.plan);
    setForm({
      plan: p.plan,
      name: p.name,
      description: p.description ?? "",
      includedModules: p.includedModules ?? [],
      moduleInput: "",
      priceMonthly: String(p.priceMonthly),
      priceAnnually: String(p.priceAnnually),
      maxUsers: String(p.maxUsers),
      maxClients: String(p.maxClients),
      maxStorageGb: String(p.maxStorageGb),
    });
    setOpen(true);
  };

  const addModule = () => {
    const v = form.moduleInput.trim().toLowerCase();
    if (!v || form.includedModules.includes(v)) return;
    setForm((f) => ({
      ...f,
      includedModules: [...f.includedModules, v],
      moduleInput: "",
    }));
  };

  const removeModule = (m: string) =>
    setForm((f) => ({
      ...f,
      includedModules: f.includedModules.filter((x) => x !== m),
    }));

  const handleSave = () => {
    if (!form.name.trim()) {
      toast.error("Plan name is required");
      return;
    }
    if (!editingPlan && !form.plan) {
      toast.error("Plan key is required");
      return;
    }

    const payload: CreatePlanPayload = {
      plan: form.plan,
      name: form.name.trim(),
      description: form.description,
      includedModules: form.includedModules,
      priceMonthly: Number(form.priceMonthly) || 0,
      priceAnnually: Number(form.priceAnnually) || 0,
      maxUsers: Number(form.maxUsers) || 0,
      maxClients: Number(form.maxClients) || 0,
      maxStorageGb: Number(form.maxStorageGb) || 0,
      features: {},
    };

    if (editingPlan) {
      updateMutation.mutate({ planKey: editingPlan, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const totalCompanies = plans.reduce((s) => s + 1, 0) || 1;

  // ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Subscription Management
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Plans, modules and tenant subscriptions
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="gap-2 gradient-primary shadow-glow"
        >
          <Plus className="h-4 w-4" /> New Plan
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Total Plans"
          value={String(plans.length)}
          change={`${plans.filter((p) => p.isActive).length} active`}
          changeType="positive"
          icon={CreditCard}
          gradient
        />
        <StatCard
          title="Total Subscriptions"
          value={String(totalSubs)}
          change="Across all tenants"
          changeType="positive"
          icon={Users}
        />
        <StatCard
          title="Active Plans"
          value={String(plans.filter((p) => p.isActive).length)}
          change="Available to tenants"
          changeType="positive"
          icon={TrendingUp}
        />
      </div>

      {/* Plans grid */}
      {plansLoading ? (
        <div className="flex items-center justify-center h-48 gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading plans…</span>
        </div>
      ) : plans.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3 text-muted-foreground border rounded-xl">
          <CreditCard className="h-8 w-8" />
          <p className="text-sm">
            No plans configured yet. Create your first plan.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <div
              key={plan._id}
              className="bg-card border rounded-xl p-6 shadow-card flex flex-col"
            >
              <div className="flex items-start justify-between mb-4 gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-foreground text-lg">
                      {plan.name}
                    </h3>
                    <Badge variant={plan.isActive ? "default" : "secondary"}>
                      {plan.isActive ? "Active" : "Inactive"}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="font-mono text-xs capitalize"
                    >
                      {plan.plan}
                    </Badge>
                  </div>
                  <div className="flex items-baseline gap-1 mt-1">
                    <p className="text-2xl font-bold text-primary">
                      ${plan.priceMonthly}
                    </p>
                    <span className="text-sm text-muted-foreground">/mo</span>
                    {plan.priceAnnually > 0 && (
                      <span className="text-xs text-muted-foreground ml-2">
                        ${plan.priceAnnually}/yr
                      </span>
                    )}
                  </div>
                  {plan.description && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {plan.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Limits */}
              <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                <div className="bg-muted/40 rounded-lg p-2">
                  <p className="text-xs text-muted-foreground">Users</p>
                  <p className="text-sm font-semibold">
                    {plan.maxUsers === 0 ? "∞" : plan.maxUsers}
                  </p>
                </div>
                <div className="bg-muted/40 rounded-lg p-2">
                  <p className="text-xs text-muted-foreground">Clients</p>
                  <p className="text-sm font-semibold">
                    {plan.maxClients === 0 ? "∞" : plan.maxClients}
                  </p>
                </div>
                <div className="bg-muted/40 rounded-lg p-2">
                  <p className="text-xs text-muted-foreground">Storage</p>
                  <p className="text-sm font-semibold">{plan.maxStorageGb}GB</p>
                </div>
              </div>

              {/* Included modules */}
              {plan.includedModules?.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs text-muted-foreground mb-1.5 uppercase tracking-wider">
                    Included Modules
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {plan.includedModules.map((m) => (
                      <span
                        key={m}
                        className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium"
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-auto flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={() => openEdit(plan)}
                >
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tenant subscriptions table */}
      <div className="bg-card border rounded-xl shadow-card overflow-hidden">
        <div className="p-5 border-b flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-foreground">
              Tenant Subscriptions
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {totalSubs} total subscription{totalSubs !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {subsLoading ? (
          <div className="flex items-center justify-center h-48 gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Loading subscriptions…</span>
          </div>
        ) : subscriptions.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
            No subscriptions found.
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  {[
                    "Tenant",
                    "Plan",
                    "Status",
                    "Modules",
                    "Period End",
                    "Trial Ends",
                  ].map((h) => (
                    <th
                      key={h}
                      className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {subscriptions.map((sub) => {
                  const tenant = sub.tenantId;
                  const businessName =
                    tenant?.tenantProfile?.businessName ??
                    (tenant ? `${tenant.firstName} ${tenant.lastName}` : "—");

                  return (
                    <tr
                      key={sub._id}
                      className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {businessName}
                            </p>
                            {tenant && (
                              <p className="text-xs text-muted-foreground truncate">
                                {tenant.email}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge variant="secondary" className="capitalize">
                          {sub.plan}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <span
                          className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${planStatusColor(sub.status)}`}
                        >
                          {sub.status}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-1 flex-wrap">
                          {sub.activeModules.length > 0 ? (
                            <>
                              {sub.activeModules.slice(0, 2).map((m) => (
                                <span
                                  key={m}
                                  className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded"
                                >
                                  {m}
                                </span>
                              ))}
                              {sub.activeModules.length > 2 && (
                                <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">
                                  +{sub.activeModules.length - 2}
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              None
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {sub.currentPeriodEnd
                          ? new Date(sub.currentPeriodEnd).toLocaleDateString()
                          : "—"}
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {sub.trialEndsAt
                          ? new Date(sub.trialEndsAt).toLocaleDateString()
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination */}
            {totalSubPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t text-sm text-muted-foreground">
                <span>
                  Page {subsPage} of {totalSubPages}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSubsPage((p) => Math.max(1, p - 1))}
                    disabled={subsPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setSubsPage((p) => Math.min(totalSubPages, p + 1))
                    }
                    disabled={subsPage === totalSubPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create / Edit Plan Dialog */}
      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) {
            setEditingPlan(null);
            setForm(emptyForm);
          }
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPlan ? "Edit Plan" : "Create Subscription Plan"}
            </DialogTitle>
            <DialogDescription>
              {editingPlan
                ? "Update plan details."
                : "Define a new subscription plan for your tenants."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>
                  Plan Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  className="mt-1.5"
                  placeholder="e.g. Professional Plan"
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label>
                  Plan Key <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={form.plan}
                  onValueChange={(v) => setForm((f) => ({ ...f, plan: v }))}
                  disabled={!!editingPlan}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Select key" />
                  </SelectTrigger>
                  <SelectContent>
                    {PLAN_OPTIONS.map((p) => (
                      <SelectItem key={p} value={p} className="capitalize">
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                className="mt-1.5"
                rows={2}
                placeholder="Short description shown to tenants"
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Price / Month ($)</Label>
                <Input
                  type="number"
                  min={0}
                  className="mt-1.5"
                  placeholder="199"
                  value={form.priceMonthly}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, priceMonthly: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label>Price / Year ($)</Label>
                <Input
                  type="number"
                  min={0}
                  className="mt-1.5"
                  placeholder="1999"
                  value={form.priceAnnually}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, priceAnnually: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Max Users</Label>
                <Input
                  type="number"
                  min={0}
                  className="mt-1.5"
                  placeholder="25"
                  value={form.maxUsers}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, maxUsers: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label>Max Clients</Label>
                <Input
                  type="number"
                  min={0}
                  className="mt-1.5"
                  placeholder="500"
                  value={form.maxClients}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, maxClients: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label>Storage (GB)</Label>
                <Input
                  type="number"
                  min={0}
                  className="mt-1.5"
                  placeholder="50"
                  value={form.maxStorageGb}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, maxStorageGb: e.target.value }))
                  }
                />
              </div>
            </div>

            {/* <div>
              <Label>Included Modules</Label>
              <div className="flex gap-2 mt-1.5">
                <Input
                  placeholder="e.g. kyc/aml"
                  value={form.moduleInput}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, moduleInput: e.target.value }))
                  }
                  onKeyDown={(e) => e.key === "Enter" && addModule()}
                />
                <Button variant="outline" onClick={addModule}>
                  Add
                </Button>
              </div>
              {form.includedModules.length > 0 && (
                <div className="flex gap-1.5 flex-wrap mt-2">
                  {form.includedModules.map((m) => (
                    <span
                      key={m}
                      className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-1 rounded-full"
                    >
                      {m}
                      <button
                        onClick={() => removeModule(m)}
                        className="hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div> */}
            <div>
              <Label>Included Modules</Label>
              <div className="mt-1.5">
                <ModuleSelect
                  multi
                  value={form.includedModules}
                  onChange={(keys) =>
                    setForm((f) => ({ ...f, includedModules: keys }))
                  }
                  hint="Only active modules are shown. Create modules first if the list is empty."
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              className="gradient-primary"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {editingPlan ? "Saving…" : "Creating…"}
                </>
              ) : editingPlan ? (
                "Save Changes"
              ) : (
                "Create Plan"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
