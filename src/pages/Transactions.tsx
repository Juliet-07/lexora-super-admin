import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Download,
  Receipt,
  CircleDollarSign,
  Clock,
  XCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MessageSquare,
} from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import { api } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────

type TransactionStatus =
  | "pending"
  | "awaiting_payment"
  | "paid"
  | "failed"
  | "cancelled"
  | "refunded";

type PaymentMethod = "dpo" | "manual" | "invoice";
type DocumentType = "invoice" | "receipt";

interface TenantRef {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  tenantProfile?: { businessName?: string };
}

interface Transaction {
  _id: string;
  tenantId: TenantRef | null;
  type: string;
  status: TransactionStatus;
  amount: number;
  currency: string;
  plan: string;
  documentType: DocumentType | null;
  invoiceNumber: string | null;
  receiptNumber: string | null;
  paidAt: string | null;
  paymentMethod: PaymentMethod | null;
  paymentReference: string | null;
  notes: string | null;
  createdAt: string;
}

interface TransactionStats {
  byStatus: { _id: string; count: number }[];
  byPlan: { _id: string; count: number; revenue: number }[];
  byCurrency: { _id: string; total: number }[];
  recentPaid: Transaction[];
  totalRevenue: number;
  totalTransactions: number;
}

interface PaginatedTransactions {
  items: Transaction[];
  total: number;
  page: number;
  totalPages: number;
}

// ─── Helpers ──────────────────────────────────────────────────

const statusConfig: Record<
  TransactionStatus,
  { label: string; className: string }
> = {
  paid: { label: "Paid", className: "bg-green-100 text-green-700" },
  pending: { label: "Pending", className: "bg-yellow-100 text-yellow-700" },
  awaiting_payment: {
    label: "Awaiting Payment",
    className: "bg-blue-100 text-blue-700",
  },
  failed: { label: "Failed", className: "bg-red-100 text-red-700" },
  cancelled: { label: "Cancelled", className: "bg-slate-100 text-slate-600" },
  refunded: { label: "Refunded", className: "bg-purple-100 text-purple-700" },
};

const methodLabels: Record<string, string> = {
  dpo: "DPO (Online)",
  manual: "Manual",
  invoice: "Invoice",
};

function formatAmount(amount: number, currency: string) {
  if (currency === "RWF") {
    return `RWF ${amount.toLocaleString()}`;
  }
  return `$${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function tenantName(t: TenantRef | null): string {
  if (!t) return "—";
  return t.tenantProfile?.businessName || `${t.firstName} ${t.lastName}`;
}

// ─── Component ────────────────────────────────────────────────

export default function Transactions() {
  const queryClient = useQueryClient();

  // ── Filters + pagination ──────────────────────────────────
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [page, setPage] = useState(1);

  // ── Confirm invoice payment dialog ────────────────────────
  const [confirmTarget, setConfirmTarget] = useState<Transaction | null>(null);
  const [confirmRef, setConfirmRef] = useState("");
  const [confirmNotes, setConfirmNotes] = useState("");

  // ── Fetch stats ───────────────────────────────────────────
  const { data: stats } = useQuery<TransactionStats>({
    queryKey: ["transaction-stats"],
    queryFn: async () => {
      const res = await api.get("/super-admin/payments/stats");
      return res.data?.data ?? res.data;
    },
    staleTime: 60_000,
  });

  // ── Fetch transactions (paginated + filtered) ─────────────
  const { data: txData, isLoading } = useQuery<PaginatedTransactions>({
    queryKey: ["transactions", page, statusFilter, planFilter],
    queryFn: async () => {
      const params: Record<string, any> = { page, limit: 15 };
      if (statusFilter !== "all") params.status = statusFilter;
      if (planFilter !== "all") params.plan = planFilter;
      const res = await api.get("/super-admin/payments/transactions", {
        params,
      });
      return res.data?.data ?? res.data;
    },
    staleTime: 30_000,
  });

  const transactions = txData?.items ?? [];
  const totalPages = txData?.totalPages ?? 1;
  const total = txData?.total ?? 0;

  // ── Client-side search filter ─────────────────────────────
  const filtered = search.trim()
    ? transactions.filter((t) => {
        const name = tenantName(t.tenantId).toLowerCase();
        const ref = (t.paymentReference ?? "").toLowerCase();
        const inv = (t.invoiceNumber ?? "").toLowerCase();
        const rec = (t.receiptNumber ?? "").toLowerCase();
        const s = search.toLowerCase();
        return (
          name.includes(s) ||
          ref.includes(s) ||
          inv.includes(s) ||
          rec.includes(s)
        );
      })
    : transactions;

  // ── Confirm invoice mutation ──────────────────────────────
  const confirmMutation = useMutation({
    mutationFn: (id: string) =>
      api.patch(`/super-admin/payments/${id}/confirm`, {
        paymentReference: confirmRef || undefined,
        notes: confirmNotes || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["transaction-stats"] });
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      setConfirmTarget(null);
      setConfirmRef("");
      setConfirmNotes("");
      toast.success(
        "Payment confirmed. Tenant account activated and credentials sent.",
      );
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to confirm payment"),
  });

  // ── Export CSV ────────────────────────────────────────────
  const handleExport = () => {
    const rows = [
      [
        "Date",
        "Tenant",
        "Plan",
        "Amount",
        "Currency",
        "Method",
        "Status",
        "Document",
        "Reference",
      ],
      ...transactions.map((t) => [
        new Date(t.createdAt).toLocaleDateString(),
        tenantName(t.tenantId),
        t.plan,
        t.amount,
        t.currency,
        methodLabels[t.paymentMethod ?? ""] ?? t.paymentMethod ?? "—",
        t.status,
        t.documentType ?? "—",
        t.invoiceNumber ?? t.receiptNumber ?? t.paymentReference ?? "—",
      ]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lexora-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Summary stats ─────────────────────────────────────────
  const awaitingCount =
    stats?.byStatus.find((s) => s._id === "awaiting_payment")?.count ?? 0;
  const failedCount =
    stats?.byStatus.find((s) => s._id === "failed")?.count ?? 0;
  const usdRevenue = stats?.byCurrency.find((c) => c._id === "USD")?.total ?? 0;
  const rwfRevenue = stats?.byCurrency.find((c) => c._id === "RWF")?.total ?? 0;

  // ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Transactions</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Record of tenant subscription payments
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleExport}
          disabled={transactions.length === 0}
        >
          <Download className="h-4 w-4 mr-2" /> Export CSV
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Revenue (USD)"
          value={`$${usdRevenue.toLocaleString(undefined, { minimumFractionDigits: 0 })}`}
          change="Confirmed payments"
          icon={CircleDollarSign}
          gradient
        />
        <StatCard
          title="Total Revenue (RWF)"
          value={`RWF ${rwfRevenue.toLocaleString()}`}
          change="Confirmed payments"
          icon={CircleDollarSign}
        />
        <StatCard
          title="Awaiting Payment"
          value={String(awaitingCount)}
          change="Pending invoices"
          changeType="neutral"
          icon={Clock}
        />
        <StatCard
          title="Failed"
          value={String(failedCount)}
          change="Require attention"
          changeType="negative"
          icon={XCircle}
        />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tenant, reference…"
            className="pl-9"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-44 h-9 text-sm">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="awaiting_payment">Awaiting Payment</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="refunded">Refunded</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={planFilter}
          onValueChange={(v) => {
            setPlanFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-40 h-9 text-sm">
            <SelectValue placeholder="All plans" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All plans</SelectItem>
            <SelectItem value="free">Free</SelectItem>
            <SelectItem value="starter">Starter</SelectItem>
            <SelectItem value="professional">Professional</SelectItem>
            <SelectItem value="enterprise">Enterprise</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-card border rounded-xl shadow-card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-48 gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Loading transactions…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            No transactions found.
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b">
                {[
                  "Date",
                  "Tenant",
                  "Plan",
                  "Amount",
                  "Method",
                  "Document",
                  "Status",
                  "",
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
              {filtered.map((t) => {
                const stat = statusConfig[t.status] ?? statusConfig.pending;
                const docNumber = t.receiptNumber ?? t.invoiceNumber ?? "—";
                const isInvoicePending =
                  t.status === "awaiting_payment" &&
                  t.documentType === "invoice";

                return (
                  <tr
                    key={t._id}
                    className={`border-b last:border-0 transition-colors ${
                      isInvoicePending
                        ? "bg-blue-50/30 hover:bg-blue-50/50"
                        : "hover:bg-muted/30"
                    }`}
                  >
                    <td className="p-4 text-xs text-muted-foreground font-mono whitespace-nowrap">
                      {new Date(t.createdAt).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="p-4">
                      <p className="text-sm font-medium text-foreground">
                        {tenantName(t.tenantId)}
                      </p>
                      {t.tenantId?.email && (
                        <p className="text-xs text-muted-foreground">
                          {t.tenantId.email}
                        </p>
                      )}
                    </td>
                    <td className="p-4">
                      <Badge variant="secondary" className="capitalize text-xs">
                        {t.plan}
                      </Badge>
                    </td>
                    <td className="p-4 text-sm font-semibold text-foreground whitespace-nowrap">
                      {formatAmount(t.amount, t.currency)}
                    </td>
                    <td className="p-4 text-sm text-muted-foreground capitalize">
                      {methodLabels[t.paymentMethod ?? ""] ??
                        t.paymentMethod ??
                        "—"}
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-0.5">
                        {t.documentType && (
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-medium w-fit ${
                              t.documentType === "receipt"
                                ? "bg-green-100 text-green-700"
                                : "bg-yellow-100 text-yellow-700"
                            }`}
                          >
                            {t.documentType === "receipt"
                              ? "Receipt"
                              : "Invoice"}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground font-mono">
                          {docNumber}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap ${stat.className}`}
                      >
                        {stat.label}
                      </span>
                    </td>
                    <td className="p-4">
                      {/* Confirm invoice payment button */}
                      {isInvoicePending && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs border-blue-200 text-blue-700 hover:bg-blue-50"
                          onClick={() => {
                            setConfirmTarget(t);
                            setConfirmRef("");
                            setConfirmNotes("");
                          }}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                          Confirm Payment
                        </Button>
                      )}
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
            {total} transaction{total !== 1 ? "s" : ""} · Page {page} of{" "}
            {totalPages}
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

      {/* ── Confirm Invoice Payment Dialog ── */}
      <Dialog
        open={!!confirmTarget}
        onOpenChange={(v) => {
          if (!v) setConfirmTarget(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Invoice Payment</DialogTitle>
            <DialogDescription>
              Confirming payment for{" "}
              <strong>{tenantName(confirmTarget?.tenantId ?? null)}</strong>.
              This will activate their account and send login credentials.
            </DialogDescription>
          </DialogHeader>

          {confirmTarget && (
            <div className="space-y-4 py-2">
              {/* Invoice summary */}
              <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Invoice</span>
                  <span className="font-mono">
                    {confirmTarget.invoiceNumber ?? "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Plan</span>
                  <span className="capitalize font-medium">
                    {confirmTarget.plan}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-semibold">
                    {formatAmount(confirmTarget.amount, confirmTarget.currency)}
                  </span>
                </div>
              </div>

              <div>
                <Label>Payment Reference (optional)</Label>
                <Input
                  className="mt-1.5"
                  placeholder="Bank transfer ref, mobile money code, etc."
                  value={confirmRef}
                  onChange={(e) => setConfirmRef(e.target.value)}
                />
              </div>

              <div>
                <Label>Notes (optional)</Label>
                <Textarea
                  className="mt-1.5"
                  rows={2}
                  placeholder="Any notes about this payment…"
                  value={confirmNotes}
                  onChange={(e) => setConfirmNotes(e.target.value)}
                />
              </div>

              <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-xs text-green-700">
                <strong>What happens next:</strong> The invoice will be
                converted to a receipt, the tenant account will be activated,
                and login credentials will be sent to{" "}
                {confirmTarget.tenantId?.email ?? "the tenant"}.
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmTarget(null)}
              disabled={confirmMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              disabled={confirmMutation.isPending}
              onClick={() =>
                confirmTarget && confirmMutation.mutate(confirmTarget._id)
              }
            >
              {confirmMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Confirming…
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" /> Confirm & Activate
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
