import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  gradient?: boolean;
}

export function StatCard({ title, value, change, changeType = "neutral", icon: Icon, gradient }: StatCardProps) {
  return (
    <div className={`rounded-xl p-5 shadow-card ${gradient ? "gradient-primary shadow-glow" : "bg-card border"}`}>
      <div className="flex items-center justify-between mb-3">
        <p className={`text-sm font-medium ${gradient ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{title}</p>
        <div className={`rounded-lg p-2 ${gradient ? "bg-primary-foreground/10" : "bg-muted"}`}>
          <Icon className={`h-4 w-4 ${gradient ? "text-primary-foreground" : "text-muted-foreground"}`} />
        </div>
      </div>
      <p className={`text-2xl font-bold ${gradient ? "text-primary-foreground" : "text-foreground"}`}>{value}</p>
      {change && (
        <p className={`text-xs mt-1 ${
          changeType === "positive" ? "text-success" :
          changeType === "negative" ? "text-destructive" :
          gradient ? "text-primary-foreground/60" : "text-muted-foreground"
        }`}>
          {change}
        </p>
      )}
    </div>
  );
}
