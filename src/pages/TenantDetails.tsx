import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  Globe,
  MapPin,
  User,
  Calendar,
  Shield,
  CreditCard,
  Pencil,
  Trash2,
  RefreshCw,
  Loader2,
  Check,
  X,
  Save,
  BadgeCheck,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
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
import { PlanSelect } from "@/components/Dropdowns/PlanSelect";

// ─── Types ────────────────────────────────────────────────────
type TenantDetail = {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  status: string;
  createdAt: string;
  mustChangePassword: boolean;
  roles: string[];
  tenantProfile?: {
    businessName: string;
    industry: string;
    website?: string;
    registrationNumber?: string;
    taxId?: string;
    address?: {
      street?: string;
      city?: string;
      state?: string;
      country?: string;
      postalCode?: string;
    };
    contactPerson?: {
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
      position?: string;
    };
  };
  subscription?: {
    plan: string;
    status: string;
    activeModules: string[];
    baseModules: string[];
    addonModules: string[];
    currentPeriodStart?: string;
    currentPeriodEnd?: string;
    trialEndsAt?: string;
    maxUsersOverride?: number;
    maxClientsOverride?: number;
  };
};

type UpdatePayload = {
  firstName?: string;
  lastName?: string;
  phone?: string;
  businessName?: string;
  industry?: string;
  website?: string;
  registrationNumber?: string;
  taxId?: string;
};

type ChangePlanPayload = {
  plan: string;
  addonModules: string[];
  endsAt: string;
  maxUsersOverride: number;
  maxClientsOverride: number;
};

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

// ─── Subcomponents ────────────────────────────────────────────
function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value?: string;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card border rounded-xl p-6 shadow-card space-y-4">
      <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider border-b pb-3">
        {title}
      </h3>
      {children}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────
export default function TenantDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [addonInput, setAddonInput] = useState("");

  const [editForm, setEditForm] = useState<UpdatePayload>({});
  const [planForm, setPlanForm] = useState<ChangePlanPayload>({
    plan: "free",
    addonModules: [],
    endsAt: "",
    maxUsersOverride: 0,
    maxClientsOverride: 0,
  });

  // ── Fetch detail ──────────────────────────────────────────
  const {
    data: tenant,
    isLoading,
    isError,
  } = useQuery<TenantDetail>({
    queryKey: ["tenant", id],
    queryFn: async (): Promise<TenantDetail> => {
      const res = await api.get(`/super-admin/tenants/${id}`);
      // console.log(res.data.data)
      return res.data?.data ?? res.data;
    },
    enabled: !!id,
    // onSuccess: (data) => {
    //   setEditForm({
    //     firstName: data.firstName,
    //     lastName: data.lastName,
    //     phone: data.phone ?? "",
    //     businessName: data.tenantProfile?.businessName ?? "",
    //     industry: data.tenantProfile?.industry ?? "",
    //     website: data.tenantProfile?.website ?? "",
    //     registrationNumber: data.tenantProfile?.registrationNumber ?? "",
    //     taxId: data.tenantProfile?.taxId ?? "",
    //   });
    //   setPlanForm((p) => ({
    //     ...p,
    //     plan: data.subscription?.plan ?? "free",
    //     addonModules: data.subscription?.addonModules ?? [],
    //   }));
    // },
  });

  // ── Update ────────────────────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: (payload: UpdatePayload) =>
      api.patch(`/super-admin/tenants/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant", id] });
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      setEditOpen(false);
      toast.success("Tenant updated successfully.");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to update tenant"),
  });

  // ── Delete ────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/super-admin/tenants/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      toast.success("Tenant deleted.");
      navigate("/tenants");
    },
    onError: () => toast.error("Failed to delete tenant"),
  });

  // ── Change plan ───────────────────────────────────────────
  const planMutation = useMutation({
    mutationFn: (payload: ChangePlanPayload) =>
      api.post(`/super-admin/tenants/${id}/subscription`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant", id] });
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      setPlanOpen(false);
      toast.success("Subscription updated.");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to update plan"),
  });

  // ── Change Status ─────────────────────────────────────────
  const statusMutation = useMutation({
    mutationFn: ({ status }: { status: string }) =>
      api.patch(`/super-admin/tenants/${id}/status`, {
        status,
        reason:
          status === "active" ? "Account reactivated" : "Account deactivated",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant", id] });
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      toast.success("Tenant status updated.");
    },
    onError: () => toast.error("Failed to update tenant status"),
  });

  const addAddon = () => {
    const v = addonInput.trim().toLowerCase();
    if (!v || planForm.addonModules.includes(v)) return;
    setPlanForm((p) => ({ ...p, addonModules: [...p.addonModules, v] }));
    setAddonInput("");
  };

  // ─────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 gap-3 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Loading tenant profile…</span>
      </div>
    );
  }

  if (isError || !tenant) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-destructive text-sm">
          Failed to load tenant profile.
        </p>
        <Button variant="outline" onClick={() => navigate("/tenants")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Tenants
        </Button>
      </div>
    );
  }

  const businessName =
    tenant.tenantProfile?.businessName ??
    `${tenant.firstName} ${tenant.lastName}`;
  const sub = tenant.subscription;
  const addr = tenant.tenantProfile?.address;
  const cp = tenant.tenantProfile?.contactPerson;

  const statusColor =
    tenant.status === "active"
      ? "bg-success/15 text-success"
      : tenant.status === "suspended"
        ? "bg-warning/15 text-warning"
        : tenant.status === "pending"
          ? "bg-info/15 text-info"
          : "bg-muted text-muted-foreground";

  return (
    <div className="space-y-6">
      {/* ── Top bar ── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/tenants")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-xl bg-muted flex items-center justify-center border">
              <Building2 className="h-7 w-7 text-muted-foreground" />
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-foreground">
                  {businessName}
                </h1>
                <span
                  className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${statusColor}`}
                >
                  {tenant.status === "active" ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <X className="h-3 w-3" />
                  )}
                  <span className="capitalize">{tenant.status}</span>
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {tenant.email} · Joined{" "}
                {new Date(tenant.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4 mr-1.5" /> Edit
          </Button>
          <Button variant="outline" size="sm" onClick={() => setPlanOpen(true)}>
            <RefreshCw className="h-4 w-4 mr-1.5" /> Change Plan
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              statusMutation.mutate({
                status: tenant.status === "active" ? "inactive" : "active",
              })
            }
            disabled={statusMutation.isPending}
          >
            {statusMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : tenant.status === "active" ? (
              <>
                <X className="h-4 w-4 mr-1.5" /> Deactivate
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-1.5" /> Activate
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="h-4 w-4 mr-1.5" /> Delete
          </Button>
        </div>
      </div>

      {/* ── Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="space-y-6">
          <Section title="Contact Info">
            <InfoRow icon={Mail} label="Email" value={tenant.email} />
            <InfoRow icon={Phone} label="Phone" value={tenant.phone} />
            <InfoRow
              icon={Globe}
              label="Website"
              value={tenant.tenantProfile?.website}
            />
          </Section>

          <Section title="Business Info">
            <InfoRow
              icon={Building2}
              label="Business Name"
              value={tenant.tenantProfile?.businessName}
            />
            <InfoRow
              icon={BadgeCheck}
              label="Industry"
              value={tenant.tenantProfile?.industry}
            />
            <InfoRow
              icon={Shield}
              label="Registration No."
              value={tenant.tenantProfile?.registrationNumber}
            />
            <InfoRow
              icon={CreditCard}
              label="Tax ID"
              value={tenant.tenantProfile?.taxId}
            />
          </Section>

          {addr && (
            <Section title="Address">
              <InfoRow icon={MapPin} label="Street" value={addr.street} />
              <InfoRow
                icon={MapPin}
                label="City / State"
                value={[addr.city, addr.state].filter(Boolean).join(", ")}
              />
              <InfoRow icon={MapPin} label="Country" value={addr.country} />
              <InfoRow
                icon={MapPin}
                label="Postal Code"
                value={addr.postalCode}
              />
            </Section>
          )}

          {cp && (cp.firstName || cp.email) && (
            <Section title="Contact Person">
              <InfoRow
                icon={User}
                label="Name"
                value={[cp.firstName, cp.lastName].filter(Boolean).join(" ")}
              />
              <InfoRow icon={Mail} label="Email" value={cp.email} />
              <InfoRow icon={Phone} label="Phone" value={cp.phone} />
              <InfoRow icon={BadgeCheck} label="Position" value={cp.position} />
            </Section>
          )}
        </div>

        {/* Right column (spans 2) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Subscription card */}
          <div className="bg-card border rounded-xl p-6 shadow-card">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                Subscription
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPlanOpen(true)}
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Change Plan
              </Button>
            </div>

            {sub ? (
              <div className="space-y-5">
                <div className="flex items-center gap-4 flex-wrap">
                  <Badge
                    variant={
                      sub.plan === "enterprise" ? "default" : "secondary"
                    }
                    className={`capitalize text-sm px-3 py-1 ${sub.plan === "enterprise" ? "gradient-primary border-0" : ""}`}
                  >
                    {sub.plan}
                  </Badge>
                  <span
                    className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
                      sub.status === "active"
                        ? "bg-success/15 text-success"
                        : sub.status === "trial"
                          ? "bg-info/15 text-info"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <span className="capitalize">{sub.status}</span>
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  {sub.currentPeriodStart && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Period Start
                      </p>
                      <p className="font-medium">
                        {new Date(sub.currentPeriodStart).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                  {sub.currentPeriodEnd && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Period End
                      </p>
                      <p className="font-medium">
                        {new Date(sub.currentPeriodEnd).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                  {sub.trialEndsAt && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Trial Ends
                      </p>
                      <p className="font-medium text-info">
                        {new Date(sub.trialEndsAt).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                  {sub.maxUsersOverride != null && sub.maxUsersOverride > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Max Users Override
                      </p>
                      <p className="font-medium">{sub.maxUsersOverride}</p>
                    </div>
                  )}
                  {sub.maxClientsOverride != null &&
                    sub.maxClientsOverride > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">
                          Max Clients Override
                        </p>
                        <p className="font-medium">{sub.maxClientsOverride}</p>
                      </div>
                    )}
                </div>

                {/* Modules */}
                {sub.activeModules?.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wider">
                      Active Modules
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {sub.activeModules.map((m) => (
                        <span
                          key={m}
                          className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${
                            sub.addonModules?.includes(m)
                              ? "bg-primary/10 text-primary"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          <Package className="h-3 w-3" />
                          {m}
                          {sub.addonModules?.includes(m) && (
                            <span className="text-[9px] bg-primary/20 px-1 rounded">
                              addon
                            </span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No subscription assigned.
              </p>
            )}
          </div>

          {/* Account metadata */}
          <Section title="Account">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground mb-1">User Type</p>
                <p className="font-medium capitalize">
                  {tenant.roles?.join(", ") || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  Must Change Password
                </p>
                <span
                  className={`inline-flex items-center gap-1 text-xs font-medium ${tenant.mustChangePassword ? "text-warning" : "text-success"}`}
                >
                  {tenant.mustChangePassword ? (
                    <>
                      <X className="h-3.5 w-3.5" /> Yes
                    </>
                  ) : (
                    <>
                      <Check className="h-3.5 w-3.5" /> No
                    </>
                  )}
                </span>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Joined</p>
                <p className="font-medium">
                  {new Date(tenant.createdAt).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>
          </Section>
        </div>
      </div>

      {/* ── Edit Dialog ── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Tenant</DialogTitle>
            <DialogDescription>
              Update tenant profile information.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>First Name</Label>
                <Input
                  className="mt-1.5"
                  value={editForm.firstName ?? ""}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, firstName: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label>Last Name</Label>
                <Input
                  className="mt-1.5"
                  value={editForm.lastName ?? ""}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, lastName: e.target.value }))
                  }
                />
              </div>
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                className="mt-1.5"
                value={editForm.phone ?? ""}
                onChange={(e) =>
                  setEditForm((p) => ({ ...p, phone: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Business Name</Label>
              <Input
                className="mt-1.5"
                value={editForm.businessName ?? ""}
                onChange={(e) =>
                  setEditForm((p) => ({ ...p, businessName: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Industry</Label>
              <Select
                value={editForm.industry ?? ""}
                onValueChange={(v) =>
                  setEditForm((p) => ({ ...p, industry: v }))
                }
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
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
                value={editForm.website ?? ""}
                onChange={(e) =>
                  setEditForm((p) => ({ ...p, website: e.target.value }))
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Registration No.</Label>
                <Input
                  className="mt-1.5"
                  value={editForm.registrationNumber ?? ""}
                  onChange={(e) =>
                    setEditForm((p) => ({
                      ...p,
                      registrationNumber: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <Label>Tax ID</Label>
                <Input
                  className="mt-1.5"
                  value={editForm.taxId ?? ""}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, taxId: e.target.value }))
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button
              className="gradient-primary"
              disabled={updateMutation.isPending}
              onClick={() => updateMutation.mutate(editForm)}
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-1.5" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Change Plan Dialog ── */}
      <Dialog open={planOpen} onOpenChange={setPlanOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Change Subscription Plan</DialogTitle>
            <DialogDescription>
              Update plan for <strong>{businessName}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Plans</Label>
              <div className="mt-1.5">
                <PlanSelect
                  value={planForm.plan}
                  onChange={(v) => setPlanForm((p) => ({ ...p, plan: v }))}
                />
              </div>
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
                        onClick={() =>
                          setPlanForm((p) => ({
                            ...p,
                            addonModules: p.addonModules.filter((x) => x !== m),
                          }))
                        }
                      >
                        <X className="h-3 w-3 hover:text-destructive" />
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
              onClick={() => planMutation.mutate(planForm)}
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

      {/* ── Delete Confirm ── */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tenant</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently deactivate <strong>{businessName}</strong>{" "}
              and all their clients. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => deleteMutation.mutate()}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Delete Tenant"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
