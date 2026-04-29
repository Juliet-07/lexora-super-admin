import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  Search,
  Plus,
  MoreHorizontal,
  Check,
  X,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────
type Address = {
  street: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
};
type ContactPerson = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  position: string;
};

type CreateTenantPayload = {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: string;
  businessName: string;
  industry: string;
  website: string;
  registrationNumber: string;
  taxId: string;
  address: Address;
  contactPerson: ContactPerson;
  plan: string;
};

type ChangePlanPayload = {
  plan: string;
  addonModules: string[];
  endsAt: string;
  maxUsersOverride: number;
  maxClientsOverride: number;
};

type Tenant = {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  status: string;
  createdAt: string;
  tenantProfile?: { businessName: string; industry: string; website?: string };
  subscription?: { plan: string; status: string; activeModules: string[] };
};

type PaginatedResponse = {
  items: Tenant[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

// ─── Constants ────────────────────────────────────────────────
const PLAN_OPTIONS = ["free", "starter", "professional", "enterprise"];
const INDUSTRY_OPTIONS = [
  "Financial Services",
  "Legal",
  "Healthcare",
  "Real Estate",
  "Technology",
  "Insurance",
  "Consulting",
  "Other",
];
const STEPS = ["Account Info", "Business Info", "Address", "Contact Person"];

const defaultAddress: Address = {
  street: "",
  city: "",
  state: "",
  country: "",
  postalCode: "",
};
const defaultContact: ContactPerson = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  position: "",
};
const defaultPayload: CreateTenantPayload = {
  email: "",
  firstName: "",
  lastName: "",
  phone: "",
  role: "tenant_owner",
  businessName: "",
  industry: "",
  website: "",
  registrationNumber: "",
  taxId: "",
  address: defaultAddress,
  contactPerson: defaultContact,
  plan: "free",
};
const defaultPlanPayload: ChangePlanPayload = {
  plan: "free",
  addonModules: [],
  endsAt: "",
  maxUsersOverride: 0,
  maxClientsOverride: 0,
};

// ─── Component ────────────────────────────────────────────────
export default function Tenants() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<CreateTenantPayload>(defaultPayload);

  // Change plan dialog state
  const [planOpen, setPlanOpen] = useState(false);
  const [planTarget, setPlanTarget] = useState<Tenant | null>(null);
  const [planForm, setPlanForm] =
    useState<ChangePlanPayload>(defaultPlanPayload);
  const [addonInput, setAddonInput] = useState("");

  // Delete dialog state
  const [deleteTarget, setDeleteTarget] = useState<Tenant | null>(null);

  useEffect(() => {
    setPage(1);
  }, [search]);

  // ── Fetch ─────────────────────────────────────────────────
  const { data, isLoading, isError } = useQuery<PaginatedResponse>({
    queryKey: ["tenants", page, search],
    queryFn: async (): Promise<PaginatedResponse> => {
      const res = await api.get("/super-admin/tenants", {
        params: { page, limit: 10, search: search || undefined },
      });
      return res.data?.data ?? res.data;
    },
    staleTime: 2 * 60 * 1000,
    // keepPreviousData: true,
  });

  const tenants: Tenant[] = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;
  const total = data?.total ?? 0;

  // ── Create ────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (payload: CreateTenantPayload) =>
      api.post("/super-admin/tenants", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      setCreateOpen(false);
      setStep(0);
      setForm(defaultPayload);
      toast.success("Tenant created. Login credentials sent by email.");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to create tenant"),
  });

  // ── Delete ────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/super-admin/tenants/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      setDeleteTarget(null);
      toast.success("Tenant deactivated successfully.");
    },
    onError: () => toast.error("Failed to delete tenant"),
  });

  // ── Change plan ───────────────────────────────────────────
  const planMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ChangePlanPayload }) =>
      api.post(`/super-admin/tenants/${id}/subscription`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      setPlanOpen(false);
      setPlanTarget(null);
      setPlanForm(defaultPlanPayload);
      toast.success("Subscription plan updated.");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to update plan"),
  });

  // ── Helpers ───────────────────────────────────────────────
  const setField = (f: keyof CreateTenantPayload, v: string) =>
    setForm((p) => ({ ...p, [f]: v }));
  const setAddress = (f: keyof Address, v: string) =>
    setForm((p) => ({ ...p, address: { ...p.address, [f]: v } }));
  const setContact = (f: keyof ContactPerson, v: string) =>
    setForm((p) => ({ ...p, contactPerson: { ...p.contactPerson, [f]: v } }));

  const canAdvance = () => {
    if (step === 0) return !!form.email && !!form.firstName && !!form.lastName;
    if (step === 1) return !!form.businessName && !!form.industry;
    return true;
  };

  const openChangePlan = (tenant: Tenant) => {
    setPlanTarget(tenant);
    setPlanForm({
      plan: tenant.subscription?.plan ?? "free",
      addonModules: tenant.subscription?.activeModules ?? [],
      endsAt: "",
      maxUsersOverride: 0,
      maxClientsOverride: 0,
    });
    setPlanOpen(true);
  };

  const addAddon = () => {
    const v = addonInput.trim().toLowerCase();
    if (!v || planForm.addonModules.includes(v)) return;
    setPlanForm((p) => ({ ...p, addonModules: [...p.addonModules, v] }));
    setAddonInput("");
  };

  const removeAddon = (mod: string) =>
    setPlanForm((p) => ({
      ...p,
      addonModules: p.addonModules.filter((m) => m !== mod),
    }));

  // ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tenants</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isLoading
              ? "Loading…"
              : `${total} registered tenant${total !== 1 ? "s" : ""}`}
          </p>
        </div>

        {/* ── Create dialog ── */}
        <Dialog
          open={createOpen}
          onOpenChange={(v) => {
            setCreateOpen(v);
            if (!v) {
              setStep(0);
              setForm(defaultPayload);
            }
          }}
        >
          <DialogTrigger asChild>
            <Button className="gradient-primary shadow-glow">
              <Plus className="h-4 w-4 mr-2" /> Add Tenant
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Tenant</DialogTitle>
              <DialogDescription>
                Step {step + 1} of {STEPS.length} — {STEPS[step]}
              </DialogDescription>
            </DialogHeader>
            <div className="flex gap-1 mb-2">
              {STEPS.map((s, i) => (
                <div
                  key={s}
                  className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? "bg-primary" : "bg-muted"}`}
                />
              ))}
            </div>

            {step === 0 && (
              <div className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>
                      First Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      className="mt-1.5"
                      placeholder="John"
                      value={form.firstName}
                      onChange={(e) => setField("firstName", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>
                      Last Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      className="mt-1.5"
                      placeholder="Doe"
                      value={form.lastName}
                      onChange={(e) => setField("lastName", e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <Label>
                    Email <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    className="mt-1.5"
                    type="email"
                    placeholder="admin@company.com"
                    value={form.email}
                    onChange={(e) => setField("email", e.target.value)}
                  />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input
                    className="mt-1.5"
                    placeholder="+1234567890"
                    value={form.phone}
                    onChange={(e) => setField("phone", e.target.value)}
                  />
                </div>
                <div>
                  <Label>Subscription Plan</Label>
                  <Select
                    value={form.plan}
                    onValueChange={(v) => setField("plan", v)}
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
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
            )}

            {step === 1 && (
              <div className="space-y-4 py-2">
                <div>
                  <Label>
                    Business Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    className="mt-1.5"
                    placeholder="Acme Financial Services Ltd"
                    value={form.businessName}
                    onChange={(e) => setField("businessName", e.target.value)}
                  />
                </div>
                <div>
                  <Label>
                    Industry <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={form.industry}
                    onValueChange={(v) => setField("industry", v)}
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                    <SelectContent>
                      {INDUSTRY_OPTIONS.map((i) => (
                        <SelectItem key={i} value={i}>
                          {i}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Website</Label>
                  <Input
                    className="mt-1.5"
                    placeholder="https://acme.com"
                    value={form.website}
                    onChange={(e) => setField("website", e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Registration Number</Label>
                    <Input
                      className="mt-1.5"
                      placeholder="RC123456"
                      value={form.registrationNumber}
                      onChange={(e) =>
                        setField("registrationNumber", e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <Label>Tax ID</Label>
                    <Input
                      className="mt-1.5"
                      placeholder="TIN-987654"
                      value={form.taxId}
                      onChange={(e) => setField("taxId", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4 py-2">
                <div>
                  <Label>Street</Label>
                  <Input
                    className="mt-1.5"
                    placeholder="123 Main Street"
                    value={form.address.street}
                    onChange={(e) => setAddress("street", e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>City</Label>
                    <Input
                      className="mt-1.5"
                      placeholder="Lagos"
                      value={form.address.city}
                      onChange={(e) => setAddress("city", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>State</Label>
                    <Input
                      className="mt-1.5"
                      placeholder="Lagos State"
                      value={form.address.state}
                      onChange={(e) => setAddress("state", e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Country</Label>
                    <Input
                      className="mt-1.5"
                      placeholder="Nigeria"
                      value={form.address.country}
                      onChange={(e) => setAddress("country", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Postal Code</Label>
                    <Input
                      className="mt-1.5"
                      placeholder="100001"
                      value={form.address.postalCode}
                      onChange={(e) => setAddress("postalCode", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>First Name</Label>
                    <Input
                      className="mt-1.5"
                      placeholder="Jane"
                      value={form.contactPerson.firstName}
                      onChange={(e) => setContact("firstName", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Last Name</Label>
                    <Input
                      className="mt-1.5"
                      placeholder="Smith"
                      value={form.contactPerson.lastName}
                      onChange={(e) => setContact("lastName", e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    className="mt-1.5"
                    type="email"
                    placeholder="jane@company.com"
                    value={form.contactPerson.email}
                    onChange={(e) => setContact("email", e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Phone</Label>
                    <Input
                      className="mt-1.5"
                      placeholder="+1234567890"
                      value={form.contactPerson.phone}
                      onChange={(e) => setContact("phone", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Position</Label>
                    <Input
                      className="mt-1.5"
                      placeholder="Operations Manager"
                      value={form.contactPerson.position}
                      onChange={(e) => setContact("position", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            <DialogFooter className="flex justify-between gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() =>
                  step === 0 ? setCreateOpen(false) : setStep(step - 1)
                }
              >
                {step === 0 ? (
                  "Cancel"
                ) : (
                  <>
                    <ChevronLeft className="h-4 w-4 mr-1" /> Back
                  </>
                )}
              </Button>
              {step < STEPS.length - 1 ? (
                <Button
                  className="gradient-primary"
                  onClick={() => setStep(step + 1)}
                  disabled={!canAdvance()}
                >
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button
                  className="gradient-primary"
                  onClick={() => createMutation.mutate(form)}
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating…
                    </>
                  ) : (
                    "Create Tenant"
                  )}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search tenants..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="bg-card border rounded-xl shadow-card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-48 gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Loading tenants…</span>
          </div>
        ) : isError ? (
          <div className="flex items-center justify-center h-48 text-destructive text-sm">
            Failed to load tenants. Check your connection and try again.
          </div>
        ) : tenants.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-2 text-muted-foreground">
            <Building2 className="h-8 w-8" />
            <p className="text-sm">
              {search ? "No tenants match your search." : "No tenants yet."}
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b">
                {[
                  "Organization",
                  "Plan",
                  "Status",
                  "Industry",
                  "Modules",
                  "Actions",
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
              {tenants.map((tenant) => {
                const businessName =
                  tenant.tenantProfile?.businessName ??
                  `${tenant.firstName} ${tenant.lastName}`;
                const industry = tenant.tenantProfile?.industry ?? "—";
                const plan = tenant.subscription?.plan ?? "—";
                const modules = tenant.subscription?.activeModules ?? [];

                return (
                  <tr
                    key={tenant._id}
                    className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {businessName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {tenant.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge
                        variant={
                          plan === "enterprise" ? "default" : "secondary"
                        }
                        className={`capitalize ${plan === "enterprise" ? "gradient-primary border-0" : ""}`}
                      >
                        {plan}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
                          tenant.status === "active"
                            ? "bg-success/15 text-success"
                            : tenant.status === "suspended"
                              ? "bg-warning/15 text-warning"
                              : tenant.status === "pending"
                                ? "bg-info/15 text-info"
                                : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {tenant.status === "active" ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <X className="h-3 w-3" />
                        )}
                        <span className="capitalize">{tenant.status}</span>
                      </span>
                    </td>
                    <td className="p-4 text-sm text-foreground">{industry}</td>
                    <td className="p-4">
                      {modules.length > 0 ? (
                        <div className="flex gap-1 flex-wrap">
                          {modules.slice(0, 3).map((m) => (
                            <span
                              key={m}
                              className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded"
                            >
                              {m}
                            </span>
                          ))}
                          {modules.length > 3 && (
                            <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">
                              +{modules.length - 3}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          No modules
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => navigate(`/tenants/${tenant._id}`)}
                          >
                            View Profile
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => openChangePlan(tenant)}
                          >
                            <RefreshCw className="h-4 w-4 mr-2" /> Change Plan
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDeleteTarget(tenant)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" /> Delete Tenant
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Change Plan Dialog ── */}
      <Dialog open={planOpen} onOpenChange={setPlanOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Change Subscription Plan</DialogTitle>
            <DialogDescription>
              Updating plan for{" "}
              <strong>
                {planTarget?.tenantProfile?.businessName ??
                  planTarget?.firstName}
              </strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Plan</Label>
              <Select
                value={planForm.plan}
                onValueChange={(v) => setPlanForm((p) => ({ ...p, plan: v }))}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
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
            <div>
              <Label>Period End Date</Label>
              <Input
                type="date"
                className="mt-1.5"
                value={planForm.endsAt}
                onChange={(e) =>
                  setPlanForm((p) => ({ ...p, endsAt: e.target.value }))
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Max Users Override</Label>
                <Input
                  type="number"
                  min={0}
                  className="mt-1.5"
                  value={planForm.maxUsersOverride}
                  onChange={(e) =>
                    setPlanForm((p) => ({
                      ...p,
                      maxUsersOverride: Number(e.target.value),
                    }))
                  }
                />
              </div>
              <div>
                <Label>Max Clients Override</Label>
                <Input
                  type="number"
                  min={0}
                  className="mt-1.5"
                  value={planForm.maxClientsOverride}
                  onChange={(e) =>
                    setPlanForm((p) => ({
                      ...p,
                      maxClientsOverride: Number(e.target.value),
                    }))
                  }
                />
              </div>
            </div>
            <div>
              <Label>Addon Modules</Label>
              <div className="flex gap-2 mt-1.5">
                <Input
                  placeholder="e.g. kyc/aml"
                  value={addonInput}
                  onChange={(e) => setAddonInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addAddon()}
                />
                <Button variant="outline" onClick={addAddon}>
                  Add
                </Button>
              </div>
              {planForm.addonModules.length > 0 && (
                <div className="flex gap-1.5 flex-wrap mt-2">
                  {planForm.addonModules.map((m) => (
                    <span
                      key={m}
                      className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-1 rounded-full"
                    >
                      {m}
                      <button
                        onClick={() => removeAddon(m)}
                        className="hover:text-destructive ml-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPlanOpen(false)}>
              Cancel
            </Button>
            <Button
              className="gradient-primary"
              disabled={planMutation.isPending}
              onClick={() =>
                planTarget &&
                planMutation.mutate({ id: planTarget._id, payload: planForm })
              }
            >
              {planMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating…
                </>
              ) : (
                "Update Plan"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm Dialog ── */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tenant</AlertDialogTitle>
            <AlertDialogDescription>
              This will deactivate{" "}
              <strong>
                {deleteTarget?.tenantProfile?.businessName ??
                  deleteTarget?.firstName}
              </strong>{" "}
              and all their clients. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() =>
                deleteTarget && deleteMutation.mutate(deleteTarget._id)
              }
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
