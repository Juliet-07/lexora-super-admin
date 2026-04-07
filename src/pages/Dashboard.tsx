import { Building2, Users, CreditCard, AlertTriangle, TrendingUp, Activity } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";

const revenueData = [
  { month: "Jan", revenue: 42000 }, { month: "Feb", revenue: 48000 }, { month: "Mar", revenue: 55000 },
  { month: "Apr", revenue: 51000 }, { month: "May", revenue: 63000 }, { month: "Jun", revenue: 72000 },
];

const activityData = [
  { day: "Mon", users: 120 }, { day: "Tue", users: 180 }, { day: "Wed", users: 150 },
  { day: "Thu", users: 220 }, { day: "Fri", users: 190 }, { day: "Sat", users: 80 }, { day: "Sun", users: 60 },
];

const moduleData = [
  { name: "AML/KYC", value: 38, color: "hsl(245, 58%, 58%)" },
  { name: "GRC", value: 28, color: "hsl(225, 60%, 48%)" },
  { name: "CRM", value: 20, color: "hsl(260, 55%, 55%)" },
  { name: "HR", value: 14, color: "hsl(210, 80%, 55%)" },
];

const recentAlerts = [
  { company: "Kigali Finance Ltd", type: "AML Alert", severity: "High", time: "2 min ago" },
  { company: "Rwanda Tech Corp", type: "KYC Expired", severity: "Medium", time: "15 min ago" },
  { company: "East Africa Holdings", type: "Compliance Due", severity: "Low", time: "1 hr ago" },
  { company: "Great Lakes Insurance", type: "Suspicious Activity", severity: "High", time: "2 hr ago" },
];

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Global Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Welcome back, Super Admin</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Companies" value="147" change="+12 this month" changeType="positive" icon={Building2} gradient />
        <StatCard title="Active Users" value="2,847" change="+18.2% vs last month" changeType="positive" icon={Users} />
        <StatCard title="Monthly Revenue" value="$72,400" change="+14.5% growth" changeType="positive" icon={CreditCard} />
        <StatCard title="Active Alerts" value="23" change="5 critical" changeType="negative" icon={AlertTriangle} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-card border rounded-xl p-5 shadow-card">
          <h3 className="text-sm font-semibold text-foreground mb-4">Revenue Overview</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(228, 25%, 18%)" />
              <XAxis dataKey="month" stroke="hsl(220, 15%, 55%)" fontSize={12} />
              <YAxis stroke="hsl(220, 15%, 55%)" fontSize={12} />
              <Tooltip contentStyle={{ background: "hsl(228, 35%, 12%)", border: "1px solid hsl(228, 25%, 18%)", borderRadius: 8, color: "hsl(220, 20%, 92%)" }} />
              <Bar dataKey="revenue" fill="hsl(245, 58%, 58%)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border rounded-xl p-5 shadow-card">
          <h3 className="text-sm font-semibold text-foreground mb-4">Module Usage</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={moduleData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" stroke="none">
                {moduleData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "hsl(228, 35%, 12%)", border: "1px solid hsl(228, 25%, 18%)", borderRadius: 8, color: "hsl(220, 20%, 92%)" }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {moduleData.map((m) => (
              <div key={m.name} className="flex items-center gap-2 text-xs">
                <span className="h-2 w-2 rounded-full" style={{ background: m.color }} />
                <span className="text-muted-foreground">{m.name} ({m.value}%)</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border rounded-xl p-5 shadow-card">
          <h3 className="text-sm font-semibold text-foreground mb-4">User Activity (This Week)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={activityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(228, 25%, 18%)" />
              <XAxis dataKey="day" stroke="hsl(220, 15%, 55%)" fontSize={12} />
              <YAxis stroke="hsl(220, 15%, 55%)" fontSize={12} />
              <Tooltip contentStyle={{ background: "hsl(228, 35%, 12%)", border: "1px solid hsl(228, 25%, 18%)", borderRadius: 8, color: "hsl(220, 20%, 92%)" }} />
              <Line type="monotone" dataKey="users" stroke="hsl(260, 55%, 55%)" strokeWidth={2} dot={{ fill: "hsl(260, 55%, 55%)" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border rounded-xl p-5 shadow-card">
          <h3 className="text-sm font-semibold text-foreground mb-4">Recent Alerts</h3>
          <div className="space-y-3">
            {recentAlerts.map((alert, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div>
                  <p className="text-sm font-medium text-foreground">{alert.company}</p>
                  <p className="text-xs text-muted-foreground">{alert.type}</p>
                </div>
                <div className="text-right">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    alert.severity === "High" ? "bg-destructive/20 text-destructive" :
                    alert.severity === "Medium" ? "bg-warning/20 text-warning" :
                    "bg-info/20 text-info"
                  }`}>{alert.severity}</span>
                  <p className="text-xs text-muted-foreground mt-1">{alert.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
