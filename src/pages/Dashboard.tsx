import {
  Building2,
  Users,
  CreditCard,
  AlertTriangle,
  Package,
  Activity,
} from "lucide-react";
import { StatCard } from "@/components/StatCard";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const PLAN_COLORS: Record<string, string> = {
  free: "hsl(210, 80%, 55%)",
  lite: "hsl(245, 58%, 58%)",
  grow: "hsl(260, 55%, 55%)",
  enterprise: "hsl(225, 60%, 48%)",
  premium: "hsl(280, 65%, 50%)",
};

type Overview = {
  totalTenants: number;
  activeTenants: number;
  suspendedTenants: number;
  pendingTenants: number;
  totalClients: number;
  activeModules: number;
};

type SubscriptionBreakdown = { _id: string; count: number; active: number };
type RecentTenant = {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
  tenantProfile?: { businessName?: string; industry?: string };
  createdAt: string;
};

type DashboardData = {
  overview: Overview;
  subscriptionBreakdown: SubscriptionBreakdown[];
  recentTenants: RecentTenant[];
  generatedAt: string;
};

const statusColor = (s: string) =>
  s === "active"
    ? "bg-success/15 text-success"
    : s === "suspended"
      ? "bg-warning/15 text-warning"
      : s === "pending"
        ? "bg-info/15 text-info"
        : "bg-muted text-muted-foreground";

export default function Dashboard() {
  const { data, isLoading, isError } = useQuery<DashboardData>({
    queryKey: ["superadmin-dashboard"],
    queryFn: async () => {
      const res = await api.get("/super-admin/dashboard");
      return res.data?.data ?? res.data;
    },
    staleTime: 2 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 gap-3 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Loading dashboard…</span>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex items-center justify-center h-64 text-destructive text-sm">
        Failed to load dashboard. Check your connection and try again.
      </div>
    );
  }

  const { overview, subscriptionBreakdown, recentTenants } = data;

  // Build pie data from subscription breakdown
  const pieData = subscriptionBreakdown.map((s) => ({
    name: s._id.charAt(0).toUpperCase() + s._id.slice(1),
    value: s.count,
    color: PLAN_COLORS[s._id] ?? "hsl(220, 15%, 55%)",
  }));

  // Tenant status bar chart
  const tenantStatusData = [
    {
      label: "Active",
      value: overview.activeTenants,
      color: "hsl(142, 71%, 45%)",
    },
    {
      label: "Pending",
      value: overview.pendingTenants,
      color: "hsl(38, 92%, 50%)",
    },
    {
      label: "Suspended",
      value: overview.suspendedTenants,
      color: "hsl(0, 84%, 60%)",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Global Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Last updated: {new Date(data.generatedAt).toLocaleTimeString()}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <div className="xl:col-span-2">
          <StatCard
            title="Total Tenants"
            value={String(overview.totalTenants)}
            change={`${overview.activeTenants} active`}
            changeType="positive"
            icon={Building2}
            gradient
          />
        </div>
        <div className="xl:col-span-2">
          <StatCard
            title="Total Clients"
            value={String(overview.totalClients)}
            change="Across all tenants"
            changeType="positive"
            icon={Users}
          />
        </div>
        <div className="xl:col-span-1">
          <StatCard
            title="Suspended"
            value={String(overview.suspendedTenants)}
            change="Tenants"
            changeType={overview.suspendedTenants > 0 ? "negative" : "positive"}
            icon={AlertTriangle}
          />
        </div>
        <div className="xl:col-span-1">
          <StatCard
            title="Active Modules"
            value={String(overview.activeModules)}
            change="Platform-wide"
            changeType="positive"
            icon={Package}
          />
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Tenant status bar */}
        <div className="lg:col-span-2 bg-card border rounded-xl p-5 shadow-card">
          <h3 className="text-sm font-semibold text-foreground mb-4">
            Tenant Status Breakdown
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={tenantStatusData} layout="vertical">
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(228, 25%, 18%)"
              />
              <XAxis type="number" stroke="hsl(220, 15%, 55%)" fontSize={12} />
              <YAxis
                type="category"
                dataKey="label"
                stroke="hsl(220, 15%, 55%)"
                fontSize={12}
                width={70}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(228, 35%, 12%)",
                  border: "1px solid hsl(228, 25%, 18%)",
                  borderRadius: 8,
                  color: "hsl(220, 20%, 92%)",
                }}
              />
              <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                {tenantStatusData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Subscription breakdown pie */}
        <div className="bg-card border rounded-xl p-5 shadow-card">
          <h3 className="text-sm font-semibold text-foreground mb-4">
            Subscription Plans
          </h3>
          {pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "hsl(228, 35%, 12%)",
                      border: "1px solid hsl(228, 25%, 18%)",
                      borderRadius: 8,
                      color: "hsl(220, 20%, 92%)",
                    }}
                    formatter={(v: number, name: string) => [
                      `${v} tenant${v !== 1 ? "s" : ""}`,
                      name,
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {pieData.map((m) => (
                  <div key={m.name} className="flex items-center gap-2 text-xs">
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ background: m.color }}
                    />
                    <span className="text-muted-foreground capitalize">
                      {m.name} ({m.value})
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
              No subscription data yet.
            </div>
          )}
        </div>
      </div>

      {/* Recent tenants */}
      <div className="bg-card border rounded-xl shadow-card overflow-hidden">
        <div className="p-5 border-b">
          <h3 className="font-semibold text-foreground">
            Recently Onboarded Tenants
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Latest 5 firms added to the platform
          </p>
        </div>
        {recentTenants.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
            No tenants yet.
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b">
                {["Firm", "Contact", "Industry", "Status", "Joined"].map(
                  (h) => (
                    <th
                      key={h}
                      className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {recentTenants.map((t) => (
                <tr
                  key={t._id}
                  className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                >
                  <td className="p-4">
                    <p className="text-sm font-medium text-foreground">
                      {t.tenantProfile?.businessName ??
                        `${t.firstName} ${t.lastName}`}
                    </p>
                  </td>
                  <td className="p-4">
                    <p className="text-sm text-foreground">
                      {t.firstName} {t.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">{t.email}</p>
                  </td>
                  <td className="p-4 text-sm text-muted-foreground">
                    {t.tenantProfile?.industry ?? "—"}
                  </td>
                  <td className="p-4">
                    <span
                      className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full capitalize ${statusColor(t.status)}`}
                    >
                      {t.status}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-muted-foreground">
                    {new Date(t.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
