import { useState } from "react";
import { Shield, Globe, Zap, Database, User, Mail, Phone, Camera, Lock } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";

const modules = [
  { name: "AML/KYC", description: "Anti-Money Laundering & Know Your Customer compliance", enabled: true, icon: Shield },
  { name: "GRC", description: "Governance, Risk & Compliance management", enabled: true, icon: Database },
  { name: "CRM", description: "Customer Relationship Management", enabled: true, icon: Globe },
  { name: "HR", description: "Human Resources & Workforce management", enabled: false, icon: Zap },
];

const integrations = [
  { name: "RRA (Rwanda Revenue Authority)", status: "Connected", lastSync: "2 hours ago" },
  { name: "RSSB (Social Security Board)", status: "Connected", lastSync: "4 hours ago" },
  { name: "BNR (National Bank of Rwanda)", status: "Pending", lastSync: "—" },
  { name: "RDB (Development Board)", status: "Disconnected", lastSync: "—" },
];

const frameworks = [
  { name: "ISO 27001", version: "2022", status: "Active" },
  { name: "SOC 2 Type II", version: "2023", status: "Active" },
  { name: "GDPR", version: "2018", status: "Active" },
  { name: "PCI DSS", version: "4.0", status: "Draft" },
];

export default function SystemSettings() {
  const { toast } = useToast();
  const [moduleStates, setModuleStates] = useState(
    Object.fromEntries(modules.map((m) => [m.name, m.enabled]))
  );

  const [profile, setProfile] = useState({
    firstName: "Super",
    lastName: "Admin",
    email: "admin@lexora.io",
    phone: "+250 788 123 456",
    role: "Platform Super Admin",
    bio: "Managing the Lexora platform and overseeing all tenant operations.",
    avatar: "",
  });
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(profile);
  const [passwords, setPasswords] = useState({ current: "", next: "", confirm: "" });

  const saveProfile = () => {
    setProfile(draft);
    setEditing(false);
    toast({ title: "Profile updated", description: "Your profile details have been saved." });
  };

  const changePassword = () => {
    if (!passwords.current || !passwords.next) {
      toast({ title: "Missing fields", description: "Fill in all password fields.", variant: "destructive" });
      return;
    }
    if (passwords.next !== passwords.confirm) {
      toast({ title: "Passwords don't match", description: "New password and confirmation must match.", variant: "destructive" });
      return;
    }
    setPasswords({ current: "", next: "", confirm: "" });
    toast({ title: "Password changed", description: "Your password has been updated." });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">System Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Global configuration & integrations</p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="bg-muted">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="modules">Modules</TabsTrigger>
          <TabsTrigger value="frameworks">Compliance Frameworks</TabsTrigger>
          <TabsTrigger value="risk">Risk Rules</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-4 space-y-6">
          <div className="bg-card border rounded-xl p-6 shadow-card">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={profile.avatar} />
                    <AvatarFallback className="gradient-primary text-primary-foreground text-xl font-semibold">
                      {profile.firstName[0]}{profile.lastName[0]}
                    </AvatarFallback>
                  </Avatar>
                  {editing && (
                    <button className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-glow">
                      <Camera className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">{profile.firstName} {profile.lastName}</h3>
                  <p className="text-sm text-muted-foreground">{profile.role}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{profile.email}</p>
                </div>
              </div>
              {!editing ? (
                <Button variant="outline" onClick={() => { setDraft(profile); setEditing(true); }}>
                  <User className="h-4 w-4" /> Edit Profile
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                  <Button className="gradient-primary shadow-glow" onClick={saveProfile}>Save Changes</Button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>First Name</Label>
                <Input className="mt-1.5" disabled={!editing}
                  value={editing ? draft.firstName : profile.firstName}
                  onChange={(e) => setDraft({ ...draft, firstName: e.target.value })} />
              </div>
              <div>
                <Label>Last Name</Label>
                <Input className="mt-1.5" disabled={!editing}
                  value={editing ? draft.lastName : profile.lastName}
                  onChange={(e) => setDraft({ ...draft, lastName: e.target.value })} />
              </div>
              <div>
                <Label>Email</Label>
                <Input className="mt-1.5" type="email" disabled={!editing}
                  value={editing ? draft.email : profile.email}
                  onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
              </div>
              <div>
                <Label>Phone</Label>
                <Input className="mt-1.5" disabled={!editing}
                  value={editing ? draft.phone : profile.phone}
                  onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <Label>Role</Label>
                <Input className="mt-1.5" disabled value={profile.role} />
              </div>
              <div className="md:col-span-2">
                <Label>Bio</Label>
                <Textarea className="mt-1.5" rows={3} disabled={!editing}
                  value={editing ? draft.bio : profile.bio}
                  onChange={(e) => setDraft({ ...draft, bio: e.target.value })} />
              </div>
            </div>
          </div>

          <div className="bg-card border rounded-xl p-6 shadow-card space-y-4">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-foreground">Change Password</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Current Password</Label>
                <Input className="mt-1.5" type="password"
                  value={passwords.current}
                  onChange={(e) => setPasswords({ ...passwords, current: e.target.value })} />
              </div>
              <div>
                <Label>New Password</Label>
                <Input className="mt-1.5" type="password"
                  value={passwords.next}
                  onChange={(e) => setPasswords({ ...passwords, next: e.target.value })} />
              </div>
              <div>
                <Label>Confirm Password</Label>
                <Input className="mt-1.5" type="password"
                  value={passwords.confirm}
                  onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })} />
              </div>
            </div>
            <Button className="gradient-primary shadow-glow" onClick={changePassword}>Update Password</Button>
          </div>
        </TabsContent>

        <TabsContent value="modules" className="mt-4 space-y-4">
          {modules.map((mod) => (
            <div key={mod.name} className="bg-card border rounded-xl p-5 shadow-card flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                  <mod.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{mod.name}</h3>
                  <p className="text-sm text-muted-foreground">{mod.description}</p>
                </div>
              </div>
              <Switch
                checked={moduleStates[mod.name]}
                onCheckedChange={(v) => setModuleStates((s) => ({ ...s, [mod.name]: v }))}
              />
            </div>
          ))}
        </TabsContent>

        <TabsContent value="integrations" className="mt-4 space-y-4">
          {integrations.map((int) => (
            <div key={int.name} className="bg-card border rounded-xl p-5 shadow-card flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-foreground">{int.name}</h3>
                <p className="text-sm text-muted-foreground">Last sync: {int.lastSync}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                  int.status === "Connected" ? "bg-success/15 text-success" :
                  int.status === "Pending" ? "bg-warning/15 text-warning" :
                  "bg-muted text-muted-foreground"
                }`}>{int.status}</span>
                <Button variant="outline" size="sm">
                  {int.status === "Disconnected" ? "Connect" : "Configure"}
                </Button>
              </div>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="frameworks" className="mt-4">
          <div className="bg-card border rounded-xl shadow-card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Framework</th>
                  <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Version</th>
                  <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                  <th className="text-left p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {frameworks.map((fw) => (
                  <tr key={fw.name} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="p-4 text-sm font-medium text-foreground">{fw.name}</td>
                    <td className="p-4 text-sm text-muted-foreground">{fw.version}</td>
                    <td className="p-4">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                        fw.status === "Active" ? "bg-success/15 text-success" : "bg-warning/15 text-warning"
                      }`}>{fw.status}</span>
                    </td>
                    <td className="p-4"><Button variant="ghost" size="sm">Edit</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="risk" className="mt-4 space-y-4">
          <div className="bg-card border rounded-xl p-6 shadow-card space-y-4">
            <h3 className="font-semibold text-foreground">Risk Scoring Rules</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label>High Risk Threshold</Label><Input type="number" defaultValue={80} className="mt-1.5" /></div>
              <div><Label>Medium Risk Threshold</Label><Input type="number" defaultValue={50} className="mt-1.5" /></div>
              <div><Label>Auto-Flag Transactions Above ($)</Label><Input type="number" defaultValue={10000} className="mt-1.5" /></div>
              <div><Label>Review Period (days)</Label><Input type="number" defaultValue={30} className="mt-1.5" /></div>
            </div>
            <Button className="gradient-primary shadow-glow">Save Rules</Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
