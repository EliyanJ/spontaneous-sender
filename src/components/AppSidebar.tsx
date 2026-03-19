import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Search,
  Mail,
  Send,
  Activity,
  RefreshCw,
  GitCompare,
  FileText,
  Settings,
  Shield,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { cn } from "@/lib/utils";

const menuItems = [
  { title: "Dashboard",      icon: LayoutDashboard, value: "overview" },
  { title: "Recherche",      icon: Search,          value: "search" },
  { title: "Campagnes",      icon: Send,            value: "campaigns" },
  { title: "Suivi",          icon: Activity,        value: "suivi" },
  { title: "Relance",        icon: RefreshCw,       value: "relance" },
  { title: "Comparateur CV", icon: GitCompare,      value: "cv-comparator" },
  { title: "Créateur CV",    icon: FileText,        value: "cv-builder" },
];

interface AppSidebarProps {
  activeTab: string;
  onTabChange: (value: string) => void;
}

export function AppSidebar({ activeTab, onTabChange }: AppSidebarProps) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { isAdmin } = useAdminCheck();
  const navigate = useNavigate();

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar">
      {/* Header */}
      <SidebarHeader className="border-b border-sidebar-border/50 px-3 py-3">
        <div className={cn("flex items-center gap-2 overflow-hidden", collapsed && "justify-center")}>
          <Logo height={28} className="shrink-0" />
          {!collapsed && (
            <span className="font-semibold text-foreground text-base tracking-tight truncate">
              Cronos
            </span>
          )}
        </div>
      </SidebarHeader>

      {/* Nav Items */}
      <SidebarContent className="pt-3">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5 px-2">
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.value}>
                  <SidebarMenuButton
                    onClick={() => {
                      if (item.value === "cv-builder") {
                        navigate("/cv-builder");
                      } else {
                        onTabChange(item.value);
                      }
                    }}
                    isActive={activeTab === item.value}
                    tooltip={item.title}
                    className={cn(
                      "w-full py-2.5 px-3 rounded-lg transition-all duration-200 gap-3",
                      activeTab === item.value
                        ? "bg-primary/10 text-primary border border-primary/20 font-medium"
                        : "hover:bg-sidebar-accent text-sidebar-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="border-t border-sidebar-border/50 px-2 py-3 space-y-1">
        {/* Settings */}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => onTabChange("settings")}
              isActive={activeTab === "settings"}
              tooltip="Paramètres"
              className={cn(
                "w-full py-2.5 px-3 rounded-lg transition-all duration-200 gap-3",
                activeTab === "settings"
                  ? "bg-primary/10 text-primary border border-primary/20 font-medium"
                  : "hover:bg-sidebar-accent text-sidebar-foreground"
              )}
            >
              <Settings className="h-4 w-4 shrink-0" />
              <span>Paramètres</span>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {/* Admin */}
          {isAdmin && (
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => navigate("/admin")}
                tooltip="Administration"
                className="w-full py-2.5 px-3 rounded-lg transition-all duration-200 gap-3 text-primary hover:bg-primary/10 border border-primary/30"
              >
                <Shield className="h-4 w-4 shrink-0" />
                <span>Admin</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
        </SidebarMenu>

        {/* Theme + Collapse trigger */}
        <div className={cn("flex items-center pt-1", collapsed ? "justify-center" : "justify-between px-1")}>
          {!collapsed && <ThemeToggle />}
          <SidebarTrigger className="h-8 w-8 rounded-lg hover:bg-sidebar-accent text-sidebar-foreground">
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </SidebarTrigger>
          {collapsed && (
            <div className="mt-2">
              <ThemeToggle />
            </div>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
