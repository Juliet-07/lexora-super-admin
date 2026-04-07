import { useState } from "react";
import { Search, Filter, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const logs = [
  { id: 1, user: "admin@lexora.io", action: "Created Organization", target: "Akagera Capital", ip: "192.168.1.45", time: "2024-06-15 14:23:01", type: "Create" },
  { id: 2, user: "admin@lexora.io", action: "Updated Subscription", target: "Rwanda Tech Corp", ip: "192.168.1.45", time: "2024-06-15 13:45:22", type: "Update" },
  { id: 3, user: "moderator@lexora.io", action: "Reviewed AML Alert", target: "Kigali Finance Ltd", ip: "10.0.0.12", time: "2024-06-15 12:30:15", type: "Review" },
  { id: 4, user: "admin@lexora.io", action: "Deactivated Tenant", target: "Great Lakes Insurance", ip: "192.168.1.45", time: "2024-06-15 11:15:44", type: "Delete" },
  { id: 5, user: "admin@lexora.io", action: "Enabled Module", target: "Virunga Microfinance → HR", ip: "192.168.1.45", time: "2024-06-15 10:08:33", type: "Update" },
  { id: 6, user: "system", action: "Compliance Check", target: "All Organizations", ip: "—", time: "2024-06-15 06:00:00", type: "System" },
  { id: 7, user: "admin@lexora.io", action: "Generated Invoice", target: "East Africa Holdings", ip: "192.168.1.45", time: "2024-06-14 16:42:19", type: "Create" },
  { id: 8, user: "moderator@lexora.io", action: "Exported User Report", target: "Global", ip: "10.0.0.12", time: "2024-06-14 15:20:07", type: "Export" },
];

const typeColors: Record<string, string> = {
  Create: "bg-success/15 text-success",
  Update: "bg-info/15 text-info",
  Delete: "bg-destructive/15 text-destructive",
  Review: "bg-accent/15 text-accent",
  System: "bg-muted text-muted-foreground",
  Export: "bg-warning/15 text-warning",
};

export default function AuditLogs() {
  const [search, setSearch] = useState("");
  const filtered = logs.filter((l) =>
    l.action.toLowerCase().includes(search.toLowerCase()) ||
    l.target.toLowerCase().includes(search.toLowerCase()) ||
    l.user.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Audit Logs</h1>
          <p className="text-muted-foreground text-sm mt-1">System-wide activity trail</p>
        </div>
        <Button variant="outline"><Download className="h-4 w-4 mr-2" />Export</Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search logs..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Button variant="outline" size="icon"><Filter className="h-4 w-4" /></Button>
      </div>

      <div className="bg-card border rounded-xl shadow-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Timestamp</th>
              <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">User</th>
              <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Action</th>
              <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Target</th>
              <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Type</th>
              <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">IP Address</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((log) => (
              <tr key={log.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                <td className="p-4 text-xs text-muted-foreground font-mono">{log.time}</td>
                <td className="p-4 text-sm text-foreground">{log.user}</td>
                <td className="p-4 text-sm font-medium text-foreground">{log.action}</td>
                <td className="p-4 text-sm text-muted-foreground">{log.target}</td>
                <td className="p-4"><span className={`text-xs px-2.5 py-1 rounded-full font-medium ${typeColors[log.type] || ""}`}>{log.type}</span></td>
                <td className="p-4 text-xs text-muted-foreground font-mono">{log.ip}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
