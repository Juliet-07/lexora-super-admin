import { CreditCard, TrendingUp, Users, DollarSign } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

const plans = [
  { name: "Starter", price: "$49/mo", companies: 18, color: "bg-info", features: ["1 Module", "10 Users", "Basic Support"] },
  { name: "Professional", price: "$149/mo", companies: 52, color: "bg-accent", features: ["3 Modules", "50 Users", "Priority Support", "API Access"] },
  { name: "Enterprise", price: "$399/mo", companies: 77, color: "gradient-primary", features: ["All Modules", "Unlimited Users", "24/7 Support", "Custom Integrations", "Dedicated CSM"] },
];

const invoices = [
  { company: "Kigali Finance Ltd", amount: "$399.00", status: "Paid", date: "2024-06-01", plan: "Enterprise" },
  { company: "Rwanda Tech Corp", amount: "$149.00", status: "Paid", date: "2024-06-01", plan: "Professional" },
  { company: "East Africa Holdings", amount: "$399.00", status: "Pending", date: "2024-06-01", plan: "Enterprise" },
  { company: "Great Lakes Insurance", amount: "$49.00", status: "Overdue", date: "2024-05-01", plan: "Starter" },
  { company: "Virunga Microfinance", amount: "$149.00", status: "Paid", date: "2024-06-01", plan: "Professional" },
];

export default function Subscriptions() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Subscription Management</h1>
        <p className="text-muted-foreground text-sm mt-1">Plans, billing & invoices</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Total MRR" value="$38,450" change="+12.3% vs last month" changeType="positive" icon={DollarSign} gradient />
        <StatCard title="Active Subscriptions" value="147" change="3 trials expiring" changeType="neutral" icon={CreditCard} />
        <StatCard title="Avg Revenue/Company" value="$261" change="+8.1%" changeType="positive" icon={TrendingUp} />
        <StatCard title="Churn Rate" value="2.1%" change="-0.4% improvement" changeType="positive" icon={Users} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map((plan) => (
          <div key={plan.name} className="bg-card border rounded-xl p-6 shadow-card flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-foreground text-lg">{plan.name}</h3>
                <p className="text-2xl font-bold text-primary mt-1">{plan.price}</p>
              </div>
              <Badge variant="secondary">{plan.companies} cos.</Badge>
            </div>
            <div className="mb-4">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Adoption</span>
                <span>{Math.round((plan.companies / 147) * 100)}%</span>
              </div>
              <Progress value={(plan.companies / 147) * 100} className="h-2" />
            </div>
            <ul className="space-y-2 flex-1">
              {plan.features.map((f) => (
                <li key={f} className="text-sm text-muted-foreground flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" /> {f}
                </li>
              ))}
            </ul>
            <Button variant="outline" className="mt-4 w-full">Manage Plan</Button>
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
    </div>
  );
}
