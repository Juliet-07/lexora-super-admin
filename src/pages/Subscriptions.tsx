import { useState } from "react";
import { CreditCard, TrendingUp, Users, DollarSign, Plus, Pencil, Trash2, X } from "lucide-react";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

type Plan = {
  id: string;
  name: string;
  price: number;
  interval: "month" | "year";
  companies: number;
  features: string[];
  description?: string;
  status: "active" | "draft";
};

const initialPlans: Plan[] = [
  {
    id: "p1",
    name: "Starter",
    price: 49,
    interval: "month",
    companies: 18,
    features: ["1 Module", "10 Users", "Basic Support"],
    description: "For small teams getting started",
    status: "active",
  },
  {
    id: "p2",
    name: "Professional",
    price: 149,
    interval: "month",
    companies: 52,
    features: ["3 Modules", "50 Users", "Priority Support", "API Access"],
    description: "For growing organizations",
    status: "active",
  },
  {
    id: "p3",
    name: "Enterprise",
    price: 399,
    interval: "month",
    companies: 77,
    features: ["All Modules", "Unlimited Users", "24/7 Support", "Custom Integrations", "Dedicated CSM"],
    description: "For large enterprises with complex needs",
    status: "active",
  },
];

const invoices = [
  { company: "Kigali Finance Ltd", amount: "$399.00", status: "Paid", date: "2024-06-01", plan: "Enterprise" },
  { company: "Rwanda Tech Corp", amount: "$149.00", status: "Paid", date: "2024-06-01", plan: "Professional" },
  { company: "East Africa Holdings", amount: "$399.00", status: "Pending", date: "2024-06-01", plan: "Enterprise" },
  { company: "Great Lakes Insurance", amount: "$49.00", status: "Overdue", date: "2024-05-01", plan: "Starter" },
  { company: "Virunga Microfinance", amount: "$149.00", status: "Paid", date: "2024-06-01", plan: "Professional" },
];

type PlanFormState = {
  name: string;
  price: string;
  interval: "month" | "year";
  description: string;
  status: "active" | "draft";
  features: string[];
  featureInput: string;
};

const emptyForm: PlanFormState = {
  name: "",
  price: "",
  interval: "month",
  description: "",
  status: "active",
  features: [],
  featureInput: "",
};

export default function Subscriptions() {
  const [plans, setPlans] = useState<Plan[]>(initialPlans);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PlanFormState>(emptyForm);

  const totalCompanies = plans.reduce((s, p) => s + p.companies, 0) || 1;

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (plan: Plan) => {
    setEditingId(plan.id);
    setForm({
      name: plan.name,
      price: String(plan.price),
      interval: plan.interval,
      description: plan.description ?? "",
      status: plan.status,
      features: [...plan.features],
      featureInput: "",
    });
    setOpen(true);
  };

  const addFeature = () => {
    const f = form.featureInput.trim();
    if (!f) return;
    setForm({ ...form, features: [...form.features, f], featureInput: "" });
  };

  const removeFeature = (idx: number) => {
    setForm({ ...form, features: form.features.filter((_, i) => i !== idx) });
  };

  const handleSave = () => {
    if (!form.name.trim() || !form.price) {
      toast({ title: "Missing fields", description: "Plan name and price are required.", variant: "destructive" });
      return;
    }
    const priceNum = Number(form.price);
    if (Number.isNaN(priceNum) || priceNum < 0) {
      toast({ title: "Invalid price", description: "Enter a valid non-negative number.", variant: "destructive" });
      return;
    }

    if (editingId) {
      setPlans(plans.map(p => p.id === editingId ? {
        ...p,
        name: form.name.trim(),
        price: priceNum,
        interval: form.interval,
        description: form.description,
        status: form.status,
        features: form.features,
      } : p));
      toast({ title: "Plan updated", description: `${form.name} has been updated.` });
    } else {
      const newPlan: Plan = {
        id: `p_${Date.now()}`,
        name: form.name.trim(),
        price: priceNum,
        interval: form.interval,
        description: form.description,
        status: form.status,
        features: form.features,
        companies: 0,
      };
      setPlans([...plans, newPlan]);
      toast({ title: "Plan created", description: `${form.name} is now available.` });
    }
    setOpen(false);
  };

  const handleDelete = (id: string) => {
    const plan = plans.find(p => p.id === id);
    setPlans(plans.filter(p => p.id !== id));
    toast({ title: "Plan deleted", description: `${plan?.name ?? "Plan"} has been removed.` });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Subscription Management</h1>
          <p className="text-muted-foreground text-sm mt-1">Plans, billing & invoices</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" /> New Plan
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Total MRR" value="$38,450" change="+12.3% vs last month" changeType="positive" icon={DollarSign} gradient />
        <StatCard title="Active Subscriptions" value="147" change="3 trials expiring" changeType="neutral" icon={CreditCard} />
        <StatCard title="Avg Revenue/Company" value="$261" change="+8.1%" changeType="positive" icon={TrendingUp} />
        <StatCard title="Churn Rate" value="2.1%" change="-0.4% improvement" changeType="positive" icon={Users} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map((plan) => (
          <div key={plan.id} className="bg-card border rounded-xl p-6 shadow-card flex flex-col">
            <div className="flex items-start justify-between mb-4 gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-foreground text-lg">{plan.name}</h3>
                  <Badge variant={plan.status === "active" ? "default" : "secondary"}>{plan.status}</Badge>
                </div>
                <p className="text-2xl font-bold text-primary mt-1">
                  ${plan.price}
                  <span className="text-sm font-normal text-muted-foreground">/{plan.interval}</span>
                </p>
                {plan.description && (
                  <p className="text-xs text-muted-foreground mt-1">{plan.description}</p>
                )}
              </div>
              <Badge variant="secondary">{plan.companies} cos.</Badge>
            </div>
            <div className="mb-4">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Adoption</span>
                <span>{Math.round((plan.companies / totalCompanies) * 100)}%</span>
              </div>
              <Progress value={(plan.companies / totalCompanies) * 100} className="h-2" />
            </div>
            <ul className="space-y-2 flex-1">
              {plan.features.map((f, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" /> {f}
                </li>
              ))}
              {plan.features.length === 0 && (
                <li className="text-xs text-muted-foreground italic">No features defined</li>
              )}
            </ul>
            <div className="mt-4 flex gap-2">
              <Button variant="outline" className="flex-1 gap-2" onClick={() => openEdit(plan)}>
                <Pencil className="h-3.5 w-3.5" /> Edit
              </Button>
              <Button variant="outline" size="icon" onClick={() => handleDelete(plan.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-card border rounded-xl shadow-card overflow-hidden">
        <div className="p-5 border-b">
          <h3 className="font-semibold text-foreground">Recent Invoices</h3>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Company</th>
              <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Plan</th>
              <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Amount</th>
              <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
              <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv, i) => (
              <tr key={i} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                <td className="p-4 text-sm font-medium text-foreground">{inv.company}</td>
                <td className="p-4"><Badge variant="secondary">{inv.plan}</Badge></td>
                <td className="p-4 text-sm text-foreground font-medium">{inv.amount}</td>
                <td className="p-4">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    inv.status === "Paid" ? "bg-success/15 text-success" :
                    inv.status === "Pending" ? "bg-warning/15 text-warning" :
                    "bg-destructive/15 text-destructive"
                  }`}>{inv.status}</span>
                </td>
                <td className="p-4 text-sm text-muted-foreground">{inv.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Plan" : "Create Subscription Plan"}</DialogTitle>
            <DialogDescription>
              {editingId ? "Update plan details and features." : "Define a new subscription plan for your tenants."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
            <div className="space-y-2">
              <Label htmlFor="name">Plan Name</Label>
              <Input id="name" placeholder="e.g. Growth" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="price">Price (USD)</Label>
                <Input id="price" type="number" min="0" placeholder="99" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Billing Interval</Label>
                <Select value={form.interval} onValueChange={(v: "month" | "year") => setForm({ ...form, interval: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="month">Monthly</SelectItem>
                    <SelectItem value="year">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v: "active" | "draft") => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="desc">Description</Label>
              <Textarea id="desc" rows={2} placeholder="Short description shown to tenants" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>

            <div className="space-y-2">
              <Label>Features</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. Unlimited users"
                  value={form.featureInput}
                  onChange={e => setForm({ ...form, featureInput: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); addFeature(); }
                  }}
                />
                <Button type="button" variant="outline" onClick={addFeature}>Add</Button>
              </div>
              {form.features.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {form.features.map((f, i) => (
                    <span key={i} className="inline-flex items-center gap-1 text-xs bg-muted px-2.5 py-1 rounded-full">
                      {f}
                      <button onClick={() => removeFeature(i)} className="hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editingId ? "Save Changes" : "Create Plan"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
