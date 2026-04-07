import { useState } from "react";
import { Building2, Search, Plus, MoreHorizontal, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const orgs = [
  { id: 1, name: "Kigali Finance Ltd", plan: "Enterprise", status: "Active", users: 45, modules: ["AML/KYC", "GRC"], created: "2024-01-15" },
  { id: 2, name: "Rwanda Tech Corp", plan: "Professional", status: "Active", users: 23, modules: ["CRM", "HR"], created: "2024-02-20" },
  { id: 3, name: "East Africa Holdings", plan: "Enterprise", status: "Active", users: 67, modules: ["AML/KYC", "GRC", "CRM"], created: "2023-11-08" },
  { id: 4, name: "Great Lakes Insurance", plan: "Starter", status: "Suspended", users: 12, modules: ["GRC"], created: "2024-03-01" },
  { id: 5, name: "Virunga Microfinance", plan: "Professional", status: "Active", users: 31, modules: ["AML/KYC", "HR"], created: "2024-01-28" },
  { id: 6, name: "Akagera Capital", plan: "Enterprise", status: "Active", users: 54, modules: ["AML/KYC", "GRC", "CRM", "HR"], created: "2023-09-12" },
  { id: 7, name: "Nyungwe Solutions", plan: "Starter", status: "Inactive", users: 8, modules: ["CRM"], created: "2024-04-10" },
];

export default function Organizations() {
  const [search, setSearch] = useState("");
  const filtered = orgs.filter((o) => o.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Organizations</h1>
          <p className="text-muted-foreground text-sm mt-1">{orgs.length} registered companies</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="gradient-primary shadow-glow">
              <Plus className="h-4 w-4 mr-2" /> Add Organization
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create New Organization</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div><Label>Company Name</Label><Input placeholder="Enter company name" className="mt-1.5" /></div>
              <div><Label>Contact Email</Label><Input placeholder="admin@company.com" className="mt-1.5" /></div>
              <div><Label>Subscription Plan</Label><Input placeholder="Select plan" className="mt-1.5" /></div>
            </div>
            <DialogFooter><Button className="gradient-primary">Create Organization</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search organizations..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="bg-card border rounded-xl shadow-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Organization</th>
              <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Plan</th>
              <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
              <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Users</th>
              <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Modules</th>
              <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((org) => (
              <tr key={org.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{org.name}</p>
                      <p className="text-xs text-muted-foreground">Since {org.created}</p>
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <Badge variant={org.plan === "Enterprise" ? "default" : "secondary"} className={org.plan === "Enterprise" ? "gradient-primary border-0" : ""}>
                    {org.plan}
                  </Badge>
                </td>
                <td className="p-4">
                  <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
                    org.status === "Active" ? "bg-success/15 text-success" :
                    org.status === "Suspended" ? "bg-warning/15 text-warning" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {org.status === "Active" ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                    {org.status}
                  </span>
                </td>
                <td className="p-4 text-sm text-foreground">{org.users}</td>
                <td className="p-4">
                  <div className="flex gap-1 flex-wrap">
                    {org.modules.map((m) => (
                      <span key={m} className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">{m}</span>
                    ))}
                  </div>
                </td>
                <td className="p-4">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>View Profile</DropdownMenuItem>
                      <DropdownMenuItem>Edit Modules</DropdownMenuItem>
                      <DropdownMenuItem>Change Plan</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">Deactivate</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
