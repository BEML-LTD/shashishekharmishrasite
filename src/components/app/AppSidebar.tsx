import { NavLink } from "@/components/NavLink";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import type { RoleFlags } from "@/hooks/useRoleFlags";
import { cn } from "@/lib/utils";
import { BarChart3, ClipboardList, Settings2, Shield } from "lucide-react";
import { useLocation } from "react-router-dom";

type SidebarItem = {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  requiresPrivileged?: boolean;
};

const items: SidebarItem[] = [
  { title: "Dashboard", url: "/app", icon: BarChart3 },
  { title: "Complaints", url: "/app/complaints", icon: ClipboardList },
  { title: "Profile", url: "/app/profile", icon: Settings2 },
  { title: "Management", url: "/app/manage", icon: Shield, requiresPrivileged: true },
];

export default function AppSidebar({ flags }: { flags: RoleFlags }) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const currentPath = location.pathname;

  const filteredItems = items.filter((i) => !i.requiresPrivileged || flags.isAdminOrInCharge);

  return (
    <Sidebar className={cn(collapsed ? "w-14" : "w-64")} collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>PRD</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredItems.map((item) => {
                const isActive = currentPath === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                      <NavLink
                        to={item.url}
                        end={item.url === "/app"}
                        className="rounded-md"
                        activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
                      >
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
