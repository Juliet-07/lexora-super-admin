import { useState } from "react";
import {
  Boxes, Plus, Search, Shield, Database, Globe, Zap, Briefcase, BarChart3,
  Settings2, Trash2, Pencil, Check, X, ChevronRight, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

type Feature = {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
};

type Module = {
  id: string;
  name: string;
  code: string;
  description: string;
  category: string;
  icon: keyof typeof iconMap;
  status: "Active" | "Beta" | "Draft";
  tenants: number;
  features: Feature[];
};

const iconMap = {
  Shield, Database, Globe, Zap, Briefcase, BarChart3, Boxes,
};

const initialModules: Module[] = [
  {
    id: "m1",
    name: "AML/KYC",
    code: "aml_kyc",
    description: "Anti-Money Laundering and Know Your Customer compliance suite.",
    category: "Compliance",
    icon: "Shield",
    status: "Active",
    tenants: 24,
    features: [
      { id: "f1", name: "Customer Screening", description: "Sanctions & PEP screening", enabled: true },
      { id: "f2", name: "Transaction Monitoring", description: "Real-time transaction analysis", enabled: true },
      { id: "f3", name: "Risk Scoring", description: "Automated customer risk profiling", enabled: true },
      { id: "f4", name: "SAR Filing", description: "Suspicious Activity Report submissions", enabled: false },
    ],
  },
  {
    id: "m2",
    name: "GRC",
    code: "grc",
    description: "Governance, Risk and Compliance management framework.",
    category: "Compliance",
    icon: "Database",
    status: "Active",
    tenants: 18,
    features: [
      { id: "f1", name: "Policy Library", description: "Centralized policy repository", enabled: true },
      { id: "f2", name: "Risk Register", description: "Enterprise risk catalog", enabled: true },
      { id: "f3", name: "Audit Trails", description: "Immutable audit logs", enabled: true },
    ],
  },
  {
    id: "m3",
    name: "CRM",
    code: "crm",
    description: "Customer relationship management with pipelines and contacts.",
    category: "Sales",
    icon: "Globe",
    status: "Active",
    tenants: 31,
    features: [
      { id: "f1", name: "Contact Management", description: "Unified contact database", enabled: true },
      { id: "f2", name: "Deal Pipeline", description: "Visual sales pipeline", enabled: true },
      { id: "f3", name: "Email Campaigns", description: "Bulk email automation", enabled: false },
    ],
  },
  {
    id: "m4",
    name: "HR",
    code: "hr",
    description: "Human Resources, payroll and workforce management tooling.",
    category: "Operations",
    icon: "Briefcase",
    status: "Beta",
    tenants: 9,
    features: [
      { id: "f1", name: "Employee Records", description: "Digital employee files", enabled: true },
      { id: "f2", name: "Leave Management", description: "Time-off requests & approvals", enabled: true },
      { id: "f3", name: "Payroll", description: "Automated salary processing", enabled: false },
    ],
  },
];

const statusStyles: Record<Module["status"], string> = {
  Active: "bg-success/15 text-success",
  Beta: "bg-info/15 text-info",
  Draft: "bg-muted text-muted-foreground",
};

export default function Modules() {
  const [modules, setModules] = useState<Module[]>(initialModules);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string>(initialModules[0].id);
  const [createOpen, setCreateOpen] = useState(false);
  const [featureOpen, setFeatureOpen] = useState(false);

  const [newModule, setNewModule] = useState({
    name: "", code: "", description: "", category: "Compliance",
    icon: "Boxes" as keyof typeof iconMap, status: "Draft" as Module["status"],
  });
  const [newFeature, setNewFeature] = useState({ name: "", description: "" });

  const selected = modules.find((m) => m.id === selectedId) ?? modules[0];
  const filtered = modules.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.code.toLowerCase().includes(search.toLowerCase())
  );

  const totalFeatures = modules.reduce((acc, m) => acc + m.features.length, 0);
  const activeModules = modules.filter((m) => m.status === "Active").length;

  const handleCreateModule = () => {
    if (!newModule.name.trim() || !newModule.code.trim()) {
      toast.error("Name and code are required");
      return;
    }
    const m: Module = {
      id: `m${Date.now()}`,
      ...newModule,
      tenants: 0,
      features: [],
    };
    setModules((prev) => [...prev, m]);
    setSelectedId(m.id);
    setCreateOpen(false);
    setNewModule({ name: "", code: "", description: "", category: "Compliance", icon: "Boxes", status: "Draft" });
    toast.success(`Module "${m.name}" created`);
  };

  const handleDeleteModule = (id: string) => {
    const next = modules.filter((m) => m.id !== id);
    setModules(next);
    if (next.length) setSelectedId(next[0].id);
    toast.success("Module deleted");
  };

  const handleAddFeature = () => {
    if (!newFeature.name.trim()) {
      toast.error("Feature name is required");
      return;
    }
    setModules((prev) =>
      prev.map((m) =>
        m.id === selected.id
          ? { ...m, features: [...m.features, { id: `f${Date.now()}`, name: newFeature.name, description: newFeature.description, enabled: true }] }
          : m
      )
    );
    setNewFeature({ name: "", description: "" });
    setFeatureOpen(false);
    toast.success("Feature added");
  };

  const toggleFeature = (fid: string) => {
    setModules((prev) =>
      prev.map((m) =>
        m.id === selected.id
          ? { ...m, features: m.features.map((f) => f.id === fid ? { ...f, enabled: !f.enabled } : f) }
          : m
      )
    );
  };

  const removeFeature = (fid: string) => {
    setModules((prev) =>
      prev.map((m) =>
        m.id === selected.id
          ? { ...m, features: m.features.filter((f) => f.id !== fid) }
          : m
      )
    );
    toast.success("Feature removed");
  };

  const SelectedIcon = iconMap[selected.icon] ?? Boxes;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Module Management</h1>
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
                    placeholder="e.g. Treasury"
                    className="mt-1.5"
                    value={newModule.name}
                    onChange={(e) => setNewModule({ ...newModule, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Code</Label>
                  <Input
                    placeholder="treasury"
                    className="mt-1.5"
                    value={newModule.code}
                    onChange={(e) => setNewModule({ ...newModule, code: e.target.value.toLowerCase().replace(/\s+/g, "_") })}
                  />
                </div>
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  placeholder="Short description shown to tenants"
                  className="mt-1.5"
                  value={newModule.description}
                  onChange={(e) => setNewModule({ ...newModule, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Category</Label>
                  <Select value={newModule.category} onValueChange={(v) => setNewModule({ ...newModule, category: v })}>
                    <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Compliance">Compliance</SelectItem>
                      <SelectItem value="Sales">Sales</SelectItem>
                      <SelectItem value="Operations">Operations</SelectItem>
                      <SelectItem value="Finance">Finance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Icon</Label>
                  <Select value={newModule.icon} onValueChange={(v) => setNewModule({ ...newModule, icon: v as keyof typeof iconMap })}>
                    <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.keys(iconMap).map((k) => (
                        <SelectItem key={k} value={k}>{k}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={newModule.status} onValueChange={(v) => setNewModule({ ...newModule, status: v as Module["status"] })}>
                    <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Draft">Draft</SelectItem>
                      <SelectItem value="Beta">Beta</SelectItem>
                      <SelectItem value="Active">Active</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button className="gradient-primary" onClick={handleCreateModule}>Create Module</Button>
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
          <p className="text-3xl font-bold text-foreground mt-2">{modules.length}</p>
        </div>
        <div className="bg-card border rounded-xl p-5 shadow-card">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Active Modules</p>
            <Sparkles className="h-4 w-4 text-success" />
          </div>
          <p className="text-3xl font-bold text-foreground mt-2">{activeModules}</p>
        </div>
        <div className="bg-card border rounded-xl p-5 shadow-card">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Total Features</p>
            <Settings2 className="h-4 w-4 text-info" />
          </div>
          <p className="text-3xl font-bold text-foreground mt-2">{totalFeatures}</p>
        </div>
      </div>

      {/* Two-pane layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6">
        {/* Modules list */}
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
              const Icon = iconMap[m.icon] ?? Boxes;
              const isActive = m.id === selectedId;
              return (
                <button
                  key={m.id}
                  onClick={() => setSelectedId(m.id)}
                  className={`w-full text-left p-4 flex items-center gap-3 transition-colors ${
                    isActive ? "bg-primary/10 border-l-2 border-primary" : "hover:bg-muted/40 border-l-2 border-transparent"
                  }`}
                >
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                    isActive ? "gradient-primary shadow-glow" : "bg-muted"
                  }`}>
                    <Icon className={`h-5 w-5 ${isActive ? "text-primary-foreground" : "text-muted-foreground"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground truncate">{m.name}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusStyles[m.status]}`}>
                        {m.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {m.features.length} features · {m.tenants} tenants
                    </p>
                  </div>
                  <ChevronRight className={`h-4 w-4 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                </button>
              );
            })}
            {filtered.length === 0 && (
              <div className="p-8 text-center text-sm text-muted-foreground">No modules found</div>
            )}
          </div>
        </div>

        {/* Module detail */}
        <div className="space-y-4">
          <div className="bg-card border rounded-xl p-6 shadow-card">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-start gap-4">
                <div className="gradient-primary shadow-glow h-14 w-14 rounded-xl flex items-center justify-center">
                  <SelectedIcon className="h-7 w-7 text-primary-foreground" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-bold text-foreground">{selected.name}</h2>
                    <Badge variant="secondary" className="font-mono text-xs">{selected.code}</Badge>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusStyles[selected.status]}`}>
                      {selected.status}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1.5 max-w-xl">{selected.description}</p>
                  <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                    <span>Category: <span className="text-foreground font-medium">{selected.category}</span></span>
                    <span>·</span>
                    <span>Used by <span className="text-foreground font-medium">{selected.tenants}</span> tenants</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Pencil className="h-4 w-4 mr-1.5" /> Edit
                </Button>
                <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDeleteModule(selected.id)}>
                  <Trash2 className="h-4 w-4 mr-1.5" /> Delete
                </Button>
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="bg-card border rounded-xl shadow-card overflow-hidden">
            <div className="p-5 border-b flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-foreground">Features</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Granular capabilities exposed to tenants subscribed to this module
                </p>
              </div>
              <Dialog open={featureOpen} onOpenChange={setFeatureOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gradient-primary shadow-glow">
                    <Plus className="h-4 w-4 mr-1.5" /> Add Feature
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Feature to {selected.name}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div>
                      <Label>Feature Name</Label>
                      <Input
                        placeholder="e.g. Bulk Import"
                        className="mt-1.5"
                        value={newFeature.name}
                        onChange={(e) => setNewFeature({ ...newFeature, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Textarea
                        placeholder="What does this feature do?"
                        className="mt-1.5"
                        value={newFeature.description}
                        onChange={(e) => setNewFeature({ ...newFeature, description: e.target.value })}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setFeatureOpen(false)}>Cancel</Button>
                    <Button className="gradient-primary" onClick={handleAddFeature}>Add Feature</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="divide-y">
              {selected.features.map((f) => (
                <div key={f.id} className="p-5 flex items-center justify-between gap-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                      f.enabled ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"
                    }`}>
                      {f.enabled ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{f.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{f.description || "No description"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch checked={f.enabled} onCheckedChange={() => toggleFeature(f.id)} />
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => removeFeature(f.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {selected.features.length === 0 && (
                <div className="p-10 text-center">
                  <Settings2 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No features yet. Add the first one.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
