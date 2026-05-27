import { useState } from "react";
import {
  Shield,
  Globe,
  Zap,
  Database,
  User,
  Camera,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Gauge,
  ToggleLeft,
  Info,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

type ProfileData = {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  createdAt: string;
};

type PlatformModule = {
  _id: string;
  key: string;
  name: string;
  description?: string;
  isActive: boolean;
  includedInPlans: string[];
  addonPriceMonthly?: number;
};

type RiskRules = {
  highRisk: number;
  mediumRisk: number;
  autoFlagTransaction: number;
  reviewPeriod: number;
  updatedAt?: string;
};

// ─────────────────────────────────────────────────────────────
// MODULE ICON MAP
// ─────────────────────────────────────────────────────────────

const MODULE_ICONS: Record<string, any> = {
  kyc_aml: Shield,
  "kyc/aml": Shield,
  grc: Database,
  crm: Globe,
  hr_pm: Zap,
  hr: Zap,
};

const MODULE_COLORS: Record<string, string> = {
  kyc_aml: "from-rose-500 to-orange-500",
  "kyc/aml": "from-rose-500 to-orange-500",
  grc: "from-violet-500 to-purple-600",
  crm: "from-blue-500 to-cyan-500",
  hr_pm: "from-emerald-500 to-teal-500",
  hr: "from-emerald-500 to-teal-500",
};

// ─────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────

export default function SystemSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
  });
  const [editing, setEditing] = useState(false);
  const [riskForm, setRiskForm] = useState<RiskRules>({
    highRisk: 75,
    mediumRisk: 40,
    autoFlagTransaction: 10000,
    reviewPeriod: 180,
  });
  const [riskDirty, setRiskDirty] = useState(false);

  // ── Queries — React Query, no useEffect ──────────────────

  const { data: profile, isLoading: profileLoading } = useQuery<ProfileData>({
    queryKey: ["admin-profile"],
    queryFn: async () => {
      const res = await api.get("/auth/me");
      return res.data?.data ?? res.data;
    },
    staleTime: 5 * 60 * 1000,
    // Sync form when data arrives — using select to derive form state
    select: (data) => {
      // Side-effect free: only update form if not currently editing
      return data;
    },
  });

  // Populate form from profile — done via onSuccess pattern in React Query v5
  const { data: profileForForm } = useQuery<ProfileData>({
    queryKey: ["admin-profile"],
    queryFn: async () => {
      const res = await api.get("/auth/me");
      return res.data?.data ?? res.data;
    },
    staleTime: 5 * 60 * 1000,
    enabled: !editing, // don't refetch while editing
  });

  // Derive form state from query — React Query way (no useEffect)
  const formFirstName = editing
    ? form.firstName
    : (profileForForm?.firstName ?? "");
  const formLastName = editing
    ? form.lastName
    : (profileForForm?.lastName ?? "");
  const formPhone = editing
    ? form.phone
    : ((profileForForm as any)?.phone ?? "");

  const { data: modules = [], isLoading: modulesLoading } = useQuery<
    PlatformModule[]
  >({
    queryKey: ["platform-modules"],
    queryFn: async () => {
      const res = await api.get("/super-admin/modules?includeInactive=true");
      return res.data?.data ?? res.data ?? [];
    },
    staleTime: 60_000,
  });

  // ── Risk rules — single query, derive edit form from it ───
  const { data: savedRiskRules, isLoading: riskLoading } = useQuery<RiskRules>({
    queryKey: ["risk-rules"],
    queryFn: async () => {
      const res = await api.get("/super-admin/risk-rules");
      return res.data?.data ?? res.data;
    },
    staleTime: 60_000,
    // When data loads, sync edit form (only if not dirty)
    // React Query v5 pattern: use initialData or structuredClone in mutationFn
  });

  // Derive edit form: if not dirty, always reflect saved data
  const activeRiskForm = riskDirty ? riskForm : (savedRiskRules ?? riskForm);

  // ── Mutations ─────────────────────────────────────────────

  const updateProfileMutation = useMutation({
    mutationFn: () =>
      api.patch("/auth/profile", {
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-profile"] });
      setEditing(false);
      toast({ title: "Profile updated" });
    },
    onError: (err: any) =>
      toast({
        title: "Update failed",
        description: err?.response?.data?.message ?? "Please try again.",
        variant: "destructive",
      }),
  });

  const toggleModuleMutation = useMutation({
    mutationFn: ({ key, isActive }: { key: string; isActive: boolean }) =>
      api.patch(`/super-admin/modules/${key}/toggle`, { isActive }),
    onSuccess: (_, { isActive }) => {
      queryClient.invalidateQueries({ queryKey: ["platform-modules"] });
      toast({
        title: `Module ${isActive ? "enabled" : "disabled"}`,
        description: `Module has been ${isActive ? "activated" : "deactivated"} across all subscriptions.`,
      });
    },
    onError: (err: any) => {
      queryClient.invalidateQueries({ queryKey: ["platform-modules"] });
      toast({
        title: "Toggle failed",
        description: err?.response?.data?.message ?? "Please try again.",
        variant: "destructive",
      });
    },
  });

  const saveRiskMutation = useMutation({
    mutationFn: () => api.post("/super-admin/risk-rules", activeRiskForm),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["risk-rules"] });
      setRiskDirty(false);
      toast({
        title: "Risk rules saved",
        description: "Platform risk configuration updated.",
      });
    },
    onError: (err: any) =>
      toast({
        title: "Save failed",
        description: err?.response?.data?.message ?? "Please try again.",
        variant: "destructive",
      }),
  });

  // ── Helpers ───────────────────────────────────────────────

  const startEditing = () => {
    setForm({
      firstName: profile?.firstName ?? "",
      lastName: profile?.lastName ?? "",
      phone: (profile as any)?.phone ?? "",
    });
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
  };

  const saveProfile = () => {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      toast({
        title: "Missing fields",
        description: "First and last name are required.",
        variant: "destructive",
      });
      return;
    }
    updateProfileMutation.mutate();
  };

  const updateRiskField = (field: keyof RiskRules, value: number) => {
    setRiskForm((prev) => ({ ...prev, [field]: value }));
    setRiskDirty(true);
  };

  const discardRiskChanges = () => {
    setRiskDirty(false);
    setRiskForm(savedRiskRules ?? riskForm);
  };

  const initials = profile
    ? `${profile.firstName?.[0] ?? ""}${profile.lastName?.[0] ?? ""}`.toUpperCase()
    : "SA";

  // ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">System Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Global configuration &amp; platform management
        </p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="bg-muted">
          <TabsTrigger value="profile">
            <User className="h-4 w-4 mr-2" /> Profile
          </TabsTrigger>
          <TabsTrigger value="modules">
            <ToggleLeft className="h-4 w-4 mr-2" /> Modules
          </TabsTrigger>
          <TabsTrigger value="risk">
            <Gauge className="h-4 w-4 mr-2" /> Risk Rules
          </TabsTrigger>
        </TabsList>

        {/* ══════════════════════ PROFILE ══════════════════════ */}
        <TabsContent value="profile" className="mt-4 space-y-6">
          <div className="bg-card border rounded-xl p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar className="h-20 w-20">
                    <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-primary-foreground text-xl font-semibold">
                      {profileLoading ? "…" : initials}
                    </AvatarFallback>
                  </Avatar>
                  {editing && (
                    <button className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md">
                      <Camera className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <div>
                  {profileLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-36" />
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-44" />
                    </div>
                  ) : (
                    <>
                      <h3 className="text-lg font-semibold">
                        {profile?.firstName} {profile?.lastName}
                      </h3>
                      <Badge variant="secondary" className="text-xs mt-0.5">
                        Super Admin
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {profile?.email}
                      </p>
                    </>
                  )}
                </div>
              </div>

              {!profileLoading && (
                <div className="flex gap-2">
                  {editing && (
                    <Button
                      variant="outline"
                      onClick={cancelEditing}
                      disabled={updateProfileMutation.isPending}
                    >
                      Cancel
                    </Button>
                  )}
                  <Button
                    className={
                      editing
                        ? "bg-gradient-to-r from-primary to-secondary"
                        : ""
                    }
                    variant={editing ? "default" : "outline"}
                    onClick={() => (editing ? saveProfile() : startEditing())}
                    disabled={updateProfileMutation.isPending}
                  >
                    {updateProfileMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />{" "}
                        Saving…
                      </>
                    ) : editing ? (
                      "Save Changes"
                    ) : (
                      <>
                        <User className="h-4 w-4 mr-2" /> Edit Profile
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>

            {profileLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-1.5">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>First Name</Label>
                  <Input
                    className="mt-1.5"
                    disabled={!editing}
                    value={
                      editing ? form.firstName : (profile?.firstName ?? "")
                    }
                    onChange={(e) =>
                      setForm({ ...form, firstName: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Last Name</Label>
                  <Input
                    className="mt-1.5"
                    disabled={!editing}
                    value={editing ? form.lastName : (profile?.lastName ?? "")}
                    onChange={(e) =>
                      setForm({ ...form, lastName: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    className="mt-1.5"
                    type="email"
                    disabled
                    value={profile?.email ?? ""}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Email cannot be changed here.
                  </p>
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input
                    className="mt-1.5"
                    disabled={!editing}
                    value={
                      editing ? form.phone : ((profile as any)?.phone ?? "")
                    }
                    onChange={(e) =>
                      setForm({ ...form, phone: e.target.value })
                    }
                    placeholder="+1 234 567 8900"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Member Since</Label>
                  <Input
                    className="mt-1.5"
                    disabled
                    value={
                      profile?.createdAt
                        ? new Date(profile.createdAt).toLocaleDateString(
                            "en-GB",
                            {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            },
                          )
                        : "—"
                    }
                  />
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ══════════════════════ MODULES ══════════════════════ */}
        <TabsContent value="modules" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">Platform Modules</h2>
              <p className="text-sm text-muted-foreground">
                Toggle modules on or off globally. Disabling removes access from
                all tenant subscriptions immediately.
              </p>
            </div>
            {!modulesLoading && (
              <Badge variant="outline">
                {modules.filter((m) => m.isActive).length} of {modules.length}{" "}
                active
              </Badge>
            )}
          </div>

          {modulesLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : modules.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center text-muted-foreground text-sm">
                No platform modules configured yet.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {modules.map((mod) => {
                const Icon = MODULE_ICONS[mod.key] ?? Shield;
                const gradient =
                  MODULE_COLORS[mod.key] ?? "from-slate-500 to-gray-600";
                const isToggling =
                  toggleModuleMutation.isPending &&
                  (toggleModuleMutation.variables as any)?.key === mod.key;

                return (
                  <div
                    key={mod._id}
                    className={`bg-card border rounded-xl p-5 shadow-sm flex items-center justify-between gap-4 transition-opacity ${!mod.isActive ? "opacity-60" : ""}`}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`h-11 w-11 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center shrink-0`}
                      >
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-foreground">
                            {mod.name}
                          </h3>
                          <Badge
                            className={`text-xs ${mod.isActive ? "bg-emerald-100 text-emerald-700 border-emerald-200" : ""}`}
                            variant={mod.isActive ? "default" : "secondary"}
                          >
                            {mod.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        {mod.description && (
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {mod.description}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          Key: <code className="font-mono">{mod.key}</code>
                          {mod.includedInPlans?.length > 0 && (
                            <span className="ml-3">
                              Plans: {mod.includedInPlans.join(", ")}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {isToggling && (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                      <Switch
                        checked={mod.isActive}
                        disabled={isToggling}
                        onCheckedChange={(v) =>
                          toggleModuleMutation.mutate({
                            key: mod.key,
                            isActive: v,
                          })
                        }
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 border border-amber-200 text-sm">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <div className="text-amber-800">
              <strong>Important:</strong> Disabling a module removes it from all
              active tenant subscriptions immediately.
            </div>
          </div>
        </TabsContent>

        {/* ══════════════════════ RISK RULES ══════════════════════ */}
        <TabsContent value="risk" className="mt-4 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-base font-semibold">Risk Scoring Rules</h2>
              <p className="text-sm text-muted-foreground">
                Platform-wide thresholds. All tenants inherit these as their
                baseline risk classification.
              </p>
            </div>
            {savedRiskRules?.updatedAt && (
              <p className="text-xs text-muted-foreground">
                Last saved:{" "}
                {new Date(savedRiskRules.updatedAt).toLocaleString("en-GB")}
              </p>
            )}
          </div>

          {riskLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : (
            <>
              {/* ── Currently Active Configuration ── */}
              {savedRiskRules && (
                <Card className="border-primary/20 bg-primary/5">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      Currently Active Configuration
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <ActiveRuleStat
                        label="High Risk"
                        value={`≥ ${savedRiskRules.highRisk}`}
                        color="text-destructive"
                        dot="bg-destructive"
                      />
                      <ActiveRuleStat
                        label="Medium Risk"
                        value={`${savedRiskRules.mediumRisk} – ${savedRiskRules.highRisk - 1}`}
                        color="text-amber-600"
                        dot="bg-amber-500"
                      />
                      <ActiveRuleStat
                        label="Auto-Flag ($)"
                        value={`$${savedRiskRules.autoFlagTransaction.toLocaleString()}`}
                        color="text-primary"
                        dot="bg-primary"
                      />
                      <ActiveRuleStat
                        label="Review Period"
                        value={`${savedRiskRules.reviewPeriod} days`}
                        color="text-foreground"
                        dot="bg-slate-400"
                      />
                    </div>
                    <div className="mt-4 flex items-center gap-3">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Info className="h-3 w-3" />
                        Low Risk: 0 – {savedRiskRules.mediumRisk - 1}{" "}
                        &nbsp;·&nbsp; Medium: {savedRiskRules.mediumRisk} –{" "}
                        {savedRiskRules.highRisk - 1} &nbsp;·&nbsp; High:{" "}
                        {savedRiskRules.highRisk}+
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Separator />

              {/* ── Edit Form ── */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold">
                    {riskDirty ? "Editing Configuration" : "Edit Configuration"}
                  </h3>
                  {riskDirty && (
                    <div className="flex items-center gap-2">
                      <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs">
                        Unsaved changes
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={discardRiskChanges}
                      >
                        Discard
                      </Button>
                    </div>
                  )}
                </div>

                {/* Score thresholds */}
                <Card className="mb-4">
                  <CardHeader>
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Gauge className="h-4 w-4 text-primary" />
                      Risk Score Thresholds (0 – 100)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>High Risk Threshold</Label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={activeRiskForm.highRisk}
                        onChange={(e) =>
                          updateRiskField("highRisk", Number(e.target.value))
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        Clients scoring{" "}
                        <strong>{activeRiskForm.highRisk}+</strong> → High Risk
                      </p>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-destructive rounded-full transition-all"
                          style={{ width: `${activeRiskForm.highRisk}%` }}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Medium Risk Threshold</Label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={activeRiskForm.mediumRisk}
                        onChange={(e) =>
                          updateRiskField("mediumRisk", Number(e.target.value))
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        Clients scoring{" "}
                        <strong>
                          {activeRiskForm.mediumRisk} –{" "}
                          {activeRiskForm.highRisk - 1}
                        </strong>{" "}
                        → Medium Risk
                      </p>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full transition-all"
                          style={{ width: `${activeRiskForm.mediumRisk}%` }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Transaction + Review */}
                <Card className="mb-4">
                  <CardHeader>
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      Transaction Monitoring &amp; Review
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Auto-Flag Transactions Above ($)</Label>
                      <Input
                        type="number"
                        min={0}
                        value={activeRiskForm.autoFlagTransaction}
                        onChange={(e) =>
                          updateRiskField(
                            "autoFlagTransaction",
                            Number(e.target.value),
                          )
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        Transactions above{" "}
                        <strong>
                          ${activeRiskForm.autoFlagTransaction.toLocaleString()}
                        </strong>{" "}
                        trigger a compliance flag
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Client Review Period (days)</Label>
                      <Input
                        type="number"
                        min={1}
                        value={activeRiskForm.reviewPeriod}
                        onChange={(e) =>
                          updateRiskField(
                            "reviewPeriod",
                            Number(e.target.value),
                          )
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        Approved clients are flagged for re-review after{" "}
                        <strong>{activeRiskForm.reviewPeriod} days</strong>
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex gap-3">
                  <Button
                    className="bg-gradient-to-r from-primary to-secondary"
                    onClick={() => saveRiskMutation.mutate()}
                    disabled={saveRiskMutation.isPending || !riskDirty}
                  >
                    {saveRiskMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />{" "}
                        Saving…
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" /> Save Risk
                        Rules
                      </>
                    )}
                  </Button>
                  {riskDirty && (
                    <Button variant="outline" onClick={discardRiskChanges}>
                      Discard Changes
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ACTIVE RULE STAT — small display card for current config
// ─────────────────────────────────────────────────────────────

function ActiveRuleStat({
  label,
  value,
  color,
  dot,
}: {
  label: string;
  value: string;
  color: string;
  dot: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className={`h-3 w-3 rounded-full ${dot} shrink-0`} />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-sm font-bold ${color}`}>{value}</p>
      </div>
    </div>
  );
}
