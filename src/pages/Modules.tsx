// Modules.tsx — full API-integrated rewrite
import { useState } from "react";
import {
  Boxes,
  Plus,
  Search,
  Shield,
  Database,
  Globe,
  Zap,
  Briefcase,
  BarChart3,
  Settings2,
  Trash2,
  Pencil,
  Check,
  X,
  ChevronRight,
  Sparkles,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import axios from "axios";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// ─── Types matching the API response ────────────────────────
type ApiModule = {
  _id: string;
  key: string;
  name: string;
  description: string;
  includedInPlans: string[];
  isAvailableAsAddon: boolean;
  addonPriceMonthly: number;
  isActive: boolean;
  iconUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

type CreateModulePayload = {
  key: string;
  name: string;
  description: string;
  includedInPlans: string[];
  isAvailableAsAddon: boolean;
  addonPriceMonthly: number;
};

// ─── Icon map ────────────────────────────────────────────────
const iconMap = { Shield, Database, Globe, Zap, Briefcase, BarChart3, Boxes };

// pick an icon based on the module key/name — purely cosmetic
function resolveIcon(mod: ApiModule): keyof typeof iconMap {
  const k = mod.key.toLowerCase();
  if (k.includes("kyc") || k.includes("aml") || k.includes("compliance"))
    return "Shield";
  if (k.includes("crm") || k.includes("client")) return "Globe";
  if (k.includes("hr") || k.includes("payroll")) return "Briefcase";
  if (k.includes("report") || k.includes("analytic")) return "BarChart3";
  if (k.includes("data") || k.includes("grc")) return "Database";
  if (k.includes("integration") || k.includes("api")) return "Zap";
  return "Boxes";
}

const PLAN_OPTIONS = ["starter", "professional", "enterprise"];

const apiURL = import.meta.env.VITE_REACT_APP_BASE_URL;
const getToken = () => localStorage.getItem("adminToken");

const api = axios.create({ baseURL: apiURL });
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ─── Component ───────────────────────────────────────────────
export default function Modules() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const [newModule, setNewModule] = useState<CreateModulePayload>({
    key: "",
    name: "",
    description: "",
    includedInPlans: [],
    isAvailableAsAddon: false,
    addonPriceMonthly: 0,
  });

  // ── Fetch ──────────────────────────────────────────────────
  const {
    data: modules = [],
    isLoading,
    isError,
  } = useQuery<ApiModule[]>({
    queryKey: ["modules"],
    queryFn: async () => {
      const res = await api.get("/super-admin/modules");
      // handle both { data: [...] } and [...] shapes
      return Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
    },
    staleTime: 5 * 60 * 1000,
  });

  // ── Create ─────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (payload: CreateModulePayload) =>
      api.post("/super-admin/modules", payload),
    onSuccess: (_, payload) => {
      queryClient.invalidateQueries({ queryKey: ["modules"] });
      setCreateOpen(false);
      setNewModule({
        key: "",
        name: "",
        description: "",
        includedInPlans: [],
        isAvailableAsAddon: false,
        addonPriceMonthly: 0,
      });
      toast.success(`Module "${payload.name}" created`);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? "Failed to create module");
    },
  });

  // ── Delete ─────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/super-admin/modules/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["modules"] });
      setSelectedId(null);
      toast.success("Module deleted");
    },
    onError: () => toast.error("Failed to delete module"),
  });

  // ── Derived ────────────────────────────────────────────────
  const filtered = modules.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.key.toLowerCase().includes(search.toLowerCase()),
  );

  const selected = modules.find((m) => m._id === selectedId) ?? modules[0];
  const activeCount = modules.filter((m) => m.isActive).length;
  const addonCount = modules.filter((m) => m.isAvailableAsAddon).length;

  // ── Handlers ───────────────────────────────────────────────
  const handleCreate = () => {
    if (!newModule.key.trim() || !newModule.name.trim()) {
      toast.error("Key and name are required");
      return;
    }
    createMutation.mutate(newModule);
  };

  const togglePlan = (plan: string) => {
    setNewModule((prev) => ({
      ...prev,
      includedInPlans: prev.includedInPlans.includes(plan)
        ? prev.includedInPlans.filter((p) => p !== plan)
        : [...prev.includedInPlans, plan],
    }));
  };

  // ─────────────────────────────────────────────────────────
  // RENDER STATES
  // ─────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 gap-3 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Loading modules…</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-64 text-destructive text-sm">
        Failed to load modules. Check your connection and try again.
      </div>
    );
  }

  const SelectedIcon = selected ? iconMap[resolveIcon(selected)] : Boxes;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Module Management
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Build modules and define the features each tenant can subscribe to
          </p>
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-primary shadow-glow">
              <Plus className="h-4 w-4 mr-2" /> New Module
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Module</DialogTitle>
              <DialogDescription>
                Modules are top-level products tenants can enable.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Module Name</Label>
                  <Input
                    placeholder="e.g. AML/KYC Compliance"
                    className="mt-1.5"
                    value={newModule.name}
                    onChange={(e) =>
                      setNewModule({ ...newModule, name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Key</Label>
                  <Input
                    placeholder="kyc/aml"
                    className="mt-1.5"
                    value={newModule.key}
                    onChange={(e) =>
                      setNewModule({
                        ...newModule,
                        key: e.target.value.toLowerCase(),
                      })
                    }
                  />
                </div>
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  placeholder="Short description shown to tenants"
                  className="mt-1.5"
                  value={newModule.description}
                  onChange={(e) =>
                    setNewModule({ ...newModule, description: e.target.value })
                  }
                />
              </div>

              <div>
                <Label>Included in Plans</Label>
                <div className="flex gap-2 mt-1.5 flex-wrap">
                  {PLAN_OPTIONS.map((plan) => (
                    <button
                      key={plan}
                      type="button"
                      onClick={() => togglePlan(plan)}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors capitalize ${
                        newModule.includedInPlans.includes(plan)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border text-muted-foreground hover:border-primary"
                      }`}
                    >
                      {plan}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 items-center">
                <div>
                  <Label>Addon Price / month ($)</Label>
                  <Input
                    type="number"
                    min={0}
                    className="mt-1.5"
                    value={newModule.addonPriceMonthly}
                    onChange={(e) =>
                      setNewModule({
                        ...newModule,
                        addonPriceMonthly: Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="flex items-center gap-3 pt-6">
                  <Switch
                    checked={newModule.isAvailableAsAddon}
                    onCheckedChange={(v) =>
                      setNewModule({ ...newModule, isAvailableAsAddon: v })
                    }
                  />
                  <Label className="cursor-pointer">Available as addon</Label>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button
                className="gradient-primary"
                onClick={handleCreate}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating…
                  </>
                ) : (
                  "Create Module"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border rounded-xl p-5 shadow-card">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Total Modules</p>
            <Boxes className="h-4 w-4 text-primary" />
          </div>
          <p className="text-3xl font-bold text-foreground mt-2">
            {modules.length}
          </p>
        </div>
        <div className="bg-card border rounded-xl p-5 shadow-card">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Active Modules</p>
            <Sparkles className="h-4 w-4 text-success" />
          </div>
          <p className="text-3xl font-bold text-foreground mt-2">
            {activeCount}
          </p>
        </div>
        <div className="bg-card border rounded-xl p-5 shadow-card">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Available as Addon</p>
            <Settings2 className="h-4 w-4 text-info" />
          </div>
          <p className="text-3xl font-bold text-foreground mt-2">
            {addonCount}
          </p>
        </div>
      </div>

      {/* Two-pane layout */}
      {modules.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
          <Boxes className="h-10 w-10" />
          <p className="text-sm">No modules yet. Create your first one.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6">
          {/* Module list */}
          <div className="bg-card border rounded-xl shadow-card overflow-hidden">
            <div className="p-4 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search modules..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="divide-y max-h-[640px] overflow-y-auto">
              {filtered.map((m) => {
                const Icon = iconMap[resolveIcon(m)];
                const isActive = m._id === selectedId;
                return (
                  <button
                    key={m._id}
                    onClick={() => setSelectedId(m._id)}
                    className={`w-full text-left p-4 flex items-center gap-3 transition-colors ${
                      isActive
                        ? "bg-primary/10 border-l-2 border-primary"
                        : "hover:bg-muted/40 border-l-2 border-transparent"
                    }`}
                  >
                    <div
                      className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                        isActive ? "gradient-primary shadow-glow" : "bg-muted"
                      }`}
                    >
                      <Icon
                        className={`h-5 w-5 ${isActive ? "text-primary-foreground" : "text-muted-foreground"}`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {m.name}
                        </p>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                            m.isActive
                              ? "bg-success/15 text-success"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {m.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate font-mono">
                        {m.key}
                      </p>
                    </div>
                    <ChevronRight
                      className={`h-4 w-4 shrink-0 ${isActive ? "text-primary" : "text-muted-foreground"}`}
                    />
                  </button>
                );
              })}
              {filtered.length === 0 && (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No modules found
                </div>
              )}
            </div>
          </div>

          {/* Detail panel */}
          {selected && (
            <div className="space-y-4">
              <div className="bg-card border rounded-xl p-6 shadow-card">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-start gap-4">
                    <div className="gradient-primary shadow-glow h-14 w-14 rounded-xl flex items-center justify-center shrink-0">
                      <SelectedIcon className="h-7 w-7 text-primary-foreground" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-xl font-bold text-foreground">
                          {selected.name}
                        </h2>
                        <Badge
                          variant="secondary"
                          className="font-mono text-xs"
                        >
                          {selected.key}
                        </Badge>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            selected.isActive
                              ? "bg-success/15 text-success"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {selected.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1.5 max-w-xl">
                        {selected.description}
                      </p>

                      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground flex-wrap">
                        {selected.isAvailableAsAddon && (
                          <span>
                            Addon price:{" "}
                            <span className="text-foreground font-medium">
                              ${selected.addonPriceMonthly}/mo
                            </span>
                          </span>
                        )}
                        {selected.includedInPlans.length > 0 && (
                          <span className="flex items-center gap-1.5">
                            Plans:
                            {selected.includedInPlans.map((p) => (
                              <span
                                key={p}
                                className="bg-primary/10 text-primary px-1.5 py-0.5 rounded capitalize font-medium"
                              >
                                {p}
                              </span>
                            ))}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      disabled={deleteMutation.isPending}
                      onClick={() => deleteMutation.mutate(selected._id)}
                    >
                      {deleteMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4 mr-1.5" /> Delete
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Addon info card */}
              <div className="bg-card border rounded-xl p-5 shadow-card">
                <h3 className="font-semibold text-foreground mb-4">
                  Module Details
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Available as Addon
                    </p>
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-medium ${
                        selected.isAvailableAsAddon
                          ? "text-success"
                          : "text-muted-foreground"
                      }`}
                    >
                      {selected.isAvailableAsAddon ? (
                        <>
                          <Check className="h-3.5 w-3.5" /> Yes
                        </>
                      ) : (
                        <>
                          <X className="h-3.5 w-3.5" /> No
                        </>
                      )}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Addon Price
                    </p>
                    <p className="font-medium text-foreground">
                      {selected.isAvailableAsAddon
                        ? `$${selected.addonPriceMonthly}/mo`
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Created
                    </p>
                    <p className="font-medium text-foreground">
                      {new Date(selected.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="col-span-full">
                    <p className="text-xs text-muted-foreground mb-2">
                      Included in Plans
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      {selected.includedInPlans.length > 0 ? (
                        selected.includedInPlans.map((p) => (
                          <span
                            key={p}
                            className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full capitalize font-medium"
                          >
                            {p}
                          </span>
                        ))
                      ) : (
                        <span className="text-muted-foreground text-xs">
                          Not included in any plan
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
