import {
  LayoutDashboard,
  Building2,
  CreditCard,
  Receipt,
  Settings,
  ScrollText,
  Shield,
  Crown,
  Boxes,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

const mainItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Subscriptions", url: "/subscriptions", icon: CreditCard },
  { title: "Modules", url: "/modules", icon: Boxes },
  { title: "Tenants", url: "/tenants", icon: Building2 },
];

const systemItems = [
  // { title: "Audit Logs", url: "/audit-logs", icon: ScrollText },
  { title: "Settings", url: "/settings", icon: Settings },
  { title: "Transactions", url: "/transactions", icon: Receipt },
];

type profileData = {
  firstName: string;
  lastName: string;
  email: string;
};

export function AdminSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const isActive = (path: string) =>
    path === "/"
      ? location.pathname === "/"
      : location.pathname.startsWith(path);

  const { data, isLoading, isError } = useQuery<profileData>({
    queryKey: ["superadmin-profile"],
    queryFn: async () => {
      const res = await api.get("/auth/me");
      // console.log(res.data.data);
      return res.data?.data ?? res.data;
    },
    staleTime: 2 * 60 * 1000,
  });
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="gradient-primary rounded-lg p-2 shadow-glow">
            <Crown className="h-5 w-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div>
              <h1 className="text-lg font-bold tracking-tight text-foreground">
                Lexora
              </h1>
              <p className="text-xs text-muted-foreground">Platform Admin</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink to={item.url} end={item.url === "/"}>
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>System</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {systemItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink to={item.url}>
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        {!collapsed && (
          <div className="flex items-center gap-3 rounded-lg bg-muted p-3">
            <div className="gradient-accent h-8 w-8 rounded-full flex items-center justify-center">
              <span className="text-xs font-semibold text-primary-foreground">
                {data?.firstName?.[0]?.toUpperCase()}
                {data?.lastName?.[0]?.toUpperCase()}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                {data?.firstName + " " + data?.lastName}
              </p>
              <p className="text-xs text-muted-foreground">{data?.email}</p>
            </div>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
