import { useState } from "react";
import {
  Search,
  Filter,
  Download,
  Plus,
  Receipt,
  CircleDollarSign,
  Clock,
  XCircle,
} from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

type TxStatus = "Completed" | "Pending" | "Failed" | "Refunded";

type Transaction = {
  id: string;
  tenant: string;
  plan: string;
  amount: number;
  method: string;
  status: TxStatus;
  date: string;
  reference: string;
};

const initialTransactions: Transaction[] = [
  { id: "1", tenant: "Akagera Capital", plan: "Enterprise", amount: 1200, method: "Card", status: "Completed", date: "2026-06-05 14:23", reference: "TXN-9F2A41" },
  { id: "2", tenant: "Rwanda Tech Corp", plan: "Pro", amount: 450, method: "Bank Transfer", status: "Completed", date: "2026-06-04 09:11", reference: "TXN-7C1B08" },
  { id: "3", tenant: "Kigali Finance Ltd", plan: "Pro", amount: 450, method: "Mobile Money", status: "Pending", date: "2026-06-03 16:40", reference: "TXN-3D9E22" },
  { id: "4", tenant: "Great Lakes Insurance", plan: "Enterprise", amount: 1200, method: "Card", status: "Failed", date: "2026-06-02 11:05", reference: "TXN-5A8C77" },
  { id: "5", tenant: "Virunga Microfinance", plan: "Starter", amount: 150, method: "Mobile Money", status: "Completed", date: "2026-06-01 08:30", reference: "TXN-1B4F90" },
  { id: "6", tenant: "East Africa Holdings", plan: "Pro", amount: 450, method: "Bank Transfer", status: "Refunded", date: "2026-05-28 13:50", reference: "TXN-2E6D33" },
];

const statusColors: Record<TxStatus, string> = {
  Completed: "bg-success/15 text-success",
  Pending: "bg-warning/15 text-warning",
  Failed: "bg-destructive/15 text-destructive",
  Refunded: "bg-info/15 text-info",
};

const emptyForm = {
  tenant: "",
  plan: "Starter",
  amount: "",
  method: "Card",
  status: "Completed" as TxStatus,
};

export default function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const filtered = transactions.filter(
    (t) =>
      t.tenant.toLowerCase().includes(search.toLowerCase()) ||
      t.reference.toLowerCase().includes(search.toLowerCase()) ||
      t.plan.toLowerCase().includes(search.toLowerCase()),
  );

  const totalRevenue = transactions
    .filter((t) => t.status === "Completed")
    .reduce((sum, t) => sum + t.amount, 0);
  const pendingCount = transactions.filter((t) => t.status === "Pending").length;
  const failedCount = transactions.filter((t) => t.status === "Failed").length;

  const formatCurrency = (n: number) =>
    `$${n.toLocaleString(undefined, { minimumFractionDigits: 0 })}`;

  const handleSave = () => {
    if (!form.tenant.trim() || !form.amount) {
      toast.error("Please enter a tenant and amount");
      return;
    }
    const newTx: Transaction = {
      id: crypto.randomUUID(),
      tenant: form.tenant.trim(),
      plan: form.plan,
      amount: Number(form.amount),
      method: form.method,
      status: form.status,
      date: new Date().toISOString().slice(0, 16).replace("T", " "),
      reference: "TXN-" + Math.random().toString(36).slice(2, 8).toUpperCase(),
    };
    setTransactions((prev) => [newTx, ...prev]);
    setOpen(false);
    setForm(emptyForm);
    toast.success("Payment recorded");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Transactions</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Record of tenant subscription payments
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Record Payment
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Revenue" value={formatCurrency(totalRevenue)} change="Completed payments" icon={CircleDollarSign} gradient />
        <StatCard title="Transactions" value={String(transactions.length)} change="All-time records" icon={Receipt} />
        <StatCard title="Pending" value={String(pendingCount)} change="Awaiting confirmation" changeType="neutral" icon={Clock} />
        <StatCard title="Failed" value={String(failedCount)} change="Require attention" changeType="negative" icon={XCircle} />
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search transactions..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button variant="outline" size="icon">
          <Filter className="h-4 w-4" />
        </Button>
      </div>

      <div className="bg-card border rounded-xl shadow-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
              <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tenant</th>
              <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Plan</th>
              <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Amount</th>
              <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Method</th>
              <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
              <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Reference</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => (
              <tr key={t.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                <td className="p-4 text-xs text-muted-foreground font-mono">{t.date}</td>
                <td className="p-4 text-sm font-medium text-foreground">{t.tenant}</td>
                <td className="p-4 text-sm text-muted-foreground">{t.plan}</td>
                <td className="p-4 text-sm font-semibold text-foreground">{formatCurrency(t.amount)}</td>
                <td className="p-4 text-sm text-muted-foreground">{t.method}</td>
                <td className="p-4">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColors[t.status]}`}>
                    {t.status}
                  </span>
                </td>
                <td className="p-4 text-xs text-muted-foreground font-mono">{t.reference}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-sm text-muted-foreground">
                  No transactions found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Log a subscription payment made by a tenant.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="tenant">Tenant</Label>
              <Input
                id="tenant"
                placeholder="Company name"
                value={form.tenant}
                onChange={(e) => setForm({ ...form, tenant: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Plan</Label>
                <Select value={form.plan} onValueChange={(v) => setForm({ ...form, plan: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Starter">Starter</SelectItem>
                    <SelectItem value="Pro">Pro</SelectItem>
                    <SelectItem value="Enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (USD)</Label>
                <Input
                  id="amount"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select value={form.method} onValueChange={(v) => setForm({ ...form, method: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Card">Card</SelectItem>
                    <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                    <SelectItem value="Mobile Money">Mobile Money</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm({ ...form, status: v as TxStatus })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Failed">Failed</SelectItem>
                    <SelectItem value="Refunded">Refunded</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save Payment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
